/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}", // Configure paths to your Angular templates and ts files
  ],
  theme: {
    extend: {
      colors: {
        'spotify-green': '#1DB954',
        'spotify-black': '#191414',
        'spotify-gray': '#282828',
        'spotify-light-gray': '#B3B3B3',
        'brand-blue': '#0000FF', // Add a very distinct test color
      }
    },
  },
  plugins: [
    require('tailwind-scrollbar'),
  ],
}
