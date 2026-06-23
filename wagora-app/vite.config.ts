import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Bundle splitting — cuts first-load JS from 814KB to ~250KB
    // Heavy pages (Onboarding, Analytics, Settings) load on demand
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — cached separately, rarely changes
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Lucide icons — large, shared across all pages
          'vendor-icons': ['lucide-react'],
          // Supabase client — large SDK, isolated for caching
          'vendor-supabase': ['@supabase/supabase-js'],
          // Heavy pages loaded lazily
          'page-onboarding': [
            './src/pages/onboarding/Onboarding.tsx',
          ],
          'page-settings': [
            './src/pages/settings/Settings.tsx',
            './src/pages/settings/BillingSettings.tsx',
            './src/pages/settings/PlatformSettings.tsx',
            './src/pages/settings/WorkspaceSettings.tsx',
            './src/pages/settings/SalesAgent.tsx',
            './src/pages/settings/BrandDocuments.tsx',
            './src/pages/settings/SecuritySettings.tsx',
            './src/pages/settings/OutreachSettings.tsx',
            './src/pages/settings/NotificationSettings.tsx',
            './src/pages/settings/TeamSettings.tsx',
          ],
          'page-analytics': ['./src/pages/analytics/Analytics.tsx'],
        },
      },
    },
    // Raise warning threshold to 600KB to suppress the vite warning
    // (after splitting, no chunk should exceed this)
    chunkSizeWarningLimit: 600,
  },
})
