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

		it('should have fileIds and fileNames options', () => {
			const optionsProp = node.description.properties.find((p) => p.name === 'options');
			const options = optionsProp!.options as { name: string }[];
			const names = options.map((o) => o.name);
			expect(names).toContain('fileIds');
			expect(names).toContain('fileNames');
			expect(names).toContain('conversationId');
			expect(names).toContain('thinkingLevel');
		});

		it('should not have question as a node property (AI passes it)', () => {
			const questionProp = node.description.properties.find((p) => p.name === 'question');
			expect(questionProp).toBeUndefined();
		});
	});

	describe('supplyData', () => {
		it('should implement supplyData method', () => {
			expect(typeof node.supplyData).toBe('function');
		});

		it('should return a DynamicTool that calls /ask-sources', async () => {
			const requests: { credentialType: string; options: any }[] = [];

			const mockCtx = {
				getNodeParameter: (name: string, _itemIndex: number) => {
					const params: Record<string, unknown> = {
						toolDescription: 'Ask about documents',
						options: { thinkingLevel: 'balanced' },
					};
					return params[name];
				},
				helpers: {
					httpRequestWithAuthentication: {
						call: async (_self: unknown, credentialType: string, options: any) => {
							requests.push({ credentialType, options });
							return { answer: 'The document says...', conversation_id: 'c1' };
						},
					},
				},
			};

			const result = await node.supplyData!.call(mockCtx as any, 0);
			expect(result.response).toBeDefined();

			const tool = result.response as any;
			expect(tool.name).toBe('graphor_ask');
			expect(tool.description).toBe('Ask about documents');

			// Invoke the tool with a question
			const output = await tool.func('What is in the document?');

			expect(requests).toHaveLength(1);
			expect(requests[0].credentialType).toBe('graphorApi');
			expect(requests[0].options.method).toBe('POST');
			expect(requests[0].options.url).toBe('https://sources.graphorlm.com/ask-sources');

			const body = requests[0].options.body;
			expect(body.question).toBe('What is in the document?');
			expect(body.thinking_level).toBe('balanced');

			// Tool should return stringified JSON
			const parsed = JSON.parse(output);
			expect(parsed.answer).toBe('The document says...');
		});

		it('should send file_ids when configured', async () => {
			const requests: any[] = [];

			const mockCtx = {
				getNodeParameter: (name: string) => {
					const params: Record<string, unknown> = {
						toolDescription: 'test',
						options: { fileIds: 'id-1, id-2' },
					};
					return params[name];
				},
				helpers: {
					httpRequestWithAuthentication: {
						call: async (_self: unknown, _cred: string, options: any) => {
							requests.push(options);
							return {};
						},
					},
				},
			};

			const result = await node.supplyData!.call(mockCtx as any, 0);
			await (result.response as any).func('test question');

			const body = requests[0].body;
			expect(body.file_ids).toEqual(['id-1', 'id-2']);
		});

		it('should send conversation_id when configured', async () => {
			const requests: any[] = [];

			const mockCtx = {
				getNodeParameter: (name: string) => {
					const params: Record<string, unknown> = {
						toolDescription: 'test',
						options: { conversationId: 'conv-abc' },
					};
					return params[name];
				},
				helpers: {
					httpRequestWithAuthentication: {
						call: async (_self: unknown, _cred: string, options: any) => {
							requests.push(options);
							return {};
						},
					},
				},
			};

			const result = await node.supplyData!.call(mockCtx as any, 0);
			await (result.response as any).func('test');

			expect(requests[0].body.conversation_id).toBe('conv-abc');
		});

		it('should not include empty optional fields', async () => {
			const requests: any[] = [];

			const mockCtx = {
				getNodeParameter: (name: string) => {
					const params: Record<string, unknown> = {
						toolDescription: 'test',
						options: {},
					};
					return params[name];
				},
				helpers: {
					httpRequestWithAuthentication: {
						call: async (_self: unknown, _cred: string, options: any) => {
							requests.push(options);
							return {};
						},
					},
				},
			};

			const result = await node.supplyData!.call(mockCtx as any, 0);
			await (result.response as any).func('just a question');

			expect(requests[0].body).toEqual({ question: 'just a question' });
		});
	});
});
