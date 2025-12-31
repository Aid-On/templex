import { describe, it, expect, vi } from 'vitest';
import { TemplateExtractor, formatTemplate, mergeTemplates, compareTemplates } from '../src';
import type { DocumentTemplate } from '../src/types';
import type { LLMProvider } from '../src/types';

// Mock LLM Provider
const createMockProvider = (): LLMProvider => ({
  chat: vi.fn().mockResolvedValue(
    JSON.stringify({
      elements: [
        { type: 'heading', level: 1, pattern: 'Title' },
        { type: 'paragraph', pattern: 'Introduction' },
        { type: 'heading', level: 2, pattern: 'Main Point' },
        { type: 'paragraph', pattern: 'Explanation' },
      ],
      keywords: ['AI', 'template', 'extraction'],
      patterns: {
        introduction: 'Brief overview',
        body: 'Detailed explanation',
        conclusion: 'Summary'
      },
      confidence: 0.85
    })
  )
});

describe('TemplateExtractor', () => {
  it('should extract template from text', async () => {
    const provider = createMockProvider();
    const extractor = new TemplateExtractor({
      provider,
      model: 'test-model',
      extractPatterns: true,
      extractKeywords: true
    });

    const text = `
# AI and Template Extraction

Artificial Intelligence has revolutionized how we process and understand text.

## Key Concepts

Template extraction allows us to identify patterns in documents.

## Conclusion

This technology enables better content analysis.
    `.trim();

    const result = await extractor.extract(text);

    expect(result.template).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.processingTime).toBeGreaterThan(0);
    expect(result.chunks).toBeGreaterThan(0);
  });

  it('should handle empty text', async () => {
    const provider = createMockProvider();
    provider.chat = vi.fn().mockResolvedValue(
      JSON.stringify({
        elements: [],
        keywords: [],
        patterns: {},
        confidence: 0
      })
    );

    const extractor = new TemplateExtractor({
      provider,
      minConfidence: 0
    });

    const result = await extractor.extract('');
    
    expect(result.template.structure).toHaveLength(0);
    expect(result.confidence).toBe(0);
  });
});

describe('formatTemplate', () => {
  it('should format template as markdown', () => {
    const template: DocumentTemplate = {
      title: 'Test Article',
      structure: [
        { type: 'heading', level: 1, pattern: 'Title' },
        { type: 'paragraph', intent: 'introduction' }
      ],
      metadata: {
        genre: 'technical',
        audience: 'developers'
      },
      patterns: {
        introduction: 'Hook the reader',
        body: 'Explain concepts'
      },
      keywords: [
        { term: 'AI', weight: 0.9, context: 'main topic' },
        { term: 'template', weight: 0.7, context: 'method' }
      ]
    };

    const formatted = formatTemplate(template);
    
    expect(formatted).toContain('# Test Article');
    expect(formatted).toContain('## Metadata');
    expect(formatted).toContain('genre: technical');
    expect(formatted).toContain('## Structure');
    expect(formatted).toContain('heading (level 1)');
    expect(formatted).toContain('## Patterns');
    expect(formatted).toContain('Hook the reader');
    expect(formatted).toContain('## Keywords');
    expect(formatted).toContain('AI (weight: 0.90)');
  });
});

describe('mergeTemplates', () => {
  it('should merge multiple templates', () => {
    const template1: DocumentTemplate = {
      title: 'Article 1',
      structure: [
        { type: 'heading', level: 1 },
        { type: 'paragraph' }
      ],
      metadata: { genre: 'technical' },
      patterns: { introduction: 'Start here' },
      keywords: [
        { term: 'AI', weight: 0.9, context: 'main' }
      ]
    };

    const template2: DocumentTemplate = {
      title: 'Article 2',
      structure: [
        { type: 'heading', level: 2 },
        { type: 'list' }
      ],
      metadata: { audience: 'general' },
      patterns: { body: 'Main content' },
      keywords: [
        { term: 'ML', weight: 0.8, context: 'tech' },
        { term: 'AI', weight: 0.85, context: 'topic' }
      ]
    };

    const merged = mergeTemplates([template1, template2]);
    
    expect(merged.structure).toHaveLength(4);
    expect(merged.metadata).toHaveProperty('genre', 'technical');
    expect(merged.metadata).toHaveProperty('audience', 'general');
    expect(merged.patterns).toHaveProperty('introduction');
    expect(merged.patterns).toHaveProperty('body');
    expect(merged.keywords).toHaveLength(2);
  });

  it('should handle single template', () => {
    const template: DocumentTemplate = {
      title: 'Single',
      structure: [],
      metadata: {},
      patterns: {},
      keywords: []
    };

    const merged = mergeTemplates([template]);
    expect(merged).toEqual(template);
  });

  it('should throw on empty array', () => {
    expect(() => mergeTemplates([])).toThrow('No templates to merge');
  });
});

describe('compareTemplates', () => {
  it('should return 1 for identical templates', () => {
    const template: DocumentTemplate = {
      title: 'Test',
      structure: [
        { type: 'heading', level: 1 },
        { type: 'paragraph' }
      ],
      metadata: { genre: 'article' },
      patterns: { intro: 'start' },
      keywords: [
        { term: 'test', weight: 1, context: 'main' }
      ]
    };

    const similarity = compareTemplates(template, template);
    expect(similarity).toBe(1);
  });

  it('should return 0 for completely different templates', () => {
    const template1: DocumentTemplate = {
      title: 'A',
      structure: [{ type: 'heading' }],
      metadata: { genre: 'news' },
      patterns: { a: 'a' },
      keywords: [{ term: 'a', weight: 1, context: 'a' }]
    };

    const template2: DocumentTemplate = {
      title: 'B',
      structure: [{ type: 'list' }],
      metadata: { genre: 'blog' },
      patterns: { b: 'b' },
      keywords: [{ term: 'b', weight: 1, context: 'b' }]
    };

    const similarity = compareTemplates(template1, template2);
    expect(similarity).toBe(0);
  });

  it('should calculate partial similarity', () => {
    const template1: DocumentTemplate = {
      title: 'Article',
      structure: [
        { type: 'heading' },
        { type: 'paragraph' }
      ],
      metadata: { genre: 'tech' },
      patterns: { intro: 'start' },
      keywords: [
        { term: 'AI', weight: 1, context: 'main' },
        { term: 'ML', weight: 0.8, context: 'related' }
      ]
    };

    const template2: DocumentTemplate = {
      title: 'Post',
      structure: [
        { type: 'heading' },
        { type: 'list' }
      ],
      metadata: { genre: 'tech' },
      patterns: { intro: 'begin' },
      keywords: [
        { term: 'AI', weight: 0.9, context: 'topic' },
        { term: 'DL', weight: 0.7, context: 'tech' }
      ]
    };

    const similarity = compareTemplates(template1, template2);
    expect(similarity).toBeGreaterThan(0);
    expect(similarity).toBeLessThan(1);
  });
});