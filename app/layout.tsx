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
import {getMetadataBaseUrl} from '@/lib/site';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const siteTitle = 'ELEKTRA ETX | Future of Performance';
const siteDescription =
  'Experience the pure power and aerodynamic efficiency of the ELEKTRA ETX.';

export const metadata: Metadata = {
  metadataBase: getMetadataBaseUrl(),
  title: siteTitle,
  description: siteDescription,
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    type: 'website',
  },
  twitter: {card: 'summary_large_image', title: siteTitle, description: siteDescription},
  robots: {index: true, follow: true},
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable} overflow-x-clip`} suppressHydrationWarning>
      <head>
        <link
          rel="preload"
          href={ETX_EXTERIOR_GLB}
          as="fetch"
          type="model/gltf+json"
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
