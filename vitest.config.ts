import { coverageConfigDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    testTimeout: process.env.CI ? 120000 : 0, // 0 locally (no timeout)
    coverage: {
      exclude: [
        'src/service/GitClient.ts',
        'src/index.ts',
        'src/local.ts',
        'src/model.ts',
        ...coverageConfigDefaults.exclude
      ],
      reporter: ['text'], // other: 'html', 'clover', 'json'
      thresholds: {
        lines: 85,
        branches: 90,
      }
    }
  }
})
