/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    watch: {
      ignored: [
        path.resolve(__dirname, '../api/dist/**'),
      ],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      all: true,
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx', 
        'src/vite-env.d.ts', 
        'src/setupTests.ts',
        '**/*.d.ts',
        '**/*.spec.{ts,tsx}',
        '**/*.test.{ts,tsx}',
        'src/app/styles',
        'src/shared/lib/socket.ts'
      ],
    },
  },
})