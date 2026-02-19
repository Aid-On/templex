import { describe, it, expect } from 'vitest';
import { TemplateExtractor } from '../../src/core';
import { ArticleGenerator } from '../../src/generator';
import type { LLMProvider } from '../../src/types';

// Mock LLM Provider for testing
class MockLLMProvider implements LLMProvider {
  async chat(systemPrompt: string, _userPrompt: string, _options?: { temperature?: number; maxTokens?: number }): Promise<string> {
    // Simulate template extraction response
    if (systemPrompt.includes('template structure') || systemPrompt.includes('Extract the document template') || systemPrompt.includes('Extract template structure')) {
      return JSON.stringify({
        elements: [
          { type: 'heading', level: 1 },
          { type: 'paragraph' },
          { type: 'heading', level: 2 },
          { type: 'list' },
          { type: 'heading', level: 2 },
          { type: 'paragraph' }
        ],
        keywords: [
          { term: 'AI', weight: 0.9 },
          { term: 'automation', weight: 0.8 },
          { term: 'efficiency', weight: 0.7 }
        ],
        patterns: {
          'opening': 'hook-problem-solution',
          'structure': 'hierarchical'
        },
        confidence: 0.85
      });
    }
    
    // Simulate article generation
    if (systemPrompt.includes('article') || systemPrompt.includes('記事を生成')) {
      return `# AI Revolution in Business

## The Problem
Many businesses struggle to keep up with technological advancement.

## The Solution  
Implementing AI gradually can transform operations:
- Start with automation of repetitive tasks
- Use data analytics for insights
- Scale AI adoption based on results

## Conclusion
The future belongs to AI-enabled businesses.`;
    }
    
    // Default response for template extraction that's not caught above
    return JSON.stringify({
      elements: [{ type: 'paragraph' }],
      keywords: [{ term: 'default', weight: 0.5 }],
      patterns: { 'structure': 'simple' },
      confidence: 0.5
    });
  }
}

describe('Template Extraction Integration', () => {
  const mockProvider = new MockLLMProvider();

  describe('Full extraction pipeline', () => {
    it('should extract template from a document', async () => {
      const extractor = new TemplateExtractor({
        provider: mockProvider, extractPatterns: true, extractKeywords: true, language: 'en'
      });

      const sampleDocument = `
        # The Rise of AI in Modern Business
        Artificial intelligence is transforming how companies operate.
        ## Current Challenges
        Many organizations face significant hurdles:
        - Legacy systems that can't integrate AI
        - Lack of skilled personnel
        - High implementation costs
        ## Smart Solutions
        The key is gradual implementation:
        1. Start small with pilot projects
        2. Measure impact and ROI
        3. Scale successful initiatives
        ## Real World Results
        Companies using AI report:
        - 35% increase in productivity
        - 50% reduction in manual tasks
        - 25% improvement in customer satisfaction
      `;

      const result = await extractor.extract(sampleDocument, {
        chunkSize: 2000,
        onProgress: (progress) => {
          console.log(`Progress: ${progress.phase} - ${progress.message}`);
        }
      });

      expect(result).toBeDefined();
      expect(result.template).toBeDefined();
      expect(result.processingTime).toBeDefined();
      expect(result.template.structure).toBeInstanceOf(Array);
      expect(result.template.structure.length).toBeGreaterThan(0);
      expect(result.template.keywords).toBeInstanceOf(Array);
      expect(result.template.keywords.length).toBeGreaterThan(0);
      expect(result.template.keywords[0]).toHaveProperty('term');
      expect(result.template.keywords[0]).toHaveProperty('weight');
      expect(result.template.patterns).toBeInstanceOf(Object);
      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.chunks).toBeGreaterThanOrEqual(1);
    });

    it('should handle multiple languages', async () => {
      const extractorJa = new TemplateExtractor({ provider: mockProvider, language: 'ja' });
      const extractorEn = new TemplateExtractor({ provider: mockProvider, language: 'en' });
      const document = 'Sample document for testing';
      const resultJa = await extractorJa.extract(document);
      const resultEn = await extractorEn.extract(document);
      expect(resultJa).toBeDefined();
      expect(resultEn).toBeDefined();
    });
  });

  describe('Template extraction with refinement', () => {
    it('should use iterative refinement for better results', async () => {
      const extractor = new TemplateExtractor({
        provider: mockProvider, maxDepth: 3, useIterativeRefinement: true
      });
      const document = `
        Complex document with multiple sections and various patterns
        that would benefit from iterative refinement process.
      `;
      const result = await extractor.extract(document, { chunkSize: 100 });
      expect(result).toBeDefined();
      expect(result.template).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should handle extraction errors gracefully', async () => {
      const errorProvider: LLMProvider = {
        chat: async () => { throw new Error('LLM API error'); }
      };
      const extractor = new TemplateExtractor({ provider: errorProvider });
      const result = await extractor.extract('test document');
      expect(result).toBeDefined();
      expect(result.template).toBeDefined();
      expect(result.template.structure).toEqual([]);
      expect(result.confidence).toBe(0);
    });

    it('should handle partial failures', async () => {
      let callCount = 0;
      const partialFailProvider: LLMProvider = {
        chat: async () => {
          callCount++;
          if (callCount === 1) throw new Error('Temporary failure');
          return JSON.stringify({ elements: [], keywords: [], patterns: {}, confidence: 0.5 });
        }
      };
      const extractor = new TemplateExtractor({ provider: partialFailProvider });
      const result = await extractor.extract('test', { chunkSize: 50 });
      expect(result).toBeDefined();
    });
  });

  describe('Generation from extracted template', () => {
    it('should generate article using extracted template', async () => {
      const extractor = new TemplateExtractor({ provider: mockProvider });
      const sourceDoc = `
        # How AI Changes Everything
        ## The Problem
        Traditional methods are becoming obsolete.
        ## The Solution
        AI provides intelligent automation.
        ## The Impact
        Businesses see dramatic improvements.
      `;
      const extractionResult = await extractor.extract(sourceDoc);
      
      // Then use the template to generate new content
      const generator = new ArticleGenerator(mockProvider);
      
      const defaultTemplate = {
        name: 'Extracted Template', formula: 'Problem + Solution + Impact',
        components: [], flow: 'Linear' as const, persuasionTechniques: []
      };
      const newArticle = await generator.generate(
        extractionResult.template.abstractTemplate || defaultTemplate,
        {
          topic: 'Blockchain in Healthcare',
          fearHook: 'Healthcare data breaches are increasing',
          evidence: '70% of hospitals experienced cyber attacks',
          solution: 'Blockchain provides immutable security',
          examples: [{ industry: 'Healthcare', company: 'MediChain', result: '99.9% security improvement' }],
          urgency: 'Implement before next audit',
          cta: 'Schedule a security assessment'
        }
      );
      expect(newArticle).toBeDefined();
      expect(newArticle).toContain('AI Revolution');
      expect(newArticle.length).toBeGreaterThan(100);
    });
  });

  describe('Performance with large documents', () => {
    it('should handle large documents efficiently', async () => {
      const extractor = new TemplateExtractor({ provider: mockProvider });
      const largeDoc = Array(100).fill(0).map((_, i) =>
        `Section ${i + 1}: This is a paragraph with substantial content to test chunking.`
      ).join('\n\n');
      const startTime = Date.now();
      const result = await extractor.extract(largeDoc, {
        chunkSize: 1000,
        onProgress: (progress) => {
          expect(progress.phase).toBeDefined();
          expect(progress.current).toBeGreaterThanOrEqual(0);
          expect(progress.total).toBeGreaterThanOrEqual(1);
        }
      });
      const processingTime = Date.now() - startTime;
      expect(result).toBeDefined();
      expect(result.processingTime).toBeLessThanOrEqual(processingTime + 100);
      expect(result.chunks).toBeGreaterThanOrEqual(1);
    });
  });
});