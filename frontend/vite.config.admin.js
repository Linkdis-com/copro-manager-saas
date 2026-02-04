import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  plugins: [react()],
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