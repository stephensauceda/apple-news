import js from '@eslint/js'
import globals from 'globals'

export default [
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node
      }
    },
    rules: {
      'comma-dangle': ['error', 'never'],
      semi: ['error', 'never'],
      'no-console': ['warn', { allow: ['warn', 'error'] }]
    }
  },
  {
    ignores: ['dist/**', 'coverage/**']
  },
  {
    files: ['local/scripts/**/*.mjs'],
    rules: {
      'no-console': 'off'
    }
  }
]
