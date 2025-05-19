import { Injectable } from '@angular/core';
import { SpotifyConfigService } from '../../config/spotify-config.service';
import { TokenData } from '../../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class TokenManagerService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor(private config: SpotifyConfigService) {
    this.loadTokensFromStorage();
  }

  private loadTokensFromStorage(): void {
    const storedToken = localStorage.getItem(this.config.storageKeys.accessToken);
    const storedExpiry = localStorage.getItem(this.config.storageKeys.tokenExpiry);
    const storedRefreshToken = localStorage.getItem(this.config.storageKeys.refreshToken);

    if (storedToken && storedExpiry) {
      const expiryTimestamp = parseInt(storedExpiry, 10);
      if (Date.now() < expiryTimestamp) {
        this.accessToken = storedToken;
        this.tokenExpiry = expiryTimestamp;
        this.refreshToken = storedRefreshToken;
      } else if (storedRefreshToken) {
        // Token expired but we have a refresh token
        this.refreshToken = storedRefreshToken;
        this.refreshAccessToken().catch(() => {
          this.clearTokens();
        });
      } else {
        this.clearTokens();
      }
    }
  }

  private storeTokens(tokenData: TokenData): void {
    this.accessToken = tokenData.accessToken;
    this.tokenExpiry = Date.now() + tokenData.expiresIn * 1000;

    if (tokenData.refreshToken) {
      this.refreshToken = tokenData.refreshToken;
      localStorage.setItem(this.config.storageKeys.refreshToken, tokenData.refreshToken);
    }

    localStorage.setItem(this.config.storageKeys.accessToken, tokenData.accessToken);
    localStorage.setItem(this.config.storageKeys.tokenExpiry, this.tokenExpiry.toString());
  }

  clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;

    localStorage.removeItem(this.config.storageKeys.accessToken);
    localStorage.removeItem(this.config.storageKeys.tokenExpiry);
    localStorage.removeItem(this.config.storageKeys.refreshToken);
  }

  async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) {
      return false;
    }

    const params = new URLSearchParams();
    params.append('client_id', this.config.clientId);
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', this.refreshToken);

    try {
      const result = await fetch(this.config.endpoints.token, {
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
        this.storeTokens({
          accessToken: tokenData.access_token,
          expiresIn: tokenData.expires_in
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    }
  }

  getValidAccessToken(): string | null {
    if (this.accessToken && this.tokenExpiry) {
      // If token is about to expire in the next 5 minutes, try to refresh it
      if (Date.now() + 300000 > this.tokenExpiry && this.refreshToken) {
        this.refreshAccessToken().catch(() => {
          this.clearTokens();
        });
      }

      if (Date.now() < this.tokenExpiry) {
        return this.accessToken;
      }
    }

    // If token is invalid or expired, clear tokens
    if (this.accessToken || this.tokenExpiry) {
      console.log("Access token expired or invalid, clearing tokens.");
      this.clearTokens();
    }
    return null;
  }

  hasValidToken(): boolean {
    return !!this.getValidAccessToken();
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  setTokens(tokenData: TokenData): void {
    this.storeTokens(tokenData);
  }
}
