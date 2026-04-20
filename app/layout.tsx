import type {Metadata} from 'next';
import {Inter} from 'next/font/google';
import {Analytics} from '@vercel/analytics/next';
import {SpeedInsights} from '@vercel/speed-insights/next';
import './globals.css';
import {Providers} from './providers';
import {Navbar} from '@/components/Navbar';
import Footer from '@/components/Footer';
import {PageTransition} from '@/components/PageTransition';
import {ETX_EXTERIOR_GLB} from '@/lib/site-assets';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'ELEKTRA ETX | Future of Performance',
  description: 'Experience the pure power and aerodynamic efficiency of the ELEKTRA ETX.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable} overflow-x-clip`}>
      <head>
        <link
          rel="preload"
          href={ETX_EXTERIOR_GLB}
          as="fetch"
          type="model/gltf-binary"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-w-0 overflow-x-clip" suppressHydrationWarning>
        <Providers>
          <Navbar />
          <PageTransition>{children}</PageTransition>
          <Footer />
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
