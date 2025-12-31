export const DEFAULT_PROMPTS = {
  ja: {
    analysisSystem: `文章を分析して、以下の2つを抽出してください：

1. 文章の抽象的なテンプレート構造（エレベーターピッチ、問題解決型、ストーリーテリング型など）
2. 各セクションの具体的な内容と役割

JSON形式で出力してください：
{
  "abstractTemplate": {
    "name": "識別されたテンプレートパターン名（例：Problem-Solution、AIDA、Hero's Journey）",
    "formula": "抽象的な構成式（例：[問題提起] → [現状分析] → [解決策] → [ベネフィット] → [行動喚起]）",
    "components": [
      {
        "name": "コンポーネント名（例：Hook、Problem Statement）",
        "purpose": "このコンポーネントの目的",
        "examples": ["実際の文章から抽出した例"],
        "patterns": ["使用されているパターン"],
        "position": 順序,
        "weight": 重要度(0-1)
      }
    ],
    "flow": "情報の流れ方（Linear/Pyramid/Circular）",
    "persuasionTechniques": ["使用されている説得技法"]
  },
  "elements": [
    {
      "type": "heading"|"paragraph"|"list"|"code",
      "level": 1-6,
      "content": "内容要約",
      "intent": "意図",
      "persuasion": "訴求ポイント",
      "technique": "技法"
    }
  ],
  "keywords": ["キーワード"],
  "patterns": {
    "introduction": "導入パターン",
    "body": "展開パターン",
    "conclusion": "結論パターン"
  },
  "confidence": 0.7
}

重要：
1. abstractTemplateで汎用的に再利用可能なパターンを抽出してください。
2. confidenceは必ず0.0から1.0の間の数値を入れてください（通常0.6-0.8）。`,
    
    mergePrompt: `複数の分析結果を統合して、一貫性のあるテンプレートを作成してください。
重複を排除し、パターンを一般化してください。`,
    
    supplementPrompt: `テンプレートの不足部分を補完し、全体の整合性を確認してください。`
  },
  
  en: {
    analysisSystem: `Analyze the text and extract the following two elements:

1. Abstract template structure (Elevator Pitch, Problem-Solution, Storytelling, etc.)
2. Specific content and role of each section

Output in JSON format:
{
  "abstractTemplate": {
    "name": "Identified template pattern name (e.g., Problem-Solution, AIDA, Hero's Journey)",
    "formula": "Abstract composition formula (e.g., [Problem] → [Analysis] → [Solution] → [Benefits] → [Call to Action])",
    "components": [
      {
        "name": "Component name (e.g., Hook, Problem Statement)",
        "purpose": "Purpose of this component",
        "examples": ["Examples extracted from the actual text"],
        "patterns": ["Patterns used"],
        "position": sequence_number,
        "weight": importance(0-1)
      }
    ],
    "flow": "Information flow (Linear/Pyramid/Circular)",
    "persuasionTechniques": ["Persuasion techniques used"]
  },
  "elements": [
    {
      "type": "heading"|"paragraph"|"list"|"code",
      "level": 1-6,
      "content": "Content summary",
      "intent": "Intent",
      "persuasion": "Appeal points",
      "technique": "Technique"
    }
  ],
  "keywords": ["keywords"],
  "patterns": {
    "introduction": "Introduction pattern",
    "body": "Body pattern",
    "conclusion": "Conclusion pattern"
  },
  "confidence": 0.7
}

Important:
1. Extract a reusable pattern in the abstractTemplate.
2. confidence must be a number between 0.0 and 1.0 (typically 0.6-0.8).`,
    
    mergePrompt: `Merge multiple analysis results to create a consistent template.
Eliminate duplicates and generalize patterns.`,
    
    supplementPrompt: `Supplement missing parts of the template and verify overall consistency.`
  }
};

export type PromptLanguage = keyof typeof DEFAULT_PROMPTS;

export class PromptBuilder {
  private language: PromptLanguage;
  private customPrompts?: Partial<typeof DEFAULT_PROMPTS[PromptLanguage]>;

  constructor(language: PromptLanguage = 'ja', customPrompts?: Partial<typeof DEFAULT_PROMPTS[PromptLanguage]>) {
    this.language = language;
    this.customPrompts = customPrompts;
  }

  getAnalysisPrompt(): string {
    return this.customPrompts?.analysisSystem || DEFAULT_PROMPTS[this.language].analysisSystem;
  }

  getMergePrompt(): string {
    return this.customPrompts?.mergePrompt || DEFAULT_PROMPTS[this.language].mergePrompt;
  }

  getSupplementPrompt(): string {
    return this.customPrompts?.supplementPrompt || DEFAULT_PROMPTS[this.language].supplementPrompt;
  }

  setLanguage(language: PromptLanguage): void {
    this.language = language;
  }

  setCustomPrompts(prompts: Partial<typeof DEFAULT_PROMPTS[PromptLanguage]>): void {
    this.customPrompts = prompts;
  }
}