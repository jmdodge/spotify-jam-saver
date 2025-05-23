import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-playlist-choice',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-spotify-black rounded-lg p-6 w-full max-w-md">
        <h2 class="text-2xl font-bold text-white mb-6 text-center">
          How would you like to record your jam?
        </h2>

        <div class="space-y-4">
          <div class="space-y-2">
            <label
              for="playlistName"
              class="block text-white text-sm font-medium"
            >
              Playlist Name
            </label>
            <input
              type="text"
              id="playlistName"
              [(ngModel)]="playlistName"
              class="w-full bg-spotify-gray text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-spotify-green"
              placeholder="Enter playlist name"
            />
          </div>

          <button
            (click)="createNew.emit(playlistName)"
            [disabled]="!playlistName.trim()"
            class="w-full bg-spotify-green text-white font-bold py-4 px-6 rounded-md hover:bg-opacity-80 transition-colors focus:outline-none focus:ring-2 focus:ring-spotify-green focus:ring-opacity-50 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create New Playlist
          </button>

          <button
            (click)="chooseExisting.emit()"
            class="w-full bg-spotify-gray text-white font-bold py-4 px-6 rounded-md hover:bg-opacity-80 transition-colors focus:outline-none focus:ring-2 focus:ring-spotify-green focus:ring-opacity-50 flex items-center justify-center gap-3 cursor-pointer"
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16m-7 6h7"
              />
            </svg>
            Choose Existing Playlist
          </button>
        </div>

        <button
          (click)="cancel.emit()"
          class="w-full mt-6 text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          Cancel
        </button>
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
export class PlaylistChoiceComponent implements OnInit {
  @Output() createNew = new EventEmitter<string>();
  @Output() chooseExisting = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  playlistName = '';

  ngOnInit() {
    const date = new Date();
    const formattedDate = `${('0' + (date.getMonth() + 1)).slice(-2)}-${('0' + date.getDate()).slice(-2)}-${date.getFullYear()}`;
    this.playlistName = `Jam [${formattedDate}]`;
  }
}
