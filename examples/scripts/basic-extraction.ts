#!/usr/bin/env npx tsx

/**
 * 基本的なテンプレート抽出の例
 * 
 * このスクリプトは、文書からテンプレート構造を抽出する
 * 最もシンプルな使用例を示しています。
 */

import { readFileSync } from 'fs';
import { TemplateExtractor } from '../../src';
import type { LLMProvider } from '../../src/types';

// シンプルなモックプロバイダー
class SimpleMockProvider implements LLMProvider {
  async chat(_systemPrompt: string, _userPrompt: string): Promise<string> {
    // 実際のLLMの代わりに、簡単な解析を行う
    const analysis = {
      elements: [
        { type: 'heading', level: 1 },
        { type: 'paragraph' },
        { type: 'heading', level: 2 },
        { type: 'list' },
        { type: 'paragraph' }
      ],
      keywords: [
        { term: 'TypeScript', weight: 0.9 },
        { term: '効率化', weight: 0.8 },
        { term: '新機能', weight: 0.7 }
      ],
      patterns: {
        opening: 'introduction',
        structure: 'hierarchical',
        flow: 'problem-solution'
      },
      confidence: 0.85
    };
    
    return JSON.stringify(analysis);
  }
}

async function main() {
  console.log('📚 Templex - Basic Template Extraction Example\n');
  
  // 1. プロバイダーとエクストラクターの初期化
  const provider = new SimpleMockProvider();
  const extractor = new TemplateExtractor({
    provider,
    language: 'ja'
  });
  
  // 2. サンプル文書の読み込み
  const documentPath = 'examples/documents/tech-blog-ja.md';
  let document: string;
  
  try {
    document = readFileSync(documentPath, 'utf-8');
    console.log(`✅ 文書を読み込みました: ${documentPath}\n`);
  } catch (error) {
    console.error('❌ 文書の読み込みに失敗しました');
    console.log('💡 ヒント: npm run build を実行してからこのスクリプトを実行してください\n');
    
    // デモ用のサンプルテキスト
    document = `
# サンプル記事

これはデモ用のサンプル記事です。

## セクション1
内容がここに入ります。

## セクション2
さらなる内容がここに入ります。
    `;
  }
  
  // 3. テンプレート抽出の実行
  console.log('🔍 テンプレート構造を分析中...\n');
  
  try {
    const result = await extractor.extract(document, {
      chunkSize: 2000,
      onProgress: (progress) => {
        console.log(`  [${progress.phase}] ${progress.message}`);
      }
    });
    
    console.log('\n✨ 抽出完了！\n');
    
    // 4. 結果の表示
    console.log('📋 テンプレート構造:');
    console.log('==================');
    
    // 構造要素
    console.log('\n🏗️ 文書構造:');
    result.template.structure.forEach((element, index) => {
      const indent = element.level ? '  '.repeat(element.level - 1) : '';
      console.log(`  ${indent}${index + 1}. ${element.type}${element.level ? ` (レベル${element.level})` : ''}`);
    });
    
    // キーワード
    console.log('\n🔤 キーワード:');
    result.template.keywords.slice(0, 5).forEach(keyword => {
      console.log(`  • ${keyword.term} (重要度: ${(keyword.weight * 100).toFixed(0)}%)`);
    });
    
    // パターン
    console.log('\n📊 検出されたパターン:');
    Object.entries(result.template.patterns).forEach(([key, value]) => {
      console.log(`  • ${key}: ${value}`);
    });
    
    // メタデータ
    console.log('\n📈 分析メタデータ:');
    console.log(`  • 信頼度: ${(result.confidence * 100).toFixed(0)}%`);
    console.log(`  • 処理時間: ${result.processingTime}ms`);
    console.log(`  • チャンク数: ${result.chunks}`);
    
    // 5. 抽象テンプレートの表示（存在する場合）
    if (result.template.abstractTemplate) {
      console.log('\n🎯 抽象テンプレート:');
      console.log(`  名前: ${result.template.abstractTemplate.name}`);
      console.log(`  構造: ${result.template.abstractTemplate.formula}`);
      console.log(`  フロー: ${result.template.abstractTemplate.flow}`);
    }
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
}

// 実行
main().catch(console.error);