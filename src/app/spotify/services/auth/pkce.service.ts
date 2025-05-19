import { Injectable } from '@angular/core';
import { SpotifyConfigService } from '../../config/spotify-config.service';
import { TokenResponse } from '../../models';

@Injectable({
  providedIn: 'root'
})
export class PkceService {
  constructor(private config: SpotifyConfigService) {}

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

  async generateCodeVerifier(): Promise<string> {
    const verifier = this.generateRandomString(128);
    localStorage.setItem(this.config.storageKeys.codeVerifier, verifier);
    return verifier;
  }

  getStoredCodeVerifier(): string | null {
    return localStorage.getItem(this.config.storageKeys.codeVerifier);
  }

  clearCodeVerifier(): void {
    localStorage.removeItem(this.config.storageKeys.codeVerifier);
  }

  async generateAuthorizationUrl(): Promise<string> {
    const verifier = await this.generateCodeVerifier();
    const challenge = await this.generateCodeChallenge(verifier);

    const params = new URLSearchParams();
    params.append('client_id', this.config.clientId);
    params.append('response_type', 'code');
    params.append('redirect_uri', this.config.redirectUri);
    params.append('scope', this.config.scopes.join(' '));
    params.append('code_challenge_method', 'S256');
    params.append('code_challenge', challenge);

    return `${this.config.endpoints.authorize}?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<TokenResponse | null> {
    const verifier = this.getStoredCodeVerifier();
    if (!verifier) {
      console.error('CRITICAL: Code verifier not found in local storage during exchange.');
      return null;
    }

    const params = new URLSearchParams();
    params.append('client_id', this.config.clientId);
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', this.config.redirectUri);
    params.append('code_verifier', verifier);

    try {
      const result = await fetch(this.config.endpoints.token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
      });

      // Clear verifier regardless of success/failure
      this.clearCodeVerifier();

      if (!result.ok) {
        const errorBody = await result.text();
        console.error('Spotify token exchange HTTP error:', result.status, errorBody);
        return null;
      }

      const tokenResponse = await result.json();
      if (tokenResponse.access_token && typeof tokenResponse.expires_in === 'number') {
        return tokenResponse as TokenResponse;
      }

      console.error('Token response missing access_token or expires_in:', tokenResponse);
      return null;
    } catch (error) {
      console.error('Exception during fetch in exchangeCodeForToken:', error);
      this.clearCodeVerifier();
      return null;
    }
  }
}
