# Templex CLI ツール

Templexライブラリを使って、文書からテンプレート抽出や記事生成を行うコマンドラインツール群です。

## 📦 セットアップ

```bash
# パッケージのインストール
npm install

# ビルド
npm run build
```

## 🛠️ 利用可能なCLIツール

### 1. テンプレート抽出 CLI (`cli.ts`)

文書からテンプレート構造を抽出するツール。

#### 基本的な使い方

```bash
# モックプロバイダーを使用（APIキー不要）
npm run cli:extract article.txt

# Groq LLMを使用（要APIキー）
GROQ_API_KEY=your-key npm run cli:extract article.txt --groq

# 組み込みサンプルで試す
npm run cli:extract -- --example
```

#### オプション

- `--mock` : モックプロバイダーを使用（デフォルト、APIキー不要）
- `--groq` : Groq LLMを使用（`GROQ_API_KEY`環境変数が必要）
- `--example` : 組み込みのサンプルテキストで実行
- `--help` : ヘルプを表示

#### 実行例

```bash
# 日本語記事からテンプレート抽出
$ npm run cli:extract examples/blog-post.md

📄 Templex CLI - Template Extractor
Using mock provider (no API needed)
📝 Analyzing: examples/blog-post.md

Extracted Template:
================================================================================
📋 Document Structure:
  - Heading (level 1)
  - Paragraph
  - Heading (level 2)
  - List
  - Heading (level 2)
  - Paragraph

🔤 Keywords (6 found):
  • typescript (weight: 0.85)
  • javascript (weight: 0.72)
  • フロントエンド (weight: 0.68)
  • バックエンド (weight: 0.65)
  • パフォーマンス (weight: 0.58)
  • 最適化 (weight: 0.55)

📊 Patterns:
  • opening: introduction-hook
  • structure: problem-solution
  • flow: hierarchical

✨ Abstract Template:
Name: Technical Article Template
Formula: Introduction + Problem Analysis + Solution + Implementation + Conclusion
Flow: Linear
Techniques: Data-driven, Authority

💡 Confidence: 0.85
```

### 2. 記事生成 CLI (`cli-generate.ts`)

テンプレートを使って新しい記事を生成するツール。

#### 基本的な使い方

```bash
# Fear-Drivenパターンで記事生成（日本語）
npm run cli:generate

# Problem-Solutionパターンで英語記事生成
npm run cli:generate -- --pattern problem-solution --lang en

# カスタムトピックで生成
npm run cli:generate -- --topic "AIによる業務効率化"

# Groq LLMを使用
GROQ_API_KEY=your-key npm run cli:generate -- --groq
```

#### オプション

- `--pattern` : 使用するパターン (`fear-driven` | `problem-solution`)
- `--lang` : 言語 (`ja` | `en`)
- `--topic` : 記事のトピック
- `--mock` : モックプロバイダーを使用
- `--groq` : Groq LLMを使用
- `--output` : 出力ファイルパス
- `--help` : ヘルプを表示

#### パターン別のオプション

**Fear-Drivenパターン:**
- `--fear-hook` : 恐怖フック（例: "競合に遅れをとっていませんか？"）
- `--evidence` : 証拠・統計（例: "80%の企業がすでに導入"）
- `--solution` : 解決策
- `--urgency` : 緊急性（例: "今すぐ始めるべき理由"）

**Problem-Solutionパターン:**
- `--problem` : 問題の説明
- `--severity` : 深刻性の説明
- `--solution` : 解決策
- `--implementation` : 実装方法

#### 実行例

```bash
# AIに関する恐怖訴求型記事を生成
$ npm run cli:generate -- \
    --topic "AI導入の必要性" \
    --fear-hook "あなたの会社はAI革命に乗り遅れていませんか？" \
    --solution "段階的なAI導入アプローチ"

🚀 Article Generator CLI
Using pattern: fear-driven
Language: ja
Provider: mock

Generated Article:
================================================================================

# あなたの会社はAI革命に乗り遅れていませんか？

## 隠れた危機
競合他社がAIを活用している間、あなたはまだ検討中です。最新の調査によると、
Fortune 500企業の80%がすでにAIを中核業務に統合しています。

## 身近な証拠
TechCorpという中規模企業の話をしましょう。AI トレンドを無視した結果、
18ヶ月で市場シェアの40%を AI対応の競合他社に奪われました。

## 簡単な解説
AIを「眠らない最も優秀な社員」と考えてください。24時間365日、
データを処理し、パターンを見つけ、提案を行います。

[... 続く ...]
```

## 🔧 高度な使い方

### 環境変数の設定

```bash
# .envファイルを作成
echo "GROQ_API_KEY=your-api-key" > .env

# 環境変数を読み込んで実行
source .env && npm run cli:generate -- --groq
```

### バッチ処理

複数のファイルを処理する場合：

```bash
# シェルスクリプトで一括処理
for file in articles/*.txt; do
  npm run cli:extract "$file" > "templates/$(basename $file .txt).json"
done
```

### 出力のパイプライン処理

```bash
# テンプレート抽出して、それを基に新記事生成
npm run cli:extract article.txt | \
  jq '.keywords' | \
  npm run cli:generate -- --keywords-file /dev/stdin
```

## 📝 package.json スクリプト

以下のスクリプトが利用可能です：

```json
{
  "scripts": {
    "cli:extract": "tsx cli/cli.ts",
    "cli:generate": "tsx cli/cli-generate.ts",
    "cli:help": "tsx cli/cli.ts --help && tsx cli/cli-generate.ts --help"
  }
}
```

## 🎯 ユースケース

### 1. ブログ記事のテンプレート化

既存の人気ブログ記事からテンプレートを抽出し、同じ構造で新しい記事を量産：

```bash
# 人気記事からテンプレート抽出
npm run cli:extract popular-post.md > template.json

# テンプレートを使って新記事生成
npm run cli:generate -- --template template.json --topic "新技術トレンド"
```

### 2. 技術文書の標準化

社内の技術文書を分析して、標準的な構造を抽出：

```bash
# 複数の技術文書を分析
for doc in tech-docs/*.md; do
  npm run cli:extract "$doc"
done | npm run analyze-patterns > standard-template.json
```

### 3. マーケティングコンテンツの自動生成

効果的なセールスページの構造を学習して、新商品用のページを生成：

```bash
# Fear-Drivenパターンでランディングページ生成
npm run cli:generate -- \
  --pattern fear-driven \
  --topic "サイバーセキュリティ" \
  --fear-hook "あなたのデータは本当に安全ですか？" \
  --evidence "昨年のデータ侵害は43%増加" \
  --solution "エンドツーエンド暗号化ソリューション" \
  --output landing-page.md
```

## ⚠️ 注意事項

- Groq APIを使用する場合は、APIキーが必要です
- 大きなファイルを処理する場合は、メモリ使用量に注意してください
- 生成された記事は必ず人間がレビューしてから公開してください

## 🤝 貢献

CLIツールの改善や新機能の提案は歓迎です！
Issueやプルリクエストをお待ちしています。