import { describe, it, expect, beforeEach } from 'vitest';
import { DEFAULT_PROMPTS, PromptBuilder } from '../src/prompts';

describe('PromptBuilder', () => {
  describe('constructor and language setting', () => {
    it('should default to Japanese language', () => {
      const builder = new PromptBuilder();
      const prompt = builder.getAnalysisPrompt();
      expect(prompt).toContain('文章を分析して');
    });

    it('should accept English language', () => {
      const builder = new PromptBuilder('en');
      const prompt = builder.getAnalysisPrompt();
      expect(prompt).toContain('Analyze the text');
    });

    it('should switch language dynamically', () => {
      const builder = new PromptBuilder('ja');
      expect(builder.getAnalysisPrompt()).toContain('文章を分析して');
      
      builder.setLanguage('en');
      expect(builder.getAnalysisPrompt()).toContain('Analyze the text');
    });
  });

  describe('getAnalysisPrompt', () => {
    it('should return Japanese analysis prompt', () => {
      const builder = new PromptBuilder('ja');
      const prompt = builder.getAnalysisPrompt();
      
      expect(prompt).toContain('抽象的なテンプレート構造');
      expect(prompt).toContain('abstractTemplate');
      expect(prompt).toContain('Problem-Solution');
    });

    it('should return English analysis prompt', () => {
      const builder = new PromptBuilder('en');
      const prompt = builder.getAnalysisPrompt();
      
      expect(prompt).toContain('Abstract template structure');
      expect(prompt).toContain('abstractTemplate');
      expect(prompt).toContain('Problem-Solution');
    });
  });

  describe('getMergePrompt', () => {
    it('should return Japanese merge prompt', () => {
      const builder = new PromptBuilder('ja');
      const prompt = builder.getMergePrompt();
      
      expect(prompt).toContain('複数の分析結果を統合');
      expect(prompt).toContain('一貫性のあるテンプレート');
    });

    it('should return English merge prompt', () => {
      const builder = new PromptBuilder('en');
      const prompt = builder.getMergePrompt();
      
      expect(prompt).toContain('Merge multiple analysis results');
      expect(prompt).toContain('consistent template');
    });
  });

  describe('getSupplementPrompt', () => {
    it('should return Japanese supplement prompt', () => {
      const builder = new PromptBuilder('ja');
      const prompt = builder.getSupplementPrompt();
      
      expect(prompt).toContain('不足部分を補完');
      expect(prompt).toContain('整合性を確認');
    });

    it('should return English supplement prompt', () => {
      const builder = new PromptBuilder('en');
      const prompt = builder.getSupplementPrompt();
      
      expect(prompt).toContain('Supplement missing parts');
      expect(prompt).toContain('verify overall consistency');
    });
  });

  describe('custom prompts', () => {
    it('should use custom prompts when provided', () => {
      const customAnalysisPrompt = 'Custom analysis prompt';
      const builder = new PromptBuilder('ja', {
        analysisSystem: customAnalysisPrompt
      });
      
      expect(builder.getAnalysisPrompt()).toBe(customAnalysisPrompt);
      expect(builder.getMergePrompt()).toContain('複数の分析結果'); // Default Japanese
    });

    it('should allow setting custom prompts after initialization', () => {
      const builder = new PromptBuilder('en');
      const customMergePrompt = 'Custom merge prompt';
      
      builder.setCustomPrompts({
        mergePrompt: customMergePrompt
      });
      
      expect(builder.getMergePrompt()).toBe(customMergePrompt);
      expect(builder.getAnalysisPrompt()).toContain('Analyze the text'); // Default English
    });

    it('should override default prompts with custom ones', () => {
      const customPrompts = {
        analysisSystem: 'Custom analysis',
        mergePrompt: 'Custom merge',
        supplementPrompt: 'Custom supplement'
      };
      
      const builder = new PromptBuilder('ja', customPrompts);
      
      expect(builder.getAnalysisPrompt()).toBe('Custom analysis');
      expect(builder.getMergePrompt()).toBe('Custom merge');
      expect(builder.getSupplementPrompt()).toBe('Custom supplement');
    });
  });

  describe('DEFAULT_PROMPTS structure', () => {
    it('should have all required prompts in Japanese', () => {
      expect(DEFAULT_PROMPTS.ja).toHaveProperty('analysisSystem');
      expect(DEFAULT_PROMPTS.ja).toHaveProperty('mergePrompt');
      expect(DEFAULT_PROMPTS.ja).toHaveProperty('supplementPrompt');
    });

    it('should have all required prompts in English', () => {
      expect(DEFAULT_PROMPTS.en).toHaveProperty('analysisSystem');
      expect(DEFAULT_PROMPTS.en).toHaveProperty('mergePrompt');
      expect(DEFAULT_PROMPTS.en).toHaveProperty('supplementPrompt');
    });

    it('should have valid JSON structure in prompts', () => {
      // Japanese prompt should contain valid JSON example
      const jaPrompt = DEFAULT_PROMPTS.ja.analysisSystem;
      expect(jaPrompt).toContain('"abstractTemplate"');
      expect(jaPrompt).toContain('"elements"');
      expect(jaPrompt).toContain('"keywords"');
      
      // English prompt should contain valid JSON example
      const enPrompt = DEFAULT_PROMPTS.en.analysisSystem;
      expect(enPrompt).toContain('"abstractTemplate"');
      expect(enPrompt).toContain('"elements"');
      expect(enPrompt).toContain('"keywords"');
    });
  });
});