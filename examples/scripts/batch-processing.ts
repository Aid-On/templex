#!/usr/bin/env npx tsx

/**
 * バッチ処理の例
 * 
 * 複数の文書を効率的に処理し、共通パターンを抽出する方法を示します。
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { TemplateExtractor } from '../../src';
import type { LLMProvider, DocumentTemplate, ExtractionResult } from '../../src/types';

// バッチ処理用のプロバイダー
class BatchMockProvider implements LLMProvider {
  private callCount = 0;
  
  async chat(systemPrompt: string, userPrompt: string): Promise<string> {
    this.callCount++;
    
    // 文書の特徴に応じて異なるテンプレートを返す
    const isTechnical = userPrompt.includes('TypeScript') || userPrompt.includes('React');
    const isBusiness = userPrompt.includes('DX') || userPrompt.includes('競合');
    
    if (isTechnical) {
      return JSON.stringify({
        elements: [
          { type: 'heading', level: 1 },
          { type: 'paragraph' },
          { type: 'code' },
          { type: 'heading', level: 2 },
          { type: 'list' }
        ],
        keywords: [
          { term: 'TypeScript', weight: 0.9 },
          { term: 'パフォーマンス', weight: 0.7 },
          { term: '最適化', weight: 0.6 }
        ],
        patterns: {
          structure: 'tutorial',
          flow: 'step-by-step'
        },
        confidence: 0.85
      });
    }
    
    if (isBusiness) {
      return JSON.stringify({
        elements: [
          { type: 'heading', level: 1 },
          { type: 'paragraph' },
          { type: 'heading', level: 2 },
          { type: 'list' },
          { type: 'quote' }
        ],
        keywords: [
          { term: 'DX', weight: 0.95 },
          { term: '競合優位', weight: 0.8 },
          { term: 'ROI', weight: 0.7 }
        ],
        patterns: {
          structure: 'fear-driven',
          flow: 'problem-solution'
        },
        confidence: 0.9
      });
    }
    
    // デフォルト
    return JSON.stringify({
      elements: [
        { type: 'heading', level: 1 },
        { type: 'paragraph' }
      ],
      keywords: [
        { term: 'general', weight: 0.5 }
      ],
      patterns: {
        structure: 'simple'
      },
      confidence: 0.7
    });
  }
  
  getCallCount(): number {
    return this.callCount;
  }
}

// 共通パターンを分析する関数
function analyzeCommonPatterns(results: ExtractionResult[]): {
  commonElements: string[];
  commonKeywords: string[];
  averageConfidence: number;
} {
  // 要素の出現頻度をカウント
  const elementCounts = new Map<string, number>();
  const keywordCounts = new Map<string, number>();
  
  results.forEach(result => {
    // 構造要素をカウント
    result.template.structure.forEach(element => {
      const key = `${element.type}${element.level ? `-L${element.level}` : ''}`;
      elementCounts.set(key, (elementCounts.get(key) || 0) + 1);
    });
    
    // キーワードをカウント
    result.template.keywords.forEach(keyword => {
      keywordCounts.set(keyword.term, (keywordCounts.get(keyword.term) || 0) + 1);
    });
  });
  
  // 50%以上の文書に含まれる要素を共通要素とする
  const threshold = results.length * 0.5;
  const commonElements = Array.from(elementCounts.entries())
    .filter(([_, count]) => count >= threshold)
    .map(([element, _]) => element);
  
  const commonKeywords = Array.from(keywordCounts.entries())
    .filter(([_, count]) => count >= threshold)
    .map(([keyword, _]) => keyword);
  
  // 平均信頼度を計算
  const averageConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
  
  return { commonElements, commonKeywords, averageConfidence };
}

async function main() {
  console.log('📚 Templex - Batch Processing Example\n');
  
  const provider = new BatchMockProvider();
  const extractor = new TemplateExtractor({
    provider,
    language: 'ja'
  });
  
  // 処理する文書のリスト
  const documents = [
    {
      path: 'examples/documents/tech-blog-ja.md',
      name: '技術ブログ記事'
    },
    {
      path: 'examples/documents/business-article-ja.md',
      name: 'ビジネス記事'
    }
  ];
  
  // サンプル文書も追加（ファイルが存在しない場合の代替）
  const sampleDocuments = [
    {
      name: 'サンプル技術記事',
      content: `# React 18の新機能
      
Reactの最新バージョンがリリースされました。

## 主要な変更点
- Concurrent Features
- Automatic Batching
- Transitions API

## パフォーマンス改善
レンダリング速度が大幅に向上しました。`
    },
    {
      name: 'サンプルマーケティング記事',
      content: `# なぜ今DXが必要なのか

デジタル変革は待ったなしの状況です。

## 競合他社の動向
既に多くの企業が先行しています。

## 今すぐ行動すべき理由
遅れれば遅れるほど差は広がります。`
    }
  ];
  
  const results: ExtractionResult[] = [];
  const errors: { document: string; error: string }[] = [];
  
  console.log(`📂 ${documents.length + sampleDocuments.length}個の文書を処理します\n`);
  
  // 実ファイルの処理
  for (const doc of documents) {
    console.log(`\n処理中: ${doc.name}`);
    console.log('-'.repeat(40));
    
    try {
      let content: string;
      if (existsSync(doc.path)) {
        content = readFileSync(doc.path, 'utf-8');
      } else {
        console.log(`  ⚠️  ファイルが見つかりません: ${doc.path}`);
        continue;
      }
      
      const result = await extractor.extract(content, {
        chunkSize: 1500,
        onProgress: (progress) => {
          process.stdout.write(`\r  [${progress.phase}] ${progress.message}`);
        }
      });
      
      results.push(result);
      console.log(`\n  ✅ 完了 (信頼度: ${(result.confidence * 100).toFixed(0)}%)`);
      
      // 主要なキーワードを表示
      console.log(`  📌 キーワード: ${result.template.keywords.slice(0, 3).map(k => k.term).join(', ')}`);
      
    } catch (error) {
      errors.push({ document: doc.name, error: String(error) });
      console.log(`\n  ❌ エラー: ${error}`);
    }
  }
  
  // サンプル文書の処理
  for (const doc of sampleDocuments) {
    console.log(`\n処理中: ${doc.name}`);
    console.log('-'.repeat(40));
    
    try {
      const result = await extractor.extract(doc.content, {
        chunkSize: 500
      });
      
      results.push(result);
      console.log(`  ✅ 完了 (信頼度: ${(result.confidence * 100).toFixed(0)}%)`);
      console.log(`  📌 キーワード: ${result.template.keywords.slice(0, 3).map(k => k.term).join(', ')}`);
      
    } catch (error) {
      errors.push({ document: doc.name, error: String(error) });
      console.log(`  ❌ エラー: ${error}`);
    }
  }
  
  // 統計情報
  console.log('\n' + '='.repeat(70));
  console.log('📊 バッチ処理結果サマリー');
  console.log('='.repeat(70));
  
  console.log(`\n✅ 成功: ${results.length}件`);
  console.log(`❌ エラー: ${errors.length}件`);
  console.log(`📞 API呼び出し回数: ${provider.getCallCount()}回`);
  
  if (results.length > 0) {
    // 共通パターンの分析
    const commonPatterns = analyzeCommonPatterns(results);
    
    console.log('\n🔍 共通パターン分析:');
    console.log('-'.repeat(40));
    
    console.log('\n📝 共通構造要素:');
    commonPatterns.commonElements.forEach(element => {
      console.log(`  • ${element}`);
    });
    
    console.log('\n🔤 共通キーワード:');
    commonPatterns.commonKeywords.forEach(keyword => {
      console.log(`  • ${keyword}`);
    });
    
    console.log(`\n📈 平均信頼度: ${(commonPatterns.averageConfidence * 100).toFixed(1)}%`);
    
    // 処理時間の統計
    const totalTime = results.reduce((sum, r) => sum + r.processingTime, 0);
    const avgTime = totalTime / results.length;
    
    console.log(`\n⏱️  処理時間:`);
    console.log(`  • 合計: ${totalTime}ms`);
    console.log(`  • 平均: ${avgTime.toFixed(0)}ms/文書`);
    
    // 結果をJSONファイルに保存
    const outputPath = 'examples/templates/batch-results.json';
    const outputData = {
      timestamp: new Date().toISOString(),
      summary: {
        processed: results.length,
        failed: errors.length,
        averageConfidence: commonPatterns.averageConfidence,
        totalProcessingTime: totalTime
      },
      commonPatterns,
      results: results.map(r => ({
        confidence: r.confidence,
        processingTime: r.processingTime,
        chunks: r.chunks,
        keywords: r.template.keywords.slice(0, 5)
      })),
      errors
    };
    
    try {
      writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
      console.log(`\n💾 結果を保存しました: ${outputPath}`);
    } catch (error) {
      console.log(`\n⚠️  結果の保存に失敗: ${error}`);
    }
  }
  
  console.log('\n✅ バッチ処理完了！');
  
  // 推奨事項
  console.log('\n💡 推奨事項:');
  console.log('  1. 共通パターンを基にテンプレートを標準化');
  console.log('  2. 信頼度の低い文書は個別に再分析');
  console.log('  3. エラーが発生した文書は内容を確認');
}

// 実行
main().catch(console.error);