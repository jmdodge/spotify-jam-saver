import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { TokenManagerService } from './token-manager.service';
import { PkceService } from './pkce.service';
import { SpotifyConfigService } from '../../config/spotify-config.service';

@Injectable({
  providedIn: 'root'
})
export class SpotifyAuthService {
  constructor(
    private router: Router,
    private tokenManager: TokenManagerService,
    private pkceService: PkceService,
    private config: SpotifyConfigService
  ) {}

  async authorize(): Promise<void> {
    this.tokenManager.clearTokens();
    this.pkceService.clearCodeVerifier();

    const authUrl = await this.pkceService.generateAuthorizationUrl();
    window.location.href = authUrl;
  }

  async handleAuthCallback(): Promise<boolean> {
    const queryParams = new URLSearchParams(window.location.search);
    const code = queryParams.get('code');
    const error = queryParams.get('error');

    // Clear the URL parameters
    this.router.navigate([], { queryParams: {}, replaceUrl: true });

    if (error) {
      console.error('Error during Spotify authorization:', error);
      this.pkceService.clearCodeVerifier();
      this.tokenManager.clearTokens();
      return false;
    }

    if (code) {
      console.log('Received authorization code:', code);
      const tokenResponse = await this.pkceService.exchangeCodeForToken(code);

      if (tokenResponse) {
        this.tokenManager.setTokens({
          accessToken: tokenResponse.access_token,
          expiresIn: tokenResponse.expires_in,
          refreshToken: tokenResponse.refresh_token
        });
        console.log('Token stored after auth callback.');
        return true;
      }

      console.error('Failed to exchange code for token.');
      this.tokenManager.clearTokens();
      return false;
    }

    return this.isAuthenticated();
  }

  isAuthenticated(): boolean {
    return this.tokenManager.hasValidToken();
  }

  getAccessToken(): string | null {
    return this.tokenManager.getValidAccessToken();
  }

  logout(): void {
    this.tokenManager.clearTokens();
    this.pkceService.clearCodeVerifier();
    console.log('Logged out, all tokens cleared from storage.');
  }

  async handleApiError(error: any): Promise<boolean> {
    const hasStatus = (err: any): err is { status: number, message?: string } => {
      return typeof err === 'object' && err !== null && typeof err.status === 'number';
    };

    if (hasStatus(error) && error.status === 401) {
      console.log('Spotify API Error 401: Token expired or invalid. Attempting to refresh token...');

      const refreshSuccess = await this.tokenManager.refreshAccessToken();
      if (refreshSuccess) {
        console.log('Successfully refreshed token, retrying operation...');
        return true;
      }

      console.error('Token refresh failed. Logging out.');
      this.logout();
    }
    return false;
  }
}
