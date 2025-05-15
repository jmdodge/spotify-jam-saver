import { Injectable } from '@angular/core';
import SpotifyWebApi from 'spotify-web-api-js';

@Injectable({
  providedIn: 'root'
})
export class SpotifyService {
  private spotifyApi: SpotifyWebApi.SpotifyWebApiJs = new SpotifyWebApi();
  private clientId = 'ac5c1af01d0f46659597010bee387883';
  private redirectUri = 'http://localhost:4205/';
  private scopes = [
    'playlist-read-private',
    'playlist-modify-public',
    'playlist-modify-private',
    'user-read-playback-state',
    'user-modify-playback-state'
  ];

  constructor() { }

  authorize() {
    const authorizeURL = `https://accounts.spotify.com/authorize?client_id=${this.clientId}&response_type=token&redirect_uri=${encodeURIComponent(this.redirectUri)}&scope=${encodeURIComponent(this.scopes.join(' '))}`;
    window.location.href = authorizeURL;
  }

  handleAuthCallback(): boolean {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');

    if (accessToken) {
      this.spotifyApi.setAccessToken(accessToken);
      // Optionally, store the token in local storage or a cookie
      // localStorage.setItem('spotify_access_token', accessToken);
      // Clear the hash from the URL
      window.location.hash = '';
      return true;
    }
    return false;
  }

  getAccessToken(): string | null {
    return this.spotifyApi.getAccessToken();
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  logout() {
    this.spotifyApi.setAccessToken(null);
    // Optionally, remove the token from local storage
    // localStorage.removeItem('spotify_access_token');
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
      // It's possible the token expired, try to re-authorize or handle appropriately
      // For now, returning null, JamRecorderComponent will try to re-auth
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
    if (error && error.status === 401) {
      // Token has expired or is invalid
      this.logout(); // Clear the invalid token
      this.authorize(); // Re-initiate authorization
    }
    // You could add more specific error handling here
  }

  // Add other Spotify API methods here (e.g., createPlaylist, searchTracks, addToPlaylist, getPlaybackState)
}
