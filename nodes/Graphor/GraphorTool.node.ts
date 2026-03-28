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

const QUESTION_KEYS = ['input', 'query', 'question', 'text'] as const;
const NESTED_INPUT_KEYS = ['arguments', 'args', 'payload', 'data'] as const;

function parseCsvList(value: string): string[] {
	return value
		.split(',')
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0);
}

function extractQuestionCandidate(value: unknown): string | undefined {
	if (typeof value === 'string') {
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : undefined;
	}

	if (Array.isArray(value)) {
		for (const item of value) {
			const extracted = extractQuestionCandidate(item);
			if (extracted) {
				return extracted;
			}
		}

		return undefined;
	}

	if (value && typeof value === 'object') {
		const record = value as Record<string, unknown>;

		for (const key of QUESTION_KEYS) {
			const extracted = extractQuestionCandidate(record[key]);
			if (extracted) {
				return extracted;
			}
		}

		for (const key of NESTED_INPUT_KEYS) {
			const extracted = extractQuestionCandidate(record[key]);
			if (extracted) {
				return extracted;
			}
		}
	}

	return undefined;
}

function resolveQuestion(queryParam: string, agentInput: unknown): string {
	const trimmedQuery = queryParam.trim();
	if (trimmedQuery.length > 0) {
		return trimmedQuery;
	}

	if (typeof agentInput === 'string') {
		const trimmedInput = agentInput.trim();
		if (trimmedInput.length === 0) {
			throw new Error('Graphor tool received an empty query');
		}

		try {
			const parsed = JSON.parse(trimmedInput) as unknown;
			const extractedFromParsed = extractQuestionCandidate(parsed);
			if (extractedFromParsed) {
				return extractedFromParsed;
			}

			throw new Error('Could not extract a question from the tool input payload');
		} catch (error) {
			if (error instanceof SyntaxError) {
				return trimmedInput;
			}

			throw error;
		}
	}

	const extractedFromInput = extractQuestionCandidate(agentInput);
	if (extractedFromInput) {
		return extractedFromInput;
	}

	throw new Error('Could not extract a question from the tool input payload');
}

function formatToolResponse(response: IDataObject): string {
	if (response.structured_output !== undefined) {
		return typeof response.structured_output === 'string'
			? response.structured_output
			: JSON.stringify(response.structured_output);
	}

	if (typeof response.answer === 'string' && response.answer.trim().length > 0) {
		return response.answer;
	}

	if (typeof response.raw_json === 'string' && response.raw_json.trim().length > 0) {
		return response.raw_json;
	}

	return JSON.stringify(response);
}

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

		const self = this;

		const tool = new DynamicTool({
			name: 'graphor_ask',
			description: toolDescription,
			func: async (agentInput: unknown) => {
				try {
					const queryParam = self.getNodeParameter('query', itemIndex) as string;
					const options = (self.getNodeParameter('options', itemIndex) as {
						fileIds?: string;
						fileNames?: string;
						conversationId?: string;
						reset?: boolean;
						thinkingLevel?: string;
					}) ?? {};

					const question = resolveQuestion(queryParam, agentInput);

					const body: IDataObject = { question };

					if (options.fileIds) {
						const fileIds = parseCsvList(options.fileIds);
						if (fileIds.length > 0) {
							body.file_ids = fileIds;
						}
					}
					if (options.fileNames) {
						const fileNames = parseCsvList(options.fileNames);
						if (fileNames.length > 0) {
							body.file_names = fileNames;
						}
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

					return formatToolResponse(response as IDataObject);
				} catch (error: unknown) {
					const message = error instanceof Error ? error.message : String(error);
					throw new Error(`Graphor tool failed: ${message}`);
				}
			},
		});

		return { response: tool };
	}
}
