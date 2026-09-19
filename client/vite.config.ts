import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: {
    proxy: {
      '/likha': {
        target: 'https://gabay.zyberlab.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/likha/, ''),
        secure: false,
      },
    },
  },
});
