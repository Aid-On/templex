import { describe, it, expect, beforeAll } from 'vitest';
import { generate } from '@aid-on/unillm';
import { TemplateExtractor } from '../../src/core';
import { ArticleGenerator, createUnillmProvider } from '../../src/generator';
import type { LLMProvider, ExtractionConfig, ArticleData } from '../../src/types';

describe('Unillm Integration Tests', () => {
  const groqApiKey = process.env.GROQ_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY || 'AIzaSyAlbs38xsAkPgxlC206e_rmPfNJy7EvJMM';
  const hasApiKey = !!groqApiKey || !!geminiApiKey;

  // Create a unillm-based provider for TemplateExtractor
  function createUnillmProvider(modelSpec: string = 'gemini:gemini-2.0-flash'): LLMProvider {
    return {
      chat: async (systemPrompt: string, userPrompt: string, options?: any) => {
        const messages = [
          { role: 'system' as const, content: systemPrompt },
          { role: 'user' as const, content: userPrompt }
        ];
        
        const result = await generate(modelSpec, messages, {
          groqApiKey,
          geminiApiKey,
          temperature: options?.temperature || 0.7,
          maxTokens: options?.maxTokens || 2000
        });
        
        return result.text;
      }
    };
  }

  describe('Template Extraction with unillm', () => {
    it.skipIf(!hasApiKey)('should extract template from business article', { timeout: 30000 }, async () => {
      const provider = createUnillmProvider();
      
      const article = `
# AIで変わる未来のビジネス

## なぜ今AIなのか

多くの企業が直面している課題、それは増大する業務量と限られたリソースのギャップです。

## 現状の非効率性

- 手動プロセスによる時間の浪費
- ヒューマンエラーによる品質のばらつき  
- スケールアップの困難さ

## AI導入による革新

AIテクノロジーを活用することで、これらの問題を根本的に解決できます。

### 具体的な導入効果

1. **処理速度**: 50倍の高速化
2. **精度**: 99.9%の正確性
3. **コスト**: 70%の削減

## 今すぐ行動を

このチャンスを逃すと、競合他社に大きく遅れを取ることになります。
`;

      const config: ExtractionConfig = {
        provider,
        language: 'ja',
        extractPatterns: true,
        extractKeywords: true,
        maxDepth: 1
      };

      const extractor = new TemplateExtractor(config);
      const result = await extractor.extract(article);

      expect(result).toBeDefined();
      expect(result.template).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.template.structure.length).toBeGreaterThan(0);
      
      console.log('Extracted structure:', result.template.structure.map(s => s.type));
      console.log('Keywords:', result.template.keywords.slice(0, 5).map(k => k.term));
    });

    it.skipIf(!hasApiKey)('should generate article using unillm directly', { timeout: 30000 }, async () => {
      const provider = createUnillmProvider('gemini:gemini-2.0-flash', { geminiApiKey });
      const generator = new ArticleGenerator(provider);

      const template = {
        name: 'Simple Problem-Solution',
        formula: '[Problem] + [Solution] + [CTA]',
        components: [
          {
            name: 'Problem',
            purpose: '問題提起',
            examples: ['現状の課題'],
            patterns: ['痛みポイント'],
            position: 1,
            weight: 0.4
          },
          {
            name: 'Solution',
            purpose: '解決策',
            examples: ['AIソリューション'],
            patterns: ['技術的解決'],
            position: 2,
            weight: 0.4
          },
          {
            name: 'CTA',
            purpose: '行動喚起',
            examples: ['今すぐ始める'],
            patterns: ['緊急性'],
            position: 3,
            weight: 0.2
          }
        ],
        flow: 'Linear',
        persuasionTechniques: ['論理的説得']
      };

      const data: ArticleData = {
        topic: 'リモートワーク効率化',
        fearHook: 'リモートワークの生産性が低下していませんか？',
        solution: 'AI支援ツールで効率を2倍に',
        cta: '無料トライアルを今すぐ開始'
      };

      const article = await generator.generate(template, data);

      expect(article).toBeDefined();
      expect(article.length).toBeGreaterThan(100);
      expect(article).toContain('リモートワーク');
      
      console.log('Generated article preview:', article.substring(0, 200) + '...');
    });

    it.skipIf(!hasApiKey)('should handle multiple model specs', { timeout: 30000 }, async () => {
      // Test with different models if available
      const models = [
        'gemini:gemini-2.0-flash',
        'gemini:gemini-1.5-flash-002'
      ];

      for (const model of models) {
        try {
          const messages = [
            { role: 'system' as const, content: 'You are a helpful assistant.' },
            { role: 'user' as const, content: 'Say "Hello" in Japanese.' }
          ];

          const result = await generate(model, messages, {
            groqApiKey,
            geminiApiKey
          });

          expect(result.text).toBeDefined();
          console.log(`${model} response:`, result.text);
        } catch (error) {
          console.log(`${model} not available or error:`, error);
        }
      }
    });

    it.skipIf(!hasApiKey)('should extract and generate full pipeline', { timeout: 60000 }, async () => {
      const provider = createUnillmProvider();

      // Step 1: Extract template from existing article
      const sourceArticle = `
# 業務自動化の新時代

あなたの会社では、まだ手作業で業務を行っていませんか？

## 衝撃の事実

日本企業の60%が、いまだに手作業による非効率な業務プロセスに依存しています。
これにより、年間数百万円の機会損失が発生しています。

## スマートな解決策

RPAとAIを組み合わせた自動化ソリューションが、この問題を解決します。

- 処理時間を80%削減
- エラー率を95%低下
- コストを50%カット

## 成功事例

A社では導入後3ヶ月で投資を回収。
現在では年間1,000万円のコスト削減を実現しています。

## 今すぐ始めよう

無料診断で、あなたの会社の自動化ポテンシャルを確認してください。

[無料診断を申し込む]
`;

      const config: ExtractionConfig = {
        provider,
        language: 'ja',
        extractPatterns: true,
        extractKeywords: true,
        useIterativeRefinement: false
      };

      const extractor = new TemplateExtractor(config);
      const extractResult = await extractor.extract(sourceArticle);

      expect(extractResult.template).toBeDefined();
      console.log('Extracted template confidence:', extractResult.confidence);

      // Step 2: Generate new article using extracted structure
      if (extractResult.template.abstractTemplate) {
        const provider = createUnillmProvider('gemini:gemini-2.0-flash', { geminiApiKey });
        const generator = new ArticleGenerator(provider);

        const newData: ArticleData = {
          topic: 'クラウド移行',
          fearHook: 'オンプレミスシステムの維持費に悩んでいませんか？',
          evidence: '維持費が年々増加し、セキュリティリスクも高まっています',
          solution: 'クラウド移行で、コスト削減とセキュリティ強化を同時に実現',
          examples: [
            {
              industry: 'IT',
              company: 'Tech社',
              result: 'インフラコスト60%削減'
            }
          ],
          urgency: '今なら移行支援キャンペーン実施中',
          cta: '無料相談を予約'
        };

        const newArticle = await generator.generate(
          extractResult.template.abstractTemplate,
          newData
        );

        expect(newArticle).toBeDefined();
        expect(newArticle).toContain('クラウド');
        
        console.log('\n=== Generated Article ===');
        console.log(newArticle.substring(0, 500) + '...');
      }
    });
  });

  // Show message if no API key
  if (!hasApiKey) {
    console.log(`
================================================================
No API key found. Skipping integration tests.

To run these tests, set the GROQ_API_KEY environment variable:
  export GROQ_API_KEY=your-api-key-here
  npm run test:integration

You can get a free API key at https://console.groq.com
================================================================
    `);
  }
});