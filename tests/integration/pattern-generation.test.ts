import { describe, it, expect } from 'vitest';
import { ArticleGenerator } from '../../src/generator';
import { getPresetPattern, PRESET_PATTERNS } from '../../src/patterns';
import type { LLMProvider } from '../../src/types';

// Enhanced mock provider with pattern awareness
class PatternAwareMockProvider implements LLMProvider {
  async chat(systemPrompt: string, userPrompt: string, options?: any): Promise<string> {
    // Parse the prompt to understand what pattern is being used
    // Check for Problem-Solution pattern first (more specific)
    const isProblemSolution = userPrompt.includes('問題提起') || 
                              (userPrompt.includes('Problem') && userPrompt.includes('Severity')) ||
                              userPrompt.includes('Problem-Solution Framework');
    const isFearDriven = (userPrompt.includes('恐怖フック') || userPrompt.includes('Fear Hook')) && !isProblemSolution;
    const isEnglish = systemPrompt.includes('English') || userPrompt.includes('Generate the article in English') || userPrompt.includes('Language: en');
    
    if (isFearDriven) {
      if (isEnglish) {
        return `# Is Your Business Ready for the AI Revolution?

## The Hidden Danger
Your competitors are already using AI while you're still deciding. Recent studies show that 80% of Fortune 500 companies have integrated AI into their core operations.

## Real Evidence  
Let me share a story about TechCorp, a mid-size company that ignored AI trends. Within 18 months, they lost 40% market share to AI-enabled competitors. Their manual processes couldn't compete with automated efficiency.

## Understanding AI Simply
Think of AI as your smartest employee who never sleeps. It processes data, finds patterns, and makes recommendations 24/7. No complexity, just results.

## Industry Success Stories
**Retail:** Amazon increased sales by 35% using AI recommendations
**Finance:** JP Morgan saves 360,000 hours annually with AI document processing  
**Healthcare:** Mayo Clinic reduces diagnosis time by 50% with AI assistance

## Your Action Plan
Step 1: Identify one repetitive task (5 minutes)
Step 2: Run a 30-day AI pilot ($500 budget)
Step 3: Measure the impact and scale

## Act Now
Early adopters gain competitive advantages that become insurmountable. The question isn't whether to adopt AI, but whether you'll lead or follow.

**Limited offer:** Free AI readiness assessment for the first 20 companies this quarter.`;
      } else {
        return `# あなたのビジネスはAI革命に対応できていますか？

## 隠れた危機
競合他社がAIを活用している間、あなたはまだ検討中です。最新の調査によると、Fortune 500企業の80%がすでにAIを中核業務に統合しています。

## 身近な証拠
TechCorpという中規模企業の話をしましょう。AI トレンドを無視した結果、18ヶ月で市場シェアの40%を AI対応の競合他社に奪われました。

## 簡単な解説
AIを「眠らない最も優秀な社員」と考えてください。24時間365日、データを処理し、パターンを見つけ、提案を行います。

## 業界別実例
**小売業:** Amazon - AI推奨により売上35%増
**金融:** JPモルガン - AI文書処理で年間36万時間削減
**医療:** Mayo Clinic - AI支援で診断時間50%短縮

## 段階的行動
ステップ1: 繰り返し作業を1つ特定（5分）
ステップ2: 30日間のAIパイロット実施（予算5万円）
ステップ3: 影響を測定し拡大

## 緊急性強調
早期導入者は、後から追いつけない競争優位性を獲得します。

**期間限定:** 今四半期の先着20社に無料AI準備診断を提供`;
      }
    }
    
    if (isProblemSolution) {
      if (isEnglish) {
        return `# Solving Digital Transformation Challenges

## The Problem
Organizations struggle with digital transformation. Legacy systems, resistance to change, and skill gaps create significant barriers.

## Why This Matters Now  
Companies that fail to transform digitally lose 25% revenue growth compared to digital leaders. The gap widens every year.

## The Solution
A phased digital transformation approach:
- Cloud migration for scalability
- Process automation for efficiency  
- Data analytics for insights
- Employee training for adoption

## Implementation Roadmap
1. Assessment Phase (Week 1-2)
2. Planning Phase (Week 3-4)
3. Pilot Implementation (Month 2)
4. Full Rollout (Month 3-6)

## Expected Outcomes
- 40% reduction in operational costs
- 60% faster time-to-market
- 30% improvement in customer satisfaction
- ROI within 12 months`;
      } else {
        return `# デジタル変革の課題を解決する

## 問題提起
多くの組織がデジタル変革に苦戦しています。レガシーシステム、変化への抵抗、スキルギャップが大きな障壁となっています。

## 深刻性強調
デジタル変革に失敗した企業は、デジタルリーダーと比較して売上成長率が25%低下します。

## 解決策提示
段階的なデジタル変革アプローチ：
- スケーラビリティのためのクラウド移行
- 効率化のためのプロセス自動化
- インサイトのためのデータ分析

## 実装方法
1. 評価フェーズ（1-2週目）
2. 計画フェーズ（3-4週目）
3. パイロット実装（2ヶ月目）
4. 全面展開（3-6ヶ月目）

## 成果予測
- 運用コスト40%削減
- 市場投入時間60%短縮
- 顧客満足度30%向上`;
      }
    }
    
    return '# Generic Article\n\nContent based on the provided template and data.';
  }
}

describe('Pattern-based Generation Integration', () => {
  const mockProvider = new PatternAwareMockProvider();
  const generator = new ArticleGenerator(mockProvider);
  
  describe('Fear-Driven Pattern', () => {
    it('should generate fear-driven article in Japanese', async () => {
      const articleData = {
        topic: 'AI導入',
        fearHook: '競合他社に遅れをとっていませんか？',
        evidence: 'Fortune 500の80%がAI導入済み',
        solution: '段階的なAI導入アプローチ',
        examples: [
          {
            industry: '小売',
            company: 'Amazon',
            result: '売上35%増'
          }
        ],
        japanContext: '日本企業の多くがまだ検討段階',
        urgency: '2024年第1四半期までに開始',
        cta: 'AIコンサルタントに相談'
      };
      
      const result = await generator.generateFromPattern(
        'fear-driven',
        articleData,
        { language: 'ja' }
      );
      
      expect(result).toBeDefined();
      expect(result).toContain('AI');
      expect(result).toContain('競合他社');
      expect(result.length).toBeGreaterThan(500);
      
      // Check structure elements
      expect(result).toMatch(/##?\s+/); // Has headings
      expect(result).toContain('ステップ'); // Has action steps
    });
    
    it('should generate fear-driven article in English', async () => {
      const articleData = {
        topic: 'AI Adoption',
        fearHook: 'Are you falling behind competitors?',
        evidence: '80% of Fortune 500 using AI',
        solution: 'Phased AI implementation',
        examples: [
          {
            industry: 'Retail',  
            company: 'Amazon', 
            result: '35% sales increase'
          }
        ],
        urgency: 'Start by Q1 2024',
        cta: 'Contact AI consultants'
      };
      
      const result = await generator.generateFromPattern(
        'fear-driven-en',
        articleData,
        { language: 'en' }
      );
      
      expect(result).toBeDefined();
      expect(result).toContain('AI Revolution');
      expect(result).toContain('competitors');
      expect(result).toContain('Step');
      
      // Verify it's in English
      expect(result).not.toContain('ステップ');
      expect(result).toMatch(/^#\s+[A-Z]/); // English heading
    });
  });
  
  describe('Problem-Solution Pattern', () => {
    it('should generate problem-solution article', async () => {
      const articleData = {
        topic: 'Digital Transformation',
        fearHook: 'Legacy systems holding you back?',
        evidence: 'Digital leaders grow 25% faster',
        solution: 'Phased transformation approach',
        examples: [
          {
            industry: 'Finance',
            company: 'JP Morgan',
            result: '360,000 hours saved'
          }
        ]
      };
      
      const result = await generator.generateFromPattern(
        'problem-solution-en',
        articleData,
        { language: 'en' }
      );
      
      expect(result).toBeDefined();
      expect(result).toContain('Problem');
      expect(result).toContain('Solution');
      expect(result).toContain('Implementation');
      
      // Check logical flow
      const lines = result.split('\n');
      const problemIndex = lines.findIndex(l => l.includes('Problem'));
      const solutionIndex = lines.findIndex(l => l.includes('Solution'));
      expect(solutionIndex).toBeGreaterThan(problemIndex);
    });
  });
  
  describe('Pattern validation', () => {
    it('should list all available patterns', () => {
      const patterns = Object.keys(PRESET_PATTERNS);
      
      expect(patterns).toContain('fear-driven');
      expect(patterns).toContain('fear-driven-en');
      expect(patterns).toContain('problem-solution');
      expect(patterns).toContain('problem-solution-en');
      
      // Each pattern should have valid structure
      patterns.forEach(patternName => {
        const pattern = PRESET_PATTERNS[patternName];
        expect(pattern).toHaveProperty('name');
        expect(pattern).toHaveProperty('formula');
        expect(pattern).toHaveProperty('components');
        expect(pattern.components).toBeInstanceOf(Array);
        expect(pattern.components.length).toBeGreaterThan(0);
      });
    });
    
    it('should get correct pattern for language', () => {
      const jaPattern = getPresetPattern('fear-driven', 'ja');
      const enPattern = getPresetPattern('fear-driven', 'en');
      
      expect(jaPattern).toBeDefined();
      expect(enPattern).toBeDefined();
      expect(jaPattern?.name).toBe('Fear-Driven Persuasion');
      expect(enPattern?.name).toBe('Fear-Driven Persuasion');
      
      // Components should be in different languages
      expect(jaPattern?.components[0].name).toContain('恐怖フック');
      expect(enPattern?.components[0].name).toContain('Fear Hook');
    });
    
    it('should handle unknown patterns gracefully', async () => {
      await expect(
        generator.generateFromPattern(
          'non-existent-pattern',
          { topic: 'test' }
        )
      ).rejects.toThrow('Unknown pattern');
    });
  });
  
  describe('Custom options with patterns', () => {
    it('should apply custom temperature and maxTokens', async () => {
      let capturedOptions: any;
      
      const capturingProvider: LLMProvider = {
        chat: async (sys, user, options) => {
          capturedOptions = options;
          return '# Test Article';
        }
      };
      
      const customGenerator = new ArticleGenerator(capturingProvider);
      
      await customGenerator.generateFromPattern(
        'fear-driven',
        { topic: 'Test' },
        {
          temperature: 0.3,
          maxTokens: 5000,
          language: 'en'
        }
      );
      
      expect(capturedOptions).toBeDefined();
      expect(capturedOptions.temperature).toBe(0.3);
      expect(capturedOptions.maxTokens).toBe(5000);
    });
  });
  
  describe('Performance with patterns', () => {
    it('should generate multiple articles efficiently', async () => {
      const topics = [
        'AI in Healthcare',
        'Blockchain Security',
        'Cloud Migration',
        'Data Analytics',
        'Cybersecurity'
      ];
      
      const startTime = Date.now();
      
      const results = await Promise.all(
        topics.map(topic =>
          generator.generateFromPattern(
            'fear-driven',
            {
              topic,
              fearHook: `Is your ${topic} strategy outdated?`,
              solution: `Modern ${topic} implementation`
            },
            { language: 'en' }
          )
        )
      );
      
      const totalTime = Date.now() - startTime;
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.length).toBeGreaterThan(100);
      });
      
      console.log(`Generated ${topics.length} articles in ${totalTime}ms`);
      expect(totalTime).toBeLessThan(5000); // Should be fast with mocked provider
    });
  });
});