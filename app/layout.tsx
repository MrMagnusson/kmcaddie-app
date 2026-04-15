import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KM Caddie',
  description: "Karl's personal golf caddie — powered by Claude",
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'KM Caddie',
  },
};

export const viewport: Viewport = {
  themeColor: '#121412',
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-surface text-on-surface font-body overflow-hidden h-screen">
        {children}
      </body>
    </html>
  );
}
