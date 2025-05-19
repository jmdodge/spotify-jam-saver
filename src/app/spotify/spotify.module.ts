import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpotifyConfigService } from './config/spotify-config.service';
import { SpotifyAuthService } from './services/auth/spotify-auth.service';
import { TokenManagerService } from './services/auth/token-manager.service';
import { PkceService } from './services/auth/pkce.service';
import { SpotifyUserService } from './services/user/spotify-user.service';
import { SpotifyPlayService } from './services/play/spotify-play.service';

@NgModule({
  imports: [CommonModule],
  providers: [
    SpotifyConfigService,
    SpotifyAuthService,
    TokenManagerService,
    PkceService,
    SpotifyUserService,
    SpotifyPlayService
  ]
})
export class SpotifyModule { }
