import { GraphorTool } from '../nodes/Graphor/GraphorTool.node';
import { NodeConnectionTypes } from 'n8n-workflow';

describe('GraphorTool Node', () => {
	let node: GraphorTool;

	beforeEach(() => {
		node = new GraphorTool();
	});

	describe('description', () => {
		it('should have correct basic properties', () => {
			expect(node.description.name).toBe('graphorTool');
			expect(node.description.displayName).toBe('Graphor Tool');
		});

		it('should be an AI tool node (not a regular node)', () => {
			expect(node.description.inputs).toEqual([]);
			expect(node.description.outputs).toEqual([NodeConnectionTypes.AiTool]);
			expect(node.description.outputNames).toEqual(['Tool']);
			expect((node.description as any).usableAsTool).toBeUndefined();
		});

		it('should have AI codex category', () => {
			expect(node.description.codex).toEqual({
				categories: ['AI'],
				subcategories: {
					AI: ['Tools'],
				},
			});
		});

		it('should have toolDescription property', () => {
			const toolDescProp = node.description.properties.find((p) => p.name === 'toolDescription');
			expect(toolDescProp).toBeDefined();
			expect(toolDescProp!.type).toBe('string');
			expect(toolDescProp!.default).toBeTruthy();
		});

		it('should have query property', () => {
			const queryProp = node.description.properties.find((p) => p.name === 'query');
			expect(queryProp).toBeDefined();
			expect(queryProp!.type).toBe('string');
			expect(queryProp!.default).toBe('');
		});

		it('should have fileIds, fileNames, conversationId, reset, and thinkingLevel options', () => {
			const optionsProp = node.description.properties.find((p) => p.name === 'options');
			const options = optionsProp!.options as { name: string }[];
			const names = options.map((o) => o.name);
			expect(names).toContain('fileIds');
			expect(names).toContain('fileNames');
			expect(names).toContain('conversationId');
			expect(names).toContain('reset');
			expect(names).toContain('thinkingLevel');
		});
	});

	describe('execute', () => {
		it('should return empty array (tool nodes do not produce main output)', async () => {
			const mockCtx = {} as any;
			const result = await node.execute.call(mockCtx);
			expect(result).toEqual([[]]);
		});
	});

	describe('supplyData', () => {
		it('should implement supplyData method', () => {
			expect(typeof node.supplyData).toBe('function');
		});

		function createMockCtx(params: Record<string, unknown>, onRequest?: (options: any) => any) {
			const requests: { credentialType: string; options: any }[] = [];
			return {
				requests,
				ctx: {
					getNodeParameter: (name: string) => params[name],
					helpers: {
						httpRequestWithAuthentication: {
							call: async (_self: unknown, credentialType: string, options: any) => {
								requests.push({ credentialType, options });
								if (onRequest) return onRequest(options);
								return { answer: 'The document says...', conversation_id: 'c1' };
							},
						},
					},
				},
			};
		}

		it('should return a DynamicTool that calls /ask-sources', async () => {
			const { ctx, requests } = createMockCtx({
				toolDescription: 'Ask about documents',
				query: '',
				options: { thinkingLevel: 'balanced' },
			});

			const result = await node.supplyData!.call(ctx as any, 0);
			expect(result.response).toBeDefined();

			const tool = result.response as any;
			expect(tool.name).toBe('graphor_ask');
			expect(tool.description).toBe('Ask about documents');

			const output = await tool.func('What is in the document?');

			expect(requests).toHaveLength(1);
			expect(requests[0].credentialType).toBe('graphorApi');
			expect(requests[0].options.method).toBe('POST');
			expect(requests[0].options.url).toBe('https://sources.graphorlm.com/ask-sources');

			const body = requests[0].options.body;
			expect(body.question).toBe('What is in the document?');
			expect(body.thinking_level).toBe('balanced');

			expect(output).toBe('The document says...');
		});

		it('should use query parameter when set (overrides agent input)', async () => {
			const { ctx, requests } = createMockCtx({
				toolDescription: 'test',
				query: 'Fixed query from parameter',
				options: {},
			});

			const result = await node.supplyData!.call(ctx as any, 0);
			await (result.response as any).func('agent input ignored');

			expect(requests[0].options.body.question).toBe('Fixed query from parameter');
		});

		it('should parse JSON agent input to extract question', async () => {
			const { ctx, requests } = createMockCtx({
				toolDescription: 'test',
				query: '',
				options: {},
			});

			const result = await node.supplyData!.call(ctx as any, 0);
			await (result.response as any).func('{"input":"Max Ducha","id":"6166n906"}');

			expect(requests[0].options.body.question).toBe('Max Ducha');
		});

		it('should handle JSON with "query" key', async () => {
			const { ctx, requests } = createMockCtx({
				toolDescription: 'test',
				query: '',
				options: {},
			});

			const result = await node.supplyData!.call(ctx as any, 0);
			await (result.response as any).func('{"query":"search term"}');

			expect(requests[0].options.body.question).toBe('search term');
		});

		it('should handle JSON with "question" key', async () => {
			const { ctx, requests } = createMockCtx({
				toolDescription: 'test',
				query: '',
				options: {},
			});

			const result = await node.supplyData!.call(ctx as any, 0);
			await (result.response as any).func('{"question":"my question"}');

			expect(requests[0].options.body.question).toBe('my question');
		});

		it('should extract the question from a JSON array payload', async () => {
			const { ctx, requests } = createMockCtx({
				toolDescription: 'test',
				query: '',
				options: {},
			});

			const result = await node.supplyData!.call(ctx as any, 0);
			await (result.response as any).func('[{"input":"Buscar Max Lucha 220"}]');

			expect(requests[0].options.body.question).toBe('Buscar Max Lucha 220');
		});

		it('should extract the question from a direct array payload', async () => {
			const { ctx, requests } = createMockCtx({
				toolDescription: 'test',
				query: '',
				options: {},
			});

			const result = await node.supplyData!.call(ctx as any, 0);
			await (result.response as any).func([{ input: "Buscar por 'Max Luxa 220' e 'Maza Prime'" }]);

			expect(requests[0].options.body.question).toBe("Buscar por 'Max Luxa 220' e 'Maza Prime'");
		});

		it('should extract the question from nested payload fields', async () => {
			const { ctx, requests } = createMockCtx({
				toolDescription: 'test',
				query: '',
				options: {},
			});

			const result = await node.supplyData!.call(ctx as any, 0);
			await (result.response as any).func('{"arguments":{"question":"nested question"}}');

			expect(requests[0].options.body.question).toBe('nested question');
		});

		it('should extract the question from a direct object payload', async () => {
			const { ctx, requests } = createMockCtx({
				toolDescription: 'test',
				query: '',
				options: {},
			});

			const result = await node.supplyData!.call(ctx as any, 0);
			await (result.response as any).func({ input: 'Max Ducha', id: '6166n906' });

			expect(requests[0].options.body.question).toBe('Max Ducha');
		});

		it('should use raw string when agent sends plain text', async () => {
			const { ctx, requests } = createMockCtx({
				toolDescription: 'test',
				query: '',
				options: {},
			});

			const result = await node.supplyData!.call(ctx as any, 0);
			await (result.response as any).func('plain text question');

			expect(requests[0].options.body.question).toBe('plain text question');
		});

		it('should send file_ids when configured', async () => {
			const { ctx, requests } = createMockCtx({
				toolDescription: 'test',
				query: '',
				options: { fileIds: 'id-1, id-2' },
			});

			const result = await node.supplyData!.call(ctx as any, 0);
			await (result.response as any).func('test question');

			expect(requests[0].options.body.file_ids).toEqual(['id-1', 'id-2']);
		});

		it('should drop empty values when parsing comma-separated file IDs', async () => {
			const { ctx, requests } = createMockCtx({
				toolDescription: 'test',
				query: '',
				options: { fileIds: 'id-1, , id-2,   ' },
			});

			const result = await node.supplyData!.call(ctx as any, 0);
			await (result.response as any).func('test question');

			expect(requests[0].options.body.file_ids).toEqual(['id-1', 'id-2']);
		});

		it('should send conversation_id when configured', async () => {
			const { ctx, requests } = createMockCtx({
				toolDescription: 'test',
				query: '',
				options: { conversationId: 'conv-abc' },
			});

			const result = await node.supplyData!.call(ctx as any, 0);
			await (result.response as any).func('test');

			expect(requests[0].options.body.conversation_id).toBe('conv-abc');
		});

		it('should send reset when enabled', async () => {
			const { ctx, requests } = createMockCtx({
				toolDescription: 'test',
				query: '',
				options: { reset: true },
			});

			const result = await node.supplyData!.call(ctx as any, 0);
			await (result.response as any).func('test');

			expect(requests[0].options.body.reset).toBe(true);
		});

		it('should not include empty optional fields', async () => {
			const { ctx, requests } = createMockCtx({
				toolDescription: 'test',
				query: '',
				options: {},
			});

			const result = await node.supplyData!.call(ctx as any, 0);
			await (result.response as any).func('just a question');

			expect(requests[0].options.body).toEqual({ question: 'just a question' });
		});

		it('should return structured output when the API provides it', async () => {
			const { ctx } = createMockCtx(
				{
					toolDescription: 'test',
					query: '',
					options: {},
				},
				() => ({
					answer: 'Structured output generated.',
					structured_output: {
						product: 'Max Lucha 220',
						brand: 'Maza Prime',
					},
				}),
			);

			const result = await node.supplyData!.call(ctx as any, 0);
			const output = await (result.response as any).func('test');

			expect(output).toBe(JSON.stringify({ product: 'Max Lucha 220', brand: 'Maza Prime' }));
		});

		it('should throw on HTTP failure so the agent can see the error', async () => {
			const { ctx } = createMockCtx(
				{
					toolDescription: 'test',
					query: '',
					options: {},
				},
				() => {
					throw new Error('Connection refused');
				},
			);

			const result = await node.supplyData!.call(ctx as any, 0);
			await expect((result.response as any).func('test')).rejects.toThrow(
				'Graphor tool failed: Connection refused',
			);
		});

		it('should throw when it cannot extract a question from parsed JSON input', async () => {
			const { ctx } = createMockCtx({
				toolDescription: 'test',
				query: '',
				options: {},
			});

			const result = await node.supplyData!.call(ctx as any, 0);
			await expect((result.response as any).func('[{"id":"6166n906"}]')).rejects.toThrow(
				'Graphor tool failed: Could not extract a question from the tool input payload',
			);
		});
	});
});
