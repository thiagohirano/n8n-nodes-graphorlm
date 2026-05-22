import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	IDataObject,
	IHttpRequestOptions,
} from 'n8n-workflow';

function parseCsvList(value: string): string[] {
	return value
		.split(',')
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0);
}

function escapeMultipartValue(value: string): string {
	return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildMultipartBody(
	file: {
		fieldName: string;
		filename: string;
		contentType?: string;
		data: Buffer;
	},
	fields: IDataObject = {},
): { body: Buffer; headers: IDataObject } {
	const boundary = `----graphor-${Date.now().toString(16)}-${Math.random()
		.toString(16)
		.slice(2)}`;
	const chunks: Buffer[] = [];
	const appendString = (value: string) => chunks.push(Buffer.from(value, 'utf8'));

	for (const [name, value] of Object.entries(fields)) {
		if (value === undefined || value === null || value === '') continue;
		appendString(`--${boundary}\r\n`);
		appendString(`Content-Disposition: form-data; name="${escapeMultipartValue(name)}"\r\n\r\n`);
		appendString(`${String(value)}\r\n`);
	}

	appendString(`--${boundary}\r\n`);
	appendString(
		`Content-Disposition: form-data; name="${escapeMultipartValue(
			file.fieldName,
		)}"; filename="${escapeMultipartValue(file.filename)}"\r\n`,
	);
	appendString(`Content-Type: ${file.contentType || 'application/octet-stream'}\r\n\r\n`);
	chunks.push(file.data);
	appendString(`\r\n--${boundary}--\r\n`);

	const body = Buffer.concat(chunks);

	return {
		body,
		headers: {
			'Content-Type': `multipart/form-data; boundary=${boundary}`,
			'Content-Length': body.length,
		},
	};
}

export class Graphor implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Graphor',
		name: 'graphor',
		icon: 'file:graphor.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Interact with Graphor API for document processing, RAG, and AI-powered document chat',
		defaults: {
			name: 'Graphor',
		},
		inputs: ['main'],
		outputs: ['main'],
		usableAsTool: true,
		credentials: [
			{
				name: 'graphorApi',
				required: true,
			},
		],
		properties: [
			// Resource Selection
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Chat',
						value: 'chat',
						description: 'Ask questions about your documents',
					},
					{
						name: 'Extraction',
						value: 'extraction',
						description: 'Extract structured data from documents',
					},
					{
						name: 'Retrieval',
						value: 'retrieval',
						description: 'Retrieve relevant chunks using semantic search',
					},
					{
						name: 'Source',
						value: 'source',
						description: 'Manage document sources',
					},
				],
				default: 'chat',
			},

			// ==================== CHAT OPERATIONS ====================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['chat'],
					},
				},
				options: [
					{
						name: 'Ask Question',
						value: 'askQuestion',
						description: 'Ask a question about your documents',
						action: 'Ask a question about your documents',
					},
				],
				default: 'askQuestion',
			},
			// Chat - Ask Question fields
			{
				displayName: 'Question',
				name: 'question',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['chat'],
						operation: ['askQuestion'],
					},
				},
				description: 'The question to ask about your documents',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['chat'],
						operation: ['askQuestion'],
					},
				},
				options: [
					{
						displayName: 'Conversation ID',
						name: 'conversationId',
						type: 'string',
						default: '',
						description: 'Conversation identifier to maintain memory context across questions',
					},
					{
						displayName: 'File IDs',
						name: 'fileIds',
						type: 'string',
						default: '',
						description:
							'Comma-separated list of file IDs to restrict search to specific documents',
					},
					{
						displayName: 'File Names (Deprecated)',
						name: 'fileNames',
						type: 'string',
						default: '',
						description: 'Comma-separated list of file names. Deprecated: use File IDs instead.',
					},
					{
						displayName: 'Reset Conversation',
						name: 'reset',
						type: 'boolean',
						default: false,
						description: 'Whether to start a new conversation and ignore previous history',
					},
					{
						displayName: 'Output Schema',
						name: 'outputSchema',
						type: 'json',
						default: '',
						description: 'JSON Schema to request structured output',
					},
					{
						displayName: 'Thinking Level',
						name: 'thinkingLevel',
						type: 'options',
						default: 'accurate',
						options: [
							{
								name: 'Fast',
								value: 'fast',
								description:
									'Uses a faster model without extended thinking. Best for simple questions where speed is prioritized.',
							},
							{
								name: 'Balanced',
								value: 'balanced',
								description:
									'Uses a more capable model with low thinking. Good balance between quality and speed.',
							},
							{
								name: 'Accurate',
								value: 'accurate',
								description:
									'Default. Uses a more capable model with high thinking. Best for complex questions requiring deep reasoning.',
							},
						],
						description: 'Controls model and thinking configuration',
					},
				],
			},

			// ==================== EXTRACTION OPERATIONS ====================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['extraction'],
					},
				},
				options: [
					{
						name: 'Extract Data',
						value: 'extractData',
						description: 'Extract structured data from documents using JSON Schema',
						action: 'Extract structured data from documents',
					},
				],
				default: 'extractData',
			},
			// Extraction - Extract Data fields
			{
				displayName: 'File IDs',
				name: 'fileIds',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['extraction'],
						operation: ['extractData'],
					},
				},
				description: 'Comma-separated list of file IDs to extract from',
			},
			{
				displayName: 'File Names (Deprecated)',
				name: 'fileNames',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['extraction'],
						operation: ['extractData'],
					},
				},
				description:
					'Comma-separated list of file names to extract from. Deprecated: use File IDs instead.',
			},
			{
				displayName: 'User Instruction',
				name: 'userInstruction',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['extraction'],
						operation: ['extractData'],
					},
				},
				description: 'Natural language instructions to guide the extraction',
			},
			{
				displayName: 'Output Schema',
				name: 'outputSchema',
				type: 'json',
				required: true,
				default:
					'{\n  "type": "object",\n  "properties": {\n    "field_name": {\n      "type": "string",\n      "description": "Description of the field"\n    }\n  }\n}',
				displayOptions: {
					show: {
						resource: ['extraction'],
						operation: ['extractData'],
					},
				},
				description: 'JSON Schema defining the structure of the extracted data',
			},
			{
				displayName: 'Thinking Level',
				name: 'thinkingLevel',
				type: 'options',
				default: 'accurate',
				displayOptions: {
					show: {
						resource: ['extraction'],
						operation: ['extractData'],
					},
				},
				options: [
					{
						name: 'Fast',
						value: 'fast',
						description:
							'Uses a faster model without extended thinking. Best for simple extractions where speed is prioritized.',
					},
					{
						name: 'Balanced',
						value: 'balanced',
						description:
							'Uses a more capable model with low thinking. Good balance between quality and speed.',
					},
					{
						name: 'Accurate',
						value: 'accurate',
						description:
							'Default. Uses a more capable model with high thinking. Best for complex extractions requiring deep reasoning.',
					},
				],
				description: 'Controls model and thinking configuration',
			},

			// ==================== RETRIEVAL OPERATIONS ====================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['retrieval'],
					},
				},
				options: [
					{
						name: 'Retrieve Chunks',
						value: 'retrieveChunks',
						description: 'Retrieve relevant document chunks using semantic search',
						action: 'Retrieve relevant document chunks',
					},
				],
				default: 'retrieveChunks',
			},
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['retrieval'],
						operation: ['retrieveChunks'],
					},
				},
				description: 'The search query to retrieve relevant chunks',
			},
			{
				displayName: 'Additional Fields',
				name: 'retrievalAdditionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['retrieval'],
						operation: ['retrieveChunks'],
					},
				},
				options: [
					{
						displayName: 'File IDs',
						name: 'fileIds',
						type: 'string',
						default: '',
						description:
							'Comma-separated list of file IDs to restrict retrieval to specific documents',
					},
					{
						displayName: 'File Names (Deprecated)',
						name: 'fileNames',
						type: 'string',
						default: '',
						description: 'Comma-separated list of file names. Deprecated: use File IDs instead.',
					},
				],
			},

			// ==================== SOURCE OPERATIONS ====================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['source'],
					},
				},
				options: [
					{
						name: 'Get Build Status',
						value: 'getBuildStatus',
						description: 'Poll the status of an async ingestion or reprocess build',
						action: 'Get build status',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a source from your project',
						action: 'Delete a source',
					},
					{
						name: 'Get Elements',
						value: 'getElements',
						description: 'Get structured elements from a processed source',
						action: 'Get source elements',
					},
					{
						name: 'List',
						value: 'list',
						description: 'List all sources in your project',
						action: 'List all sources',
					},
					{
						name: 'Process',
						value: 'process',
						description: 'Reprocess an existing source with a different parsing method',
						action: 'Reprocess a source',
					},
					{
						name: 'Upload File',
						value: 'uploadFile',
						description: 'Upload a file to your project',
						action: 'Upload a file',
					},
					{
						name: 'Upload From GitHub',
						value: 'uploadGithub',
						description: 'Upload content from a GitHub repository',
						action: 'Upload from Git Hub',
					},
					{
						name: 'Upload From YouTube',
						value: 'uploadYoutube',
						description: 'Upload content from a YouTube video',
						action: 'Upload from YouTube',
					},
					{
						name: 'Upload From URL',
						value: 'uploadUrl',
						description: 'Upload content from a web page URL',
						action: 'Upload from URL',
					},
				],
				default: 'list',
			},
			// Source - Upload File fields
			{
				displayName: 'Input Data Field Name',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						resource: ['source'],
						operation: ['uploadFile'],
					},
				},
				description: 'The name of the input field containing the binary file data',
			},
			{
				displayName: 'Partition Method',
				name: 'ingestMethod',
				type: 'options',
				default: '',
				displayOptions: {
					show: {
						resource: ['source'],
						operation: ['uploadFile', 'uploadUrl'],
					},
				},
				options: [
					{
						name: 'System Default',
						value: '',
						description: 'Do not send a method and let Graphor use its default',
					},
					{
						name: 'Fast',
						value: 'fast',
						description: 'Fast processing with heuristic classification. No OCR.',
					},
					{
						name: 'Balanced',
						value: 'balanced',
						description: 'OCR-based extraction with structure classification.',
					},
					{
						name: 'Accurate',
						value: 'accurate',
						description: 'Fine-tuned model for highest accuracy.',
					},
					{
						name: 'Agentic',
						value: 'agentic',
						description: 'Highest accuracy for complex layouts, tables, and diagrams.',
					},
				],
				description: 'Optional parsing method to use for ingestion',
			},
			// Source - Upload URL fields
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['source'],
						operation: ['uploadUrl'],
					},
				},
				description: 'The public web page URL to scrape and ingest',
			},
			{
				displayName: 'Crawl URLs',
				name: 'crawlUrls',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						resource: ['source'],
						operation: ['uploadUrl'],
					},
				},
				description: 'Whether to follow and ingest links found on the page',
			},
			// Source - Upload GitHub fields
			{
				displayName: 'Repository URL',
				name: 'githubUrl',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['source'],
						operation: ['uploadGithub'],
					},
				},
				description: 'The public GitHub repository URL',
			},
			{
				displayName: 'YouTube URL',
				name: 'youtubeUrl',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['source'],
						operation: ['uploadYoutube'],
					},
				},
				description: 'The public YouTube video URL',
			},
			// Source - file/build identifiers
			{
				displayName: 'Build ID',
				name: 'buildId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['source'],
						operation: ['getBuildStatus'],
					},
				},
				description: 'The build ID returned by ingest or reprocess',
			},
			{
				displayName: 'File ID',
				name: 'fileId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['source'],
						operation: ['process', 'delete', 'getElements'],
					},
				},
				description: 'The unique file ID returned by build status or list sources',
			},
			{
				displayName: 'Partition Method',
				name: 'partitionMethod',
				type: 'options',
				default: 'fast',
				displayOptions: {
					show: {
						resource: ['source'],
						operation: ['process'],
					},
				},
				options: [
					{
						name: 'Fast',
						value: 'fast',
						description: 'Fast processing with heuristic classification. No OCR.',
					},
					{
						name: 'Balanced',
						value: 'balanced',
						description: 'OCR-based extraction with structure classification.',
					},
					{
						name: 'Accurate',
						value: 'accurate',
						description: 'Fine-tuned model for highest accuracy.',
					},
					{
						name: 'Agentic',
						value: 'agentic',
						description: 'Highest accuracy for complex layouts, tables, and diagrams.',
					},
				],
				description: 'The processing method to use for document parsing',
			},
			{
				displayName: 'Additional Fields',
				name: 'buildStatusAdditionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['source'],
						operation: ['getBuildStatus'],
					},
				},
				options: [
					{
						displayName: 'Suppress Elements',
						name: 'suppressElements',
						type: 'boolean',
						default: false,
						description: 'Whether to omit parsed elements from the response',
					},
					{
						displayName: 'Suppress Image Base64',
						name: 'suppressImgBase64',
						type: 'boolean',
						default: false,
						description: 'Whether to omit img_base64 from elements',
					},
					{
						displayName: 'Page',
						name: 'page',
						type: 'number',
						default: 1,
						description: '1-based page number for element pagination',
					},
					{
						displayName: 'Page Size',
						name: 'pageSize',
						type: 'number',
						default: 50,
						description: 'Number of elements per page (max 100)',
					},
				],
			},
			{
				displayName: 'Additional Fields',
				name: 'getElementsAdditionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['source'],
						operation: ['getElements'],
					},
				},
				options: [
					{
						displayName: 'Element Type',
						name: 'type',
						type: 'string',
						default: '',
						description: 'Filter by element type, e.g. Title, NarrativeText, Table',
					},
					{
						displayName: 'Elements To Remove',
						name: 'elementsToRemove',
						type: 'string',
						default: '',
						description: 'Comma-separated element types to exclude',
					},
					{
						displayName: 'Page',
						name: 'page',
						type: 'number',
						default: 1,
						description: '1-based page number for pagination',
					},
					{
						displayName: 'Page Numbers',
						name: 'pageNumbers',
						type: 'string',
						default: '',
						description: 'Comma-separated page numbers to include',
					},
					{
						displayName: 'Page Size',
						name: 'pageSize',
						type: 'number',
						default: 50,
						description: 'Number of elements per page (max 100)',
					},
					{
						displayName: 'Suppress Image Base64',
						name: 'suppressImgBase64',
						type: 'boolean',
						default: false,
						description: 'Whether to omit img_base64 from each element',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData;

				// ==================== CHAT ====================
				if (resource === 'chat') {
					if (operation === 'askQuestion') {
						const question = this.getNodeParameter('question', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as {
							conversationId?: string;
							fileIds?: string;
							fileNames?: string;
							reset?: boolean;
							outputSchema?: string;
							thinkingLevel?: string;
						};

						const body: IDataObject = {
							question,
						};

						if (additionalFields.conversationId) {
							body.conversation_id = additionalFields.conversationId;
						}
						if (additionalFields.fileIds) {
							body.file_ids = parseCsvList(additionalFields.fileIds);
						}
						if (additionalFields.fileNames) {
							body.file_names = parseCsvList(additionalFields.fileNames);
						}
						if (additionalFields.reset !== undefined) {
							body.reset = additionalFields.reset;
						}
						if (additionalFields.outputSchema) {
							body.output_schema = JSON.parse(additionalFields.outputSchema);
						}
						if (additionalFields.thinkingLevel) {
							body.thinking_level = additionalFields.thinkingLevel;
						}

						const options: IHttpRequestOptions = {
							method: 'POST',
							url: 'https://sources.graphorlm.com/ask-sources',
							body,
							json: true,
						};

						responseData = await this.helpers.httpRequestWithAuthentication.call(
							this,
							'graphorApi',
							options,
						);
					}
				}

				// ==================== EXTRACTION ====================
				if (resource === 'extraction') {
					if (operation === 'extractData') {
						const fileIds = this.getNodeParameter('fileIds', i) as string;
						const fileNames = this.getNodeParameter('fileNames', i) as string;
						const userInstruction = this.getNodeParameter('userInstruction', i) as string;
						const outputSchema = this.getNodeParameter('outputSchema', i) as string;
						const thinkingLevel = this.getNodeParameter('thinkingLevel', i) as string;

						const body: IDataObject = {
							user_instruction: userInstruction,
							output_schema: JSON.parse(outputSchema),
						};

						if (fileIds) {
							body.file_ids = parseCsvList(fileIds);
						}
						if (fileNames) {
							body.file_names = parseCsvList(fileNames);
						}
						if (thinkingLevel) {
							body.thinking_level = thinkingLevel;
						}

						const options: IHttpRequestOptions = {
							method: 'POST',
							url: 'https://sources.graphorlm.com/run-extraction',
							body,
							json: true,
						};

						responseData = await this.helpers.httpRequestWithAuthentication.call(
							this,
							'graphorApi',
							options,
						);
					}
				}

				// ==================== RETRIEVAL ====================
				if (resource === 'retrieval') {
					if (operation === 'retrieveChunks') {
						const query = this.getNodeParameter('query', i) as string;
						const additionalFields = this.getNodeParameter('retrievalAdditionalFields', i) as {
							fileIds?: string;
							fileNames?: string;
						};

						const body: IDataObject = { query };

						if (additionalFields.fileIds) {
							body.file_ids = parseCsvList(additionalFields.fileIds);
						}
						if (additionalFields.fileNames) {
							body.file_names = parseCsvList(additionalFields.fileNames);
						}

						const options: IHttpRequestOptions = {
							method: 'POST',
							url: 'https://sources.graphorlm.com/prebuilt-rag',
							body,
							json: true,
						};

						responseData = await this.helpers.httpRequestWithAuthentication.call(
							this,
							'graphorApi',
							options,
						);
					}
				}

				// ==================== SOURCE ====================
				if (resource === 'source') {
					if (operation === 'list') {
						const options: IHttpRequestOptions = {
							method: 'GET',
							url: 'https://sources.graphorlm.com',
							json: true,
						};

						responseData = await this.helpers.httpRequestWithAuthentication.call(
							this,
							'graphorApi',
							options,
						);
					}

					if (operation === 'uploadFile') {
						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
						const ingestMethod = this.getNodeParameter('ingestMethod', i) as string;
						const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);

						let uploadData: Buffer;

						if (binaryData.id) {
							uploadData = await this.helpers.binaryToBuffer(
								await this.helpers.getBinaryStream(binaryData.id),
							);
						} else {
							uploadData = Buffer.from(binaryData.data, 'base64');
						}

						const multipart = buildMultipartBody(
							{
								fieldName: 'file',
								filename: binaryData.fileName || 'file',
								contentType: binaryData.mimeType,
								data: uploadData,
							},
							ingestMethod ? { method: ingestMethod } : {},
						);

						const options: IHttpRequestOptions = {
							method: 'POST',
							url: 'https://sources.graphorlm.com/ingest-file',
							headers: multipart.headers,
							body: multipart.body,
							json: true,
						};

						responseData = await this.helpers.httpRequestWithAuthentication.call(
							this,
							'graphorApi',
							options,
						);
					}

					if (operation === 'uploadUrl') {
						const url = this.getNodeParameter('url', i) as string;
						const crawlUrls = this.getNodeParameter('crawlUrls', i) as boolean;
						const ingestMethod = this.getNodeParameter('ingestMethod', i) as string;

						const body: IDataObject = { url, crawl_urls: crawlUrls };
						if (ingestMethod) {
							body.method = ingestMethod;
						}

						const options: IHttpRequestOptions = {
							method: 'POST',
							url: 'https://sources.graphorlm.com/ingest-url',
							body,
							json: true,
						};

						responseData = await this.helpers.httpRequestWithAuthentication.call(
							this,
							'graphorApi',
							options,
						);
					}

					if (operation === 'uploadGithub') {
						const githubUrl = this.getNodeParameter('githubUrl', i) as string;

						const options: IHttpRequestOptions = {
							method: 'POST',
							url: 'https://sources.graphorlm.com/ingest-github',
							body: { url: githubUrl },
							json: true,
						};

						responseData = await this.helpers.httpRequestWithAuthentication.call(
							this,
							'graphorApi',
							options,
						);
					}

					if (operation === 'uploadYoutube') {
						const youtubeUrl = this.getNodeParameter('youtubeUrl', i) as string;

						const options: IHttpRequestOptions = {
							method: 'POST',
							url: 'https://sources.graphorlm.com/ingest-youtube',
							body: { url: youtubeUrl },
							json: true,
						};

						responseData = await this.helpers.httpRequestWithAuthentication.call(
							this,
							'graphorApi',
							options,
						);
					}

					if (operation === 'getBuildStatus') {
						const buildId = this.getNodeParameter('buildId', i) as string;
						const additionalFields = this.getNodeParameter('buildStatusAdditionalFields', i) as {
							suppressElements?: boolean;
							suppressImgBase64?: boolean;
							page?: number;
							pageSize?: number;
						};

						const qs: IDataObject = {};
						if (additionalFields.suppressElements !== undefined) {
							qs.suppress_elements = additionalFields.suppressElements;
						}
						if (additionalFields.suppressImgBase64 !== undefined) {
							qs.suppress_img_base64 = additionalFields.suppressImgBase64;
						}
						if (additionalFields.page !== undefined) {
							qs.page = additionalFields.page;
						}
						if (additionalFields.pageSize !== undefined) {
							qs.page_size = additionalFields.pageSize;
						}

						const options: IHttpRequestOptions = {
							method: 'GET',
							url: `https://sources.graphorlm.com/builds/${encodeURIComponent(buildId)}`,
							qs,
							json: true,
						};

						responseData = await this.helpers.httpRequestWithAuthentication.call(
							this,
							'graphorApi',
							options,
						);
					}

					if (operation === 'process') {
						const fileId = this.getNodeParameter('fileId', i) as string;
						const partitionMethod = this.getNodeParameter('partitionMethod', i) as string;

						const options: IHttpRequestOptions = {
							method: 'POST',
							url: 'https://sources.graphorlm.com/reprocess',
							body: {
								file_id: fileId,
								method: partitionMethod,
							},
							json: true,
						};

						responseData = await this.helpers.httpRequestWithAuthentication.call(
							this,
							'graphorApi',
							options,
						);
					}

					if (operation === 'getElements') {
						const fileId = this.getNodeParameter('fileId', i) as string;
						const additionalFields = this.getNodeParameter('getElementsAdditionalFields', i) as {
							type?: string;
							elementsToRemove?: string;
							page?: number;
							pageNumbers?: string;
							pageSize?: number;
							suppressImgBase64?: boolean;
						};

						const qs: IDataObject = { file_id: fileId };
						if (additionalFields.page !== undefined) {
							qs.page = additionalFields.page;
						}
						if (additionalFields.pageSize !== undefined) {
							qs.page_size = additionalFields.pageSize;
						}
						if (additionalFields.suppressImgBase64 !== undefined) {
							qs.suppress_img_base64 = additionalFields.suppressImgBase64;
						}
						if (additionalFields.type) {
							qs.type = additionalFields.type;
						}
						if (additionalFields.pageNumbers) {
							qs.page_numbers = parseCsvList(additionalFields.pageNumbers).map((entry) =>
								Number(entry),
							);
						}
						if (additionalFields.elementsToRemove) {
							qs.elements_to_remove = parseCsvList(additionalFields.elementsToRemove);
						}

						const options: IHttpRequestOptions = {
							method: 'GET',
							url: 'https://sources.graphorlm.com/get-elements',
							qs,
							json: true,
						};

						responseData = await this.helpers.httpRequestWithAuthentication.call(
							this,
							'graphorApi',
							options,
						);
					}

					if (operation === 'delete') {
						const fileId = this.getNodeParameter('fileId', i) as string;

						const options: IHttpRequestOptions = {
							method: 'DELETE',
							url: 'https://sources.graphorlm.com/delete',
							body: {
								file_id: fileId,
							},
							json: true,
						};

						responseData = await this.helpers.httpRequestWithAuthentication.call(
							this,
							'graphorApi',
							options,
						);
					}
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: (error as Error).message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, {
					itemIndex: i,
				});
			}
		}

		return [returnData];
	}
}
