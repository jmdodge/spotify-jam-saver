import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { SpotifyModule } from './spotify/spotify.module';

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(SpotifyModule),
    provideRouter(routes)
  ]
};
