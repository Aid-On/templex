import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { ArticleGenerator, type ArticleData, type GeneratorOptions } from '../../src/generator';
import type { AbstractTemplate, LLMProvider } from '../../src/types';

/**
 * Helper to extract the user prompt from a mock provider's call args
 */
function getUserPrompt(chatMock: Mock): string {
  return chatMock.mock.calls[0][1];
}

const createSimpleTemplate = (overrides?: Partial<AbstractTemplate>): AbstractTemplate => ({
  name: 'Test',
  formula: 'Formula',
  components: [],
  flow: 'Linear',
  persuasionTechniques: [],
  ...overrides,
});

describe('ArticleGenerator', () => {
  let mockProvider: LLMProvider;
  let generator: ArticleGenerator;

  beforeEach(() => {
    mockProvider = {
      chat: vi.fn().mockResolvedValue(
        '# Generated Article\n\nThis is the generated content.'
      )
    };

    generator = new ArticleGenerator(mockProvider);
  });

  describe('constructor', () => {
    it('should create generator with default model', () => {
      expect(new ArticleGenerator(mockProvider)).toBeDefined();
    });

    it('should create generator with custom default options', () => {
      const options: GeneratorOptions = {
        temperature: 0.5,
        maxTokens: 2000,
        systemPrompt: 'Custom system prompt'
      };
      expect(new ArticleGenerator(mockProvider, options)).toBeDefined();
    });
  });

  describe('generate', () => {
    const testTemplate: AbstractTemplate = {
      name: 'Test Template',
      formula: '[Hook] + [Problem] + [Solution]',
      components: [
        { name: 'Hook', purpose: 'Grab attention', examples: ['Example hook'], patterns: ['Question', 'Statement'], position: 1, weight: 0.3 },
        { name: 'Problem', purpose: 'Identify the issue', examples: ['Problem example'], patterns: ['Statistics', 'Story'], position: 2, weight: 0.4 },
        { name: 'Solution', purpose: 'Provide the answer', examples: ['Solution example'], patterns: ['Steps', 'Tools'], position: 3, weight: 0.3 }
      ],
      flow: 'Linear',
      persuasionTechniques: ['Authority', 'Social Proof']
    };

    const testData: ArticleData = {
      topic: 'AI in Business',
      fearHook: 'Your competitors are already using AI',
      evidence: '80% of Fortune 500 companies use AI',
      solution: 'Implement AI gradually',
      examples: [{ industry: 'Retail', company: 'Amazon', result: '35% increase in sales' }],
      japanContext: 'Japanese companies are leading in robotics',
      urgency: 'Start within Q1 2024',
      cta: 'Contact our AI consultants'
    };

    it('should generate article with template and data', async () => {
      const result = await generator.generate(testTemplate, testData);
      expect(result).toContain('Generated Article');
      expect(mockProvider.chat).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ temperature: 0.7, maxTokens: 3000 })
      );
    });

    it('should use custom options when provided', async () => {
      await generator.generate(testTemplate, testData, {
        temperature: 0.9, maxTokens: 4000, systemPrompt: 'You are a technical writer'
      });
      expect(mockProvider.chat).toHaveBeenCalledWith(
        'You are a technical writer',
        expect.any(String),
        expect.objectContaining({ temperature: 0.9, maxTokens: 4000 })
      );
    });

    it('should build prompt with all template components', async () => {
      await generator.generate(testTemplate, testData);
      const userPrompt = getUserPrompt(mockProvider.chat as Mock);
      expect(userPrompt).toContain('Test Template');
      expect(userPrompt).toContain('[Hook] + [Problem] + [Solution]');
      expect(userPrompt).toContain('Hook');
      expect(userPrompt).toContain('Grab attention');
      expect(userPrompt).toContain('30%');
    });

    it('should include article data in prompt', async () => {
      await generator.generate(testTemplate, testData);
      const userPrompt = getUserPrompt(mockProvider.chat as Mock);
      expect(userPrompt).toContain('AI in Business');
      expect(userPrompt).toContain('Your competitors are already using AI');
      expect(userPrompt).toContain('80% of Fortune 500 companies use AI');
      expect(userPrompt).toContain('Amazon');
      expect(userPrompt).toContain('35% increase in sales');
    });

    it('should handle partial data gracefully', async () => {
      await generator.generate(testTemplate, { topic: 'Simple Topic' });
      const userPrompt = getUserPrompt(mockProvider.chat as Mock);
      expect(userPrompt).toContain('Simple Topic');
      expect(userPrompt).not.toContain('\u6050\u6016\u30D5\u30C3\u30AF: undefined');
    });

    it('should handle empty examples array', async () => {
      await generator.generate(testTemplate, { topic: 'Topic', examples: [] });
      const userPrompt = getUserPrompt(mockProvider.chat as Mock);
      expect(userPrompt).not.toContain('\u696D\u754C\u5225\u4E8B\u4F8B:');
    });
  });

  describe('generateFromPattern', () => {
    it('should generate from fear-driven pattern', async () => {
      const result = await generator.generateFromPattern('fear-driven', {
        topic: 'Digital Transformation', fearHook: 'Are you falling behind?', solution: 'Cloud migration'
      });
      expect(result).toBeDefined();
      const userPrompt = getUserPrompt(mockProvider.chat as Mock);
      expect(userPrompt).toContain('Fear-Driven Persuasion');
    });

    it('should generate from problem-solution pattern', async () => {
      await generator.generateFromPattern('problem-solution', {
        topic: 'Performance Issues', solution: 'Optimization techniques'
      });
      const userPrompt = getUserPrompt(mockProvider.chat as Mock);
      expect(userPrompt).toContain('Problem-Solution Framework');
    });

    it('should throw error for unknown pattern', async () => {
      await expect(
        generator.generateFromPattern('unknown-pattern', { topic: 'Test' })
      ).rejects.toThrow('Unknown pattern: unknown-pattern');
    });
  });

  describe('error handling', () => {
    it('should handle provider errors', async () => {
      mockProvider.chat = vi.fn().mockRejectedValue(new Error('Provider error'));
      await expect(generator.generate(createSimpleTemplate(), { topic: 'Test' })).rejects.toThrow('Provider error');
    });

    it('should handle network errors', async () => {
      mockProvider.chat = vi.fn().mockRejectedValue(new Error('Network timeout'));
      await expect(generator.generateFromPattern('fear-driven', { topic: 'Test' })).rejects.toThrow('Network timeout');
    });
  });

  describe('prompt building', () => {
    it('should format component information correctly', async () => {
      const template = createSimpleTemplate({
        name: 'Detailed Template',
        formula: 'Complex Formula',
        components: [{
          name: 'Component 1', purpose: 'Purpose 1', examples: ['Ex1', 'Ex2'],
          patterns: ['Pattern1', 'Pattern2'], position: 1, weight: 0.5
        }],
        flow: 'Pyramid',
        persuasionTechniques: ['Scarcity', 'Authority']
      });
      await generator.generate(template, { topic: 'Test' });
      const userPrompt = getUserPrompt(mockProvider.chat as Mock);
      expect(userPrompt).toContain('Component 1');
      expect(userPrompt).toContain('Purpose 1');
      expect(userPrompt).toContain('50%');
      expect(userPrompt).toContain('Pattern1, Pattern2');
    });

    it('should include generation rules', async () => {
      await generator.generate(createSimpleTemplate(), { topic: 'Test' });
      const userPrompt = getUserPrompt(mockProvider.chat as Mock);
      expect(userPrompt).toContain('\u30DE\u30FC\u30AF\u30C0\u30A6\u30F3\u5F62\u5F0F\u3067\u51FA\u529B');
      expect(userPrompt).toContain('\u898B\u51FA\u3057\u306F\u968E\u5C64\u7684\u306B\u69CB\u6210');
    });

    it('should handle multiple examples properly', async () => {
      const data: ArticleData = {
        topic: 'AI Implementation',
        examples: [
          { industry: 'Healthcare', company: 'Hospital A', result: '50% efficiency gain' },
          { industry: 'Finance', company: 'Bank B', result: '30% cost reduction' },
          { industry: 'Retail', company: 'Store C', result: '40% sales increase' }
        ]
      };
      await generator.generate(createSimpleTemplate(), data);
      const userPrompt = getUserPrompt(mockProvider.chat as Mock);
      expect(userPrompt).toContain('Healthcare: Hospital A - 50% efficiency gain');
      expect(userPrompt).toContain('Finance: Bank B - 30% cost reduction');
      expect(userPrompt).toContain('Retail: Store C - 40% sales increase');
    });
  });

  describe('preset patterns', () => {
    it('should have correct fear-driven pattern structure', async () => {
      await generator.generateFromPattern('fear-driven', { topic: 'Test' });
      const userPrompt = getUserPrompt(mockProvider.chat as Mock);
      expect(userPrompt).toContain('\u6050\u6016\u30D5\u30C3\u30AF');
      expect(userPrompt).toContain('\u8EAB\u8FD1\u306A\u4F8B\u8A3C');
      expect(userPrompt).toContain('\u7C21\u5358\u306A\u89E3\u8AAC');
    });

    it('should have correct problem-solution pattern structure', async () => {
      await generator.generateFromPattern('problem-solution', { topic: 'Test' });
      const userPrompt = getUserPrompt(mockProvider.chat as Mock);
      expect(userPrompt).toContain('\u554F\u984C\u63D0\u8D77');
      expect(userPrompt).toContain('\u6DF1\u523B\u6027\u5F37\u8ABF');
      expect(userPrompt).toContain('\u89E3\u6C7A\u7B56\u63D0\u793A');
    });
  });
});
