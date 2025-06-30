/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    css: true,
    // ### ИЗМЕНЕНИЕ: Добавляем конфигурацию для сбора покрытия ###
    coverage: {
      provider: 'v8', // или 'istanbul'
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      all: true, // Включить в отчет все файлы, а не только затронутые тестами
    },
  },
})