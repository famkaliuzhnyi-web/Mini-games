import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Code quality improvements
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true 
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off', // Keep flexible for React components
      
      // Consistency rules
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',
      
      // Code organization - disabled for now to avoid massive changes
      // 'sort-imports': ['error', {
      //   ignoreCase: true,
      //   ignoreDeclarationSort: true, // Keep import order flexible for grouped imports
      //   ignoreMemberSort: false,
      //   memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single']
      // }],
      
      // React specific improvements
      'react-hooks/exhaustive-deps': 'warn', // Don't be too strict, allow intentional omissions
    },
  },
])
