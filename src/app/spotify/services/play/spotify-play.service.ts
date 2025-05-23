import { Injectable } from '@angular/core';
import { SpotifyAuthService } from '../auth/spotify-auth.service';
import { SpotifyUserService } from '../user/spotify-user.service';
import { BaseSpotifyService } from '../base/base-spotify.service';

@Injectable({
  providedIn: 'root',
})
export class SpotifyPlayService extends BaseSpotifyService {
  constructor(
    authService: SpotifyAuthService,
    private userService: SpotifyUserService,
  ) {
    super(authService);
  }

  async createPlaylist(
    name: string,
  ): Promise<SpotifyApi.CreatePlaylistResponse | null> {
    if (!this.requireAuth()) {
      return null;
    }

    return this.handleApiCall(async () => {
      const user = await this.userService.getCurrentUser();
      if (!user) {
        throw new Error('Could not get current user');
      }

      const date = new Date();
      const formattedDate = `${('0' + (date.getMonth() + 1)).slice(-2)}-${('0' + date.getDate()).slice(-2)}-${date.getFullYear()}`;
      const description = `Created by Spotify Jam Saver on ${formattedDate}`;

      return await this.spotifyApi.createPlaylist(user.id, {
        name,
        description,
        public: true,
      });
    });
  }

  async addTrackToPlaylist(
    playlistId: string,
    trackUri: string,
  ): Promise<SpotifyApi.AddTracksToPlaylistResponse | null> {
    if (!this.requireAuth()) {
      return null;
    }

    return this.handleApiCall(() =>
      this.spotifyApi.addTracksToPlaylist(playlistId, [trackUri]),
    );
  }

  async getPlaybackState(): Promise<SpotifyApi.CurrentPlaybackResponse | null> {
    if (!this.requireAuth()) {
      return null;
    }

    return this.handleApiCall(() =>
      this.spotifyApi.getMyCurrentPlaybackState(),
    );
  }

  async getCurrentTrack(): Promise<SpotifyApi.TrackObjectFull | null> {
    const playbackState = await this.getPlaybackState();
    if (playbackState?.item && playbackState.is_playing) {
      return playbackState.item as SpotifyApi.TrackObjectFull;
    }
    return null;
  }

  async getCurrentTrackArtists(): Promise<string> {
    const track = await this.getCurrentTrack();
    if (track?.artists && track.artists.length > 0) {
      return track.artists.map((a) => a.name).join(', ');
    }
    return '';
  }

  async getPlaylist(
    playlistId: string,
  ): Promise<SpotifyApi.SinglePlaylistResponse | null> {
    if (!this.requireAuth()) {
      return null;
    }

    return this.handleApiCall(() => this.spotifyApi.getPlaylist(playlistId));
  }

  async getPlaylistTracks(
    playlistId: string,
  ): Promise<SpotifyApi.PlaylistTrackObject[] | null> {
    if (!this.requireAuth()) {
      return null;
    }

    return this.handleApiCall(async () => {
      const response = await this.spotifyApi.getPlaylistTracks(playlistId);
      return response.items;
    });
  }

  async getUserPlaylists(): Promise<SpotifyApi.PlaylistObjectSimplified[]> {
    try {
      const response = await this.spotifyApi.getUserPlaylists();
      return response.items;
    } catch (error) {
      console.error('Error fetching user playlists:', error);
      throw error;
    }
  }
}
