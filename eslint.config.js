import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
  {
    // React Three Fiber components imperatively mutate three.js objects
    // (camera, raycaster, materials) inside effects and frame callbacks —
    // that is the idiomatic R3F escape hatch, not a React anti-pattern.
    files: ['src/three/**'],
    rules: {
      'react-hooks/immutability': 'off',
    },
  },
)
