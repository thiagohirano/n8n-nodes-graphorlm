import {
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
	type IDataObject,
	type IHttpRequestOptions,
} from 'n8n-workflow';
import { DynamicTool } from '@langchain/core/tools';

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
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Tools'],
			},
		},
		inputs: [],
		outputs: [NodeConnectionTypes.AiTool],
		outputNames: ['Tool'],
		credentials: [
			{
				name: 'graphorApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Tool Description',
				name: 'toolDescription',
				type: 'string',
				default: 'Ask questions about documents using Graphor AI. Send a question and get answers based on your uploaded documents.',
				typeOptions: {
					rows: 3,
				},
				description: 'Description of this tool that helps the AI Agent understand when and how to use it',
			},
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				typeOptions: {
					rows: 2,
				},
				description: 'The question to ask Graphor. Leave empty to let the AI Agent provide the query.',
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
						displayName: 'Reset Conversation',
						name: 'reset',
						type: 'boolean',
						default: false,
						description: 'Whether to clear conversation history before sending the question',
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
		return [[]];
	}

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const toolDescription = this.getNodeParameter('toolDescription', itemIndex) as string;
		const queryParam = this.getNodeParameter('query', itemIndex) as string;
		const options = this.getNodeParameter('options', itemIndex) as {
			fileIds?: string;
			fileNames?: string;
			conversationId?: string;
			reset?: boolean;
			thinkingLevel?: string;
		};

		const self = this;

		const tool = new DynamicTool({
			name: 'graphor_ask',
			description: toolDescription,
			func: async (agentInput: string) => {
				const question = queryParam || agentInput;
				const body: IDataObject = { question };

				if (options.fileIds) {
					body.file_ids = options.fileIds.split(',').map((f) => f.trim());
				}
				if (options.fileNames) {
					body.file_names = options.fileNames.split(',').map((f) => f.trim());
				}
				if (options.conversationId) {
					body.conversation_id = options.conversationId;
				}
				if (options.reset) {
					body.reset = true;
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

				const response = await self.helpers.httpRequestWithAuthentication.call(
					self,
					'graphorApi',
					requestOptions,
				);

				return JSON.stringify(response);
			},
		});

		return { response: tool };
	}
}
