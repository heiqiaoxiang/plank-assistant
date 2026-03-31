import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 23366,
    host: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
});
