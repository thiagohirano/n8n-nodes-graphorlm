import { GraphorTool } from '../nodes/Graphor/GraphorTool.node';
import { createMockExecuteFunctions } from './helpers';

describe('GraphorTool Node', () => {
	let node: GraphorTool;

	beforeEach(() => {
		node = new GraphorTool();
	});

	describe('description', () => {
		it('should have correct basic properties', () => {
			expect(node.description.name).toBe('graphorTool');
			expect(node.description.displayName).toBe('Graphor Tool');
			expect(node.description.usableAsTool).toBe(true);
		});

		it('should have fileIds option', () => {
			const optionsProp = node.description.properties.find((p) => p.name === 'options');
			const options = optionsProp!.options as { name: string }[];
			const names = options.map((o) => o.name);
			expect(names).toContain('fileIds');
			expect(names).toContain('fileNames');
		});
	});

	describe('execute', () => {
		it('should send question to /ask-sources', async () => {
			const mockCtx = createMockExecuteFunctions({
				nodeParameters: {
					question: 'What does the document say?',
					options: {},
				},
				httpResponse: { answer: 'It says...' },
			});

			const result = await node.execute.call(mockCtx as any);
			const req = mockCtx.getRequests()[0];

			expect(req.options.method).toBe('POST');
			expect(req.options.url).toBe('https://sources.graphorlm.com/ask-sources');
			expect((req.options.body as any).question).toBe('What does the document say?');
			expect(result[0]).toHaveLength(1);
		});

		it('should always send thinking_level when provided', async () => {
			const mockCtx = createMockExecuteFunctions({
				nodeParameters: {
					question: 'test',
					options: { thinkingLevel: 'balanced' },
				},
			});

			await node.execute.call(mockCtx as any);
			const body = mockCtx.getRequests()[0].options.body as any;
			expect(body.thinking_level).toBe('balanced');
		});

		it('should send file_ids when provided', async () => {
			const mockCtx = createMockExecuteFunctions({
				nodeParameters: {
					question: 'test',
					options: { fileIds: 'id-1, id-2' },
				},
			});

			await node.execute.call(mockCtx as any);
			const body = mockCtx.getRequests()[0].options.body as any;
			expect(body.file_ids).toEqual(['id-1', 'id-2']);
		});

		it('should send file_names when provided (deprecated)', async () => {
			const mockCtx = createMockExecuteFunctions({
				nodeParameters: {
					question: 'test',
					options: { fileNames: 'doc.pdf' },
				},
			});

			await node.execute.call(mockCtx as any);
			const body = mockCtx.getRequests()[0].options.body as any;
			expect(body.file_names).toEqual(['doc.pdf']);
		});

		it('should send conversation_id when provided', async () => {
			const mockCtx = createMockExecuteFunctions({
				nodeParameters: {
					question: 'follow up',
					options: { conversationId: 'conv-abc' },
				},
			});

			await node.execute.call(mockCtx as any);
			const body = mockCtx.getRequests()[0].options.body as any;
			expect(body.conversation_id).toBe('conv-abc');
		});

		it('should not send optional fields when empty', async () => {
			const mockCtx = createMockExecuteFunctions({
				nodeParameters: {
					question: 'test',
					options: {},
				},
			});

			await node.execute.call(mockCtx as any);
			const body = mockCtx.getRequests()[0].options.body as any;
			expect(body).toEqual({ question: 'test' });
		});

		it('should handle errors with continueOnFail', async () => {
			const mockCtx = createMockExecuteFunctions({
				nodeParameters: {
					question: 'test',
					options: {},
				},
				continueOnFail: true,
			});

			// Override httpRequest to throw
			mockCtx.helpers.httpRequestWithAuthentication.call = async () => {
				throw new Error('API error');
			};

			const result = await node.execute.call(mockCtx as any);
			expect(result[0][0].json.error).toBe('API error');
		});
	});
});
