import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const THEME = '#1C1C1C';

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
  },
  plugins: [
    react(),
    VitePWA({
      // « prompt » : la nouvelle version s'installe en arrière-plan puis ATTEND que le livreur
      // touche « Mettre à jour » (bannière PwaUpdateBanner, masquée pendant une course active).
      // Jamais de rechargement surprise ni d'échange de version en pleine course.
      registerType: 'prompt',
      // L'enregistrement est fait par l'app (virtual:pwa-register dans src/lib/pwa.ts).
      injectRegister: false,
      manifest: {
        id: '/',
        name: 'MENUPRO Livraison',
        short_name: 'MENUPRO Livreur',
        description: 'Application livreur MENUPRO : recevez des courses, livrez et suivez vos gains.',
        lang: 'fr',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait',
        background_color: THEME,
        theme_color: THEME,
        categories: ['business', 'food', 'navigation'],
        prefer_related_applications: false,
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name: 'Courses disponibles',
            short_name: 'Courses',
            description: 'Voir les courses à accepter près de vous',
            url: '/?open=deliveries',
            icons: [{ src: '/icons/shortcut-96.png', sizes: '96x96', type: 'image/png' }],
          },
          {
            name: 'Course en cours',
            short_name: 'En cours',
            description: 'Reprendre la course active',
            url: '/?open=active-delivery',
            icons: [{ src: '/icons/shortcut-96.png', sizes: '96x96', type: 'image/png' }],
          },
          {
            name: 'Mes gains',
            short_name: 'Gains',
            description: 'Solde, historique et retraits',
            url: '/?open=earnings',
            icons: [{ src: '/icons/shortcut-96.png', sizes: '96x96', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        // Le service worker principal détient l'abonnement push : il doit charger Firebase
        // pour afficher les notifications quand l'application est fermée.
        importScripts: ['/firebase-messaging-sw.js'],
        globPatterns: ['**/*.{js,css,html,png,jpg,svg,woff2,mp3}'],
        // logo.png (1,1 Mo) n'est plus utilisé par l'interface : inutile de le télécharger à l'installation.
        globIgnores: ['logo.png'],
        cleanupOutdatedCaches: true,
        // Navigation hors ligne : l'app (index.html précaché) s'ouvre toujours, elle gère elle-même
        // l'état « hors ligne ». Jamais pour l'API ni pour les fichiers du service worker.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/sw\.js$/, /^\/firebase-messaging-sw\.js$/, /^\/workbox-/],
        runtimeCaching: [
          // API : seule /config (clé Pusher) est mise en cache. Tout le reste de l'API part au réseau.
          {
            urlPattern: /^https:\/\/www\.menupro\.ci\/api\/v1\/config$/,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-config', networkTimeoutSeconds: 5, expiration: { maxEntries: 1, maxAgeSeconds: 3600 } },
          },
          // Tuiles de carte : réseau faible → on réaffiche les quartiers déjà vus.
          // Les tuiles sont chargées en CORS (crossOrigin dans DeliveryMap) : seules les réponses 200
          // lisibles sont gardées (une réponse opaque compte ~7 Mo dans le quota de stockage).
          {
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 7, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [200] },
            },
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
