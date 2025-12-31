#!/usr/bin/env node

import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { TemplateExtractor, ArticleGenerator } from '../src';
import type { LLMProvider } from '../src/types';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2 || args.includes('--help')) {
    console.log(`
Usage: templex-generate <template-file> <topic> [options]

Options:
  --provider <provider>  LLM provider to use (mock or groq, default: mock)
  --pattern <pattern>    Use predefined pattern (fear-driven or problem-solution)
  --output <file>        Output file path (default: stdout)
  
Example:
  templex-generate template.json "AI記事作成" --pattern fear-driven
  templex-generate success-article.md "量子コンピューター" --provider groq
    `);
    process.exit(0);
  }

  const templatePath = resolve(args[0]);
  const topic = args[1];
  
  const providerType = args.includes('--provider') 
    ? args[args.indexOf('--provider') + 1] 
    : 'mock';
    
  const pattern = args.includes('--pattern')
    ? args[args.indexOf('--pattern') + 1]
    : null;

  // プロバイダーの設定
  let provider;
  if (providerType === 'groq') {
    const { createGroqProvider } = await import('./src/groq-provider');
    provider = createGroqProvider();
  } else {
    provider = new MockLLMProvider();
  }

  const generator = new ArticleGenerator(provider);

  try {
    let article: string;
    
    if (pattern) {
      // プリセットパターンから生成
      console.error(`Generating article using ${pattern} pattern for topic: ${topic}`);
      
      article = await generator.generateFromPattern(pattern, {
        topic,
        fearHook: `あなたの${topic}戦略、本当に大丈夫ですか？`,
        evidence: `大手企業が${topic}で大成功した事例`,
        solution: `${topic}を今すぐ始める方法`,
        examples: [
          {
            industry: 'IT業界',
            company: 'テック社',
            result: '売上300%増加'
          },
          {
            industry: '製造業',
            company: 'メーカー社', 
            result: 'コスト50%削減'
          },
          {
            industry: 'サービス業',
            company: 'サービス社',
            result: '顧客満足度2倍'
          }
        ],
        japanContext: '日本企業の90%がまだ導入していない',
        urgency: '今なら先行者利益を得られる',
        cta: '無料相談を申し込む'
      });
    } else {
      // テンプレートファイルから生成
      const templateContent = await readFile(templatePath, 'utf-8');
      
      let template;
      if (templatePath.endsWith('.json')) {
        template = JSON.parse(templateContent);
      } else {
        // マークダウンファイルから抽出
        console.error('Extracting template from article...');
        const extractor = new TemplateExtractor(provider);
        const result = await extractor.extract(templateContent);
        template = result.abstractTemplate;
      }
      
      console.error(`Generating article for topic: ${topic}`);
      article = await generator.generate(template, {
        topic,
        fearHook: `${topic}の未来、見えていますか？`,
        evidence: `${topic}で成功している企業の事例`,
        solution: `${topic}を活用する3つの方法`
      });
    }
    
    // 出力
    if (args.includes('--output')) {
      const outputPath = resolve(args[args.indexOf('--output') + 1]);
      const { writeFile } = await import('fs/promises');
      await writeFile(outputPath, article);
      console.log(`Article saved to: ${outputPath}`);
    } else {
      console.log(article);
    }
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main().catch(console.error);