import type { AbstractTemplate, LLMProvider } from './types.js';
import { generate } from '@aid-on/unillm';
import { getPresetPattern } from './patterns.js';

// Factory function to create LLMProvider from unillm
export function createUnillmProvider(modelSpec: string, apiKeys?: any): LLMProvider {
  return {
    chat: async (systemPrompt: string, userPrompt: string, options?: any) => {
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: userPrompt }
      ];
      const result = await generate(modelSpec, messages, {
        ...apiKeys,
        temperature: options?.temperature,
        maxTokens: options?.maxTokens
      });
      return result.text;
    }
  };
}

export interface ArticleData {
  topic: string;
  fearHook?: string;
  evidence?: string;
  solution?: string;
  examples?: Array<{
    industry: string;
    company: string;
    result: string;
  }>;
  japanContext?: string;
  urgency?: string;
  cta?: string;
}

export interface GeneratorOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  language?: 'ja' | 'en';
}

export class ArticleGenerator {
  private provider: LLMProvider;
  private defaultOptions: GeneratorOptions;
  private prompts: Record<string, any>;

  constructor(provider: LLMProvider, defaultOptions?: GeneratorOptions) {
    this.provider = provider;
    const language = defaultOptions?.language || 'ja';
    
    this.prompts = {
      ja: {
        systemPrompt: 'あなたは説得力のある記事を書くプロのライターです。与えられたテンプレートとデータを使って、読者の心を動かす記事を生成してください。',
        buildPrompt: this.buildPromptJa.bind(this)
      },
      en: {
        systemPrompt: 'You are a professional writer who creates persuasive articles. Use the provided template and data to generate content that moves readers.',
        buildPrompt: this.buildPromptEn.bind(this)
      }
    };
    
    this.defaultOptions = {
      temperature: 0.7,
      maxTokens: 3000,
      systemPrompt: this.prompts[language].systemPrompt,
      language,
      ...defaultOptions
    };
  }

  async generate(
    template: AbstractTemplate,
    data: ArticleData,
    options?: GeneratorOptions
  ): Promise<string> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const language = mergedOptions.language || 'ja';
    const buildPromptFn = this.prompts[language].buildPrompt;
    const prompt = buildPromptFn(template, data);
    
    const systemPrompt = mergedOptions.systemPrompt || this.prompts[language].systemPrompt;
    
    const result = await this.provider.chat(
      systemPrompt,
      prompt,
      {
        temperature: mergedOptions.temperature,
        maxTokens: mergedOptions.maxTokens
      }
    );

    return result;
  }

  private buildPromptJa(template: AbstractTemplate, data: ArticleData): string {
    return `
以下のテンプレート構造とデータを使って、説得力のある記事を生成してください。

## テンプレート情報
名前: ${template.name}
構造: ${template.formula}

## コンポーネント詳細
${template.components.map(c => `
- ${c.name}
  目的: ${c.purpose}
  重要度: ${(c.weight * 100).toFixed(0)}%
  パターン例: ${c.patterns.join(', ')}
`).join('')}

## 記事データ
トピック: ${data.topic}
${data.fearHook ? `恐怖フック: ${data.fearHook}` : ''}
${data.evidence ? `証拠/事例: ${data.evidence}` : ''}
${data.solution ? `解決策: ${data.solution}` : ''}
${data.examples && data.examples.length > 0 ? `
業界別事例:
${data.examples.map(e => `- ${e.industry}: ${e.company} - ${e.result}`).join('\n')}
` : ''}
${data.japanContext ? `日本の文脈: ${data.japanContext}` : ''}
${data.urgency ? `緊急性: ${data.urgency}` : ''}
${data.cta ? `CTA: ${data.cta}` : ''}

## 生成ルール
1. マークダウン形式で出力
2. 見出しは階層的に構成
3. 具体的な数値を含める
4. 感情に訴える表現を使う
5. 読者が行動したくなるように書く
6. テンプレートの構造を厳密に守る

記事を生成してください：
`;
  }

  private buildPromptEn(template: AbstractTemplate, data: ArticleData): string {
    return `
Generate a persuasive article in English using the following template structure and data.

## Template Information
Name: ${template.name}
Structure: ${template.formula}

## Component Details
${template.components.map(c => `
- ${c.name}
  Purpose: ${c.purpose}
  Weight: ${(c.weight * 100).toFixed(0)}%
  Pattern Examples: ${c.patterns.join(', ')}
`).join('')}

## Article Data
Topic: ${data.topic}
${data.fearHook ? `Fear Hook: ${data.fearHook}` : ''}
${data.evidence ? `Evidence/Examples: ${data.evidence}` : ''}
${data.solution ? `Solution: ${data.solution}` : ''}
${data.examples && data.examples.length > 0 ? `
Industry Examples:
${data.examples.map(e => `- ${e.industry}: ${e.company} - ${e.result}`).join('\n')}
` : ''}
${data.urgency ? `Urgency: ${data.urgency}` : ''}
${data.cta ? `Call to Action: ${data.cta}` : ''}

## Generation Rules
1. Output in Markdown format
2. Structure headings hierarchically
3. Include specific metrics and numbers
4. Use emotional language
5. Write to inspire action
6. Follow the template structure strictly

Generate the article in English:
`;
  }

  async generateFromPattern(
    patternName: string,
    data: ArticleData,
    options?: GeneratorOptions
  ): Promise<string> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const language = mergedOptions.language || 'ja';
    
    const template = getPresetPattern(patternName, language);
    if (!template) {
      throw new Error(`Unknown pattern: ${patternName}`);
    }

    return this.generate(template, data, mergedOptions);
  }
}