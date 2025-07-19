import tseslint from 'typescript-eslint'
import plugin from '@stylistic/eslint-plugin'
import importPlugin from 'eslint-plugin-import';

export default [
    ...tseslint.configs.recommended,
    plugin.configs['recommended'],
    {
        plugins: {
            import: importPlugin,
        },
        rules: {
            '@stylistic/brace-style': ['error', '1tbs'], // 'else' keyword on the same line as closing brace
            '@stylistic/comma-dangle': 'off', // there are cases when trailing comma desired, and sometimes not
            '@typescript-eslint/no-unused-vars': ['error', { // unused var starting from _ is ok
                'argsIgnorePattern': '^_',
                'destructuredArrayIgnorePattern': '^_'
            }],

            // Enforce Alphabetical Import Order and Merge Duplicate Imports
            'import/order': ['error', {
                'alphabetize': {'order': 'asc', 'caseInsensitive': true}
            }],
            'import/no-duplicates': 'error',
        }
    }
];
