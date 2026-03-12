import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	IDataObject,
	IHttpRequestOptions,
} from 'n8n-workflow';

export class GraphorTool implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Graphor Tool',
		name: 'graphorTool',
		icon: 'file:graphor.svg',
		group: ['transform'],
		version: 1,
		description: 'Ask questions about documents using Graphor AI - designed for use with AI Agents',
		defaults: {
			name: 'Ask Graphor',
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
			{
				displayName: 'Question',
				name: 'question',
				type: 'string',
				required: true,
				default: '',
				description: 'The question to ask about your documents',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'File IDs',
						name: 'fileIds',
						type: 'string',
						default: '',
						description: 'Comma-separated list of file IDs to search within (leave empty to search all)',
					},
					{
						displayName: 'File Names (Deprecated)',
						name: 'fileNames',
						type: 'string',
						default: '',
						description: 'Comma-separated list of file names. Deprecated: use File IDs instead.',
					},
					{
						displayName: 'Conversation ID',
						name: 'conversationId',
						type: 'string',
						default: '',
						description: 'Conversation ID to maintain context across multiple questions',
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
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const question = this.getNodeParameter('question', i) as string;
				const options = this.getNodeParameter('options', i) as {
					fileIds?: string;
					fileNames?: string;
					conversationId?: string;
					thinkingLevel?: string;
				};

				const body: IDataObject = {
					question,
				};

				if (options.fileIds) {
					body.file_ids = options.fileIds.split(',').map((f) => f.trim());
				}
				if (options.fileNames) {
					body.file_names = options.fileNames.split(',').map((f) => f.trim());
				}
				if (options.conversationId) {
					body.conversation_id = options.conversationId;
				}
				if (options.thinkingLevel) {
					body.thinking_level = options.thinkingLevel;
				}

				const requestOptions: IHttpRequestOptions = {
					method: 'POST',
					url: 'https://sources.graphorlm.com/ask-sources',
					body,
					json: true,
				};

				const responseData = await this.helpers.httpRequestWithAuthentication.call(
					this,
					'graphorApi',
					requestOptions,
				);

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
