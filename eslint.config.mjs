import plugin from '@stylistic/eslint-plugin'
import { importX } from 'eslint-plugin-import-x'
import tseslint from 'typescript-eslint'

export default [
  ...tseslint.configs.recommended,
  plugin.configs['recommended'],
  {
    plugins: {
      'import-x': importX,
    },
    rules: {
      '@stylistic/brace-style': ['error', '1tbs'], // 'else' keyword on the same line as closing brace
      '@stylistic/comma-dangle': 'off', // there are cases when trailing comma desired, and sometimes not
      '@stylistic/list-style': 'off', // several short items per line are fine, no line break after each one
      '@typescript-eslint/no-unused-vars': ['error', { // unused var starting from _ is ok
        argsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_'
      }],

      '@stylistic/max-len': ['error', { // strings, template literals, URLs and regexes can't be split
        code: 120, ignoreStrings: true, ignoreTemplateLiterals: true, ignoreUrls: true, ignoreRegExpLiterals: true
      }],
      'preserve-caught-error': 'error', // error thrown in catch keeps the caught one as `cause`

      // Enforce Alphabetical Import Order and Merge Duplicate Imports
      'import-x/order': ['error', {
        alphabetize: { order: 'asc', caseInsensitive: true }
      }],
      'import-x/no-duplicates': 'error',
    }
  }
]
