import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ArticleGenerator, type ArticleData, type GeneratorOptions } from '../../src/generator';
import type { AbstractTemplate, LLMProvider } from '../../src/types';

describe('ArticleGenerator', () => {
  let mockProvider: LLMProvider;
  let generator: ArticleGenerator;

  beforeEach(() => {
    mockProvider = {
      chat: vi.fn().mockResolvedValue(
        '# Generated Article\n\nThis is the generated content.'
      )
    } as any;

    generator = new ArticleGenerator(mockProvider);
  });

  describe('constructor', () => {
    it('should create generator with default model', () => {
      const gen = new ArticleGenerator(mockProvider);
      expect(gen).toBeDefined();
    });

    it('should create generator with custom default options', () => {
      const options: GeneratorOptions = {
        temperature: 0.5,
        maxTokens: 2000,
        systemPrompt: 'Custom system prompt'
      };
      const gen = new ArticleGenerator(mockProvider, options);
      expect(gen).toBeDefined();
    });
  });

  describe('generate', () => {
    const testTemplate: AbstractTemplate = {
      name: 'Test Template',
      formula: '[Hook] + [Problem] + [Solution]',
      components: [
        {
          name: 'Hook',
          purpose: 'Grab attention',
          examples: ['Example hook'],
          patterns: ['Question', 'Statement'],
          position: 1,
          weight: 0.3
        },
        {
          name: 'Problem',
          purpose: 'Identify the issue',
          examples: ['Problem example'],
          patterns: ['Statistics', 'Story'],
          position: 2,
          weight: 0.4
        },
        {
          name: 'Solution',
          purpose: 'Provide the answer',
          examples: ['Solution example'],
          patterns: ['Steps', 'Tools'],
          position: 3,
          weight: 0.3
        }
      ],
      flow: 'Linear',
      persuasionTechniques: ['Authority', 'Social Proof']
    };

    const testData: ArticleData = {
      topic: 'AI in Business',
      fearHook: 'Your competitors are already using AI',
      evidence: '80% of Fortune 500 companies use AI',
      solution: 'Implement AI gradually',
      examples: [
        {
          industry: 'Retail',
          company: 'Amazon',
          result: '35% increase in sales'
        }
      ],
      japanContext: 'Japanese companies are leading in robotics',
      urgency: 'Start within Q1 2024',
      cta: 'Contact our AI consultants'
    };

    it('should generate article with template and data', async () => {
      const result = await generator.generate(testTemplate, testData);
      
      expect(result).toBeDefined();
      expect(result).toContain('Generated Article');
      expect(mockProvider.chat).toHaveBeenCalledWith(
        expect.any(String), // system prompt
        expect.any(String), // user prompt
        expect.objectContaining({
          temperature: 0.7,
          maxTokens: 3000
        })
      );
    });

    it('should use custom options when provided', async () => {
      const options: GeneratorOptions = {
        model: 'gpt-3.5-turbo',
        temperature: 0.9,
        maxTokens: 4000,
        systemPrompt: 'You are a technical writer'
      };
      
      await generator.generate(testTemplate, testData, options);
      
      expect(mockProvider.chat).toHaveBeenCalledWith(
        'You are a technical writer', // custom system prompt  
        expect.any(String), // user prompt
        expect.objectContaining({
          temperature: 0.9,
          maxTokens: 4000
        })
      );
    });

    it('should build prompt with all template components', async () => {
      await generator.generate(testTemplate, testData);
      
      const callArgs = (mockProvider.chat as any).mock.calls[0];
      const userPrompt = callArgs[1];
      
      expect(userPrompt).toContain('Test Template');
      expect(userPrompt).toContain('[Hook] + [Problem] + [Solution]');
      expect(userPrompt).toContain('Hook');
      expect(userPrompt).toContain('Grab attention');
      expect(userPrompt).toContain('30%'); // Weight as percentage
    });

    it('should include article data in prompt', async () => {
      await generator.generate(testTemplate, testData);
      
      const callArgs = (mockProvider.chat as any).mock.calls[0];
      const userPrompt = callArgs[1];
      
      expect(userPrompt).toContain('AI in Business');
      expect(userPrompt).toContain('Your competitors are already using AI');
      expect(userPrompt).toContain('80% of Fortune 500 companies use AI');
      expect(userPrompt).toContain('Amazon');
      expect(userPrompt).toContain('35% increase in sales');
    });

    it('should handle partial data gracefully', async () => {
      const partialData: ArticleData = {
        topic: 'Simple Topic'
        // All other fields are optional
      };
      
      const result = await generator.generate(testTemplate, partialData);
      expect(result).toBeDefined();
      
      const callArgs = (mockProvider.chat as any).mock.calls[0];
      const userPrompt = callArgs[1];
      
      expect(userPrompt).toContain('Simple Topic');
      expect(userPrompt).not.toContain('恐怖フック: undefined');
    });

    it('should handle empty examples array', async () => {
      const dataWithoutExamples: ArticleData = {
        topic: 'Topic',
        examples: []
      };
      
      await generator.generate(testTemplate, dataWithoutExamples);
      const callArgs = (mockProvider.chat as any).mock.calls[0];
      const userPrompt = callArgs[1];
      
      expect(userPrompt).not.toContain('業界別事例:');
    });
  });

  describe('generateFromPattern', () => {
    it('should generate from fear-driven pattern', async () => {
      const data: ArticleData = {
        topic: 'Digital Transformation',
        fearHook: 'Are you falling behind?',
        solution: 'Cloud migration'
      };
      
      const result = await generator.generateFromPattern('fear-driven', data);
      
      expect(result).toBeDefined();
      expect(mockProvider.chat).toHaveBeenCalled();
      
      const callArgs = (mockProvider.chat as any).mock.calls[0];
      const userPrompt = callArgs[1];
      
      expect(userPrompt).toContain('Fear-Driven Persuasion');
      expect(userPrompt).toContain('恐怖フック');
    });

    it('should generate from problem-solution pattern', async () => {
      const data: ArticleData = {
        topic: 'Performance Issues',
        solution: 'Optimization techniques'
      };
      
      const result = await generator.generateFromPattern('problem-solution', data);
      
      expect(result).toBeDefined();
      
      const callArgs = (mockProvider.chat as any).mock.calls[0];
      const userPrompt = callArgs[1];
      
      expect(userPrompt).toContain('Problem-Solution Framework');
      expect(userPrompt).toContain('問題提起');
    });

    it('should throw error for unknown pattern', async () => {
      const data: ArticleData = { topic: 'Test' };
      
      await expect(
        generator.generateFromPattern('unknown-pattern', data)
      ).rejects.toThrow('Unknown pattern: unknown-pattern');
    });
  });

  describe('error handling', () => {
    it('should handle provider errors', async () => {
      mockProvider.chat = vi.fn().mockRejectedValue(
        new Error('Provider error')
      );
      
      const template: AbstractTemplate = {
        name: 'Test',
        formula: 'Formula',
        components: [],
        flow: 'Linear',
        persuasionTechniques: []
      };
      
      const data: ArticleData = { topic: 'Test' };
      
      await expect(generator.generate(template, data)).rejects.toThrow('Provider error');
    });

    it('should handle network errors', async () => {
      mockProvider.chat = vi.fn().mockRejectedValue(
        new Error('Network timeout')
      );
      
      await expect(
        generator.generateFromPattern('fear-driven', { topic: 'Test' })
      ).rejects.toThrow('Network timeout');
    });
  });

  describe('prompt building', () => {
    it('should format component information correctly', async () => {
      const template: AbstractTemplate = {
        name: 'Detailed Template',
        formula: 'Complex Formula',
        components: [
          {
            name: 'Component 1',
            purpose: 'Purpose 1',
            examples: ['Ex1', 'Ex2'],
            patterns: ['Pattern1', 'Pattern2'],
            position: 1,
            weight: 0.5
          }
        ],
        flow: 'Pyramid',
        persuasionTechniques: ['Scarcity', 'Authority']
      };
      
      const data: ArticleData = { topic: 'Test' };
      
      await generator.generate(template, data);
      
      const callArgs = (mockProvider.chat as any).mock.calls[0];
      const userPrompt = callArgs[1];
      
      expect(userPrompt).toContain('Component 1');
      expect(userPrompt).toContain('Purpose 1');
      expect(userPrompt).toContain('50%'); // weight * 100
      expect(userPrompt).toContain('Pattern1, Pattern2');
    });

    it('should include generation rules', async () => {
      const template: AbstractTemplate = {
        name: 'Test',
        formula: 'Formula',
        components: [],
        flow: 'Linear',
        persuasionTechniques: []
      };
      
      await generator.generate(template, { topic: 'Test' });
      
      const callArgs = (mockProvider.chat as any).mock.calls[0];
      const userPrompt = callArgs[1];
      
      expect(userPrompt).toContain('マークダウン形式で出力');
      expect(userPrompt).toContain('見出しは階層的に構成');
      expect(userPrompt).toContain('具体的な数値を含める');
      expect(userPrompt).toContain('感情に訴える表現を使う');
      expect(userPrompt).toContain('読者が行動したくなるように書く');
      expect(userPrompt).toContain('テンプレートの構造を厳密に守る');
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
      
      const template: AbstractTemplate = {
        name: 'Test',
        formula: 'Formula',
        components: [],
        flow: 'Linear',
        persuasionTechniques: []
      };
      
      await generator.generate(template, data);
      
      const callArgs = (mockProvider.chat as any).mock.calls[0];
      const userPrompt = callArgs[1];
      
      expect(userPrompt).toContain('Healthcare: Hospital A - 50% efficiency gain');
      expect(userPrompt).toContain('Finance: Bank B - 30% cost reduction');
      expect(userPrompt).toContain('Retail: Store C - 40% sales increase');
    });
  });

  describe('preset patterns', () => {
    it('should have correct fear-driven pattern structure', async () => {
      await generator.generateFromPattern('fear-driven', { topic: 'Test' });
      
      const callArgs = (mockProvider.chat as any).mock.calls[0];
      const userPrompt = callArgs[1];
      
      // Check all 6 components of fear-driven pattern
      expect(userPrompt).toContain('恐怖フック');
      expect(userPrompt).toContain('身近な例証');
      expect(userPrompt).toContain('簡単な解説');
      expect(userPrompt).toContain('業界別実例');
      expect(userPrompt).toContain('段階的行動');
      expect(userPrompt).toContain('緊急性強調');
    });

    it('should have correct problem-solution pattern structure', async () => {
      await generator.generateFromPattern('problem-solution', { topic: 'Test' });
      
      const callArgs = (mockProvider.chat as any).mock.calls[0];
      const userPrompt = callArgs[1];
      
      // Check all 5 components of problem-solution pattern
      expect(userPrompt).toContain('問題提起');
      expect(userPrompt).toContain('深刻性強調');
      expect(userPrompt).toContain('解決策提示');
      expect(userPrompt).toContain('実装方法');
      expect(userPrompt).toContain('成果予測');
    });
  });
});