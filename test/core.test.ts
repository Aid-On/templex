import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TemplateExtractor } from '../src/core';
import type { 
  LLMProvider, 
  ExtractionConfig, 
  ExtractionOptions,
  ProgressInfo 
} from '../src/types';

describe('TemplateExtractor', () => {
  let mockProvider: LLMProvider;
  let extractor: TemplateExtractor;

  beforeEach(() => {
    mockProvider = {
      chat: vi.fn().mockResolvedValue(JSON.stringify({
        abstractTemplate: {
          name: 'Test Template',
          formula: '[A] + [B]',
          components: [],
          flow: 'Linear',
          persuasionTechniques: []
        },
        elements: [
          { type: 'heading', level: 1, content: 'Test Heading' },
          { type: 'paragraph', content: 'Test content' }
        ],
        keywords: ['test', 'example'],
        patterns: { intro: 'pattern' },
        confidence: 0.8
      }))
    };

    const config: ExtractionConfig = {
      provider: mockProvider,
      model: 'gpt-4',
      maxDepth: 1,
      language: 'ja'
    };

    extractor = new TemplateExtractor(config);
  });

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      const config: ExtractionConfig = {
        provider: mockProvider,
        model: 'custom-model',
        maxDepth: 5,
        language: 'en'
      };
      
      const customExtractor = new TemplateExtractor(config);
      expect(customExtractor).toBeDefined();
    });

    it('should validate and normalize config', () => {
      const config: ExtractionConfig = {
        provider: mockProvider,
        maxDepth: 100, // Should be clamped to 10
        minConfidence: 2 // Should be clamped to 1
      };
      
      const customExtractor = new TemplateExtractor(config);
      expect(customExtractor).toBeDefined();
    });
  });

  describe('extract', () => {
    it('should extract template from text', async () => {
      const text = 'This is a test document with some content.';
      const result = await extractor.extract(text);
      
      expect(result).toBeDefined();
      expect(result.template).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.chunks).toBeGreaterThan(0);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should handle empty text', async () => {
      const result = await extractor.extract('');
      
      expect(result).toBeDefined();
      expect(result.template).toBeDefined();
      expect(result.chunks).toBe(0);
    });

    it('should call progress callback', async () => {
      const progressCallback = vi.fn();
      const text = 'Test document';
      
      await extractor.extract(text, {
        onProgress: progressCallback
      });
      
      expect(progressCallback).toHaveBeenCalled();
      
      // Check that all phases were reported
      const calls = progressCallback.mock.calls.map(call => call[0] as ProgressInfo);
      const phases = new Set(calls.map(c => c.phase));
      
      expect(phases.has('chunking')).toBe(true);
      expect(phases.has('analyzing')).toBe(true);
      expect(phases.has('finalizing')).toBe(true);
    });

    it('should handle extraction options', async () => {
      const options: ExtractionOptions = {
        chunkSize: 1000,
        overlapRatio: 0.2,
        verbose: true
      };
      
      const result = await extractor.extract('Test text', options);
      expect(result).toBeDefined();
    });

    it('should handle LLM errors gracefully', async () => {
      mockProvider.chat = vi.fn().mockRejectedValue(new Error('LLM Error'));
      
      await expect(extractor.extract('Test text')).rejects.toThrow('Template extraction failed');
    });
  });

  describe('JSON parsing', () => {
    it('should parse valid JSON response', async () => {
      const validResponse = {
        elements: [{ type: 'heading', level: 1 }],
        keywords: ['test'],
        patterns: {},
        confidence: 0.9
      };
      
      mockProvider.chat = vi.fn().mockResolvedValue(JSON.stringify(validResponse));
      
      const result = await extractor.extract('Test');
      expect(result.template.structure).toHaveLength(1);
      expect(result.confidence).toBeCloseTo(0.9, 1);
    });

    it('should handle JSON with markdown code blocks', async () => {
      const jsonWithMarkdown = '```json\n' + JSON.stringify({
        elements: [{ type: 'paragraph' }],
        keywords: ['test'],
        patterns: {},
        confidence: 0.7
      }) + '\n```';
      
      mockProvider.chat = vi.fn().mockResolvedValue(jsonWithMarkdown);
      
      const result = await extractor.extract('Test');
      expect(result.template.structure).toHaveLength(1);
    });

    it('should handle malformed JSON with fallback', async () => {
      const malformedJson = '{ "elements": [{ type: "heading" }], invalid json here';
      
      mockProvider.chat = vi.fn().mockResolvedValue(malformedJson);
      
      const result = await extractor.extract('Test');
      expect(result).toBeDefined();
      // Should use fallback parsing
      expect(result.confidence).toBeLessThanOrEqual(0.5);
    });

    it('should handle JSON with comments', async () => {
      const jsonWithComments = `{
        // This is a comment
        "elements": [{ "type": "heading" }],
        "keywords": ["test"], // Another comment
        "patterns": {},
        "confidence": 0.8
      }`;
      
      mockProvider.chat = vi.fn().mockResolvedValue(jsonWithComments);
      
      const result = await extractor.extract('Test');
      expect(result.template.structure).toHaveLength(1);
    });

    it('should handle trailing commas', async () => {
      const jsonWithTrailingCommas = `{
        "elements": [{ "type": "heading" },],
        "keywords": ["test",],
        "patterns": {},
        "confidence": 0.8,
      }`;
      
      mockProvider.chat = vi.fn().mockResolvedValue(jsonWithTrailingCommas);
      
      const result = await extractor.extract('Test');
      expect(result.template.structure).toHaveLength(1);
    });
  });

  describe('iterative refinement', () => {
    it('should use iterative refinement when maxDepth > 1', async () => {
      const config: ExtractionConfig = {
        provider: mockProvider,
        maxDepth: 2 // Triggers iterative refinement
      };
      
      const iterativeExtractor = new TemplateExtractor(config);
      
      // Mock multiple chunks
      let callCount = 0;
      mockProvider.chat = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve(JSON.stringify({
          elements: [{ type: 'heading', level: callCount }],
          keywords: [`keyword${callCount}`],
          patterns: {},
          confidence: 0.5 + callCount * 0.1
        }));
      });
      
      const result = await iterativeExtractor.extract('Long text that requires multiple chunks');
      expect(result).toBeDefined();
      expect(mockProvider.chat).toHaveBeenCalled();
    });

    it('should use iterative refinement when explicitly enabled', async () => {
      const config: ExtractionConfig = {
        provider: mockProvider,
        maxDepth: 1,
        useIterativeRefinement: true
      };
      
      const iterativeExtractor = new TemplateExtractor(config);
      const result = await iterativeExtractor.extract('Test text');
      expect(result).toBeDefined();
    });
  });

  describe('multi-language support', () => {
    it('should use Japanese prompts by default', async () => {
      const result = await extractor.extract('テストテキスト');
      expect(mockProvider.chat).toHaveBeenCalled();
      // The prompt builder should have been initialized with 'ja'
      expect(result).toBeDefined();
    });

    it('should use English prompts when specified', async () => {
      const config: ExtractionConfig = {
        provider: mockProvider,
        language: 'en'
      };
      
      const enExtractor = new TemplateExtractor(config);
      const result = await enExtractor.extract('Test text');
      expect(result).toBeDefined();
    });
  });

  describe('chunk processing', () => {
    it('should handle multiple chunks', async () => {
      const longText = 'a'.repeat(5000); // Long text to force multiple chunks
      
      let chunkCount = 0;
      mockProvider.chat = vi.fn().mockImplementation(() => {
        chunkCount++;
        return Promise.resolve(JSON.stringify({
          elements: [{ type: 'paragraph', content: `Chunk ${chunkCount}` }],
          keywords: [`keyword${chunkCount}`],
          patterns: {},
          confidence: 0.8
        }));
      });
      
      const result = await extractor.extract(longText);
      expect(chunkCount).toBeGreaterThan(1);
      expect(result.chunks).toBe(chunkCount);
    });

    it('should merge chunks using similarity logic', async () => {
      // Mock similar elements in different chunks
      let callCount = 0;
      mockProvider.chat = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve(JSON.stringify({
          elements: [
            { type: 'heading', level: 1, content: 'Introduction' },
            { type: 'paragraph', content: `Paragraph ${callCount}` }
          ],
          keywords: ['common', `unique${callCount}`],
          patterns: {},
          confidence: 0.8
        }));
      });
      
      const result = await extractor.extract('Text requiring multiple chunks analysis');
      
      // Should merge similar headings
      const headings = result.template.structure.filter(e => 
        e.type === 'heading' && e.content === 'Introduction'
      );
      expect(headings.length).toBeLessThanOrEqual(1); // Similar headings should be merged
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      mockProvider.chat = vi.fn().mockRejectedValue(new Error('Network error'));
      
      await expect(extractor.extract('Test')).rejects.toThrow('Template extraction failed');
    });

    it('should handle timeout errors', async () => {
      mockProvider.chat = vi.fn().mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );
      
      await expect(extractor.extract('Test')).rejects.toThrow();
    });

    it('should handle completely invalid responses', async () => {
      mockProvider.chat = vi.fn().mockResolvedValue('Not JSON at all');
      
      const result = await extractor.extract('Test');
      expect(result).toBeDefined();
      expect(result.confidence).toBeLessThanOrEqual(0.3); // Low confidence for fallback
    });
  });

  describe('validation integration', () => {
    it('should validate and normalize extracted templates', async () => {
      mockProvider.chat = vi.fn().mockResolvedValue(JSON.stringify({
        elements: [
          { type: 'heading', level: 10 }, // Invalid level, should be normalized
          { type: 'paragraph' }
        ],
        keywords: ['test'],
        patterns: {},
        confidence: 2.0 // Invalid confidence, should be clamped
      }));
      
      const result = await extractor.extract('Test');
      
      // Check that validation was applied
      const heading = result.template.structure.find(e => e.type === 'heading');
      expect(heading?.level).toBeGreaterThanOrEqual(1);
      expect(heading?.level).toBeLessThanOrEqual(6);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });
});