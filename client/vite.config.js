import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-icon.svg'],
      manifest: {
        name: 'AUTO-QUAL AI',
        short_name: 'AUTO-QUAL',
        description: 'Automotive quality inspection intelligence platform',
        theme_color: '#0b1117',
        background_color: '#0b1117',
        display: 'standalone',
        orientation: 'landscape-primary',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/pwa-icon.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/pwa-icon.svg', sizes: '512x512', type: 'image/svg+xml' },
          { src: '/pwa-icon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
    }),
  ],
})
