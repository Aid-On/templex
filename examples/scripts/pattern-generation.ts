#!/usr/bin/env npx tsx

/**
 * パターンベース記事生成の例
 * 
 * プリセットパターン（Fear-Driven、Problem-Solution）を使って
 * 新しい記事を生成する方法を示します。
 */

import { ArticleGenerator } from '../../src';
import type { LLMProvider, ArticleData } from '../../src/types';

// 記事生成用のモックプロバイダー
class GeneratorMockProvider implements LLMProvider {
  async chat(systemPrompt: string, userPrompt: string): Promise<string> {
    // プロンプトからパターンを判定
    const isFearDriven = userPrompt.includes('恐怖フック') || userPrompt.includes('Fear Hook');
    const isProblemSolution = userPrompt.includes('問題提起') || userPrompt.includes('Problem');
    const isEnglish = systemPrompt.includes('English');
    
    if (isFearDriven) {
      return this.generateFearDrivenArticle(isEnglish);
    } else if (isProblemSolution) {
      return this.generateProblemSolutionArticle(isEnglish);
    }
    
    return this.generateDefaultArticle();
  }
  
  private generateFearDrivenArticle(isEnglish: boolean): string {
    if (isEnglish) {
      return `# Is Your Business Ready for the AI Revolution?

## The Hidden Crisis
While you're still planning, your competitors are already implementing AI solutions. Recent studies show that 80% of industry leaders have integrated AI into their core operations.

## The Evidence is Clear
Let me share a story about TechCorp, a mid-size company that ignored AI trends. Within 18 months, they lost 40% market share to AI-enabled competitors.

## Understanding AI Simply
Think of AI as your smartest employee who never sleeps. It processes data, finds patterns, and makes recommendations 24/7.

## Success Stories
- **Retail**: Amazon increased sales by 35% using AI recommendations
- **Finance**: JP Morgan saves 360,000 hours annually with AI
- **Healthcare**: Mayo Clinic reduces diagnosis time by 50%

## Your Action Plan
1. Identify one repetitive task (5 minutes)
2. Run a 30-day AI pilot ($500 budget)
3. Measure impact and scale

## Act Now
Early adopters gain insurmountable competitive advantages. The question isn't whether to adopt AI, but whether you'll lead or follow.`;
    }
    
    return `# AIを導入しないリスク、本当に理解していますか？

## 見過ごされている危機
あなたが検討している間に、競合他社は既にAIを活用して圧倒的な差をつけています。最新の調査では、業界リーダーの80%がAIを中核業務に統合済みです。

## 衝撃的な事実
中堅企業のTechCorpの事例をご存知でしょうか。AIトレンドを無視した結果、わずか18ヶ月で市場シェアの40%を失いました。

## AIを簡単に理解する
AIは「24時間働き続ける最も優秀な社員」と考えてください。データを処理し、パターンを発見し、最適な提案を行います。

## 成功事例
- **小売業**: Amazon - AI推奨により売上35%増
- **金融**: JPモルガン - 年間36万時間削減
- **医療**: Mayo Clinic - 診断時間50%短縮

## 今すぐできる行動計画
1. 繰り返し作業を1つ特定（5分）
2. 30日間のAIパイロット実施（予算5万円）
3. 効果測定と拡大展開

## 緊急性
早期導入者は追いつけない競争優位を獲得します。問題は「AIを導入するか」ではなく「いつ導入するか」です。`;
  }
  
  private generateProblemSolutionArticle(isEnglish: boolean): string {
    if (isEnglish) {
      return `# Solving Digital Transformation Challenges

## The Problem
Organizations struggle with digital transformation. Legacy systems, resistance to change, and skill gaps create significant barriers.

## Why This Matters
Companies failing to transform digitally lose 25% revenue growth compared to digital leaders.

## The Solution
A phased digital transformation approach:
- Cloud migration for scalability
- Process automation for efficiency
- Data analytics for insights

## Implementation
1. Assessment Phase (Week 1-2)
2. Planning Phase (Week 3-4)
3. Pilot Implementation (Month 2)
4. Full Rollout (Month 3-6)

## Expected Results
- 40% reduction in operational costs
- 60% faster time-to-market
- 30% improvement in customer satisfaction`;
    }
    
    return `# デジタル変革の課題を解決する

## 問題提起
多くの組織がデジタル変革に苦戦しています。レガシーシステム、変化への抵抗、スキルギャップが大きな障壁となっています。

## 深刻性
デジタル変革に失敗した企業は、デジタルリーダーと比較して売上成長率が25%低下します。

## 解決策
段階的なデジタル変革アプローチ：
- スケーラビリティのためのクラウド移行
- 効率化のためのプロセス自動化
- インサイトのためのデータ分析

## 実装方法
1. 評価フェーズ（1-2週目）
2. 計画フェーズ（3-4週目）
3. パイロット実装（2ヶ月目）
4. 全面展開（3-6ヶ月目）

## 期待される成果
- 運用コスト40%削減
- 市場投入時間60%短縮
- 顧客満足度30%向上`;
  }
  
  private generateDefaultArticle(): string {
    return `# サンプル記事

これはデフォルトの記事生成例です。

## セクション1
内容がここに入ります。

## セクション2
さらなる内容がここに入ります。

## まとめ
重要なポイントをまとめます。`;
  }
}

async function main() {
  console.log('🚀 Templex - Pattern-Based Article Generation\n');
  
  const provider = new GeneratorMockProvider();
  const generator = new ArticleGenerator(provider);
  
  // 使用するパターンを選択
  const patterns = [
    { name: 'fear-driven', label: 'Fear-Driven (恐怖訴求型)' },
    { name: 'problem-solution', label: 'Problem-Solution (問題解決型)' }
  ];
  
  console.log('利用可能なパターン:');
  patterns.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.label}`);
  });
  console.log();
  
  // 各パターンで記事を生成
  for (const pattern of patterns) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📝 ${pattern.label} パターンで生成`);
    console.log('='.repeat(70));
    
    // 日本語版
    console.log('\n🇯🇵 日本語版:');
    console.log('-'.repeat(40));
    
    const articleDataJa: ArticleData = {
      topic: 'AI導入の必要性',
      fearHook: '競合他社に遅れをとっていませんか？',
      evidence: 'Fortune 500企業の80%がAI導入済み',
      solution: '段階的なAI導入アプローチ',
      examples: [
        {
          industry: '小売業',
          company: 'Amazon',
          result: '売上35%増加'
        },
        {
          industry: '金融',
          company: 'JPモルガン',
          result: '年間36万時間削減'
        }
      ],
      urgency: '今すぐ始めるべき理由',
      cta: '無料相談に申し込む'
    };
    
    try {
      const articleJa = await generator.generateFromPattern(
        pattern.name as 'fear-driven' | 'problem-solution',
        articleDataJa,
        { language: 'ja' }
      );
      
      // 最初の数行だけ表示
      const linesJa = articleJa.split('\n').slice(0, 10);
      console.log(linesJa.join('\n'));
      console.log('... (省略)');
      
    } catch (error) {
      console.error(`❌ エラー: ${error}`);
    }
    
    // 英語版
    console.log('\n🇬🇧 英語版:');
    console.log('-'.repeat(40));
    
    const articleDataEn: ArticleData = {
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
      urgency: 'Start now or fall behind',
      cta: 'Book free consultation'
    };
    
    try {
      const articleEn = await generator.generateFromPattern(
        pattern.name as 'fear-driven' | 'problem-solution',
        articleDataEn,
        { language: 'en' }
      );
      
      // 最初の数行だけ表示
      const linesEn = articleEn.split('\n').slice(0, 10);
      console.log(linesEn.join('\n'));
      console.log('... (省略)');
      
    } catch (error) {
      console.error(`❌ エラー: ${error}`);
    }
  }
  
  console.log('\n✅ 生成完了！');
  console.log('\n💡 ヒント:');
  console.log('  - 実際のLLM（Groq等）を使用するとより高品質な記事が生成されます');
  console.log('  - ArticleDataの各フィールドをカスタマイズして独自の記事を作成できます');
  console.log('  - カスタムパターンを作成することも可能です');
}

// 実行
main().catch(console.error);