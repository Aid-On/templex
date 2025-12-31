# @aid-on/templex

## 概要

`@aid-on/templex`は、記事や文書から抽象的なテンプレートと文書構造を抽出するライブラリです。fractop、iteratop、unilmpを組み合わせて、文書の構造パターンを学習し、再利用可能なテンプレートを生成します。

## 主な特徴

- **テンプレート抽出**: 文書から再利用可能な抽象テンプレートを生成
- **構造分析**: 見出し、段落、リストなどの文書構造を解析
- **パターン学習**: 複数文書からの共通構造パターン発見
- **関数型処理**: fractop/iteratopによる効率的なデータ変換
- **LLM統合**: unilmpによる高度な文書理解
- **多言語対応**: 日本語・英語を含む多言語文書の処理

## アーキテクチャ

### 文書処理パイプライン

```
Raw Text → Structure Analysis → Pattern Recognition → Template Generation
    ↓              ↓                    ↓                    ↓
入力文書    構造解析・分割     パターン認識・抽象化    テンプレート生成
```

### コンポーネント構成

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Text Input    │    │   Processing    │    │    Output       │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ Articles        │───►│ iteratop        │───►│ Templates       │
│ Documents       │    │ fractop         │    │ Structures      │
│ Web Pages       │    │ unilmp          │    │ Patterns        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## APIリファレンス

### 基本的な使用方法

```typescript
import { createTemplateExtractor, extractStructure } from '@aid-on/templex';

// テンプレート抽出器の作成
const extractor = createTemplateExtractor({
  provider: 'groq',
  model: 'llama-3.3-70b',
  language: 'ja'
});

// 単一文書からのテンプレート抽出
const template = await extractor.extractTemplate(articleText);

// 複数文書からの共通パターン抽出
const commonTemplate = await extractor.extractCommonPattern([
  article1, article2, article3
]);

// 文書構造の詳細分析
const structure = await extractStructure(articleText, {
  includeMetadata: true,
  preserveFormatting: false
});
```

### テンプレート生成

```typescript
import { TemplateGenerator } from '@aid-on/templex';

const generator = new TemplateGenerator({
  abstractionLevel: 'high',
  preserveVariables: true,
  includeStyleGuide: true
});

// 記事テンプレート生成
const articleTemplate = await generator.createTemplate(blogPost, {
  templateType: 'blog-article',
  sections: ['introduction', 'body', 'conclusion'],
  variables: ['title', 'author', 'publishDate']
});

// テンプレートの適用
const newArticle = await generator.applyTemplate(articleTemplate, {
  title: "新しい記事のタイトル",
  author: "著者名",
  content: "記事本文..."
});
```

## 使用例

### ブログ記事テンプレート化システム

```typescript
// src/blog-template-system.ts
import { createTemplateExtractor } from '@aid-on/templex';
import { iteratop } from '@aid-on/iteratop';

export class BlogTemplateSystem {
  private extractor = createTemplateExtractor({
    provider: 'groq',
    model: 'llama-3.3-70b'
  });

  async analyzeBlogCollection(blogPosts: string[]) {
    // 各記事の構造を並列分析
    const structures = await iteratop(blogPosts)
      .parallel()
      .map(async (post) => {
        return await this.extractor.extractStructure(post);
      })
      .collect();

    // 共通パターンの抽出
    const commonPattern = await this.extractor.findCommonPattern(structures);

    // テンプレート生成
    const template = await this.generateBlogTemplate(commonPattern);

    return {
      template,
      structures,
      recommendations: this.generateRecommendations(commonPattern)
    };
  }

  private async generateBlogTemplate(pattern: any) {
    return {
      structure: {
        header: {
          title: "{{title}}",
          author: "{{author}}",
          publishDate: "{{publishDate}}",
          tags: "{{tags}}"
        },
        body: {
          introduction: "{{introduction}}",
          mainContent: pattern.bodyStructure,
          conclusion: "{{conclusion}}"
        },
        footer: {
          relatedPosts: "{{relatedPosts}}",
          socialShare: true
        }
      },
      variables: pattern.detectedVariables,
      styleGuide: pattern.stylePattern
    };
  }
}
```

### 技術文書標準化

```typescript
// src/tech-doc-standardizer.ts
import { createTemplateExtractor, DocumentStructure } from '@aid-on/templex';

export class TechDocStandardizer {
  constructor(private config: {
    standardFormat: 'RFC' | 'IEEE' | 'ISO' | 'internal';
    language: string;
  }) {}

  async standardizeDocuments(documents: string[]) {
    const extractor = createTemplateExtractor({
      provider: 'groq',
      specialization: 'technical-writing'
    });

    const results = [];

    for (const doc of documents) {
      // 現在の文書構造を分析
      const currentStructure = await extractor.extractStructure(doc, {
        technicalLevel: 'high',
        preserveCodeBlocks: true,
        extractReferences: true
      });

      // 標準形式に変換
      const standardized = await this.convertToStandard(
        doc, 
        currentStructure
      );

      // 品質チェック
      const qualityScore = await this.assessQuality(standardized);

      results.push({
        original: doc,
        standardized,
        structure: currentStructure,
        qualityScore,
        improvements: this.suggestImprovements(currentStructure)
      });
    }

    return results;
  }

  private async convertToStandard(
    document: string, 
    structure: DocumentStructure
  ) {
    const standardTemplate = this.getStandardTemplate(this.config.standardFormat);
    
    // 構造マッピング
    const mapped = await this.mapToStandardStructure(structure, standardTemplate);
    
    // 文書再生成
    return await this.generateStandardDocument(mapped, document);
  }

  private getStandardTemplate(format: string) {
    const templates = {
      'RFC': {
        sections: ['abstract', 'introduction', 'specification', 'security', 'references'],
        formatting: 'plain-text',
        numbering: 'decimal'
      },
      'IEEE': {
        sections: ['abstract', 'introduction', 'methodology', 'results', 'discussion', 'conclusion'],
        formatting: 'academic',
        numbering: 'roman-arabic'
      },
      'internal': {
        sections: ['overview', 'requirements', 'design', 'implementation', 'testing'],
        formatting: 'markdown',
        numbering: 'hierarchical'
      }
    };

    return templates[format] || templates['internal'];
  }
}
```

### コンテンツ生成テンプレートシステム

```typescript
// src/content-generation-system.ts
import { createTemplateExtractor } from '@aid-on/templex';
import { fractop } from '@aid-on/fractop';

export class ContentGenerationSystem {
  private extractor = createTemplateExtractor({
    provider: 'groq',
    model: 'llama-3.3-70b'
  });

  async createContentTemplate(examples: string[], contentType: string) {
    // 関数型パイプラインでテンプレート生成
    const template = await fractop
      .from(examples)
      .map(text => this.preprocessText(text))
      .filter(text => this.isValidExample(text))
      .reduce(async (acc, text) => {
        const structure = await this.extractor.extractStructure(text);
        return this.mergeStructures(acc, structure);
      }, {})
      .map(merged => this.createTemplateFromStructure(merged, contentType))
      .get();

    return template;
  }

  async generateContent(template: any, variables: Record<string, any>) {
    // テンプレート変数の検証
    const missingVars = this.validateVariables(template, variables);
    if (missingVars.length > 0) {
      throw new Error(`Missing variables: ${missingVars.join(', ')}`);
    }

    // コンテンツ生成
    const generated = await this.fillTemplate(template, variables);

    // 品質向上処理
    const enhanced = await this.enhanceContent(generated, template.styleGuide);

    return {
      content: enhanced,
      metadata: {
        templateUsed: template.id,
        generatedAt: new Date().toISOString(),
        variables: Object.keys(variables)
      }
    };
  }

  private async enhanceContent(content: string, styleGuide: any) {
    // スタイル統一
    let enhanced = await this.applyStyleGuide(content, styleGuide);

    // 読みやすさ向上
    enhanced = await this.improveReadability(enhanced);

    // SEO最適化
    enhanced = await this.optimizeForSEO(enhanced);

    return enhanced;
  }

  private preprocessText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')  // 改行統一
      .replace(/\s+/g, ' ')    // 空白正規化
      .trim();
  }

  private isValidExample(text: string): boolean {
    return text.length > 100 && 
           text.split('\n').length > 3 &&
           !/^(error|warning|debug)/i.test(text);
  }

  private mergeStructures(acc: any, structure: any): any {
    // 構造マージロジック
    return {
      sections: [...(acc.sections || []), ...structure.sections],
      patterns: {...(acc.patterns || {}), ...structure.patterns},
      variables: [...new Set([...(acc.variables || []), ...structure.variables])]
    };
  }
}
```

### 多言語文書テンプレート

```typescript
// src/multilingual-template.ts
import { createTemplateExtractor } from '@aid-on/templex';

export class MultilingualTemplateExtractor {
  constructor(private supportedLanguages = ['ja', 'en', 'zh', 'ko']) {}

  async createMultilingualTemplate(documents: Record<string, string[]>) {
    const templates = {};

    // 言語別テンプレート抽出
    for (const [language, docs] of Object.entries(documents)) {
      if (!this.supportedLanguages.includes(language)) {
        console.warn(`Language ${language} not supported, skipping`);
        continue;
      }

      const extractor = createTemplateExtractor({
        provider: 'groq',
        language,
        culturalContext: this.getCulturalContext(language)
      });

      // 言語固有パターン抽出
      const languageTemplate = await extractor.extractCommonPattern(docs);
      
      // 文化的文書構造の分析
      const culturalStructure = await this.analyzeCulturalStructure(docs, language);

      templates[language] = {
        ...languageTemplate,
        culturalFeatures: culturalStructure,
        localizationRules: this.getLocalizationRules(language)
      };
    }

    // 言語間共通パターンの抽出
    const universalPattern = await this.extractUniversalPattern(templates);

    return {
      templates,
      universalPattern,
      localizationGuide: this.generateLocalizationGuide(templates)
    };
  }

  private getCulturalContext(language: string) {
    const contexts = {
      'ja': {
        formalityLevels: ['casual', 'polite', 'respectful', 'humble'],
        structurePreference: 'ki-sho-ten-ketsu',
        honorifics: true
      },
      'en': {
        formalityLevels: ['informal', 'formal', 'academic'],
        structurePreference: 'introduction-body-conclusion',
        directness: 'high'
      },
      'zh': {
        formalityLevels: ['informal', 'formal', 'classical'],
        structurePreference: 'parallel-structure',
        harmony: true
      },
      'ko': {
        formalityLevels: ['banmal', 'jondaetmal', 'hasipsio-che'],
        structurePreference: 'context-first',
        hierarchy: true
      }
    };

    return contexts[language] || contexts['en'];
  }

  private async analyzeCulturalStructure(docs: string[], language: string) {
    // 文化固有の文書構造パターンを分析
    const features = {
      paragraphLength: this.analyzeTypicalParagraphLength(docs),
      sentenceComplexity: this.analyzeSentenceComplexity(docs, language),
      formalityIndicators: this.extractFormalityIndicators(docs, language),
      structuralPatterns: this.findStructuralPatterns(docs, language)
    };

    return features;
  }

  async translateTemplate(
    template: any, 
    fromLanguage: string, 
    toLanguage: string
  ) {
    const extractor = createTemplateExtractor({
      provider: 'groq',
      language: toLanguage
    });

    // 構造的翻訳（レイアウト保持）
    const translatedStructure = await this.translateStructure(
      template.structure, 
      fromLanguage, 
      toLanguage
    );

    // 文化的適応
    const culturallyAdapted = await this.adaptToCulture(
      translatedStructure, 
      toLanguage
    );

    return {
      ...template,
      structure: culturallyAdapted,
      language: toLanguage,
      originalLanguage: fromLanguage,
      adaptationNotes: this.generateAdaptationNotes(template, toLanguage)
    };
  }
}
```

## 設定オプション

### テンプレート抽出設定

```typescript
interface TemplateExtractorConfig {
  // LLM設定
  provider: 'groq' | 'openai' | 'anthropic';
  model?: string;
  
  // 言語・文化設定
  language: string;
  culturalContext?: any;
  
  // 抽出設定
  abstractionLevel: 'low' | 'medium' | 'high';
  preserveFormatting: boolean;
  includeMetadata: boolean;
  
  // 品質制御
  minConfidenceScore: number;
  maxVariableCount: number;
  templateValidation: boolean;
}
```

### 処理パフォーマンス設定

```typescript
interface ProcessingOptions {
  // 並列処理
  parallelism: number;
  batchSize: number;
  
  // キャッシュ
  enableCache: boolean;
  cacheExpiration: number;
  
  // メモリ管理
  maxMemoryUsage: string;
  streamProcessing: boolean;
}
```

## パフォーマンス考慮事項

### 大量文書処理最適化

```typescript
// 効率的な大量文書処理
import { iteratop } from '@aid-on/iteratop';

class OptimizedDocumentProcessor {
  async processBulkDocuments(documents: string[]) {
    return await iteratop(documents)
      .chunk(50)  // バッチサイズ制御
      .parallel(10)  // 並列度制御
      .map(async (batch) => {
        return await this.processBatch(batch);
      })
      .flatten()
      .collect();
  }
  
  private async processBatch(batch: string[]) {
    // メモリ効率的なバッチ処理
    const results = [];
    for (const doc of batch) {
      const result = await this.processDocument(doc);
      results.push(result);
      
      // メモリ解放
      if (results.length % 10 === 0) {
        await this.garbageCollect();
      }
    }
    return results;
  }
}
```