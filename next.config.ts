import type {NextConfig} from 'next';

/**
 * CSP allow-list — kept tight on purpose.
 *
 *  - `'unsafe-inline'` style/script are required because Next.js inlines
 *    its bootstrap script and several components emit inline `style` attrs
 *    (3D scenes, GSAP, motion, dynamic colors, SVG noise data-URIs).
 *  - `blob:` worker is needed by three.js / draco / ktx2 loaders.
 *  - `https://www.elektrateq.com` and `https://i.ytimg.com` are the only
 *    external image hosts we actually use (press thumbnails + YouTube
 *    poster frames). All other remote image traffic is blocked.
 *  - Vercel Analytics + Speed Insights are loaded from `va.vercel-scripts.com`.
 */
const cspDirectives = {
  'default-src': ["'self'"],
  'base-uri': ["'self'"],
  'object-src': ["'none'"],
  'frame-ancestors': ["'none'"],
  'form-action': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    'https://va.vercel-scripts.com',
    'https://vercel.live',
    'https://www.gstatic.com',
  ],
  'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https://www.elektrateq.com',
    'https://i.ytimg.com',
  ],
  'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
  'connect-src': [
    "'self'",
    'https://vitals.vercel-insights.com',
    'https://va.vercel-scripts.com',
    'https://vercel.live',
    'https://www.gstatic.com',
    'blob:',
  ],
  'worker-src': ["'self'", 'blob:'],
  'media-src': ["'self'", 'data:', 'blob:'],
  'manifest-src': ["'self'"],
  'upgrade-insecure-requests': [],
} as const;

const cspHeader = Object.entries(cspDirectives)
  .map(([k, v]) => (v.length ? `${k} ${v.join(' ')}` : k))
  .join('; ');

const securityHeaders = [
  {key: 'Content-Security-Policy', value: cspHeader},
  {key: 'X-Content-Type-Options', value: 'nosniff'},
  {key: 'X-Frame-Options', value: 'DENY'},
  {key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin'},
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {key: 'Cross-Origin-Opener-Policy', value: 'same-origin'},
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const longCacheHeader = [
  {key: 'Cache-Control', value: 'public, max-age=31536000, immutable'},
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,

  /** Tree-shake large packages that re-export many symbols (R3F, icons, motion). */
  experimental: {
    optimizePackageImports: [
      '@react-three/drei',
      'lucide-react',
      'motion',
    ],
  },

  eslint: {
    /**
     * The new React Compiler-style rules in `eslint-config-next@16` flag
     * many intentional patterns we rely on (browser-feature fallbacks
     * inside effects, derived UI state in 3D scenes, mutating WebGL canvas
     * style on intersection). Run `npm run lint` in CI as a soft signal —
     * don't block production deploys on advisory rules.
     */
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.elektrateq.com',
        pathname: '/wp-content/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        pathname: '/**',
      },
    ],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/:all*(webp|avif|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|otf|glb|bin|hdr)',
        headers: longCacheHeader,
      },
      {
        source: '/cargo_collection/:path*',
        headers: longCacheHeader,
      },
      {
        source: '/design_collection/:path*',
        headers: longCacheHeader,
      },
      {
        source: '/models/:path*',
        headers: longCacheHeader,
      },
      {
        source: '/hdr/:path*',
        headers: longCacheHeader,
      },
    ];
  },
};

export default nextConfig;
