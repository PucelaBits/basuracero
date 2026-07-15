const js = require('@eslint/js');
const globals = require('globals');
const vue = require('eslint-plugin-vue');
const vueParser = require('vue-eslint-parser');

module.exports = [
  {
    ignores: ['dist/**', 'node_modules/**', 'public/**', 'uploads/**', 'data/**']
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node
      }
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }]
    }
  },
  {
    files: ['src/client/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser
      }
    }
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.jest
      }
    }
  },
  {
    files: ['src/client/**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      },
      globals: {
        ...globals.browser
      }
    },
    plugins: {
      vue
    },
    rules: {
      'no-dupe-keys': 'error',
      'no-unreachable': 'error',
      'vue/no-dupe-keys': 'error',
      'vue/no-parsing-error': 'error',
      'vue/valid-v-for': 'error',
      'vue/valid-v-if': 'error'
    }
  }
];
