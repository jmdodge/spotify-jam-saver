import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpotifyService } from '../spotify.service';
import QRCode from 'qrcode';

@Component({
  selector: 'app-jam-recorder',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './jam-recorder.component.html',
  styleUrl: './jam-recorder.component.scss'
})
export class JamRecorderComponent implements OnInit, OnDestroy {
  isRecording = false;
  playlistName = '';
  playlistUrl = '';
  playlistQrCodeUrl = '';
  currentPlaylistId: string | null = null;
  currentlyPlaying: SpotifyApi.TrackObjectFull | null = null;
  addedSongs: { id: string; name: string; added: boolean }[] = [];

  private playbackInterval: any;

  constructor(private spotifyService: SpotifyService) {}

  get currentTrackArtists(): string {
    if (this.currentlyPlaying && this.currentlyPlaying.artists && this.currentlyPlaying.artists.length > 0) {
      return this.currentlyPlaying.artists.map(a => a.name).join(', ');
    }
    return '';
  }

  ngOnInit(): void {}

  async startRecording() {
    this.isRecording = true;
    const date = new Date();
    const formattedDate = `${('0' + (date.getMonth() + 1)).slice(-2)}-${('0' + date.getDate()).slice(-2)}-${date.getFullYear()}`;
    this.playlistName = `Jam [${formattedDate}]`;

    try {
      const playlist = await this.spotifyService.createPlaylist(this.playlistName);
      if (playlist) {
        this.currentPlaylistId = playlist.id;
        this.playlistUrl = playlist.external_urls.spotify;
        this.playlistQrCodeUrl = await QRCode.toDataURL(this.playlistUrl);
        this.monitorPlayback();
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      this.isRecording = false;
    }
  }

  stopRecording() {
    this.isRecording = false;
    if (this.playbackInterval) {
      clearInterval(this.playbackInterval);
    }
  }

  monitorPlayback() {
    this.playbackInterval = setInterval(async () => {
      if (!this.isRecording || !this.currentPlaylistId) return;

      try {
        const playbackState = await this.spotifyService.getPlaybackState();
        if (playbackState && playbackState.item && playbackState.is_playing) {
          const track = playbackState.item as SpotifyApi.TrackObjectFull;
          if (track.id !== this.currentlyPlaying?.id && !this.addedSongs.find(s => s.id === track.id)) {
            this.currentlyPlaying = track;
            this.addSongToPlaylist(track);
          }
        }
      } catch (error) {
        console.error('Error monitoring playback:', error);
        if ((error as any)?.status === 401) {
            this.stopRecording();
            this.spotifyService.authorize();
        }
      }
    }, 5000);
  }

  async addSongToPlaylist(track: SpotifyApi.TrackObjectFull) {
    if (!this.currentPlaylistId) return;

    const songEntry = { id: track.id, name: track.name, added: false };
    this.addedSongs.push(songEntry);

    try {
      await this.spotifyService.addTrackToPlaylist(this.currentPlaylistId, track.uri);
      const addedSong = this.addedSongs.find(s => s.id === track.id);
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
