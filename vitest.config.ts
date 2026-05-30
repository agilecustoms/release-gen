import { coverageConfigDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    testTimeout: 120_000, // 2 min
    hookTimeout: 120_000, // beforeAll, afterAll, beforeEach, afterEach
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
        lines: 86,
        branches: 90,
      }
    }
  }
})
