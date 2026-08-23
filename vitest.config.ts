import { defineConfig } from 'vitest/config'
import { mergeConfig } from 'vite'
import viteConfig from './vite.config'

export default defineConfig(
  mergeConfig(
    viteConfig,
    {
      test: {
        globals: true,
        environment: 'jsdom',
        include: ['src/**/*.test.{ts,tsx}'],
        // Run unit tests in writable mode so they exercise real behavior
        // rather than the demo's read-only guards.
        env: { DEMO_MODE: 'false' },
      },
    },
  ),
)
