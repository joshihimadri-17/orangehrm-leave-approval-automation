const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['node_modules/**', 'reports/**', 'logs/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs', globals: { ...globals.node, ...globals.browser } },
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: "CallExpression[callee.property.name='waitForTimeout']", message: 'Hard waits are not allowed; wait for a state instead.' },
        { selector: "CallExpression[callee.property.name='only']", message: 'Remove .only before committing.' },
      ],
    },
  },
];
