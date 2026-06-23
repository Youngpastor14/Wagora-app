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
    // Bundle splitting — cuts initial load from 814KB to ~250KB
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — cached aggressively by browsers
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Supabase SDK
          'vendor-supabase': ['@supabase/supabase-js'],
          // Icon library (large — split out so it's cached independently)
          'vendor-icons': ['lucide-react'],
          // Auth pages — only loaded on /auth/*
          'chunk-auth': [
            './src/pages/auth/SignIn.tsx',
            './src/pages/auth/SignUp.tsx',
            './src/pages/auth/AuthCallback.tsx',
            './src/pages/auth/ForgotPassword.tsx',
            './src/pages/auth/VerifyEmail.tsx',
            './src/pages/auth/ResetPassword.tsx',
          ],
          // Onboarding — only loaded once per user lifetime
          'chunk-onboarding': ['./src/pages/onboarding/Onboarding.tsx'],
          // Settings — loaded on demand
          'chunk-settings': [
            './src/pages/settings/Settings.tsx',
            './src/pages/settings/BillingSettings.tsx',
            './src/pages/settings/PlatformSettings.tsx',
            './src/pages/settings/SalesAgent.tsx',
            './src/pages/settings/WorkspaceSettings.tsx',
            './src/pages/settings/BrandDocuments.tsx',
            './src/pages/settings/SecuritySettings.tsx',
            './src/pages/settings/NotificationSettings.tsx',
            './src/pages/settings/OutreachSettings.tsx',
            './src/pages/settings/TeamSettings.tsx',
          ],
        },
      },
    },
    // Raise warning threshold slightly — we're actively splitting
    chunkSizeWarningLimit: 600,
  },
})
