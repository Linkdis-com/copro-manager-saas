import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'force-admin-html',
      transformIndexHtml: {
        order: 'pre',
        handler() {
          // Force le chargement de admin-index.html
          return fs.readFileSync(
            path.resolve(__dirname, 'admin-index.html'),
            'utf-8'
          );
        }
      }
    }
  ],
  build: {
    outDir: 'dist-admin',
    rollupOptions: {
      input: './admin-index.html'
    }
  },
  server: {
    port: 5174
  }
});