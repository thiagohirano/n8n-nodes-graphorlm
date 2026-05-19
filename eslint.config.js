const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');

const compat = new FlatCompat({
	baseDirectory: __dirname,
	recommendedConfig: js.configs.recommended,
	allConfig: js.configs.all,
});

const tsFiles = ['nodes/**/*.ts', 'credentials/**/*.ts'];

module.exports = [
	{
		ignores: ['node_modules/**', 'dist/**'],
	},
	...compat.config({
		parser: '@typescript-eslint/parser',
		plugins: ['n8n-nodes-base'],
		extends: ['plugin:n8n-nodes-base/community'],
		rules: {
			'n8n-nodes-base/node-param-description-miscased-id': 'off',
		},
	}).map((config) => ({ ...config, files: tsFiles })),
];
