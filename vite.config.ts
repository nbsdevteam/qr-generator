import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  worker: { format: 'es' },
  build: {
    // The barcode encoder (bwip-js) is ~1 MB; it is already split out and only loads
    // when the Barcode page is first opened.
    chunkSizeWarningLimit: 1200,
  },
});