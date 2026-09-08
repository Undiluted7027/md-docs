import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { createWebConfigEnv } from './env.config.ts';

export default defineConfig(({ mode }) => {
  const loadedEnv = loadEnv(mode, import.meta.dirname, 'SERVER_');
  const env = createWebConfigEnv({
    SERVER_PORT: process.env.SERVER_PORT ?? loadedEnv.SERVER_PORT,
  });

  return {
    plugins: [react()],
    server: {
      host: 'localhost',
      port: 5173,
      strictPort: true,
      proxy: {
        '/collaboration': {
          target: `http://127.0.0.1:${String(env.SERVER_PORT)}`,
          ws: true,
        },
      },
    },
  };
});
