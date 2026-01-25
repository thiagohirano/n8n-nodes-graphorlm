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
						displayName: 'File Names',
						name: 'fileNames',
						type: 'string',
						default: '',
						description: 'Comma-separated list of file names to search within (leave empty to search all)',
					},
					{
						displayName: 'Conversation ID',
						name: 'conversationId',
						type: 'string',
						default: '',
						description: 'Conversation ID to maintain context across multiple questions',
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
					fileNames?: string;
					conversationId?: string;
				};

				const body: IDataObject = {
					question,
				};

				if (options.fileNames) {
					body.file_names = options.fileNames.split(',').map((f) => f.trim());
				}
				if (options.conversationId) {
					body.conversation_id = options.conversationId;
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
