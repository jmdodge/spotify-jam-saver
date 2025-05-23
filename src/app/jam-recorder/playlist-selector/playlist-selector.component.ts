import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SpotifyPlayService } from '../../spotify/services/play/spotify-play.service';

@Component({
  selector: 'app-playlist-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div
        class="bg-spotify-black rounded-lg p-6 w-full max-w-2xl max-h-[80vh] flex flex-col"
      >
        <h2 class="text-2xl font-bold text-white mb-4">Select a Playlist</h2>

        <!-- Search Box -->
        <div class="relative mb-4">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (ngModelChange)="filterPlaylists()"
            placeholder="Search playlists..."
            class="w-full bg-spotify-gray text-white px-4 py-2 pl-10 rounded-md focus:outline-none focus:ring-2 focus:ring-spotify-green"
          />
          <svg
            class="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <!-- Playlist List -->
        <div class="overflow-y-auto flex-grow">
          <div *ngIf="loading" class="text-center py-4">
            <div
              class="animate-spin rounded-full h-8 w-8 border-b-2 border-spotify-green mx-auto"
            ></div>
          </div>

          <div
            *ngIf="!loading && filteredPlaylists.length === 0"
            class="text-center py-4 text-gray-400"
          >
            No playlists found
          </div>

          <ul class="space-y-2">
            <li
              *ngFor="let playlist of filteredPlaylists"
              (click)="selectPlaylist(playlist)"
              class="flex items-center gap-3 p-3 bg-spotify-gray rounded-md cursor-pointer hover:bg-spotify-gray/80 transition-colors"
            >
              <img
                *ngIf="playlist.images?.[0]?.url"
                [src]="playlist.images[0].url"
                [alt]="playlist.name"
                class="w-16 h-16 rounded-md"
              />
              <div
                *ngIf="!playlist.images?.[0]?.url"
                class="w-16 h-16 rounded-md bg-spotify-gray flex items-center justify-center"
              >
                <svg
                  class="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                  />
                </svg>
              </div>
              <div class="flex-grow">
                <div class="text-white font-medium">{{ playlist.name }}</div>
                <div class="text-gray-400 text-sm">
                  {{ playlist.owner.display_name }} •
                  {{ playlist.tracks.total }} tracks
                </div>
              </div>
            </li>
          </ul>
        </div>

        <!-- Action Buttons -->
        <div
          class="flex justify-end gap-3 mt-4 pt-4 border-t border-spotify-gray"
        >
          <button
            (click)="cancel.emit()"
            class="px-4 py-2 text-white hover:bg-spotify-gray rounded-md transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class PlaylistSelectorComponent implements OnInit {
  @Output() select = new EventEmitter<SpotifyApi.PlaylistObjectSimplified>();
  @Output() cancel = new EventEmitter<void>();
  @Output() createNew = new EventEmitter<void>();

  playlists: SpotifyApi.PlaylistObjectSimplified[] = [];
  filteredPlaylists: SpotifyApi.PlaylistObjectSimplified[] = [];
  searchQuery = '';
  loading = true;

  constructor(private playService: SpotifyPlayService) {}

  ngOnInit() {
    this.loadPlaylists();
  }

  async loadPlaylists() {
    try {
      this.loading = true;
      this.playlists = await this.playService.getUserPlaylists();
      this.filteredPlaylists = [...this.playlists];
    } catch (error) {
      console.error('Error loading playlists:', error);
    } finally {
      this.loading = false;
    }
  }

  filterPlaylists() {
    if (!this.searchQuery.trim()) {
      this.filteredPlaylists = [...this.playlists];
      return;
    }

    const query = this.searchQuery.toLowerCase();
    this.filteredPlaylists = this.playlists.filter(
      (playlist) =>
        playlist.name.toLowerCase().includes(query) ||
        (playlist.owner.display_name?.toLowerCase() ?? '').includes(query),
    );
  }

  selectPlaylist(playlist: SpotifyApi.PlaylistObjectSimplified) {
    this.select.emit(playlist);
  }
}
