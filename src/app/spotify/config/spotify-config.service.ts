import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SpotifyConfigService {
  readonly clientId = 'ac5c1af01d0f46659597010bee387883';
  readonly redirectUri = environment.spotifyRedirectUri;
  readonly scopes = [
    'playlist-read-private',
    'playlist-modify-public',
    'playlist-modify-private',
    'user-read-playback-state',
    'user-modify-playback-state'
  ] as const;

  // Storage keys
  readonly storageKeys = {
    accessToken: 'spotify_access_token',
    tokenExpiry: 'spotify_token_expiry',
    refreshToken: 'spotify_refresh_token',
    userProfile: 'spotify_user_profile',
    codeVerifier: 'spotify_code_verifier'
  } as const;

  // API endpoints
  readonly endpoints = {
    authorize: 'https://accounts.spotify.com/authorize',
    token: 'https://accounts.spotify.com/api/token',
    me: 'https://api.spotify.com/v1/me'
  } as const;
}
