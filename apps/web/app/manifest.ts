import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Round Rewards',
    short_name: 'Rounds',
    description: 'Manage your loyalty program and reward your customers',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#F5F5F7',
    theme_color: '#E60128',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
