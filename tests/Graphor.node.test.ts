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
			expect((node.description as any).usableAsTool).toBe(true);
		});

		it('should define Graphor API resources', () => {
			const resourceProp = node.description.properties.find((p) => p.name === 'resource');
			expect(resourceProp).toBeDefined();
			const values = (resourceProp!.options as { value: string }[]).map((o) => o.value);
			expect(values).toEqual(['chat', 'extraction', 'retrieval', 'source']);
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

		it('should have current source operations', () => {
			const sourceOps = node.description.properties.find(
				(p) => p.name === 'operation' && p.displayOptions?.show?.resource?.[0] === 'source',
			);
			const values = (sourceOps!.options as { value: string }[]).map((o) => o.value);
			expect(values).toEqual(
				expect.arrayContaining([
					'getBuildStatus',
					'delete',
					'getElements',
					'list',
					'process',
					'uploadFile',
					'uploadGithub',
					'uploadYoutube',
					'uploadUrl',
				]),
			);
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
		it('should POST url to /ingest-url', async () => {
			const mockCtx = createMockExecuteFunctions({
				nodeParameters: {
					resource: 'source',
					operation: 'uploadUrl',
					url: 'https://example.com/page',
					crawlUrls: true,
					ingestMethod: 'balanced',
				},
			});

			await node.execute.call(mockCtx as any);
			const req = mockCtx.getRequests()[0];
			expect(req.options.url).toBe('https://sources.graphorlm.com/ingest-url');
			expect((req.options.body as any).url).toBe('https://example.com/page');
			expect((req.options.body as any).crawl_urls).toBe(true);
			expect((req.options.body as any).crawlUrls).toBeUndefined();
			expect((req.options.body as any).method).toBe('balanced');
		});
	});

	describe('Source - Upload GitHub', () => {
		it('should POST github url to /ingest-github', async () => {
			const mockCtx = createMockExecuteFunctions({
				nodeParameters: {
					resource: 'source',
					operation: 'uploadGithub',
					githubUrl: 'https://github.com/user/repo',
				},
			});

			await node.execute.call(mockCtx as any);
			const req = mockCtx.getRequests()[0];
			expect(req.options.url).toBe('https://sources.graphorlm.com/ingest-github');
			expect((req.options.body as any).url).toBe('https://github.com/user/repo');
		});
	});

	describe('Source - Upload YouTube', () => {
		it('should POST youtube url to /ingest-youtube', async () => {
			const mockCtx = createMockExecuteFunctions({
				nodeParameters: {
					resource: 'source',
					operation: 'uploadYoutube',
					youtubeUrl: 'https://www.youtube.com/watch?v=abc123',
				},
			});

			await node.execute.call(mockCtx as any);
			const req = mockCtx.getRequests()[0];
			expect(req.options.url).toBe('https://sources.graphorlm.com/ingest-youtube');
			expect((req.options.body as any).url).toBe('https://www.youtube.com/watch?v=abc123');
		});
	});

	describe('Source - Get Build Status', () => {
		it('should GET build status with query params', async () => {
			const mockCtx = createMockExecuteFunctions({
				nodeParameters: {
					resource: 'source',
					operation: 'getBuildStatus',
					buildId: 'build-123',
					buildStatusAdditionalFields: {
						suppressElements: true,
						suppressImgBase64: true,
						page: 2,
						pageSize: 25,
					},
				},
			});

			await node.execute.call(mockCtx as any);
			const req = mockCtx.getRequests()[0];
			expect(req.options.method).toBe('GET');
			expect(req.options.url).toBe('https://sources.graphorlm.com/builds/build-123');
			expect(req.options.qs).toEqual({
				suppress_elements: true,
				suppress_img_base64: true,
				page: 2,
				page_size: 25,
			});
		});
	});

	describe('Source - Process', () => {
		it('should POST reprocess with file_id and method', async () => {
			const mockCtx = createMockExecuteFunctions({
				nodeParameters: {
					resource: 'source',
					operation: 'process',
					fileId: 'file-123',
					partitionMethod: 'agentic',
				},
			});

			await node.execute.call(mockCtx as any);
			const req = mockCtx.getRequests()[0];
			expect(req.options.url).toBe('https://sources.graphorlm.com/reprocess');
			const body = req.options.body as any;
			expect(body.file_id).toBe('file-123');
			expect(body.method).toBe('agentic');
		});
	});

	describe('Source - Get Elements', () => {
		it('should GET /get-elements with file_id and filters', async () => {
			const mockCtx = createMockExecuteFunctions({
				nodeParameters: {
					resource: 'source',
					operation: 'getElements',
					fileId: 'file-123',
					getElementsAdditionalFields: {
						type: 'Table',
						elementsToRemove: 'Footer, PageNumber',
						page: 3,
						pageNumbers: '1, 2',
						pageSize: 40,
						suppressImgBase64: true,
					},
				},
			});

			await node.execute.call(mockCtx as any);
			const req = mockCtx.getRequests()[0];
			expect(req.options.method).toBe('GET');
			expect(req.options.url).toBe('https://sources.graphorlm.com/get-elements');
			expect(req.options.qs).toEqual({
				file_id: 'file-123',
				type: 'Table',
				elements_to_remove: ['Footer', 'PageNumber'],
				page: 3,
				page_numbers: [1, 2],
				page_size: 40,
				suppress_img_base64: true,
			});
		});
	});

	describe('Source - Delete', () => {
		it('should DELETE source', async () => {
			const mockCtx = createMockExecuteFunctions({
				nodeParameters: {
					resource: 'source',
					operation: 'delete',
					fileId: 'file-old',
				},
			});

			await node.execute.call(mockCtx as any);
			const req = mockCtx.getRequests()[0];
			expect(req.options.method).toBe('DELETE');
			expect(req.options.url).toBe('https://sources.graphorlm.com/delete');
			expect((req.options.body as any).file_id).toBe('file-old');
		});
	});

	describe('Retrieval - Retrieve Chunks', () => {
		it('should POST query to /prebuilt-rag', async () => {
			const mockCtx = createMockExecuteFunctions({
				nodeParameters: {
					resource: 'retrieval',
					operation: 'retrieveChunks',
					query: 'payment terms',
					retrievalAdditionalFields: { fileIds: 'file-1, file-2' },
				},
			});

			await node.execute.call(mockCtx as any);
			const req = mockCtx.getRequests()[0];
			expect(req.options.method).toBe('POST');
			expect(req.options.url).toBe('https://sources.graphorlm.com/prebuilt-rag');
			expect(req.options.body).toEqual({
				query: 'payment terms',
				file_ids: ['file-1', 'file-2'],
			});
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
