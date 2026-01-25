import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class GraphorApi implements ICredentialType {
	name = 'graphorApi';
	displayName = 'Graphor API';
	documentationUrl = 'https://docs.graphorlm.com/guides/api-tokens';
	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'Your Graphor API token (starts with grlm_)',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://sources.graphorlm.com',
			url: '/',
			method: 'GET',
		},
	};
}
