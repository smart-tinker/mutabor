/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // ### ИЗМЕНЕНИЕ: Явно указываем Vite использовать порт 3000 ###
    // Это нужно, чтобы он соответствовал настройке "ports" в docker-compose.dev.yml ("8080:3000")
    port: 3000,
    watch: {
      // Эта настройка остается - она важна для стабильности в monorepo
      ignored: [
        path.resolve(__dirname, '../api/dist/**'),
      ],
    },
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