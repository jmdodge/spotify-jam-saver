import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SpotifyAuthService } from './spotify/services/auth/spotify-auth.service';
import { SpotifyUserService } from './spotify/services/user/spotify-user.service';
import { UserProfile } from './spotify/models';
import { JamRecorderComponent } from './jam-recorder/jam-recorder.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, JamRecorderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  public title = 'Spotify Jam Saver';
  private _userProfile: UserProfile | null = null;

  constructor(
    private authService: SpotifyAuthService,
    private userService: SpotifyUserService
  ) {}

  async ngOnInit() {
    // Handle any auth callback from URL
    await this.authService.handleAuthCallback();
    // Load user profile if authenticated
    if (this.isAuthenticated) {
      this._userProfile = await this.userService.getProfile();
    }
  }

  login() {
    this.authService.authorize();
  }

  logout() {
    this.authService.logout();
    this._userProfile = null;
  }

  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  get userProfile(): UserProfile | null {
    return this._userProfile;
  }
}
