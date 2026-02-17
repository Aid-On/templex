#!/usr/bin/env npx tsx

import { readFileSync } from 'fs';
import { TemplateExtractor, formatTemplate } from '../src';
import type { LLMProvider } from '../src/types';

// Simple mock provider for testing without real LLM
class MockLLMProvider implements LLMProvider {
  async chat(_systemPrompt: string, userPrompt: string): Promise<string> {
    const lines = userPrompt.split('\n').filter(l => l.trim());
    const headings = lines.filter(l => l.startsWith('#'));
    const paragraphs = lines.filter(l => !l.startsWith('#') && l.length > 20);

    const elements = this.extractElements(headings, paragraphs);
    const keywords = this.extractKeywords(userPrompt);

    const result = {
      elements,
      keywords,
      patterns: {
        introduction: paragraphs[0]?.substring(0, 50) || 'Introduction pattern',
        body: 'Main content pattern',
        conclusion: paragraphs[paragraphs.length - 1]?.substring(0, 50) || 'Conclusion pattern'
      },
      confidence: 0.75
    };

    if (process.env.DEBUG) {
      process.stderr.write(`Mock LLM Response: ${JSON.stringify(result, null, 2)}\n`);
    }
    return JSON.stringify(result);
  }

  private extractElements(
    headings: string[],
    paragraphs: string[]
  ): Array<{ type: string; level?: number; pattern: string }> {
    const elements: Array<{ type: string; level?: number; pattern: string }> = [];
    for (const h of headings) {
      const level = h.match(/^#+/)?.[0].length || 1;
      elements.push({ type: 'heading', level, pattern: level === 1 ? 'Main Title' : `Section ${level}` });
    }
    if (paragraphs.length > 0) {
      elements.push({ type: 'paragraph', pattern: 'Body content' });
    }
    return elements;
  }

  private extractKeywords(text: string): string[] {
    const terms = new Set<string>();

    const englishWords = text.match(/[a-zA-Z][a-zA-Z0-9]{3,}/g) || [];
    for (const word of englishWords) {
      if (word.length > 4) terms.add(word.toLowerCase());
    }

    const katakanaWords = text.match(/[\u30A1-\u30FA\u30FC]{3,}/g) || [];
    for (const word of katakanaWords) terms.add(word);

    const kanjiWords = text.match(/[\u4E00-\u9FFF]{2,4}/g) || [];
    for (const word of kanjiWords) {
      if (!/(\u3059\u308B|\u3042\u308B|\u3044\u308B|\u306A\u308B|\u3067\u304D\u308B|\u3067\u3059|\u307E\u3059|\u3053\u306E|\u305D\u306E)/.test(word)) {
        terms.add(word);
      }
    }

    return Array.from(terms).slice(0, 10);
  }
}

// Real LLM Provider using Groq
class GroqProvider implements LLMProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0].message.content;
  }
}

const EXAMPLE_TEXT = `
# The Revolution of AI in Document Processing

Artificial Intelligence has fundamentally transformed how we process and understand text documents.

## Introduction to Document Analysis

Modern document processing leverages machine learning algorithms to extract meaningful patterns from unstructured text.

## Key Technologies

### Natural Language Processing
NLP forms the backbone of document understanding.

### Pattern Recognition
Advanced pattern recognition algorithms identify recurring structures.

## Applications in Industry

- Financial services use it for contract analysis
- Healthcare providers extract patient information
- Legal firms accelerate document review

## Future Perspectives

The future lies in more sophisticated AI models that understand context and nuance.

## Conclusion

As AI evolves, document processing capabilities will become increasingly sophisticated.
`;

function showHelp(): void {
  process.stdout.write(`
Templex CLI - Template Extractor

Usage:
  npx tsx cli.ts <file> [--mock|--groq]
  npx tsx cli.ts --example

Options:
  <file>      Path to text file to analyze
  --mock      Use mock provider (default, no API needed)
  --groq      Use Groq LLM (requires GROQ_API_KEY env)
  --example   Show example with built-in text
  --help      Show this help message
`);
}

function readInputText(args: string[]): string {
  if (args[0] === '--example') {
    process.stdout.write('Using example article...\n');
    return EXAMPLE_TEXT;
  }

  const text = readFileSync(args[0], 'utf-8');
  process.stdout.write(`Read file: ${args[0]}\n`);
  return text;
}

function createProvider(args: string[]): LLMProvider {
  if (args.includes('--groq')) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      process.stderr.write('GROQ_API_KEY environment variable is required for --groq mode\n');
      process.exit(1);
    }
    process.stdout.write('Using Groq LLM provider\n\n');
    return new GroqProvider(apiKey);
  }

  process.stdout.write('Using mock provider (no API needed)\n\n');
  return new MockLLMProvider();
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help') {
    showHelp();
    return;
  }

  const text = readInputText(args);
  const provider = createProvider(args);

  process.stdout.write('Analyzing document structure...\n\n');

  const extractor = new TemplateExtractor({
    provider,
    extractPatterns: true,
    extractKeywords: true,
    extractMetadata: true,
    minConfidence: 0.5
  });

  const startTime = Date.now();
  const result = await extractor.extract(text);
  const elapsed = Date.now() - startTime;

  process.stdout.write('Analysis complete!\n\n');
  process.stdout.write('\u2501'.repeat(60) + '\n');
  process.stdout.write(formatTemplate(result.template) + '\n');
  process.stdout.write('\u2501'.repeat(60) + '\n');
  process.stdout.write(`\nStatistics:\n`);
  process.stdout.write(`- Confidence: ${(result.confidence * 100).toFixed(1)}%\n`);
  process.stdout.write(`- Processing time: ${elapsed}ms\n`);
  process.stdout.write(`- Chunks processed: ${result.chunks}\n`);
}

main().catch(e => process.stderr.write(`Error: ${e instanceof Error ? e.message : String(e)}\n`));
