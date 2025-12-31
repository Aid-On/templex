import type { AbstractTemplate } from './types.js';

/**
 * Predefined article generation patterns
 */
export const PRESET_PATTERNS: Record<string, AbstractTemplate> = {
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
  
  'fear-driven-en': {
    name: 'Fear-Driven Persuasion',
    formula: '[Fear Hook] + [Relatable Evidence] + [Simple Explanation] + [Industry Examples] + [Action Steps] + [Urgency]',
    components: [
      {
        name: 'Fear Hook',
        purpose: 'Create concern about current situation',
        examples: ['Is your X really Y?'],
        patterns: ['Question form', 'Warning form'],
        position: 1,
        weight: 0.25
      },
      {
        name: 'Relatable Evidence',
        purpose: 'Back up fear with examples',
        examples: ['Personal success/failure stories'],
        patterns: ['Personal story', 'Company case'],
        position: 2,
        weight: 0.20
      },
      {
        name: 'Simple Explanation',
        purpose: 'Simplify complex technology',
        examples: ['Think of X as Y'],
        patterns: ['Metaphor', 'Bullet points'],
        position: 3,
        weight: 0.15
      },
      {
        name: 'Industry Examples',
        purpose: 'Show concrete success cases',
        examples: ['Industry + Company + Metrics'],
        patterns: ['3 industries', 'Emphasize numbers'],
        position: 4,
        weight: 0.20
      },
      {
        name: 'Action Steps',
        purpose: 'Present easy starting steps',
        examples: ['Step 1: Complete in 5 minutes'],
        patterns: ['3 steps', 'Clear investment'],
        position: 5,
        weight: 0.10
      },
      {
        name: 'Urgency',
        purpose: 'Provide reason to act now',
        examples: ['Limited time offer'],
        patterns: ['Time-limited benefits', 'Future prediction'],
        position: 6,
        weight: 0.10
      }
    ],
    flow: 'Linear',
    persuasionTechniques: ['Loss aversion', 'Social proof', 'Authority', 'Scarcity']
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
  },

  'problem-solution-en': {
    name: 'Problem-Solution Framework',
    formula: '[Problem] + [Severity] + [Solution] + [Implementation] + [Expected Results]',
    components: [
      {
        name: 'Problem',
        purpose: 'Clarify reader\'s problem',
        examples: ['Are you struggling with X?'],
        patterns: ['Empathy', 'Statistics'],
        position: 1,
        weight: 0.20
      },
      {
        name: 'Severity',
        purpose: 'Show risk of ignoring problem',
        examples: ['If you continue, X will happen'],
        patterns: ['Future prediction', 'Comparison'],
        position: 2,
        weight: 0.20
      },
      {
        name: 'Solution',
        purpose: 'Propose concrete solution',
        examples: ['X can solve this'],
        patterns: ['Tool introduction', 'Method introduction'],
        position: 3,
        weight: 0.30
      },
      {
        name: 'Implementation',
        purpose: 'Explain specific steps',
        examples: ['Achieve in 3 steps'],
        patterns: ['Step-by-step', 'Checklist'],
        position: 4,
        weight: 0.20
      },
      {
        name: 'Expected Results',
        purpose: 'Paint picture of success',
        examples: ['You will achieve X'],
        patterns: ['Metrics prediction', 'Before/After'],
        position: 5,
        weight: 0.10
      }
    ],
    flow: 'Linear',
    persuasionTechniques: ['Logical persuasion', 'Track record', 'Gradual guidance']
  }
};

/**
 * Get a preset pattern by name and language
 */
export function getPresetPattern(name: string, language: 'ja' | 'en' = 'ja'): AbstractTemplate | undefined {
  const patternKey = language === 'en' && !name.endsWith('-en') ? `${name}-en` : name;
  return PRESET_PATTERNS[patternKey] || PRESET_PATTERNS[name];
}