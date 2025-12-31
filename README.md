# @aid-on/templex

[![npm version](https://badge.fury.io/js/@aid-on%2Ftemplex.svg)](https://www.npmjs.com/package/@aid-on/templex)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Template Extractor - AIを使用してテキストから抽象的なテンプレートとドキュメント構造を抽出するライブラリ

## 特徴

- 📝 **テンプレート抽出**: 記事やテキストから再利用可能なテンプレートパターンを自動抽出
- 🔄 **記事生成**: 抽出したテンプレートを使用して新しい記事を生成
- 🌍 **多言語対応**: 日本語と英語のプロンプトをサポート
- 🧩 **柔軟な統合**: `@aid-on/unillm`を使用して複数のLLMプロバイダーに対応
- 📊 **進捗追跡**: リアルタイムで処理の進捗を追跡
- 🔍 **高度な分析**: 文書構造、キーワード、説得技法を分析

## インストール

```bash
npm install @aid-on/templex
```

または

```bash
pnpm add @aid-on/templex
```

## 使用方法

### 基本的な使用例

```typescript
import { TemplateExtractor, ArticleGenerator } from '@aid-on/templex';
import { generate } from '@aid-on/unillm';

// LLMプロバイダーの設定
const provider = {
  chat: async (systemPrompt, userPrompt, options) => {
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];
    const result = await generate('gemini:gemini-2.0-flash', messages, {
      geminiApiKey: process.env.GEMINI_API_KEY
    });
    return result.text;
  }
};

// テンプレート抽出
const extractor = new TemplateExtractor({
  provider,
  language: 'ja',
  extractPatterns: true,
  extractKeywords: true
});

const articleText = `
# AIで変わる未来のビジネス

## なぜ今AIなのか
多くの企業が直面している課題...

## 現状の非効率性
- 手動プロセスによる時間の浪費
- ヒューマンエラーによる品質のばらつき

## AI導入による革新
AIテクノロジーを活用することで...
`;

const result = await extractor.extract(articleText);
console.log('抽出されたテンプレート:', result.template);
console.log('信頼度:', result.confidence);
```

### 記事生成

```typescript
import { ArticleGenerator } from '@aid-on/templex';

const generator = new ArticleGenerator('gemini:gemini-2.0-flash', {
  apiKeys: { geminiApiKey: process.env.GEMINI_API_KEY }
});

// 抽出したテンプレートを使用
const newArticle = await generator.generate(
  result.template.abstractTemplate,
  {
    topic: 'リモートワーク効率化',
    fearHook: 'リモートワークの生産性が低下していませんか？',
    solution: 'AI支援ツールで効率を2倍に',
    cta: '無料トライアルを今すぐ開始'
  }
);

console.log(newArticle);
```

### プリセットパターンの使用

```typescript
// Fear-Drivenパターンで記事を生成
const article = await generator.generateFromPattern('fear-driven', {
  topic: 'サイバーセキュリティ',
  fearHook: 'あなたの会社のデータは本当に安全ですか？',
  evidence: '昨年のサイバー攻撃は40%増加',
  solution: 'AI駆動型セキュリティシステム',
  urgency: '今なら初期費用50%OFF',
  cta: '無料診断を申し込む'
});
```

### 進捗追跡

```typescript
const extractor = new TemplateExtractor(config);

const result = await extractor.extract(article, {
  onProgress: (progress) => {
    console.log(`${progress.phase}: ${progress.current}/${progress.total}`);
    // 出力例:
    // chunking: 1/5
    // analyzing: 3/5
    // refining: 1/1
    // finalizing: 1/1
  }
});
```

## API

### TemplateExtractor

テキストからテンプレートを抽出するメインクラス

#### コンストラクタオプション

```typescript
interface ExtractionConfig {
  provider: LLMProvider;           // LLMプロバイダー
  language?: 'ja' | 'en';          // 言語設定（デフォルト: 'ja'）
  maxDepth?: number;               // 反復処理の最大深度
  minConfidence?: number;          // 最小信頼度閾値
  extractPatterns?: boolean;       // パターン抽出の有効化
  extractKeywords?: boolean;       // キーワード抽出の有効化
  extractMetadata?: boolean;       // メタデータ抽出の有効化
  useIterativeRefinement?: boolean; // 反復的改善の使用
}
```

### ArticleGenerator

テンプレートを使用して記事を生成

#### コンストラクタオプション

```typescript
interface GeneratorOptions {
  model?: string;           // 使用するモデル
  temperature?: number;     // 生成の温度パラメータ
  maxTokens?: number;       // 最大トークン数
  systemPrompt?: string;    // システムプロンプト
  apiKeys?: {              // APIキー
    groqApiKey?: string;
    geminiApiKey?: string;
    openaiApiKey?: string;
  };
}
```

### 抽出されるテンプレート構造

```typescript
interface AbstractTemplate {
  name: string;                    // テンプレート名
  formula: string;                 // 構成式
  components: Array<{
    name: string;                  // コンポーネント名
    purpose: string;               // 目的
    examples: string[];            // 実例
    patterns: string[];            // パターン
    position: number;              // 位置
    weight: number;                // 重要度 (0-1)
  }>;
  flow: string;                    // 情報の流れ
  persuasionTechniques: string[];  // 説得技法
}
```

## 必要な環境

- Node.js >= 20.0.0
- TypeScript >= 5.0.0

## 依存関係

- `@aid-on/unillm` - 統一LLMインターフェース
- `@aid-on/fractop` - フラクタル処理
- `@aid-on/iteratop` - 反復処理

## ライセンス

MIT

## 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueを開いて変更内容を議論してください。

## サポート

問題が発生した場合は、[GitHubのissue](https://github.com/Aid-On/aid-on-platform/issues)を作成してください。