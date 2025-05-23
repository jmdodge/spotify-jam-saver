import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpotifyPlayService } from '../spotify/services/play/spotify-play.service';
import { PlaylistSelectorComponent } from './playlist-selector/playlist-selector.component';
import { PlaylistChoiceComponent } from './playlist-choice/playlist-choice.component';
import QRCode from 'qrcode';

@Component({
  selector: 'app-jam-recorder',
  standalone: true,
  imports: [CommonModule, PlaylistSelectorComponent, PlaylistChoiceComponent],
  templateUrl: './jam-recorder.component.html',
  styleUrl: './jam-recorder.component.scss',
})
export class JamRecorderComponent implements OnInit, OnDestroy {
  isRecording = false;
  showPlaylistChoice = false;
  showPlaylistSelector = false;
  playlistName = '';
  playlistUrl = '';
  playlistQrCodeUrl = '';
  currentPlaylistId: string | null = null;
  currentlyPlaying: SpotifyApi.TrackObjectFull | null = null;
  addedSongs: { id: string; name: string; added: boolean }[] = [];

  private playbackInterval: any;

  constructor(private playService: SpotifyPlayService) {}

  get currentTrackArtists(): string {
    if (
      this.currentlyPlaying &&
      this.currentlyPlaying.artists &&
      this.currentlyPlaying.artists.length > 0
    ) {
      return this.currentlyPlaying.artists.map((a) => a.name).join(', ');
    }
    return '';
  }

  ngOnInit(): void {}

  showPlaylistSelection() {
    this.showPlaylistChoice = true;
  }

  onChooseExistingPlaylist() {
    this.showPlaylistChoice = false;
    this.showPlaylistSelector = true;
  }

  async onCreateNewPlaylist(playlistName: string) {
    this.showPlaylistChoice = false;
    this.playlistName = playlistName;

    try {
      const playlist = await this.playService.createPlaylist(this.playlistName);
      if (playlist) {
        this.currentPlaylistId = playlist.id;
        this.playlistUrl = playlist.external_urls.spotify;
        this.playlistQrCodeUrl = await QRCode.toDataURL(this.playlistUrl);
        this.startRecording();
      }
    } catch (error) {
      console.error('Error creating playlist:', error);
    }
  }

  onCancelPlaylistSelection() {
    this.showPlaylistChoice = false;
    this.showPlaylistSelector = false;
  }

  async onPlaylistSelected(playlist: SpotifyApi.PlaylistObjectSimplified) {
    this.showPlaylistSelector = false;
    this.currentPlaylistId = playlist.id;
    this.playlistName = playlist.name;
    this.playlistUrl = playlist.external_urls.spotify;
    this.playlistQrCodeUrl = await QRCode.toDataURL(this.playlistUrl);
    this.startRecording();
  }

  startRecording() {
    this.isRecording = true;
    this.monitorPlayback();
  }

  stopRecording() {
    this.isRecording = false;
    if (this.playbackInterval) {
      clearInterval(this.playbackInterval);
    }
  }

  /**
   * Check what's currently playing every 5 seconds, and add the song to our playlist if we haven't already added that
   * song.
   */
  monitorPlayback() {
    this.playbackInterval = setInterval(async () => {
      if (!this.isRecording || !this.currentPlaylistId) return;

      try {
        const track = await this.playService.getCurrentTrack();
        if (
          track &&
          track.id !== this.currentlyPlaying?.id &&
          !this.addedSongs.find((s) => s.id === track.id)
        ) {
          this.currentlyPlaying = track;
          this.addSongToPlaylist(track);
        }
      } catch (error) {
        console.error('Error monitoring playback:', error);
      }
    }, 5000);
  }

  async addSongToPlaylist(track: SpotifyApi.TrackObjectFull) {
    if (!this.currentPlaylistId) return;

    const songEntry = { id: track.id, name: track.name, added: false };
    this.addedSongs.push(songEntry);

    try {
      await this.playService.addTrackToPlaylist(
        this.currentPlaylistId,
        track.uri,
      );
      const addedSong = this.addedSongs.find((s) => s.id === track.id);
      if (addedSong) {
        addedSong.added = true;
      }
    } catch (error) {
      console.error(`Error adding song ${track.name} to playlist:`, error);
    }
  }

  ngOnDestroy(): void {
    this.stopRecording();
  }
}
