import { describe, it, expect, beforeAll } from 'vitest';
import { TemplateExtractor } from '../src/core';
import { ArticleGenerator } from '../src/generator';
import { formatTemplate } from '../src/utils';
import type { LLMProvider, ExtractionConfig, ArticleData } from '../src/types';

/**
 * Real LLM Integration Tests
 * These tests require actual API keys and make real API calls
 * Set environment variables:
 * - OPENAI_API_KEY or GROQ_API_KEY
 */

describe('Real LLM Integration Tests', () => {
  let provider: LLMProvider;
  let apiKey: string | undefined;

  beforeAll(() => {
    // Check for API keys
    apiKey = process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      console.warn('Skipping real LLM tests: No API key found in environment');
      return;
    }

    // Create real LLM provider
    if (process.env.OPENAI_API_KEY) {
      // OpenAI provider
      provider = {
        chat: async (systemPrompt: string, userPrompt: string) => {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
              model: 'gpt-4-turbo-preview',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
              ],
              temperature: 0.7,
              max_tokens: 2000
            })
          });

          const data = await response.json();
          return data.choices[0].message.content;
        },
        generateText: async (options: any) => {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
              model: options.model || 'gpt-4-turbo-preview',
              messages: options.messages,
              temperature: options.temperature || 0.7,
              max_tokens: options.maxTokens || 3000
            })
          });

          const data = await response.json();
          return { text: data.choices[0].message.content };
        }
      };
    } else if (process.env.GROQ_API_KEY) {
      // Groq provider
      provider = {
        chat: async (systemPrompt: string, userPrompt: string) => {
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify({
              model: 'mixtral-8x7b-32768',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
              ],
              temperature: 0.7,
              max_tokens: 2000
            })
          });

          const data = await response.json();
          return data.choices[0].message.content;
        },
        generateText: async (options: any) => {
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify({
              model: 'mixtral-8x7b-32768',
              messages: options.messages,
              temperature: options.temperature || 0.7,
              max_tokens: options.maxTokens || 3000
            })
          });

          const data = await response.json();
          return { text: data.choices[0].message.content };
        }
      };
    }
  });

  describe('Real template extraction from actual articles', () => {
    it.skipIf(!apiKey)('should extract template from a real business article', async () => {
      const realArticle = `
# The Future of Remote Work: A Post-Pandemic Analysis

The COVID-19 pandemic has fundamentally transformed how we think about work. What started as a temporary measure has evolved into a permanent shift in workplace dynamics.

## The Numbers Don't Lie

Recent studies show that 74% of companies plan to permanently shift to remote work, even after the pandemic ends. This isn't just a trend—it's a revolution in how we conceptualize the workplace.

### Key Statistics:
- 88% of organizations worldwide made it mandatory or encouraged employees to work from home
- Productivity increased by 47% for companies that adopted remote work
- Employee satisfaction scores rose by 32% in fully remote environments

## The Challenge of Traditional Office Spaces

For decades, the 9-to-5 office routine was the gold standard. Companies invested millions in prime real estate, believing that physical proximity was essential for collaboration and innovation. However, this model came with hidden costs:

1. **Commute Stress**: Average workers spent 54 minutes daily commuting
2. **Real Estate Costs**: Office space averaged $50-100 per square foot annually
3. **Work-Life Imbalance**: Rigid schedules limited personal flexibility

## Enter the Digital Revolution

The solution emerged from necessity but proved its worth through results. Cloud-based collaboration tools, video conferencing, and project management platforms have made remote work not just possible, but preferable for many organizations.

### Success Stories

**Tech Giant Transformation**: Twitter announced employees could work from home "forever," leading to a 23% increase in job applications and a 15% boost in employee retention.

**Startup Scaling**: GitLab, operating fully remote since inception, grew from 10 to over 1,300 employees across 65 countries, proving that remote-first can scale.

## The Path Forward

Organizations looking to embrace this shift should consider:

1. **Invest in Technology**: Robust communication and collaboration tools are non-negotiable
2. **Rethink Culture**: Build connection through virtual team-building and clear communication
3. **Measure Outcomes, Not Hours**: Focus on deliverables rather than time spent online

## Take Action Today

The future of work is here. Companies that adapt now will have a competitive advantage in attracting top talent and reducing operational costs. 

Don't wait for your competitors to leave you behind. Start your remote work transformation today with our comprehensive guide and consulting services.

**[Download Our Free Remote Work Transition Guide]** | **[Schedule a Consultation]**
`;

      const config: ExtractionConfig = {
        provider,
        language: 'en',
        extractPatterns: true,
        extractKeywords: true,
        extractMetadata: true,
        maxDepth: 1
      };

      const extractor = new TemplateExtractor(config);
      const result = await extractor.extract(realArticle, {
        onProgress: (progress) => {
          console.log(`Extraction progress: ${progress.phase} - ${progress.current}/${progress.total}`);
        }
      });

      // Validate extraction results
      expect(result).toBeDefined();
      expect(result.template).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.5);
      
      // Check structure extraction
      expect(result.template.structure.length).toBeGreaterThan(5);
      const headings = result.template.structure.filter(e => e.type === 'heading');
      expect(headings.length).toBeGreaterThan(3);
      
      // Check keyword extraction
      expect(result.template.keywords.length).toBeGreaterThan(5);
      const keywordTerms = result.template.keywords.map(k => k.term.toLowerCase());
      expect(keywordTerms).toContain('remote');
      
      // Check pattern extraction
      expect(result.template.patterns).toBeDefined();
      expect(Object.keys(result.template.patterns).length).toBeGreaterThan(0);
      
      // Check abstract template extraction
      if (result.template.abstractTemplate) {
        expect(result.template.abstractTemplate.name).toBeTruthy();
        expect(result.template.abstractTemplate.formula).toBeTruthy();
        expect(result.template.abstractTemplate.components.length).toBeGreaterThan(0);
        
        console.log('Extracted template type:', result.template.abstractTemplate.name);
        console.log('Formula:', result.template.abstractTemplate.formula);
      }

      // Log formatted template for inspection
      const formatted = formatTemplate(result.template);
      console.log('\n=== Extracted Template ===\n');
      console.log(formatted);
    });

    it.skipIf(!apiKey)('should extract and generate Japanese content', async () => {
      const japaneseArticle = `
# DXで変わる日本企業の未来

## はじめに：なぜ今DXが必要なのか

日本企業の99.7%を占める中小企業。その多くが、デジタル化の波に乗り遅れています。
しかし、このままでは国際競争力を失うばかりか、事業継続すら危ぶまれる時代が来ています。

## 衝撃的な事実

経済産業省の調査によると、2025年までにDXを実現できなかった企業は、最大12兆円の経済損失を被る可能性があります。
これは「2025年の崖」と呼ばれ、日本経済全体を揺るがす深刻な問題です。

### 現状の課題
- レガシーシステムの保守に IT予算の8割を費やす企業が約7割
- IT人材不足により、2030年には約79万人が不足する見込み
- 紙ベースの業務プロセスが依然として主流

## 解決への道筋：段階的DX導入

### ステップ1：業務の可視化
現状の業務フローを徹底的に分析し、デジタル化可能な領域を特定します。

### ステップ2：クラウド移行
オンプレミスからクラウドへ。初期投資を抑えながら、柔軟なシステム構築が可能になります。

### ステップ3：データ活用
蓄積されたデータをAIで分析し、新たなビジネスインサイトを獲得します。

## 成功事例：A社の挑戦

従業員50名の製造業A社は、DX導入により：
- 生産効率が40%向上
- 在庫管理コストを60%削減
- 新規顧客獲得率が2.5倍に

わずか1年で投資を回収し、現在は海外展開も視野に入れています。

## 今すぐ始めるべき理由

競合他社がDXに躊躇している今こそ、差別化のチャンスです。
政府の補助金制度も充実しており、最大で導入費用の2/3が補助される可能性があります。

**まずは無料診断から始めませんか？**

[無料DX診断を申し込む] [資料をダウンロード]
`;

      const config: ExtractionConfig = {
        provider,
        language: 'ja',
        extractPatterns: true,
        extractKeywords: true,
        maxDepth: 1
      };

      const extractor = new TemplateExtractor(config);
      const extractResult = await extractor.extract(japaneseArticle);

      expect(extractResult).toBeDefined();
      expect(extractResult.template.abstractTemplate).toBeDefined();
      
      // Generate new article using extracted template
      if (extractResult.template.abstractTemplate) {
        const generator = new ArticleGenerator(provider as any);
        const articleData: ArticleData = {
          topic: 'AI活用による医療現場の革新',
          fearHook: '医療ミスの70%はヒューマンエラーが原因',
          evidence: '日本の医療現場では、医師不足により一人当たりの負担が限界に達しています',
          solution: 'AI診断支援システムの導入',
          examples: [
            {
              industry: '大学病院',
              company: 'B大学附属病院',
              result: '診断精度95%、診断時間50%短縮'
            }
          ],
          japanContext: '日本の医療制度に最適化されたシステム',
          urgency: '2024年の診療報酬改定で加算対象に',
          cta: '詳細資料を無料でダウンロード'
        };

        const generated = await generator.generate(
          extractResult.template.abstractTemplate,
          articleData
        );

        expect(generated).toBeDefined();
        expect(generated.length).toBeGreaterThan(500);
        expect(generated).toContain('AI');
        expect(generated).toContain('医療');
        
        console.log('\n=== Generated Japanese Article ===\n');
        console.log(generated.substring(0, 1000) + '...');
      }
    });

    it.skipIf(!apiKey)('should handle complex technical documentation', async () => {
      const technicalDoc = `
# API Reference: Stream Processing Library

## Overview

The Stream Processing Library provides a high-performance, type-safe interface for handling real-time data streams in distributed systems.

## Core Concepts

### Stream<T>
A Stream<T> represents an asynchronous sequence of values of type T. Unlike traditional arrays, streams are lazy-evaluated and can represent infinite sequences.

\`\`\`typescript
interface Stream<T> {
  map<U>(fn: (value: T) => U): Stream<U>;
  filter(predicate: (value: T) => boolean): Stream<T>;
  reduce<U>(reducer: (acc: U, value: T) => U, initial: U): Promise<U>;
}
\`\`\`

### BackPressure Management

When consumers cannot keep up with producers, the system implements automatic backpressure:

1. **Buffer Strategy**: Maintains a configurable buffer size
2. **Drop Strategy**: Drops oldest messages when buffer is full
3. **Block Strategy**: Blocks producers until buffer space is available

## Implementation Examples

### Basic Usage

\`\`\`typescript
const stream = createStream<number>();
stream
  .map(x => x * 2)
  .filter(x => x > 10)
  .forEach(console.log);
\`\`\`

### Advanced Patterns

#### Window Operations
\`\`\`typescript
stream
  .window(Duration.seconds(5))
  .aggregate(sum)
  .forEach(total => console.log(\`5-second sum: \${total}\`));
\`\`\`

## Performance Considerations

- Memory usage scales with O(buffer_size), not stream length
- Throughput: 100k+ messages/second on standard hardware
- Latency: < 1ms for most operations

## Best Practices

1. Always handle errors with \`.catch()\`
2. Use \`.take(n)\` to limit infinite streams
3. Prefer \`.pipe()\` for complex transformations

## Migration Guide

Coming from RxJS? Here's a quick conversion:
- \`Observable\` → \`Stream\`
- \`Subject\` → \`StreamController\`
- \`switchMap\` → \`flatMapLatest\`
`;

      const config: ExtractionConfig = {
        provider,
        language: 'en',
        extractPatterns: true,
        extractKeywords: true,
        maxDepth: 2 // Use iterative refinement for complex docs
      };

      const extractor = new TemplateExtractor(config);
      const result = await extractor.extract(technicalDoc);

      expect(result).toBeDefined();
      expect(result.template.structure.length).toBeGreaterThan(5);
      
      // Technical docs should have code blocks
      const codeBlocks = result.template.structure.filter(e => e.type === 'code');
      expect(codeBlocks.length).toBeGreaterThan(0);
      
      // Should identify technical keywords
      const keywords = result.template.keywords.map(k => k.term.toLowerCase());
      expect(keywords.some(k => k.includes('stream') || k.includes('api'))).toBe(true);
      
      console.log('\n=== Technical Documentation Pattern ===');
      console.log('Structure types found:', 
        [...new Set(result.template.structure.map(e => e.type))].join(', ')
      );
      console.log('Keywords extracted:', 
        result.template.keywords.slice(0, 10).map(k => k.term).join(', ')
      );
    });

    it.skipIf(!apiKey)('should compare extraction quality across different models', async () => {
      // Skip if we don't have multiple API keys to test
      if (!process.env.OPENAI_API_KEY || !process.env.GROQ_API_KEY) {
        console.log('Skipping model comparison: Need both OpenAI and Groq API keys');
        return;
      }

      const testArticle = `
# The Power of Habit: Transform Your Life in 30 Days

Did you know that 40% of your daily actions are habits, not conscious decisions?

## The Problem with Bad Habits

We all have habits we'd like to break. Whether it's checking social media too often, eating junk food, or procrastinating, these patterns hold us back from our potential.

## The Science of Habit Formation

Neuroscientists have discovered that habits form through a three-step loop:
1. **Cue**: The trigger that initiates the behavior
2. **Routine**: The behavior itself
3. **Reward**: The benefit you gain from the behavior

## The 30-Day Transformation Method

Research shows it takes an average of 66 days to form a new habit, but significant progress happens in just 30 days.

### Week 1: Awareness
Track your current habits without judgment.

### Week 2: Substitution
Replace bad habits with positive alternatives.

### Week 3: Reinforcement
Strengthen new patterns with rewards.

### Week 4: Integration
Make the new habit part of your identity.

## Success Story

Sarah, a marketing executive, used this method to replace her afternoon snacking habit with a 5-minute walk. Result? She lost 10 pounds and increased her energy levels by 30%.

## Start Your Journey Today

Download our free habit tracker and join thousands who have transformed their lives.

**[Get Your Free Habit Tracker]** - Limited time offer!
`;

      // Test with different providers
      const providers = [
        { name: 'OpenAI GPT-4', provider: createOpenAIProvider() },
        { name: 'Groq Mixtral', provider: createGroqProvider() }
      ];

      const results = [];

      for (const { name, provider } of providers) {
        const config: ExtractionConfig = {
          provider,
          language: 'en',
          extractPatterns: true,
          extractKeywords: true,
          maxDepth: 1
        };

        const extractor = new TemplateExtractor(config);
        const startTime = Date.now();
        const result = await extractor.extract(testArticle);
        const endTime = Date.now();

        results.push({
          model: name,
          confidence: result.confidence,
          structureCount: result.template.structure.length,
          keywordCount: result.template.keywords.length,
          hasAbstractTemplate: !!result.template.abstractTemplate,
          processingTime: endTime - startTime
        });

        console.log(`\n=== ${name} Results ===`);
        console.log(`Confidence: ${result.confidence.toFixed(2)}`);
        console.log(`Structure elements: ${result.template.structure.length}`);
        console.log(`Keywords: ${result.template.keywords.length}`);
        console.log(`Processing time: ${endTime - startTime}ms`);
        if (result.template.abstractTemplate) {
          console.log(`Template type: ${result.template.abstractTemplate.name}`);
        }
      }

      // Compare results
      expect(results).toHaveLength(2);
      results.forEach(r => {
        expect(r.confidence).toBeGreaterThan(0.5);
        expect(r.structureCount).toBeGreaterThan(5);
        expect(r.keywordCount).toBeGreaterThan(3);
      });
    });
  });

  // Helper functions for creating providers
  function createOpenAIProvider(): LLMProvider {
    return {
      chat: async (systemPrompt: string, userPrompt: string) => {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-4-turbo-preview',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 2000
          })
        });

        const data = await response.json();
        return data.choices[0].message.content;
      }
    };
  }

  function createGroqProvider(): LLMProvider {
    return {
      chat: async (systemPrompt: string, userPrompt: string) => {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
          },
          body: JSON.stringify({
            model: 'mixtral-8x7b-32768',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 2000
          })
        });

        const data = await response.json();
        return data.choices[0].message.content;
      }
    };
  }
});