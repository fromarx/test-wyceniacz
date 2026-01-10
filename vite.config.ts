import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  esbuild: {
    // To sprawi, że esbuild obsłuży JSX w plikach .js
    loader: 'jsx',
    include: /src\/.*\.js$/, // dostosuj ścieżkę do swoich plików
  },
  optimizeDeps: {
    esbuildOptions: {
      // To wymusza obsługę JSX w bibliotekach z node_modules
      loader: {
        '.js': 'jsx',
      },
    },
  },
});