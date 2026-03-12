import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Update 'base' to match your GitHub repo name if deploying to GitHub Pages
// e.g. if your repo is github.com/yourname/prepacivique → base: '/prepacivique/'
// For a custom domain or root deployment → base: '/'

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    // Split the large questions file into its own chunk
    rollupOptions: {
      output: {
        manualChunks: {
          questions: ['./src/data/questions.js'],
        },
      },
    },
  },
});
