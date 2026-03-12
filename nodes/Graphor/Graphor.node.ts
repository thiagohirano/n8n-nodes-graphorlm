import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	IDataObject,
	IHttpRequestOptions,
} from 'n8n-workflow';

export class Graphor implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Graphor',
		name: 'graphor',
		icon: 'file:graphor.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Graphor API for document processing, RAG, and AI-powered document chat',
		defaults: {
			name: 'Graphor',
		},
		inputs: ['main'],
		outputs: ['main'],
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
						description: 'Comma-separated list of file IDs to restrict search to specific documents',
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
						default: 'balanced',
						options: [
							{
								name: 'Fast',
								value: 'fast',
								description: 'Uses a faster model without extended thinking. Best for simple questions where speed is prioritized.',
							},
							{
								name: 'Balanced',
								value: 'balanced',
								description: 'Default. Uses a more capable model with low thinking. Good balance between quality and speed.',
							},
							{
								name: 'Accurate',
								value: 'accurate',
								description: 'Uses a more capable model with high thinking. Best for complex questions requiring deep reasoning.',
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
				description: 'Comma-separated list of file names to extract from. Deprecated: use File IDs instead.',
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
				default: '{\n  "type": "object",\n  "properties": {\n    "field_name": {\n      "type": "string",\n      "description": "Description of the field"\n    }\n  }\n}',
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
				default: 'balanced',
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
						description: 'Uses a faster model without extended thinking. Best for simple extractions where speed is prioritized.',
					},
					{
						name: 'Balanced',
						value: 'balanced',
						description: 'Default. Uses a more capable model with low thinking. Good balance between quality and speed.',
					},
					{
						name: 'Accurate',
						value: 'accurate',
						description: 'Uses a more capable model with high thinking. Best for complex extractions requiring deep reasoning.',
					},
				],
				description: 'Controls model and thinking configuration',
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
						description: 'Process a source with OCR/parsing',
						action: 'Process a source',
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
			// Source - Process fields
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['source'],
						operation: ['process', 'delete', 'getElements'],
					},
				},
				description: 'The name of the file to process/delete/get elements from',
			},
			{
				displayName: 'Partition Method',
				name: 'partitionMethod',
				type: 'options',
				default: 'basic',
				displayOptions: {
					show: {
						resource: ['source'],
						operation: ['process'],
					},
				},
				options: [
					{
						name: 'Basic',
						value: 'basic',
						description: 'Fast processing with heuristic classification',
					},
					{
						name: 'Hi-Res',
						value: 'hi_res',
						description: 'High resolution processing with advanced layout detection',
					},
					{
						name: 'Hi-Res FT',
						value: 'hi_res_ft',
						description: 'Fine-tuned high resolution processing',
					},
					{
						name: 'MAI',
						value: 'mai',
						description: 'Multi-modal AI processing',
					},
					{
						name: 'GraphorLM',
						value: 'graphorlm',
						description: 'Graphor proprietary processing method',
					},
				],
				description: 'The processing method to use for document parsing',
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
							body.file_ids = additionalFields.fileIds.split(',').map((f) => f.trim());
						}
						if (additionalFields.fileNames) {
							body.file_names = additionalFields.fileNames.split(',').map((f) => f.trim());
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
							body.file_ids = fileIds.split(',').map((f) => f.trim());
						}
						if (fileNames) {
							body.file_names = fileNames.split(',').map((f) => f.trim());
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
						const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);

						let uploadData: Buffer;

						if (binaryData.id) {
							uploadData = await this.helpers.binaryToBuffer(
								await this.helpers.getBinaryStream(binaryData.id),
							);
						} else {
							uploadData = Buffer.from(binaryData.data, 'base64');
						}

						const formData = new FormData();
						formData.append('file', new Blob([uploadData], { type: binaryData.mimeType }), binaryData.fileName || 'file');

						const options: IHttpRequestOptions = {
							method: 'POST',
							url: 'https://sources.graphorlm.com/upload',
							body: formData,
						};

						responseData = await this.helpers.httpRequestWithAuthentication.call(
							this,
							'graphorApi',
							options,
						);
					}

					if (operation === 'uploadUrl') {
						const url = this.getNodeParameter('url', i) as string;

						const options: IHttpRequestOptions = {
							method: 'POST',
							url: 'https://sources.graphorlm.com/upload-url-source',
							body: { url },
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
							url: 'https://sources.graphorlm.com/upload-github-source',
							body: { url: githubUrl },
							json: true,
						};

						responseData = await this.helpers.httpRequestWithAuthentication.call(
							this,
							'graphorApi',
							options,
						);
					}

					if (operation === 'process') {
						const fileName = this.getNodeParameter('fileName', i) as string;
						const partitionMethod = this.getNodeParameter('partitionMethod', i) as string;

						const options: IHttpRequestOptions = {
							method: 'POST',
							url: 'https://sources.graphorlm.com/process',
							body: {
								file_name: fileName,
								partition_method: partitionMethod,
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
						const fileName = this.getNodeParameter('fileName', i) as string;

						const options: IHttpRequestOptions = {
							method: 'POST',
							url: 'https://sources.graphorlm.com/elements',
							body: {
								file_name: fileName,
							},
							json: true,
						};

						responseData = await this.helpers.httpRequestWithAuthentication.call(
							this,
							'graphorApi',
							options,
						);
					}

					if (operation === 'delete') {
						const fileName = this.getNodeParameter('fileName', i) as string;

						const options: IHttpRequestOptions = {
							method: 'DELETE',
							url: 'https://sources.graphorlm.com/delete',
							body: {
								file_name: fileName,
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
