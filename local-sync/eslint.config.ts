import js from '@eslint/js';
import neosEslintPlugin from '@neos21/neos-eslint-plugin';
import { defineConfig } from 'eslint/config';
import pluginImportX from 'eslint-plugin-import-x';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** ESLint 設定 */
export default defineConfig([
  // ベースルール
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    plugins: {
      js        : js,
      'import-x': pluginImportX
    },
    extends: ['js/recommended'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'import-x/order': [
        'error',
        {
          groups: [
            ['builtin', 'external'],
            ['internal'],
            ['parent', 'sibling', 'index'],
            ['type']
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true }
        }
      ]
    }
  },
  
  // TypeScript 向けルール
  tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/explicit-function-return-type': ['error', { allowIIFEs: true }]
    }
  },
  
  // プロジェクト固有ルール
  neosEslintPlugin.configs.recommended,
  
  // 検証しない除外ディレクトリ・ファイル
  {
    ignores: [
      'node_modules/**'
    ]
  }
]);
