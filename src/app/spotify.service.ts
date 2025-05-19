import { Injectable } from '@angular/core';
import SpotifyWebApi from 'spotify-web-api-js';
import { Router } from '@angular/router';

const SPOTIFY_ACCESS_TOKEN_KEY = 'spotify_access_token';
const SPOTIFY_TOKEN_EXPIRY_KEY = 'spotify_token_expiry';
const SPOTIFY_REFRESH_TOKEN_KEY = 'spotify_refresh_token';  // Add refresh token storage key
const SPOTIFY_USER_PROFILE_KEY = 'spotify_user_profile'; // For storing profile to avoid re-fetch on simple reloads
const CODE_VERIFIER_STORAGE_KEY_CONST = 'spotify_code_verifier'; // Renamed for clarity

@Injectable({
  providedIn: 'root'
})
export class SpotifyService {
  private spotifyApi: SpotifyWebApi.SpotifyWebApiJs = new SpotifyWebApi();
  private clientId = 'ac5c1af01d0f46659597010bee387883';
  private redirectUri = 'http://127.0.0.1:4205/';
  private scopes = [
    'playlist-read-private',
    'playlist-modify-public',
    'playlist-modify-private',
    'user-read-playback-state',
    'user-modify-playback-state'
  ];

  private accessToken: string | null = null;
  private userProfile: UserProfile | null = null;
  private tokenExpiry: number | null = null; // Store as timestamp (milliseconds)
  private refreshToken: string | null = null;

  constructor(private router: Router) {
    this.loadTokenAndProfileFromStorage();
  }

  private loadTokenAndProfileFromStorage(): boolean {
    const storedToken = localStorage.getItem(SPOTIFY_ACCESS_TOKEN_KEY);
    const storedExpiry = localStorage.getItem(SPOTIFY_TOKEN_EXPIRY_KEY);
    const storedRefreshToken = localStorage.getItem(SPOTIFY_REFRESH_TOKEN_KEY);
    const storedProfile = localStorage.getItem(SPOTIFY_USER_PROFILE_KEY);

    if (storedToken && storedExpiry) {
      const expiryTimestamp = parseInt(storedExpiry, 10);
      if (Date.now() < expiryTimestamp) {
        this.accessToken = storedToken;
        this.tokenExpiry = expiryTimestamp;
        this.refreshToken = storedRefreshToken;
        this.spotifyApi.setAccessToken(this.accessToken);
        if (storedProfile) {
          try {
            this.userProfile = JSON.parse(storedProfile);
          } catch (e) {
            console.error('Error parsing stored user profile:', e);
            localStorage.removeItem(SPOTIFY_USER_PROFILE_KEY); // Clear invalid profile
            this.userProfile = null;
          }
        }
        // If profile wasn't in storage or failed to parse, but token is valid, fetch it.
        if (!this.userProfile && this.accessToken) {
            this.fetchProfile(this.accessToken).then(profile => {
                this.userProfile = profile;
                localStorage.setItem(SPOTIFY_USER_PROFILE_KEY, JSON.stringify(this.userProfile));
            }).catch(err => {
                console.error("Error fetching profile in loadTokenAndProfileFromStorage:", err);
                // Potentially handle token as invalid if profile fetch fails consistently
            });
        }
        console.log('Loaded token and profile from storage.');
        return true;
      } else if (storedRefreshToken) {
        // Token expired but we have a refresh token - try to refresh
        this.refreshAccessToken(storedRefreshToken).then(success => {
          if (!success) {
            this.clearFullSession();
          }
        });
        return false;
      } else {
        console.log('Spotify token from storage has expired and no refresh token available.');
        this.clearFullSession();
      }
    }
    return false;
  }

  private storeTokenAndProfile(token: string, expiresInSeconds: number, refreshToken?: string, profile?: UserProfile) {
    this.accessToken = token;
    this.tokenExpiry = Date.now() + expiresInSeconds * 1000;
    if (refreshToken) {
      this.refreshToken = refreshToken;
      localStorage.setItem(SPOTIFY_REFRESH_TOKEN_KEY, refreshToken);
    }
    localStorage.setItem(SPOTIFY_ACCESS_TOKEN_KEY, this.accessToken);
    localStorage.setItem(SPOTIFY_TOKEN_EXPIRY_KEY, this.tokenExpiry.toString());
    this.spotifyApi.setAccessToken(this.accessToken);

    if (profile) {
        this.userProfile = profile;
        localStorage.setItem(SPOTIFY_USER_PROFILE_KEY, JSON.stringify(this.userProfile));
    }
  }

  private clearTokenAndProfile() {
    this.accessToken = null;
    this.tokenExpiry = null;
    this.refreshToken = null;
    this.userProfile = null;
    localStorage.removeItem(SPOTIFY_ACCESS_TOKEN_KEY);
    localStorage.removeItem(SPOTIFY_TOKEN_EXPIRY_KEY);
    localStorage.removeItem(SPOTIFY_REFRESH_TOKEN_KEY);
    localStorage.removeItem(SPOTIFY_USER_PROFILE_KEY);
    this.spotifyApi.setAccessToken(null);
  }

  private clearFullSession() {
    this.clearTokenAndProfile();
    localStorage.removeItem(CODE_VERIFIER_STORAGE_KEY_CONST);
  }

  private generateRandomString(length: number): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const data = new TextEncoder().encode(verifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  public async authorize() {
    this.clearTokenAndProfile(); // Clear previous session data, but not the verifier which we are about to set.
    localStorage.removeItem(CODE_VERIFIER_STORAGE_KEY_CONST); // Any lingering verifier from a failed previous attempt should also be cleared
    const verifier = this.generateRandomString(128);
    localStorage.setItem(CODE_VERIFIER_STORAGE_KEY_CONST, verifier);
    console.log('Stored new code_verifier:', verifier); // Debug log
    const challenge = await this.generateCodeChallenge(verifier);

    const params = new URLSearchParams();
    params.append('client_id', this.clientId);
    params.append('response_type', 'code');
    params.append('redirect_uri', this.redirectUri);
    params.append('scope', this.scopes.join(' '));
    params.append('code_challenge_method', 'S256');
    params.append('code_challenge', challenge);

    window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  public async handleAuthCallback(): Promise<boolean> {
    const queryParams = new URLSearchParams(window.location.search);
    const code = queryParams.get('code');
    const error = queryParams.get('error');

    this.router.navigate([], { queryParams: {}, replaceUrl: true });

    if (error) {
      console.error('Error during Spotify authorization:', error);
      localStorage.removeItem(CODE_VERIFIER_STORAGE_KEY_CONST); // Clean up verifier on auth error
      this.clearTokenAndProfile();
      return false;
    }

    if (code) {
      console.log('Received authorization code:', code);
      const tokenData = await this.exchangeCodeForToken(code);

      if (tokenData && tokenData.access_token && tokenData.expires_in) {
        let fetchedProfile: UserProfile | undefined;
        try {
          fetchedProfile = await this.fetchProfile(tokenData.access_token);
          console.log('User profile fetched successfully after token exchange.');
        } catch (profileError) {
          console.error('Error fetching user profile after token exchange:', profileError);
        }
        this.storeTokenAndProfile(
          tokenData.access_token,
          tokenData.expires_in,
          tokenData.refresh_token,
          fetchedProfile
        );
        console.log('Token and profile stored after auth callback.');
        return true;
      } else {
        console.error('Failed to exchange code for token or missing token data in callback.');
        // Verifier should have been cleared by exchangeCodeForToken on failure path already.
        this.clearTokenAndProfile();
        return false;
      }
    }
    return this.isAuthenticated();
  }

  private async exchangeCodeForToken(code: string): Promise<{ access_token: string; expires_in: number; refresh_token?: string } | null> {
    const verifier = localStorage.getItem(CODE_VERIFIER_STORAGE_KEY_CONST);
    console.log('Attempting to retrieve code_verifier:', verifier); // Debug log
    if (!verifier) {
      console.error('CRITICAL: Code verifier not found in local storage during exchange.');
      return null;
    }

    const params = new URLSearchParams();
    params.append('client_id', this.clientId);
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', this.redirectUri);
    params.append('code_verifier', verifier);

    try {
      const result = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
      });

      // Verifier has served its purpose, remove it regardless of success/failure of token endpoint
      localStorage.removeItem(CODE_VERIFIER_STORAGE_KEY_CONST);
      console.log('Cleared code_verifier after attempt to use it.'); // Debug log

      if (!result.ok) {
        const errorBody = await result.text();
        console.error('Spotify token exchange HTTP error:', result.status, errorBody);
        return null;
      }

      const tokenResponse = await result.json();
      if (tokenResponse.access_token && typeof tokenResponse.expires_in === 'number'){
        console.log('Token received successfully.');
        // Make sure we store the refresh token if it's provided
        if (tokenResponse.refresh_token) {
          console.log('Refresh token received.');
        }
        return tokenResponse as { access_token: string; expires_in: number; refresh_token?: string };
      } else {
        console.error('Token response missing access_token or expires_in:', tokenResponse);
        return null;
      }
    } catch (error) {
      console.error('Exception during fetch in exchangeCodeForToken:', error);
      localStorage.removeItem(CODE_VERIFIER_STORAGE_KEY_CONST); // Ensure cleanup on network or other exception
      return null;
    }
  }

  getAccessToken(): string | null {
    if (this.accessToken && this.tokenExpiry) {
      // If token is about to expire in the next 5 minutes, try to refresh it
      if (Date.now() + 300000 > this.tokenExpiry && this.refreshToken) {
        this.refreshAccessToken(this.refreshToken).then(success => {
          if (!success) {
            this.clearFullSession();
          }
        });
      }

      if (Date.now() < this.tokenExpiry) {
        return this.accessToken;
      }
    }

    // If token is invalid or expired, clear relevant session data
    if (this.accessToken || this.tokenExpiry) {
      console.log("Access token expired or invalid, clearing session data.");
      this.clearFullSession();
    }
    return null;
  }

  getUserProfile(): UserProfile | null {
    // Ensure profile is only returned if associated with a valid token session
    return this.isAuthenticated() ? this.userProfile : null;
  }

  isAuthenticated(): boolean {
    // Check if token exists and is not expired (getAccessToken handles this check and clears if needed)
    const token = this.getAccessToken();
    return !!token;
  }

  logout() {
    this.clearFullSession();
    console.log('Logged out, full session cleared from storage.');
    // Potentially add: this.router.navigate(['/']); or similar to redirect to home/login
  }

  async createPlaylist(name: string): Promise<SpotifyApi.CreatePlaylistResponse | null> {
    if (!this.isAuthenticated()) {
      this.authorize();
      return null;
    }
    try {
      const user = await this.spotifyApi.getMe();
      const playlist = await this.spotifyApi.createPlaylist(user.id, { name: name, public: true });
      return playlist;
    } catch (error) {
      console.error('Error creating playlist:', error);
      this.handleApiError(error);
      return null;
    }
  }

  async getPlaybackState(): Promise<SpotifyApi.CurrentPlaybackResponse | null> {
    if (!this.isAuthenticated()) {
      return null;
    }
    try {
      return await this.spotifyApi.getMyCurrentPlaybackState();
    } catch (error) {
      console.error('Error getting playback state:', error);
      this.handleApiError(error);
      return null;
    }
  }

  async addTrackToPlaylist(playlistId: string, trackUri: string): Promise<SpotifyApi.AddTracksToPlaylistResponse | null> {
    if (!this.isAuthenticated()) {
      this.authorize();
      return null;
    }
    try {
      return await this.spotifyApi.addTracksToPlaylist(playlistId, [trackUri]);
    } catch (error) {
      console.error('Error adding track to playlist:', error);
      this.handleApiError(error);
      return null;
    }
  }

  private handleApiError(error: any) {
    const hasStatus = (err: any): err is { status: number, message?: string } => {
        return typeof err === 'object' && err !== null && typeof err.status === 'number';
    };

    if (hasStatus(error) && error.status === 401) {
      console.error('Spotify API Error 401: Token expired or invalid. Logging out and re-authorizing.', error.message || error);
      this.logout(); // This will clear storage
      // this.authorize(); // Re-authorizing immediately might cause loops if the issue isn't just token expiry.
                       // Consider navigating to a login page or showing a message.
    }
  }

  public async fetchProfile(token: string): Promise<UserProfile> {
    if (!token) {
        // console.warn('fetchProfile called without a token. If this is unexpected, check callstack.');
        throw new Error('Access token is required to fetch profile.');
    }
    const result = await fetch("https://api.spotify.com/v1/me", {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });
    if (!result.ok) {
        const errorBody = await result.text();
        console.error('Spotify profile fetch failed:', result.status, errorBody);
        if (result.status === 401 && this.accessToken === token) { // Check if it's the current token failing
            console.log("Profile fetch failed with 401, current token might be invalid. Logging out.");
            this.logout();
            // this.authorize(); // Avoid immediate re-auth loop
        }
        throw new Error(`Spotify profile API request failed: ${result.status} ${errorBody}`);
    }
    const profile = await result.json() as UserProfile;
    // Update service's profile and store it, only if the token matches current valid token
    // This check prevents race conditions if multiple profile fetches occur.
    if (this.accessToken === token) {
        this.userProfile = profile;
        localStorage.setItem(SPOTIFY_USER_PROFILE_KEY, JSON.stringify(this.userProfile));
    }
    return profile;
  }

  private async refreshAccessToken(refreshToken: string): Promise<boolean> {
    const params = new URLSearchParams();
    params.append('client_id', this.clientId);
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);

    try {
      const result = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
      });

      if (!result.ok) {
        console.error('Failed to refresh token:', await result.text());
        return false;
      }

      const tokenData = await result.json();
      if (tokenData.access_token && typeof tokenData.expires_in === 'number') {
        // Note: refresh token is not included in the response when refreshing
        // We keep using the existing refresh token
        this.storeTokenAndProfile(tokenData.access_token, tokenData.expires_in);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    }
  }
}

export interface UserProfile {
  country: string;
  display_name: string;
  email: string;
  explicit_content: {
      filter_enabled: boolean,
      filter_locked: boolean
  },
  external_urls: { spotify: string; };
  followers: { href: string; total: number; };
  href: string;
  id: string;
  images: UserProfileImage[];
  product: string;
  type: string;
  uri: string;
}

export interface UserProfileImage {
  url: string;
  height: number;
  width: number;
}
