import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    manifest: {
      name: 'Clinic Starter',
      short_name: 'Clinic Starter',
      description: 'Gynecology & Obstetrics Clinic System',
      theme_color: '#0f766e',
      background_color: '#f5f7fb',
      display: 'standalone',
      start_url: '/',
      scope: '/',
      lang: 'ar',
      dir: 'rtl',

      icons: [
        {
          src: '/noun_Pregnancy_7525741_@700.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/noun_Pregnancy_7525741_@700.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ]
    }
  }), cloudflare()]
})