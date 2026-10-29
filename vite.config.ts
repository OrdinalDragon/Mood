import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      // Sin polyfill inline: permite una CSP estricta sin 'unsafe-inline'.
      modulePreload: {polyfill: false},
    },
    server: {
      // HMR desactivable vía DISABLE_HMR (útil en entornos de edición automática).
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
