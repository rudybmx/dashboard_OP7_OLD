import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'logo_op7_azul.svg'],
          manifest: {
            name: 'OP7 Performance',
            short_name: 'OP7',
            description: 'Plataforma de gestão de performance.',
            theme_color: '#4F46E5',
            background_color: '#F8FAFC',
            display: 'standalone',
            scope: '/',
            start_url: '/',
            lang: 'pt-BR',
            icons: [
              {
                src: 'https://docs.qozt.com.br/logo/op7/logo_azul_recorte.svg',
                sizes: 'any',
                type: 'image/svg+xml',
                purpose: 'any maskable'
              }
            ]
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff,woff2}'],
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              },
              {
                urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'gstatic-fonts-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              },
              {
                urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'supabase-api-cache',
                  expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 60 * 5 // 5 minutes
                  },
                  networkTimeoutSeconds: 10
                }
              }
            ]
          },
          devOptions: {
            enabled: true,
            type: 'module'
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          "@": path.resolve(process.cwd()).replace(/\\/g, '/'),
        },
      },
      build: {
        target: 'esnext',
        minify: 'terser',
        cssMinify: true,
        rollupOptions: {
          output: {
            manualChunks: {
              // Vendor chunks
              'vendor-react': ['react', 'react-dom'],
              'vendor-ui': ['@radix-ui/react-avatar', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select', '@radix-ui/react-separator', '@radix-ui/react-slot', 'framer-motion', 'lucide-react'],
              'vendor-data': ['@tanstack/react-query', '@tanstack/react-table'],
              'vendor-charts': ['recharts'],
              'vendor-supabase': ['@supabase/supabase-js'],
              'vendor-utils': ['date-fns', 'date-fns-tz', 'papaparse'],
            },
            // Optimize chunk size
            chunkFileNames: 'assets/[name]-[hash].js',
            entryFileNames: 'assets/[name]-[hash].js',
            assetFileNames: (assetInfo) => {
              const info = assetInfo.name || '';
              if (/\.css$/.test(info)) {
                return 'assets/[name]-[hash][extname]';
              }
              if (/\.png|\.jpg|\.jpeg|\.svg|\.gif|\.webp$/.test(info)) {
                return 'assets/images/[name]-[hash][extname]';
              }
              return 'assets/[name]-[hash][extname]';
            },
          },
        },
        // Reduce chunk size warning limit (default is 500)
        chunkSizeWarningLimit: 1000,
        // Source maps for production debugging
        sourcemap: mode !== 'production',
      },
      // Optimize deps for faster dev startup
      optimizeDeps: {
        include: [
          'react',
          'react-dom',
          '@supabase/supabase-js',
          '@tanstack/react-query',
          'date-fns',
          'recharts',
        ],
        exclude: [],
      },
    };
});
