import { Graphor } from '../nodes/Graphor/Graphor.node';
import { createMockExecuteFunctions } from './helpers';

describe('Graphor Node', () => {
	let node: Graphor;

	beforeEach(() => {
		node = new Graphor();
	});

	describe('description', () => {
		it('should have correct basic properties', () => {
			expect(node.description.name).toBe('graphor');
			expect(node.description.displayName).toBe('Graphor');
			expect(node.description.credentials).toEqual([{ name: 'graphorApi', required: true }]);
		});

		it('should define three resources', () => {
			const resourceProp = node.description.properties.find((p) => p.name === 'resource');
			expect(resourceProp).toBeDefined();
			const values = (resourceProp!.options as { value: string }[]).map((o) => o.value);
			expect(values).toEqual(['chat', 'extraction', 'source']);
		});

		it('should have file_ids fields for chat', () => {
			const chatAdditional = node.description.properties.find(
				(p) => p.name === 'additionalFields' && p.displayOptions?.show?.resource?.[0] === 'chat',
			);
			const options = chatAdditional!.options as { name: string }[];
			const names = options.map((o) => o.name);
			expect(names).toContain('fileIds');
			expect(names).toContain('fileNames');
		});

		it('should have file_ids field for extraction', () => {
			const fileIdsProp = node.description.properties.find(
				(p) =>
					p.name === 'fileIds' && p.displayOptions?.show?.resource?.[0] === 'extraction',
			);
			expect(fileIdsProp).toBeDefined();
		});

		it('should not have flow resource', () => {
			const resourceProp = node.description.properties.find((p) => p.name === 'resource');
			const values = (resourceProp!.options as { value: string }[]).map((o) => o.value);
			expect(values).not.toContain('flow');
		});

		it('should not have youtube upload operation', () => {
			const sourceOps = node.description.properties.find(
				(p) => p.name === 'operation' && p.displayOptions?.show?.resource?.[0] === 'source',
			);
			const values = (sourceOps!.options as { value: string }[]).map((o) => o.value);
			expect(values).not.toContain('uploadYoutube');
		});
	});

	describe('Chat - Ask Question', () => {
		it('should send question to /ask-sources', async () => {
			const mockCtx = createMockExecuteFunctions({
				nodeParameters: {
					resource: 'chat',
					operation: 'askQuestion',
					question: 'What is in the document?',
					additionalFields: {},
				},
				httpResponse: { answer: 'The document contains...', conversation_id: 'abc123' },
			});

			const result = await node.execute.call(mockCtx as any);
			const requests = mockCtx.getRequests();

			expect(requests).toHaveLength(1);
			expect(requests[0].credentialType).toBe('graphorApi');
			expect(requests[0].options.method).toBe('POST');
			expect(requests[0].options.url).toBe('https://sources.graphorlm.com/ask-sources');
			expect((requests[0].options.body as any).question).toBe('What is in the document?');
		});

		it('should always send thinking_level when provided', async () => {
			const mockCtx = createMockExecuteFunctions({
				nodeParameters: {
					resource: 'chat',
					operation: 'askQuestion',
					question: 'test',
					additionalFields: { thinkingLevel: 'balanced' },
				},
			});

			await node.execute.call(mockCtx as any);
			const body = mockCtx.getRequests()[0].options.body as any;
			expect(body.thinking_level).toBe('balanced');
		});

		it('should send thinking_level=fast when selected', async () => {
			const mockCtx = createMockExecuteFunctions({
				nodeParameters: {
					resource: 'chat',
					operation: 'askQuestion',
					question: 'test',
					additionalFields: { thinkingLevel: 'fast' },
				},
			});

			await node.execute.call(mockCtx as any);
			const body = mockCtx.getRequests()[0].options.body as any;
			expect(body.thinking_level).toBe('fast');
		});

		it('should send thinking_level=accurate when selected', async () => {
			const mockCtx = createMockExecuteFunctions({
				nodeParameters: {
					resource: 'chat',
					operation: 'askQuestion',
					question: 'test',
					additionalFields: { thinkingLevel: 'accurate' },
				},
			});

			await node.execute.call(mockCtx as any);
			const body = mockCtx.getRequests()[0].options.body as any;
			expect(body.thinking_level).toBe('accurate');
		});

		it('should send file_ids when provided', async () => {
			const mockCtx = createMockExecuteFunctions({
				nodeParameters: {
					resource: 'chat',
					operation: 'askQuestion',
					question: 'test',
					additionalFields: { fileIds: 'id1, id2, id3' },
				},
			});

			await node.execute.call(mockCtx as any);
			const body = mockCtx.getRequests()[0].options.body as any;
			expect(body.file_ids).toEqual(['id1', 'id2', 'id3']);
		});

		it('should send file_names when provided (deprecated)', async () => {
			const mockCtx = createMockExecuteFunctions({
				nodeParameters: {
					resource: 'chat',
					operation: 'askQuestion',
					question: 'test',
					additionalFields: { fileNames: 'doc1.pdf, doc2.pdf' },
				},
			});

			await node.execute.call(mockCtx as any);
			const body = mockCtx.getRequests()[0].options.body as any;
			expect(body.file_names).toEqual(['doc1.pdf', 'doc2.pdf']);
		});

		it('should send both file_ids and file_names when both provided', async () => {
			const mockCtx = createMockExecuteFunctions({
				nodeParameters: {
					resource: 'chat',
					operation: 'askQuestion',
					question: 'test',
					additionalFields: { fileIds: 'id1', fileNames: 'doc.pdf' },
				},
			});

			await node.execute.call(mockCtx as any);
			const body = mockCtx.getRequests()[0].options.body as any;
			expect(body.file_ids).toEqual(['id1']);
			expect(body.file_names).toEqual(['doc.pdf']);
		});

		it('should send conversation_id and reset when provided', async () => {
			const mockCtx = createMockExecuteFunctions({
				nodeParameters: {
					resource: 'chat',
					operation: 'askQuestion',
					question: 'follow up',
					additionalFields: { conversationId: 'conv-123', reset: true },
				},
			});

			await node.execute.call(mockCtx as any);
			const body = mockCtx.getRequests()[0].options.body as any;
			expect(body.conversation_id).toBe('conv-123');
			expect(body.reset).toBe(true);
		});

		it('should parse and send output_schema when provided', async () => {
			const schema = { type: 'object', properties: { name: { type: 'string' } } };
			const mockCtx = createMockExecuteFunctions({
				nodeParameters: {
					resource: 'chat',
					operation: 'askQuestion',
					question: 'test',
					additionalFields: { outputSchema: JSON.stringify(schema) },
				},
			});

			await node.execute.call(mockCtx as any);
			const body = mockCtx.getRequests()[0].options.body as any;
			expect(body.output_schema).toEqual(schema);
		});

		it('should not send optional fields when empty', async () => {
			const mockCtx = createMockExecuteFunctions({
				nodeParameters: {
					resource: 'chat',
					operation: 'askQuestion',
					question: 'test',
					additionalFields: {},
				},
			});

			await node.execute.call(mockCtx as any);
			const body = mockCtx.getRequests()[0].options.body as any;
			expect(body).toEqual({ question: 'test' });
		});
	});

	describe('Extraction - Extract Data', () => {
		it('should send extraction request to /run-extraction', async () => {
			const schema = { type: 'object', properties: { name: { type: 'string' } } };
			const mockCtx = createMockExecuteFunctions({
				nodeParameters: {
					resource: 'extraction',
					operation: 'extractData',
					fileIds: 'file-1, file-2',
					fileNames: '',
					userInstruction: 'Extract names',
					outputSchema: JSON.stringify(schema),
					thinkingLevel: 'accurate',
				},
				httpResponse: { structured_output: { name: 'John' } },
			});

			await node.execute.call(mockCtx as any);
			const requests = mockCtx.getRequests();

			expect(requests).toHaveLength(1);
			expect(requests[0].options.method).toBe('POST');
			expect(requests[0].options.url).toBe('https://sources.graphorlm.com/run-extraction');

			const body = requests[0].options.body as any;
			expect(body.file_ids).toEqual(['file-1', 'file-2']);
			expect(body.file_names).toBeUndefined();
			expect(body.user_instruction).toBe('Extract names');
			expect(body.output_schema).toEqual(schema);
			expect(body.thinking_level).toBe('accurate');
		});

		it('should send file_names when provided (deprecated path)', async () => {
			const schema = { type: 'object', properties: {} };
			const mockCtx = createMockExecuteFunctions({
				nodeParameters: {
					resource: 'extraction',
					operation: 'extractData',
					fileIds: '',
					fileNames: 'report.pdf',
					userInstruction: 'Extract',
					outputSchema: JSON.stringify(schema),
					thinkingLevel: 'balanced',
				},
			});

			await node.execute.call(mockCtx as any);
			const body = mockCtx.getRequests()[0].options.body as any;
			expect(body.file_names).toEqual(['report.pdf']);
			expect(body.file_ids).toBeUndefined();
		});

		it('should always send thinking_level', async () => {
			const schema = { type: 'object', properties: {} };
			const mockCtx = createMockExecuteFunctions({
				nodeParameters: {
					resource: 'extraction',
					operation: 'extractData',
					fileIds: 'f1',
					fileNames: '',
					userInstruction: 'Extract',
					outputSchema: JSON.stringify(schema),
					thinkingLevel: 'balanced',
				},
			});

			await node.execute.call(mockCtx as any);
			const body = mockCtx.getRequests()[0].options.body as any;
			expect(body.thinking_level).toBe('balanced');
		});
	});

	describe('Source - List', () => {
		it('should GET sources list', async () => {
			const mockCtx = createMockExecuteFunctions({
				nodeParameters: {
					resource: 'source',
					operation: 'list',
				},
			});

			await node.execute.call(mockCtx as any);
			const req = mockCtx.getRequests()[0];
			expect(req.options.method).toBe('GET');
			expect(req.options.url).toBe('https://sources.graphorlm.com');
		});
	});

	describe('Source - Upload URL', () => {
		it('should POST url to /upload-url-source', async () => {
			const mockCtx = createMockExecuteFunctions({
				nodeParameters: {
					resource: 'source',
					operation: 'uploadUrl',
					url: 'https://example.com/page',
				},
			});

			await node.execute.call(mockCtx as any);
			const req = mockCtx.getRequests()[0];
			expect(req.options.url).toBe('https://sources.graphorlm.com/upload-url-source');
			expect((req.options.body as any).url).toBe('https://example.com/page');
		});
	});

	describe('Source - Upload GitHub', () => {
		it('should POST github url to /upload-github-source', async () => {
			const mockCtx = createMockExecuteFunctions({
				nodeParameters: {
					resource: 'source',
					operation: 'uploadGithub',
					githubUrl: 'https://github.com/user/repo',
				},
			});

			await node.execute.call(mockCtx as any);
			const req = mockCtx.getRequests()[0];
			expect(req.options.url).toBe('https://sources.graphorlm.com/upload-github-source');
			expect((req.options.body as any).url).toBe('https://github.com/user/repo');
		});
	});

	describe('Source - Process', () => {
		it('should POST process with partition method', async () => {
			const mockCtx = createMockExecuteFunctions({
				nodeParameters: {
					resource: 'source',
					operation: 'process',
					fileName: 'report.pdf',
					partitionMethod: 'hi_res',
				},
			});

			await node.execute.call(mockCtx as any);
			const req = mockCtx.getRequests()[0];
			expect(req.options.url).toBe('https://sources.graphorlm.com/process');
			const body = req.options.body as any;
			expect(body.file_name).toBe('report.pdf');
			expect(body.partition_method).toBe('hi_res');
		});
	});

	describe('Source - Get Elements', () => {
		it('should POST to /elements', async () => {
			const mockCtx = createMockExecuteFunctions({
				nodeParameters: {
					resource: 'source',
					operation: 'getElements',
					fileName: 'report.pdf',
				},
			});

			await node.execute.call(mockCtx as any);
			const req = mockCtx.getRequests()[0];
			expect(req.options.url).toBe('https://sources.graphorlm.com/elements');
			expect((req.options.body as any).file_name).toBe('report.pdf');
		});
	});

	describe('Source - Delete', () => {
		it('should DELETE source', async () => {
			const mockCtx = createMockExecuteFunctions({
				nodeParameters: {
					resource: 'source',
					operation: 'delete',
					fileName: 'old-file.pdf',
				},
			});

			await node.execute.call(mockCtx as any);
			const req = mockCtx.getRequests()[0];
			expect(req.options.method).toBe('DELETE');
			expect(req.options.url).toBe('https://sources.graphorlm.com/delete');
			expect((req.options.body as any).file_name).toBe('old-file.pdf');
		});
	});

	describe('Error handling', () => {
		it('should throw NodeOperationError on failure', async () => {
			const mockCtx = createMockExecuteFunctions({
				nodeParameters: {
					resource: 'chat',
					operation: 'askQuestion',
					question: 'test',
					additionalFields: { outputSchema: 'invalid json{' },
				},
			});

			await expect(node.execute.call(mockCtx as any)).rejects.toThrow();
		});

		it('should continue on fail when enabled', async () => {
			const mockCtx = createMockExecuteFunctions({
				nodeParameters: {
					resource: 'chat',
					operation: 'askQuestion',
					question: 'test',
					additionalFields: { outputSchema: 'invalid json{' },
				},
				continueOnFail: true,
			});

			const result = await node.execute.call(mockCtx as any);
			expect(result[0][0].json.error).toBeDefined();
		});
	});

	describe('Multiple items', () => {
		it('should process multiple input items', async () => {
			const mockCtx = createMockExecuteFunctions({
				nodeParameters: {
					resource: 'chat',
					operation: 'askQuestion',
					question: 'test',
					additionalFields: {},
				},
				inputData: [{}, {}],
				httpResponse: { answer: 'response' },
			});

			const result = await node.execute.call(mockCtx as any);
			expect(result[0]).toHaveLength(2);
			expect(mockCtx.getRequests()).toHaveLength(2);
		});
	});
});
