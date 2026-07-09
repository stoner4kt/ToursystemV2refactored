import type {Metadata, Viewport} from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // Global styles

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'INYATHI Fleet Management Portal',
  description: 'INYATHI Fleet Management - Reconciliations, Fleet, and Booking System',
  manifest: '/assets/favicons/manifest.json',
  icons: {
    icon: [
      { url: '/assets/favicons/favicon.ico', sizes: 'any' },
      { url: '/assets/favicons/icon0.svg', type: 'image/svg+xml' },
      { url: '/assets/favicons/icon1.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: [
      { url: '/assets/favicons/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/assets/favicons/favicon.ico',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'INYATHI',
    startupImage: '/assets/823.png',
  },
  applicationName: 'INYATHI',
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#0d9488',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <head>
        {/* PWA / Home Screen Icons */}
        <link rel="icon" href="/assets/favicons/favicon.ico" sizes="any" />
        <link rel="icon" href="/assets/favicons/icon0.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/assets/favicons/apple-icon.png" />
        <link rel="manifest" href="/assets/favicons/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="INYATHI" />
        <meta name="application-name" content="INYATHI" />
        <meta name="msapplication-TileColor" content="#0a1424" />
        <meta name="msapplication-TileImage" content="/assets/favicons/icon1.png" />
      </head>
      <body className="font-sans bg-slate-50 text-slate-900 antialiased min-h-screen selection:bg-teal-500 selection:text-white" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
