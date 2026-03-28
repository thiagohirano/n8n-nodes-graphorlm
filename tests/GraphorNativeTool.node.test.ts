import { GraphorNativeTool } from '../nodes/Graphor/GraphorNativeTool.node';

describe('GraphorNativeTool Node', () => {
	let node: GraphorNativeTool;

	beforeEach(() => {
		node = new GraphorNativeTool();
	});

	describe('description', () => {
		it('should expose a native tool-capable node', () => {
			expect(node.description.name).toBe('graphorNativeTool');
			expect(node.description.displayName).toBe('Graphor Tool (Native)');
			expect(node.description.inputs).toEqual(['main']);
			expect(node.description.outputs).toEqual(['main']);
			expect((node.description as any).usableAsTool).toBe(true);
		});

		it('should define the question field and tool options', () => {
			const questionProp = node.description.properties.find((p) => p.name === 'question');
			expect(questionProp).toBeDefined();
			expect(questionProp!.type).toBe('string');
			expect(questionProp!.required).toBe(true);

			const optionsProp = node.description.properties.find((p) => p.name === 'options');
			const optionNames = (optionsProp!.options as { name: string }[]).map((option) => option.name);
			expect(optionNames).toEqual(
				expect.arrayContaining([
					'conversationId',
					'fileIds',
					'fileNames',
					'reset',
					'thinkingLevel',
				]),
			);
		});
	});

	describe('execute', () => {
		function createMockCtx(params: Record<string, unknown>, onRequest?: (options: any) => any) {
			const requests: { credentialType: string; options: any }[] = [];

			return {
				requests,
				ctx: {
					getInputData: () => [{ json: {} }],
					getNodeParameter: (name: string) => params[name],
					continueOnFail: () => false,
					getNode: () => ({ name: 'Ask Graphor (Native)' }),
					helpers: {
						httpRequestWithAuthentication: {
							call: async (_self: unknown, credentialType: string, options: any) => {
								requests.push({ credentialType, options });
								if (onRequest) return onRequest(options);
								return { answer: 'The document says...', conversation_id: 'c1' };
							},
						},
						returnJsonArray: (data: any) => [data],
						constructExecutionMetaData: (items: any[]) => items,
					},
				},
			};
		}

		it('should call ask-sources and return the response', async () => {
			const { ctx, requests } = createMockCtx({
				question: 'What is in the document?',
				options: { thinkingLevel: 'balanced' },
			});

			const result = await node.execute.call(ctx as any);

			expect(requests).toHaveLength(1);
			expect(requests[0].credentialType).toBe('graphorApi');
			expect(requests[0].options.method).toBe('POST');
			expect(requests[0].options.url).toBe('https://sources.graphorlm.com/ask-sources');
			expect(requests[0].options.body).toEqual({
				question: 'What is in the document?',
				thinking_level: 'balanced',
			});
			expect(result).toEqual([[{ answer: 'The document says...', conversation_id: 'c1' }]]);
		});

		it('should map optional request fields', async () => {
			const { ctx, requests } = createMockCtx({
				question: 'Summarize the invoice',
				options: {
					conversationId: 'conv-123',
					fileIds: 'file-1, file-2',
					fileNames: 'invoice.pdf, invoice-2.pdf',
					reset: true,
					thinkingLevel: 'accurate',
				},
			});

			await node.execute.call(ctx as any);

			expect(requests[0].options.body).toEqual({
				question: 'Summarize the invoice',
				conversation_id: 'conv-123',
				file_ids: ['file-1', 'file-2'],
				file_names: ['invoice.pdf', 'invoice-2.pdf'],
				reset: true,
				thinking_level: 'accurate',
			});
		});

		it('should return execution error data when continueOnFail is enabled', async () => {
			const requests: { credentialType: string; options: any }[] = [];
			const ctx = {
				getInputData: () => [{ json: {} }],
				getNodeParameter: (name: string) =>
					({
						question: 'test',
						options: {},
					})[name],
				continueOnFail: () => true,
				getNode: () => ({ name: 'Ask Graphor (Native)' }),
				helpers: {
					httpRequestWithAuthentication: {
						call: async (_self: unknown, credentialType: string, options: any) => {
							requests.push({ credentialType, options });
							throw new Error('Connection refused');
						},
					},
					returnJsonArray: (data: any) => [data],
					constructExecutionMetaData: (items: any[]) => items,
				},
			};

			const result = await node.execute.call(ctx as any);

			expect(result).toEqual([[{ error: 'Connection refused' }]]);
		});
	});
});
