import { IDataObject } from 'n8n-workflow';

/**
 * Creates a mock IExecuteFunctions context for testing n8n nodes.
 * Tracks all HTTP requests made during execution for assertion.
 */
export function createMockExecuteFunctions(opts: {
	nodeParameters?: Record<string, unknown>;
	inputData?: IDataObject[];
	binaryData?: Record<string, { id?: string; data: string; mimeType: string; fileName: string }>;
	httpResponse?: unknown;
	continueOnFail?: boolean;
}) {
	const requests: { credentialType: string; options: IDataObject }[] = [];

	const context = {
		getInputData: () =>
			(opts.inputData ?? [{}]).map((json) => ({
				json,
				binary: opts.binaryData ?? {},
			})),

		getNodeParameter: (name: string, _itemIndex: number) => {
			const params = opts.nodeParameters ?? {};
			if (name in params) return params[name];
			throw new Error(`Parameter "${name}" not configured in test`);
		},

		getNode: () => ({ name: 'Graphor' }),

		continueOnFail: () => opts.continueOnFail ?? false,

		helpers: {
			httpRequestWithAuthentication: {
				call: async (_thisArg: unknown, credentialType: string, options: IDataObject) => {
					requests.push({ credentialType, options });
					return opts.httpResponse ?? {};
				},
			},
			constructExecutionMetaData: (data: IDataObject[], meta: IDataObject) => {
				return data.map((d) => ({ ...d, pairedItem: meta }));
			},
			returnJsonArray: (data: IDataObject | IDataObject[]) => {
				if (Array.isArray(data)) return data.map((d) => ({ json: d }));
				return [{ json: data }];
			},
			assertBinaryData: (itemIndex: number, propertyName: string) => {
				const items = (opts.inputData ?? [{}]).map((json) => ({
					json,
					binary: opts.binaryData ?? {},
				}));
				const binary = items[itemIndex]?.binary?.[propertyName];
				if (!binary) throw new Error(`No binary data found for "${propertyName}"`);
				return binary;
			},
			binaryToBuffer: async (stream: unknown) => Buffer.from('test'),
			getBinaryStream: async (id: string) => 'stream',
		},

		getRequests: () => requests,
	};

	return context;
}
