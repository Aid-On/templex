# Templex 使用例

このディレクトリには、Templexライブラリの使用例とサンプルドキュメントが含まれています。

## 📁 ディレクトリ構成

```
examples/
├── README.md                     # このファイル
├── documents/                    # サンプル文書
│   ├── tech-blog-ja.md          # 日本語技術ブログ
│   ├── tech-blog-en.md          # 英語技術ブログ
│   ├── business-article-ja.md   # 日本語ビジネス記事
│   └── marketing-copy.md        # マーケティングコピー
├── templates/                    # 抽出済みテンプレート
│   └── extracted-templates.json # 抽出されたテンプレート例
└── scripts/                      # 使用例スクリプト
    ├── basic-extraction.ts       # 基本的なテンプレート抽出
    ├── pattern-generation.ts     # パターンベース記事生成
    ├── batch-processing.ts       # バッチ処理の例
    └── custom-provider.ts        # カスタムプロバイダーの実装

```

## 🚀 クイックスタート

### 1. サンプル文書からテンプレート抽出

```bash
# 日本語技術ブログからテンプレート抽出
npm run cli:extract examples/documents/tech-blog-ja.md

# 英語ビジネス記事から抽出
npm run cli:extract examples/documents/business-article-en.md
```

### 2. パターンベースで記事生成

```bash
# Fear-Drivenパターンで記事生成
npm run cli:generate -- --pattern fear-driven --topic "AIセキュリティ"

# Problem-Solutionパターンで生成
npm run cli:generate -- --pattern problem-solution --topic "リモートワーク"
```

### 3. TypeScriptでの使用例

```bash
# 基本的なテンプレート抽出
npx tsx examples/scripts/basic-extraction.ts

# パターンベース生成
npx tsx examples/scripts/pattern-generation.ts

# バッチ処理
npx tsx examples/scripts/batch-processing.ts
```

## 📚 サンプル文書の説明

### `tech-blog-ja.md`
TypeScriptの新機能について解説した日本語の技術ブログ記事。見出し、コード例、説明文のバランスが取れた構造。

### `tech-blog-en.md`
React最適化テクニックについての英語技術記事。問題提起→解決策→実装例の流れ。

### `business-article-ja.md`
DXについてのビジネス記事。恐怖訴求（Fear-Driven）パターンの良い例。

### `marketing-copy.md`
SaaSプロダクトのランディングページコピー。感情に訴える構造の参考。

## 🎯 ユースケース別の例

### ケース1: ブログ記事の量産

既存の人気記事から構造を学習し、同じパターンで新記事を生成：

```typescript
// examples/use-cases/blog-automation.ts を参照
```

### ケース2: 技術文書の標準化

複数の技術文書から共通パターンを抽出し、標準テンプレートを作成：

```typescript
// examples/use-cases/doc-standardization.ts を参照
```

### ケース3: 多言語コンテンツ生成

日本語テンプレートから英語記事を生成：

```typescript
// examples/use-cases/multilingual-generation.ts を参照
```

## 💡 Tips

- 大量の文書を処理する場合は、`batch-processing.ts`を参考にしてください
- カスタムLLMプロバイダーを使いたい場合は、`custom-provider.ts`を参照
- テンプレートの精度を上げるには、似た構造の文書を複数分析することをお勧めします

## 📖 詳細なドキュメント

より詳しい使い方については、[メインのREADME](../README.md)と[CLIドキュメント](../cli/README.md)を参照してください。