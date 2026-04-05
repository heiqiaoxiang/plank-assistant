import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 23366,
    host: '0.0.0.0',
    hmr: {
      host: '192.168.0.111',
      port: 23366
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
});
