import {coverageConfigDefaults, defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: process.env.CI ? undefined : 0, // 0 locally, default on CI
    coverage: {
      exclude: [
        'src/index.ts',
        'src/local.ts',
        'src/model.ts',
        ...coverageConfigDefaults.exclude
      ],
      reporter: ['text'], // other: 'html', 'clover', 'json'
      thresholds: {
        lines: 35,
        branches: 82,
      }
    }
  }
})
