import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png'],
      manifest: {
        name: 'MENUPRO Livraison',
        short_name: 'MENUPRO',
        description: 'Application livreur MENUPRO — gerez vos courses et vos gains',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1C1C1C',
        orientation: 'portrait',
        icons: [
          { src: '/logo.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/www\.menupro\.ci\/api\/v1\/config$/,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-config', expiration: { maxEntries: 1, maxAgeSeconds: 3600 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-files', expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://menupro.test',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
