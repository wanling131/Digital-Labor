const react = require('eslint-plugin-react');

module.exports = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'dist/**'
    ],
    languageOptions: {
      ecmaVersion: 12,
      sourceType: 'module',
      globals: {
        browser: true,
        node: true
      }
    },
    plugins: {
      react
    },
    settings: {
      react: {
        version: 'detect'
      }
    },
    rules: {
      indent: ['error', 2],
      'linebreak-style': ['error', 'windows'],
      quotes: ['error', 'single'],
      semi: ['error', 'always'],
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off'
    }
  }
];