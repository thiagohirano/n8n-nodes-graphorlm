# n8n-nodes-graphorlm

[![npm version](https://badge.fury.io/js/n8n-nodes-graphorlm.svg)](https://www.npmjs.com/package/n8n-nodes-graphorlm)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

This is an n8n community node that lets you interact with [Graphor](https://graphorlm.com) - an intelligent document processing platform with RAG pipelines, document chat, and data extraction capabilities.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

### npm

```bash
npm install n8n-nodes-graphorlm
```

### n8n Desktop/Cloud

1. Go to **Settings** > **Community Nodes**
2. Select **Install**
3. Enter `n8n-nodes-graphorlm` and agree to the risks
4. Click **Install**

## Nodes

This package includes one regular node:

1. **Graphor** - Full-featured node with all operations

The Graphor node can be used as a tool with n8n AI Agents (like the AI Agent node with OpenAI, Anthropic, etc.).

## Operations

### Chat
- **Ask Question**: Ask questions about your documents using natural language with conversational memory support

### Extraction
- **Extract Data**: Extract structured data from documents using JSON Schema definitions

### Retrieval
- **Retrieve Chunks**: Retrieve relevant document chunks using semantic search for custom RAG workflows

### Source
- **List**: List all sources in your project
- **Upload File**: Ingest a file (PDF, DOCX, images, audio, video) and return a `build_id`
- **Upload From URL**: Ingest content from a web page URL and return a `build_id`
- **Upload From GitHub**: Ingest content from a public GitHub repository and return a `build_id`
- **Upload From YouTube**: Ingest content from a YouTube video and return a `build_id`
- **Get Build Status**: Poll an async ingest or reprocess build until it returns a `file_id`
- **Process**: Reprocess an existing source by `file_id`
- **Get Elements**: Get parsed elements from a processed source by `file_id`
- **Delete**: Delete a source from your project by `file_id`

## Credentials

To use this node, you need a Graphor API token:

1. Log in to your [Graphor account](https://app.graphorlm.com)
2. Go to **Settings** > **API Tokens**
3. Create a new API token
4. Copy the token (it starts with `grlm_`)

## Supported File Types

- **Documents**: PDF, DOC, DOCX, ODT, TXT, MD, HTML
- **Presentations**: PPT, PPTX
- **Spreadsheets**: CSV, TSV, XLS, XLSX
- **Images**: PNG, JPG, JPEG, TIFF, BMP, HEIC
- **Audio**: MP3, WAV, M4A, OGG, FLAC
- **Video**: MP4, MOV, AVI, MKV, WEBM

## Processing Methods

| Method | Description |
|--------|-------------|
| **Fast** | Fast processing with heuristic classification. No OCR. |
| **Balanced** | OCR-based extraction with structure classification. |
| **Accurate** | Fine-tuned model for highest accuracy. |
| **Agentic** | Highest accuracy for complex layouts, tables, and diagrams. |

## Compatibility

- n8n version 1.0.0 or later
- Node.js 18.0.0 or later

## Resources

- [Graphor Introduction](https://docs.graphorlm.com/introduction)
- [Graphor Documentation](https://docs.graphorlm.com)
- [Graphor API Reference](https://docs.graphorlm.com/api-reference/overview)
- [API Tokens Guide](https://docs.graphorlm.com/guides/api-tokens)
- [Data Ingestion Guide](https://docs.graphorlm.com/guides/data-ingestion)
- [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/community-nodes/)

## License

[MIT](LICENSE)
