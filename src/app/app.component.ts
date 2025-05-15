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
  // isAuthenticated and userProfile will be derived from the service directly in the template or via getters
  // For simplicity in direct template binding, we can keep them as properties updated by the service.

  constructor(public spotifyService: SpotifyService) {} // Make service public for template access

  async ngOnInit() {
    // SpotifyService constructor now calls loadTokenAndProfileFromStorage()
    // Then, handleAuthCallback processes any new authorization code from URL
    const isCallbackAuth = await this.spotifyService.handleAuthCallback();

    // If not a callback auth, ensure isAuthenticated and userProfile are up-to-date from storage
    if (!isCallbackAuth) {
      // This is mostly to ensure the component's state reflects the service's loaded state.
      // isAuthenticated() in the service checks the loaded token.
      // getUserProfile() in the service returns the loaded profile.
    }
    // The template will use spotifyService.isAuthenticated() and spotifyService.getUserProfile()
    // or local properties if we choose to sync them, like below:
    // this.updateAuthStatus(); // If we had a sync method
  }

  // Optional: Method to sync status if not directly binding to service properties in template
  // updateAuthStatus() {
  //   this.isAuthenticated = this.spotifyService.isAuthenticated();
  //   this.userProfile = this.spotifyService.getUserProfile();
  // }

  login() {
    this.spotifyService.authorize();
  }

  logout() {
    this.spotifyService.logout();
    // After logout, status will be updated automatically via service.isAuthenticated() for the template
    // If using local properties and not direct service binding in template:
    // this.updateAuthStatus();
  }

  // Getter for the template to react to changes in authentication status
  get isAuthenticated(): boolean {
    return this.spotifyService.isAuthenticated();
  }

  // Getter for the template to get user profile
  get userProfile(): UserProfile | null {
    return this.spotifyService.getUserProfile();
  }
}
