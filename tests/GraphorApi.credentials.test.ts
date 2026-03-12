import { GraphorApi } from '../credentials/GraphorApi.credentials';

describe('GraphorApi Credentials', () => {
	let credentials: GraphorApi;

	beforeEach(() => {
		credentials = new GraphorApi();
	});

	it('should have correct name', () => {
		expect(credentials.name).toBe('graphorApi');
		expect(credentials.displayName).toBe('Graphor API');
	});

	it('should use Bearer token authentication', () => {
		expect(credentials.authenticate).toEqual({
			type: 'generic',
			properties: {
				headers: {
					Authorization: '=Bearer {{$credentials.apiToken}}',
				},
			},
		});
	});

	it('should test against sources endpoint', () => {
		expect(credentials.test).toEqual({
			request: {
				baseURL: 'https://sources.graphorlm.com',
				url: '/',
				method: 'GET',
			},
		});
	});

	it('should have apiToken as password field', () => {
		const tokenProp = credentials.properties.find((p) => p.name === 'apiToken');
		expect(tokenProp).toBeDefined();
		expect(tokenProp!.type).toBe('string');
		expect(tokenProp!.typeOptions?.password).toBe(true);
		expect(tokenProp!.required).toBe(true);
	});
});
