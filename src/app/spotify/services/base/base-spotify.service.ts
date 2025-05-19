import { Injectable } from '@angular/core';
import SpotifyWebApi from 'spotify-web-api-js';
import { SpotifyAuthService } from '../auth/spotify-auth.service';

@Injectable()
export abstract class BaseSpotifyService {
  protected spotifyApi: SpotifyWebApi.SpotifyWebApiJs;

  constructor(protected authService: SpotifyAuthService) {
    this.spotifyApi = new SpotifyWebApi();
    this.updateApiToken();
  }

  protected updateApiToken(): void {
    const token = this.authService.getAccessToken();
    if (token) {
      this.spotifyApi.setAccessToken(token);
    }
  }

  protected async handleApiCall<T>(
    apiCall: () => Promise<T>,
    retryOn401: boolean = true
  ): Promise<T | null> {
    try {
      this.updateApiToken();
      return await apiCall();
    } catch (error) {
      console.error('API call failed:', error);

      if (retryOn401) {
        const shouldRetry = await this.authService.handleApiError(error);
        if (shouldRetry) {
          try {
            this.updateApiToken();
            return await apiCall();
          } catch (retryError) {
            console.error('API call failed after token refresh:', retryError);
          }
        }
      }
      return null;
    }
  }

  protected requireAuth(): boolean {
    if (!this.authService.isAuthenticated()) {
      this.authService.authorize();
      return false;
    }
    return true;
  }
}
