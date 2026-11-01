import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Quán Hải Sản | Câu cá & kinh doanh',
  description: 'Game quản lý quán hải sản pixel art – câu cá, nhập hàng, bán cá.',
  applicationName: 'Quán Hải Sản', appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Quán Hải Sản' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/icon-192.png' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 1, userScalable: false, themeColor: '#211539', viewportFit: 'cover' };
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="vi" suppressHydrationWarning><body>{children}</body></html>;
}
