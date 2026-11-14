import { defineConfig } from 'vitest/config'

// Rule tests only: pure functions from src/data and the screen models that have no React Native in them
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
})
