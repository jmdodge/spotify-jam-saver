import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SpotifyService, UserProfile } from './spotify.service';
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
  public isAuthenticated = false;
  public userProfile: UserProfile | null = null;

  constructor(private spotifyService: SpotifyService) {}

  async ngOnInit() {
    this.isAuthenticated = await this.spotifyService.handleAuthCallback();
    if (this.isAuthenticated) {
      this.userProfile = this.spotifyService.getUserProfile();
    } else {
      this.isAuthenticated = this.spotifyService.isAuthenticated();
      if (this.isAuthenticated) {
        this.userProfile = this.spotifyService.getUserProfile();
        if (!this.userProfile && this.spotifyService.getAccessToken()) {
          try {
            const token = this.spotifyService.getAccessToken();
            if (token) {
              this.userProfile = this.spotifyService.getUserProfile();
            }
          } catch (e) {
            console.error("Error fetching profile in AppComponent ngOnInit fallback:", e);
          }
        }
      }
    }
  }

  login() {
    this.spotifyService.authorize();
  }

  logout() {
    this.spotifyService.logout();
    this.isAuthenticated = false;
    this.userProfile = null;
  }
}
