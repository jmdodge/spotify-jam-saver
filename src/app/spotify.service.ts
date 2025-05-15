import { Injectable } from '@angular/core';
import SpotifyWebApi from 'spotify-web-api-js';
import { Router } from '@angular/router';

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
  private readonly CODE_VERIFIER_STORAGE_KEY = 'spotify_code_verifier';

  constructor(private router: Router) { }

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
    this.userProfile = null;
    const verifier = this.generateRandomString(128);
    localStorage.setItem(this.CODE_VERIFIER_STORAGE_KEY, verifier);
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
      return false;
    }

    if (code) {
      console.log('Received authorization code:', code);
      try {
        const token = await this.exchangeCodeForToken(code);
        if (token) {
          this.accessToken = token;
          this.spotifyApi.setAccessToken(this.accessToken);
          console.log('Access token obtained and set using PKCE.');

          try {
            this.userProfile = await this.fetchProfile(this.accessToken);
            console.log('User profile fetched:', this.userProfile);
          } catch (profileError) {
            console.error('Error fetching user profile:', profileError);
          }
          return true;
        } else {
          console.error('Failed to exchange code for token using PKCE.');
          return false;
        }
      } catch (e) {
        console.error('Error during PKCE token exchange:', e);
        return false;
      }
    }
    if (this.isAuthenticated() && !this.userProfile && this.accessToken) {
        try {
            this.userProfile = await this.fetchProfile(this.accessToken);
        } catch (e) { console.error('Error fetching profile on re-check', e); }
    }
    return this.isAuthenticated();
  }

  private async exchangeCodeForToken(code: string): Promise<string | null> {
    const verifier = localStorage.getItem(this.CODE_VERIFIER_STORAGE_KEY);

    if (!verifier) {
      console.error('Code verifier not found in local storage.');
      throw new Error('Code verifier not found.');
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

      if (!result.ok) {
        const errorBody = await result.text();
        console.error('Spotify token exchange failed:', result.status, errorBody);
        throw new Error(`Spotify token API request failed: ${result.status} ${errorBody}`);
      }

      const { access_token, refresh_token, expires_in } = await result.json();
      localStorage.removeItem(this.CODE_VERIFIER_STORAGE_KEY);

      if (refresh_token) {
      }

      return access_token || null;
    } catch (error) {
      console.error('Exception during token exchange:', error);
      localStorage.removeItem(this.CODE_VERIFIER_STORAGE_KEY);
      return null;
    }
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getUserProfile(): UserProfile | null {
    return this.userProfile;
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  logout() {
    this.accessToken = null;
    this.userProfile = null;
    this.spotifyApi.setAccessToken(null);
    localStorage.removeItem(this.CODE_VERIFIER_STORAGE_KEY);
    console.log('Logged out.');
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
      console.error('Spotify API Error 401: Token expired or invalid. Re-authorizing.', error.message || error);
      this.logout();
      this.authorize();
    }
  }

  public async fetchProfile(token: string): Promise<UserProfile> {
    if (!token) throw new Error('Access token is required to fetch profile.');
    const result = await fetch("https://api.spotify.com/v1/me", {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });
    if (!result.ok) {
        const errorBody = await result.text();
        console.error('Spotify profile fetch failed:', result.status, errorBody);
        throw new Error(`Spotify profile API request failed: ${result.status} ${errorBody}`);
    }
    return await result.json();
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
