import { Injectable } from '@angular/core';
import { SpotifyAuthService } from '../auth/spotify-auth.service';
import { BaseSpotifyService } from '../base/base-spotify.service';
import { SpotifyConfigService } from '../../config/spotify-config.service';
import { UserProfile } from '../../models';

export interface UserProfileImage {
  url: string;
  height: number;
  width: number;
}

@Injectable({
  providedIn: 'root'
})
export class SpotifyUserService extends BaseSpotifyService {
  private userProfile: UserProfile | null = null;

  constructor(
    authService: SpotifyAuthService,
    private config: SpotifyConfigService
  ) {
    super(authService);
    this.loadProfileFromStorage();
  }

  private loadProfileFromStorage(): void {
    const storedProfile = localStorage.getItem(this.config.storageKeys.userProfile);
    if (storedProfile) {
      try {
        this.userProfile = JSON.parse(storedProfile);
      } catch (e) {
        console.error('Error parsing stored user profile:', e);
        localStorage.removeItem(this.config.storageKeys.userProfile);
        this.userProfile = null;
      }
    }
  }

  private storeProfile(profile: UserProfile): void {
    this.userProfile = profile;
    localStorage.setItem(this.config.storageKeys.userProfile, JSON.stringify(profile));
  }

  async getProfile(): Promise<UserProfile | null> {
    if (!this.requireAuth()) {
      return null;
    }

    // Return cached profile if we have one
    if (this.userProfile) {
      return this.userProfile;
    }

    // Fetch fresh profile
    const profile = await this.handleApiCall(async () => {
      const result = await fetch(this.config.endpoints.me, {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.authService.getAccessToken()}` }
      });

      if (!result.ok) {
        throw new Error(`Profile fetch failed: ${result.status}`);
      }

      const profile = await result.json() as UserProfile;
      this.storeProfile(profile);
      return profile;
    });

    return profile;
  }

  getCurrentUser(): Promise<SpotifyApi.UserObjectPrivate | null> {
    if (!this.requireAuth()) {
      return Promise.resolve(null);
    }

    return this.handleApiCall(() => this.spotifyApi.getMe());
  }

  clearProfile(): void {
    this.userProfile = null;
    localStorage.removeItem(this.config.storageKeys.userProfile);
  }
}
