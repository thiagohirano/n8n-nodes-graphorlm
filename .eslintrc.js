module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	plugins: ['n8n-nodes-base'],
	extends: ['plugin:n8n-nodes-base/community'],
	ignorePatterns: ['node_modules/', 'dist/'],
	rules: {
		'n8n-nodes-base/node-param-description-miscased-id': 'off',
	},
};
