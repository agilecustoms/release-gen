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
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['test/service/**/*.test.ts'],
        }
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['test/integration/**/*.test.ts'],
          globalSetup: ['test/integration/globalSetup.ts'],
        }
      }
    ]
  }
})
