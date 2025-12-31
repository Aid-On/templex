#!/usr/bin/env npx tsx

import { readFileSync } from 'fs';
import { TemplateExtractor, formatTemplate } from '../src';
import type { LLMProvider } from '../src/types';

// Simple mock provider for testing without real LLM
class MockLLMProvider implements LLMProvider {
  async chat(systemPrompt: string, userPrompt: string): Promise<string> {
    // Analyze the text and return mock structured data
    const lines = userPrompt.split('\n').filter(l => l.trim());
    const headings = lines.filter(l => l.startsWith('#'));
    const paragraphs = lines.filter(l => !l.startsWith('#') && l.length > 20);
    
    const elements = [];
    if (headings.length > 0) {
      headings.forEach(h => {
        const level = h.match(/^#+/)?.[0].length || 1;
        elements.push({
          type: 'heading',
          level,
          pattern: level === 1 ? 'Main Title' : `Section ${level}`
        });
      });
    }
    
    if (paragraphs.length > 0) {
      elements.push({ type: 'paragraph', pattern: 'Body content' });
    }
    
    // Extract keywords (improved for Japanese/English mix)
    // Split by common delimiters and extract meaningful terms
    const terms = new Set<string>();
    
    // Extract English words
    const englishWords = userPrompt.match(/[a-zA-Z][a-zA-Z0-9]{3,}/g) || [];
    englishWords.forEach(word => {
      if (word.length > 4) {
        terms.add(word.toLowerCase());
      }
    });
    
    // Extract Japanese compound words (katakana sequences, kanji compounds)
    const katakanaWords = userPrompt.match(/[ァ-ヺー]{3,}/g) || [];
    katakanaWords.forEach(word => terms.add(word));
    
    // Extract meaningful kanji compounds (2-4 characters)
    const kanjiWords = userPrompt.match(/[一-龯]{2,4}/g) || [];
    kanjiWords.forEach(word => {
      // Filter out common particles and helper words
      if (!word.match(/(する|ある|いる|なる|できる|です|ます|この|その)/)) {
        terms.add(word);
      }
    });
    
    // Convert to array and limit
    const keywords = Array.from(terms).slice(0, 10);
    
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
    
    // Don't log in production mode
    if (process.env.DEBUG) {
      console.log('🔸 Mock LLM Response:', JSON.stringify(result, null, 2));
    }
    return JSON.stringify(result);
  }
}

// Real LLM Provider using Groq
class GroqProvider implements LLMProvider {
  constructor(private apiKey: string) {}
  
  async chat(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',  // Groq's most powerful model
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
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    if (process.env.DEBUG_LLM) {
      console.log('🤖 Groq Response:', content.substring(0, 500));
    }
    
    return content;
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help') {
    console.log(`
📄 Templex CLI - Template Extractor

Usage:
  npx tsx cli.ts <file> [--mock|--groq]
  npx tsx cli.ts --example
  
Options:
  <file>      Path to text file to analyze
  --mock      Use mock provider (default, no API needed)
  --groq      Use Groq LLM (requires GROQ_API_KEY env)
  --example   Show example with built-in text
  --help      Show this help message
  
Examples:
  npx tsx cli.ts article.txt --mock
  npx tsx cli.ts blog.md --groq
  npx tsx cli.ts --example
`);
    return;
  }
  
  let text: string;
  let provider: LLMProvider;
  
  // Handle example mode
  if (args[0] === '--example') {
    text = `
# The Revolution of AI in Document Processing

Artificial Intelligence has fundamentally transformed how we process and understand text documents. This technological advancement enables unprecedented capabilities in content analysis.

## Introduction to Document Analysis

Modern document processing leverages machine learning algorithms to extract meaningful patterns from unstructured text. These systems can identify document structures, key concepts, and semantic relationships with remarkable accuracy.

## Key Technologies

### Natural Language Processing
NLP forms the backbone of document understanding, enabling machines to comprehend human language in its various forms and contexts.

### Pattern Recognition
Advanced pattern recognition algorithms identify recurring structures and templates within documents, facilitating automated classification and extraction.

## Applications in Industry

Organizations across various sectors are implementing document processing solutions:

- Financial services use it for contract analysis
- Healthcare providers extract patient information
- Legal firms accelerate document review
- Publishers automate content categorization

## Future Perspectives

The future of document processing lies in more sophisticated AI models that can understand context, nuance, and domain-specific knowledge. We're moving towards systems that not only extract information but truly comprehend document intent and meaning.

## Conclusion

As AI technology continues to evolve, document processing capabilities will become increasingly sophisticated, enabling new applications and transforming how we interact with textual information.
`;
    console.log('📝 Using example article...\n');
  } else {
    // Read file
    try {
      text = readFileSync(args[0], 'utf-8');
      console.log(`📖 Read file: ${args[0]}\n`);
    } catch (error) {
      console.error(`❌ Error reading file: ${args[0]}`);
      process.exit(1);
    }
  }
  
  // Choose provider
  const useGroq = args.includes('--groq');
  
  if (useGroq) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error('❌ GROQ_API_KEY environment variable is required for --groq mode');
      process.exit(1);
    }
    provider = new GroqProvider(apiKey);
    console.log('🤖 Using Groq LLM provider\n');
  } else {
    provider = new MockLLMProvider();
    console.log('🎭 Using mock provider (no API needed)\n');
  }
  
  // Extract template
  console.log('🔍 Analyzing document structure...\n');
  
  const extractor = new TemplateExtractor({
    provider,
    extractPatterns: true,
    extractKeywords: true,
    extractMetadata: true,
    minConfidence: 0.5 // Lower threshold for testing
  });
  
  try {
    const startTime = Date.now();
    const result = await extractor.extract(text);
    const elapsed = Date.now() - startTime;
    
    console.log('✅ Analysis complete!\n');
    
    // Debug info
    if (args.includes('--debug')) {
      console.log('🐛 Debug - Template object:');
      console.log(JSON.stringify(result.template, null, 2));
      console.log('\n');
    }
    
    console.log('━'.repeat(60));
    console.log(formatTemplate(result.template));
    console.log('━'.repeat(60));
    console.log('\n📊 Statistics:');
    console.log(`- Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`- Processing time: ${elapsed}ms`);
    console.log(`- Chunks processed: ${result.chunks}`);
    
    if (result.errors && result.errors.length > 0) {
      console.log('\n⚠️ Warnings:');
      result.errors.forEach(e => console.log(`  - ${e}`));
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main().catch(console.error);