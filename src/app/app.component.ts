import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SpotifyService } from './spotify.service';
import { JamRecorderComponent } from './jam-recorder/jam-recorder.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, JamRecorderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'spotify-jam-saver';
  isAuthenticated = false;

  constructor(private spotifyService: SpotifyService) {}

  ngOnInit() {
    if (this.spotifyService.handleAuthCallback()) {
      this.isAuthenticated = true;
    } else {
      this.isAuthenticated = this.spotifyService.isAuthenticated();
    }
  }

  login() {
    this.spotifyService.authorize();
  }

  logout() {
    this.spotifyService.logout();
    this.isAuthenticated = false;
  }
}
