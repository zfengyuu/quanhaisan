import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/', name: 'Quán Hải Sản – Câu Cá & Kinh Doanh', short_name: 'Quán Hải Sản',
    description: 'Câu cá, nhập hải sản, bán hàng và phát triển quán ven biển.',
    start_url: '/', scope: '/', display: 'standalone', orientation: 'portrait',
    background_color: '#211539', theme_color: '#211539', lang: 'vi',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  };
}
