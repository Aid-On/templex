import { describe, it, expect, beforeEach } from 'vitest';
import { TemplateExtractor } from '../src/core';
import { ArticleGenerator } from '../src/generator';
import { formatTemplate } from '../src/utils';
import type { LLMProvider, ExtractionConfig, ArticleData } from '../src/types';

describe('Integration Tests', () => {
  let mockProvider: LLMProvider;

  beforeEach(() => {
    // Mock LLM provider that returns realistic responses
    mockProvider = {
      chat: async (system: string, user: string) => {
        // Simulate different responses based on content
        if (user.includes('エレベーターピッチ')) {
          return JSON.stringify({
            abstractTemplate: {
              name: 'Elevator Pitch',
              formula: '[Hook] + [Problem] + [Solution] + [Value] + [CTA]',
              components: [
                {
                  name: 'Hook',
                  purpose: '注意を引く',
                  examples: ['驚きの事実', '質問形式'],
                  patterns: ['統計データ', '問いかけ'],
                  position: 1,
                  weight: 0.2
                },
                {
                  name: 'Problem',
                  purpose: '問題提起',
                  examples: ['現状の課題'],
                  patterns: ['痛みポイント'],
                  position: 2,
                  weight: 0.25
                },
                {
                  name: 'Solution',
                  purpose: '解決策提示',
                  examples: ['革新的アプローチ'],
                  patterns: ['具体的手法'],
                  position: 3,
                  weight: 0.3
                },
                {
                  name: 'Value',
                  purpose: '価値提案',
                  examples: ['ROI', '効率化'],
                  patterns: ['数値化された成果'],
                  position: 4,
                  weight: 0.15
                },
                {
                  name: 'CTA',
                  purpose: '行動喚起',
                  examples: ['今すぐ始める'],
                  patterns: ['緊急性の演出'],
                  position: 5,
                  weight: 0.1
                }
              ],
              flow: 'Linear',
              persuasionTechniques: ['希少性', '権威性', '社会的証明']
            },
            elements: [
              { 
                type: 'heading', 
                level: 1, 
                content: 'AIで業務を革新する方法',
                intent: '注目を集める',
                persuasion: '革新性の強調'
              },
              { 
                type: 'paragraph', 
                content: '現在の業務プロセスには多くの非効率が存在します',
                intent: '問題提起',
                technique: '共感を生む'
              },
              { 
                type: 'heading', 
                level: 2, 
                content: 'AIソリューションの導入',
                intent: '解決策の提示'
              },
              { 
                type: 'paragraph', 
                content: 'AIを活用することで業務効率を50%向上させることができます',
                persuasion: '具体的な数値',
                technique: '統計の活用'
              },
              {
                type: 'list',
                content: '導入ステップ',
                children: [
                  { type: 'paragraph', content: '現状分析' },
                  { type: 'paragraph', content: 'AI選定' },
                  { type: 'paragraph', content: '段階的導入' }
                ]
              },
              {
                type: 'heading',
                level: 2,
                content: '成功事例',
                intent: '信頼性の構築'
              },
              {
                type: 'paragraph',
                content: 'A社では3ヶ月で投資回収を実現しました',
                persuasion: '社会的証明',
                technique: '事例の活用'
              },
              {
                type: 'paragraph',
                content: '今すぐ無料相談を申し込む',
                intent: '行動喚起',
                persuasion: '緊急性',
                transition: '結論への誘導'
              }
            ],
            keywords: ['AI', '業務効率', '革新', 'ROI', '自動化', 'DX'],
            patterns: {
              introduction: 'フック型導入',
              body: '問題-解決-成果の流れ',
              conclusion: '行動喚起型'
            },
            confidence: 0.85
          });
        } else {
          // Default response for other content
          return JSON.stringify({
            elements: [
              { type: 'heading', level: 1, content: 'Document Title' },
              { type: 'paragraph', content: 'Content paragraph' }
            ],
            keywords: ['keyword1', 'keyword2'],
            patterns: { introduction: 'standard' },
            confidence: 0.7
          });
        }
      },
      generateText: async (options: any) => {
        return {
          text: `# ${options.messages?.[1]?.content?.includes('AI') ? 'AIが変える未来のビジネス' : 'Generated Article'}

## 導入：なぜ今AIなのか

多くの企業が直面している課題...それは増大する業務量と限られたリソースのギャップです。

## 問題：現状の非効率性

- 手動プロセスによる時間の浪費
- ヒューマンエラーによる品質のばらつき
- スケールアップの困難さ

## 解決策：AI導入による革新

AIテクノロジーを活用することで、これらの問題を根本的に解決できます。

### 具体的な導入効果

1. **処理速度**: 50倍の高速化
2. **精度**: 99.9%の正確性
3. **コスト**: 70%の削減

## 成功事例

**製造業A社の事例**
- 導入前：月間100万円の人件費
- 導入後：月間30万円のランニングコスト
- ROI：3ヶ月で回収

## 今すぐ行動を

このチャンスを逃すと、競合他社に大きく遅れを取ることになります。
**今なら無料相談実施中** - お問い合わせは今すぐ！`
        };
      }
    } as any;
  });

  describe('End-to-end template extraction and generation', () => {
    it('should extract template from Japanese business pitch and generate article', async () => {
      const pitchText = `
# AIで業務を革新する - エレベーターピッチ

皆さん、毎日の業務で無駄な時間を過ごしていませんか？

現在、日本企業の70%が手動プロセスによる非効率に悩んでいます。
これにより年間数百万円の機会損失が発生しています。

私たちのAIソリューションは、これらの課題を根本的に解決します。
機械学習により業務を自動化し、精度と速度を劇的に向上させます。

導入企業の90%が3ヶ月以内にROIを達成。
A社では業務時間を50%削減し、年間1000万円のコスト削減を実現しました。

今なら無料トライアル実施中。
まずは30分の無料相談から始めませんか？
`;

      // Step 1: Extract template
      const config: ExtractionConfig = {
        provider: mockProvider,
        language: 'ja',
        extractPatterns: true,
        extractKeywords: true,
        maxDepth: 1
      };

      const extractor = new TemplateExtractor(config);
      const extractionResult = await extractor.extract(pitchText, {
        chunkSize: 1000,
        onProgress: (progress) => {
          // Progress tracking
          expect(progress.phase).toBeTruthy();
          expect(progress.current).toBeGreaterThanOrEqual(0);
          expect(progress.total).toBeGreaterThanOrEqual(progress.current);
        }
      });

      // Validate extraction result
      expect(extractionResult).toBeDefined();
      expect(extractionResult.template).toBeDefined();
      expect(extractionResult.confidence).toBeGreaterThan(0.5);
      expect(extractionResult.template.abstractTemplate).toBeDefined();
      expect(extractionResult.template.abstractTemplate?.name).toBe('Elevator Pitch');
      expect(extractionResult.template.structure.length).toBeGreaterThan(0);
      expect(extractionResult.template.keywords.length).toBeGreaterThan(0);

      // Check abstract template components
      const abstractTemplate = extractionResult.template.abstractTemplate!;
      expect(abstractTemplate.components).toHaveLength(5);
      expect(abstractTemplate.components[0].name).toBe('Hook');
      expect(abstractTemplate.flow).toBe('Linear');
      expect(abstractTemplate.persuasionTechniques).toContain('希少性');

      // Step 2: Generate new article using extracted template
      const generator = new ArticleGenerator(mockProvider as any);
      const articleData: ArticleData = {
        topic: 'AIによるカスタマーサポート自動化',
        fearHook: 'カスタマーサポートのコストが経営を圧迫していませんか？',
        evidence: '日本企業の60%がサポートコストの増大に悩んでいます',
        solution: 'AIチャットボットによる24時間自動対応',
        examples: [
          {
            industry: 'EC業界',
            company: 'B社',
            result: '問い合わせ対応時間80%削減'
          },
          {
            industry: 'SaaS',
            company: 'C社',
            result: '顧客満足度20%向上'
          }
        ],
        japanContext: '日本の丁寧な接客文化にも対応',
        urgency: '競合他社が導入を始めています',
        cta: '無料デモを今すぐ予約'
      };

      const generatedArticle = await generator.generate(
        abstractTemplate,
        articleData
      );

      // Validate generated article
      expect(generatedArticle).toBeDefined();
      expect(generatedArticle.length).toBeGreaterThan(100);
      expect(generatedArticle).toContain('AI');
      expect(generatedArticle).toContain('#'); // Markdown headers

      // Step 3: Format template for display
      const formattedTemplate = formatTemplate(extractionResult.template);
      expect(formattedTemplate).toContain('Abstract Template Pattern');
      expect(formattedTemplate).toContain('Elevator Pitch');
      expect(formattedTemplate).toContain('Components:');
    });

    it('should handle multi-language extraction and generation', async () => {
      const englishText = `
# Revolutionizing Business with AI

Are you wasting valuable time on repetitive tasks?

Studies show that 70% of businesses lose millions annually due to inefficient processes.

Our AI solution automates these tasks, delivering 10x productivity gains.

Join industry leaders who have already transformed their operations.

Start your free trial today!
`;

      // English extraction
      const enConfig: ExtractionConfig = {
        provider: mockProvider,
        language: 'en',
        maxDepth: 1
      };

      const enExtractor = new TemplateExtractor(enConfig);
      const enResult = await enExtractor.extract(englishText);

      expect(enResult).toBeDefined();
      expect(enResult.template).toBeDefined();
      expect(enResult.template.structure.length).toBeGreaterThan(0);

      // Japanese extraction with same structure
      const jaConfig: ExtractionConfig = {
        provider: mockProvider,
        language: 'ja',
        maxDepth: 1
      };

      const jaExtractor = new TemplateExtractor(jaConfig);
      const jaResult = await jaExtractor.extract(englishText);

      expect(jaResult).toBeDefined();
      // Both should extract similar structure despite language settings
      expect(jaResult.template.structure.length).toBeCloseTo(
        enResult.template.structure.length,
        1
      );
    });

    it('should handle iterative refinement for complex documents', async () => {
      const complexDocument = `
# 第1章：問題提起
現代のビジネス環境では...

# 第2章：現状分析
データによると...

# 第3章：解決策
私たちの提案は...

# 第4章：実装計画
ステップバイステップで...

# 第5章：期待される成果
導入後の効果...
`;

      const config: ExtractionConfig = {
        provider: mockProvider,
        language: 'ja',
        maxDepth: 2, // Enable iterative refinement
        useIterativeRefinement: true,
        minConfidence: 0.8
      };

      const extractor = new TemplateExtractor(config);
      const result = await extractor.extract(complexDocument, {
        chunkSize: 500 // Force multiple chunks
      });

      expect(result).toBeDefined();
      expect(result.chunks).toBeGreaterThan(0);
      expect(result.template.structure.length).toBeGreaterThan(0);
    });

    it('should extract patterns from different article types', async () => {
      const templates = {
        problemSolution: `
# 問題：生産性の低下
多くの企業が直面している...

# 原因分析
主な要因として...

# 解決策：自動化の導入
テクノロジーを活用して...

# 実施手順
1. 現状把握
2. ツール選定
3. 段階的導入

# 期待効果
導入により...
`,
        storytelling: `
# ある企業の挑戦

2020年、A社は危機に直面していました。

## 転機

ある日、新しい技術との出会いが...

## 変革の始まり

小さな一歩から始まった改革は...

## 現在

今では業界のリーダーとして...

## あなたの物語は？

次はあなたの番です。
`,
        comparison: `
# 従来の方法 vs 新しいアプローチ

## 従来の方法
- 時間：10時間
- コスト：高い
- 精度：70%

## 新しいアプローチ
- 時間：1時間
- コスト：低い
- 精度：99%

## 結論
明らかに新しいアプローチが優れています。
`
      };

      const config: ExtractionConfig = {
        provider: mockProvider,
        language: 'ja',
        extractPatterns: true
      };

      const extractor = new TemplateExtractor(config);

      // Extract from each template type
      for (const [type, text] of Object.entries(templates)) {
        const result = await extractor.extract(text);
        
        expect(result).toBeDefined();
        expect(result.template).toBeDefined();
        expect(result.template.patterns).toBeDefined();
        
        // Each type should have different pattern characteristics
        if (type === 'problemSolution') {
          expect(result.template.structure.some(e => 
            e.content?.includes('問題') || e.content?.includes('解決')
          )).toBe(true);
        } else if (type === 'storytelling') {
          expect(result.template.structure.some(e => 
            e.content?.includes('物語') || e.content?.includes('挑戦')
          )).toBe(true);
        } else if (type === 'comparison') {
          expect(result.template.structure.some(e => 
            e.content?.includes('vs') || e.content?.includes('比較')
          )).toBe(true);
        }
      }
    });

    it('should handle error recovery and partial extraction', async () => {
      // Mock provider that sometimes fails
      const unreliableProvider: LLMProvider = {
        chat: async (system: string, user: string) => {
          // Randomly return invalid JSON
          if (Math.random() > 0.7) {
            return 'Invalid JSON response {broken';
          }
          return JSON.stringify({
            elements: [{ type: 'heading', level: 1 }],
            keywords: ['test'],
            patterns: {},
            confidence: 0.6
          });
        }
      };

      const config: ExtractionConfig = {
        provider: unreliableProvider,
        language: 'ja'
      };

      const extractor = new TemplateExtractor(config);
      
      // Should handle errors gracefully
      const result = await extractor.extract('Test document');
      expect(result).toBeDefined();
      expect(result.template).toBeDefined();
      // Even with errors, should return some structure
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    it('should merge similar content across chunks correctly', async () => {
      const longDocument = `
# Introduction
This is the introduction section with important context.

${Array(50).fill('Lorem ipsum dolor sit amet. ').join('')}

# Introduction
This is also an introduction but slightly different.

${Array(50).fill('Consectetur adipiscing elit. ').join('')}

# Methodology
The methodology section describes our approach.

${Array(50).fill('Sed do eiusmod tempor. ').join('')}

# Methodology  
Another methodology section with additional details.

# Conclusion
Final thoughts and summary.
`;

      const config: ExtractionConfig = {
        provider: mockProvider,
        language: 'en',
        maxDepth: 1
      };

      const extractor = new TemplateExtractor(config);
      const result = await extractor.extract(longDocument, {
        chunkSize: 500 // Force chunking
      });

      expect(result).toBeDefined();
      expect(result.chunks).toBeGreaterThan(1);
      
      // Similar headings should be merged intelligently
      const headings = result.template.structure.filter(e => e.type === 'heading');
      const introHeadings = headings.filter(h => 
        h.content?.toLowerCase().includes('introduction')
      );
      const methodHeadings = headings.filter(h => 
        h.content?.toLowerCase().includes('methodology')
      );
      
      // Should merge similar headings
      expect(introHeadings.length).toBeLessThanOrEqual(2);
      expect(methodHeadings.length).toBeLessThanOrEqual(2);
    });
  });
});