import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { createWebConfigEnv } from './env.config.ts';

export default defineConfig(({ mode }) => {
  const loadedEnv = loadEnv(mode, import.meta.dirname, 'SERVER_');
  const env = createWebConfigEnv({
    SERVER_PORT: process.env.SERVER_PORT ?? loadedEnv.SERVER_PORT,
  });
  const serverTarget = `http://127.0.0.1:${String(env.SERVER_PORT)}`;

  return {
    plugins: [react()],
    build: {
      // The editor stack (react-markdown, remark/rehype) is one ~800 KB chunk.
      // It is dynamically imported and never loads on the landing hero or first
      // paint, so the default 500 KB warning is noise here. KaTeX, Mermaid, and
      // Shiki load separately, on demand.
      chunkSizeWarningLimit: 1000,
    },
    server: {
      host: 'localhost',
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: serverTarget,
        },
        '/collaboration': {
          target: serverTarget,
          ws: true,
        },
      },
    },
  };
});
