import type { AbstractTemplate, LLMProvider } from './types';
import { generate } from '@aid-on/unillm';

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
}

export class ArticleGenerator {
  private provider: LLMProvider;
  private defaultOptions: GeneratorOptions;

  constructor(provider: LLMProvider, defaultOptions?: GeneratorOptions) {
    this.provider = provider;
    this.defaultOptions = {
      temperature: 0.7,
      maxTokens: 3000,
      systemPrompt: 'あなたは説得力のある記事を書くプロのライターです。与えられたテンプレートとデータを使って、読者の心を動かす記事を生成してください。',
      ...defaultOptions
    };
  }

  async generate(
    template: AbstractTemplate,
    data: ArticleData,
    options?: GeneratorOptions
  ): Promise<string> {
    const prompt = this.buildPrompt(template, data);
    
    const mergedOptions = { ...this.defaultOptions, ...options };
    const systemPrompt = mergedOptions.systemPrompt || this.defaultOptions.systemPrompt!;
    
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

  private buildPrompt(template: AbstractTemplate, data: ArticleData): string {
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

  async generateFromPattern(
    patternName: string,
    data: ArticleData
  ): Promise<string> {
    // プリセットパターンから生成
    const patterns: Record<string, AbstractTemplate> = {
      'fear-driven': {
        name: 'Fear-Driven Persuasion',
        formula: '[恐怖フック] + [身近な例証] + [簡単な解説] + [業界別実例] + [段階的行動] + [緊急性強調]',
        components: [
          {
            name: '恐怖フック',
            purpose: '読者の現状への危機感を煽る',
            examples: ['あなたの〇〇は本当に〇〇ですか？'],
            patterns: ['疑問形', '警告形'],
            position: 1,
            weight: 0.25
          },
          {
            name: '身近な例証',
            purpose: '実例で恐怖を裏付ける',
            examples: ['個人の成功/失敗ストーリー'],
            patterns: ['個人ストーリー', '企業事例'],
            position: 2,
            weight: 0.20
          },
          {
            name: '簡単な解説',
            purpose: '複雑な技術を分かりやすく',
            examples: ['〇〇は「〇〇」だと思ってください'],
            patterns: ['メタファー', '箇条書き'],
            position: 3,
            weight: 0.15
          },
          {
            name: '業界別実例',
            purpose: '具体的な成功事例を示す',
            examples: ['業界名 + 企業名 + 数値成果'],
            patterns: ['3業界展開', '数値強調'],
            position: 4,
            weight: 0.20
          },
          {
            name: '段階的行動',
            purpose: 'すぐ始められるステップを提示',
            examples: ['Step1: 5分で完了'],
            patterns: ['3段階', '投資額明示'],
            position: 5,
            weight: 0.10
          },
          {
            name: '緊急性強調',
            purpose: '今すぐ行動する理由を提供',
            examples: ['今なら〇〇'],
            patterns: ['時限メリット', '未来予測'],
            position: 6,
            weight: 0.10
          }
        ],
        flow: 'Linear',
        persuasionTechniques: ['損失回避', '社会的証明', '権威性', '希少性']
      },
      'problem-solution': {
        name: 'Problem-Solution Framework',
        formula: '[問題提起] + [深刻性強調] + [解決策提示] + [実装方法] + [成果予測]',
        components: [
          {
            name: '問題提起',
            purpose: '読者が抱える問題を明確化',
            examples: ['〇〇で困っていませんか？'],
            patterns: ['共感型', '統計型'],
            position: 1,
            weight: 0.20
          },
          {
            name: '深刻性強調',
            purpose: '問題を放置するリスクを示す',
            examples: ['このままだと〇〇になります'],
            patterns: ['将来予測', '比較'],
            position: 2,
            weight: 0.20
          },
          {
            name: '解決策提示',
            purpose: '具体的な解決方法を提案',
            examples: ['〇〇を使えば解決できます'],
            patterns: ['ツール紹介', 'メソッド紹介'],
            position: 3,
            weight: 0.30
          },
          {
            name: '実装方法',
            purpose: '具体的な手順を説明',
            examples: ['3つのステップで実現'],
            patterns: ['段階的', 'チェックリスト'],
            position: 4,
            weight: 0.20
          },
          {
            name: '成果予測',
            purpose: '実行後の成果を描く',
            examples: ['〇〇が実現します'],
            patterns: ['数値予測', 'ビフォーアフター'],
            position: 5,
            weight: 0.10
          }
        ],
        flow: 'Linear',
        persuasionTechniques: ['論理的説得', '実績提示', '段階的誘導']
      }
    };

    const template = patterns[patternName];
    if (!template) {
      throw new Error(`Unknown pattern: ${patternName}`);
    }

    return this.generate(template, data);
  }
}