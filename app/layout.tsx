import type {Metadata} from 'next';
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
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="font-sans bg-slate-50 text-slate-900 antialiased min-h-screen selection:bg-teal-500 selection:text-white" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
