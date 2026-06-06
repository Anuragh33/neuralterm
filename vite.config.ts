import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          terminal: [
            'xterm',
            'xterm-addon-fit',
            'xterm-addon-search',
            'xterm-addon-serialize',
            'xterm-addon-web-links',
          ],
          markdown: ['react-markdown', 'rehype-highlight'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 1421,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
});
