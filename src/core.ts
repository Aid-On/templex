import { FractalProcessor } from '@aid-on/fractop';
import { createIterator } from '@aid-on/iteratop';
import type {
  DocumentTemplate,
  ExtractionConfig,
  ExtractionOptions,
  ExtractionResult,
  ChunkAnalysis,
  TemplateElement,
  LLMProvider
} from './types';
import { PromptBuilder, type PromptLanguage } from './prompts';
import { validateExtractionConfig, validateChunkAnalysis, validateDocumentTemplate } from './validation';
import { mergeElementLists } from './similarity';

export class TemplateExtractor {
  private config: Required<ExtractionConfig>;
  private fractalProcessor: FractalProcessor<ChunkAnalysis>;
  private lastAbstractTemplate?: any;
  private promptBuilder: PromptBuilder;

  constructor(config: ExtractionConfig) {
    // Validate and normalize configuration
    this.config = validateExtractionConfig(config);

    this.promptBuilder = new PromptBuilder(
      this.config.language as PromptLanguage || 'ja'
    );

    this.fractalProcessor = new FractalProcessor<ChunkAnalysis>(
      config.provider,
      {
        chunkSize: 2000,
        overlapSize: 200,
        maxRetries: 3,
        timeout: 30000,
      }
    );
  }

  async extract(text: string, options: ExtractionOptions = {}): Promise<ExtractionResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const { onProgress } = options;

    try {
      // Step 1: Use FractalProcessor to analyze chunks
      if (onProgress) {
        onProgress({
          phase: 'chunking',
          current: 0,
          total: 1,
          message: 'Preparing text chunks for analysis'
        });
      }
      
      const chunkAnalyses = await this.analyzeChunks(text, options);

      // Step 2: Use IterationProcessor to refine template
      if (onProgress) {
        onProgress({
          phase: 'refining',
          current: 0,
          total: 1,
          message: 'Refining template structure'
        });
      }
      
      const template = await this.refineTemplate(chunkAnalyses, options);

      // Step 3: Calculate confidence and finalize
      if (onProgress) {
        onProgress({
          phase: 'finalizing',
          current: 0,
          total: 1,
          message: 'Finalizing extraction results'
        });
      }
      
      const confidence = this.calculateConfidence(chunkAnalyses);
      
      // Validate final template
      const validatedTemplate = validateDocumentTemplate(template);

      if (onProgress) {
        onProgress({
          phase: 'finalizing',
          current: 1,
          total: 1,
          message: 'Extraction complete'
        });
      }

      return {
        template: validatedTemplate,
        confidence,
        processingTime: Date.now() - startTime,
        chunks: chunkAnalyses.length,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      throw new Error(`Template extraction failed: ${errors.join(', ')}`);
    }
  }

  private async analyzeChunks(text: string, options: ExtractionOptions): Promise<ChunkAnalysis[]> {
    const prompt = this.promptBuilder.getAnalysisPrompt();
    const { onProgress } = options;
    
    let processedChunks = 0;
    const estimatedChunks = Math.ceil(text.length / (options.chunkSize || 2000));
    
    const items = await this.fractalProcessor.process(text, {
      generateContext: async (text: string) => 'Analyzing document structure',
      processChunk: async (chunk: string, context) => {
        if (onProgress) {
          onProgress({
            phase: 'analyzing',
            current: processedChunks,
            total: estimatedChunks,
            message: `Analyzing chunk ${processedChunks + 1} of ${estimatedChunks}`
          });
        }
        
        const response = await this.config.provider.chat(
          prompt,
          chunk
        );
        
        processedChunks++;
        
        return {
          items: [this.parseChunkResult(response)],
          summary: ''
        };
      },
      mergeResults: (results) => {
        const flatResults = results.flat();
        
        // If only one result, return as-is
        if (flatResults.length <= 1) {
          return {
            items: flatResults,
            needsSupplement: false
          };
        }

        // Merge multiple ChunkAnalysis into one optimized result
        const mergedElements = this.mergeStructures(
          flatResults.map((r: ChunkAnalysis) => r.elements).flat()
        );
        
        const mergedKeywords = this.mergeKeywords(flatResults);
        const mergedPatterns = this.mergePatterns(flatResults);
        
        const mergedAnalysis: ChunkAnalysis = {
          elements: mergedElements,
          keywords: mergedKeywords, // Preserve weights for intermediate merges
          patterns: mergedPatterns,
          confidence: this.calculateConfidence(flatResults)
        };

        return {
          items: [mergedAnalysis],
          needsSupplement: false
        };
      },
      getKey: (item) => JSON.stringify(item)
    });

    if (onProgress) {
      onProgress({
        phase: 'analyzing',
        current: processedChunks,
        total: processedChunks,
        message: 'Analysis complete'
      });
    }

    return items;
  }

  private async refineTemplate(analyses: ChunkAnalysis[], options?: ExtractionOptions): Promise<DocumentTemplate> {
    if (analyses.length === 0) {
      return this.initializeTemplate();
    }

    // 反復的改善を使用するか判定
    // maxDepthが2以上、またはuseIterativeRefinementが明示的にtrueの場合
    const shouldUseIterative = 
      (this.config.maxDepth && this.config.maxDepth > 1) ||
      (this.config as any).useIterativeRefinement === true;

    if (shouldUseIterative && analyses.length > 1) {
      // 反復的改善による高精度な統合
      return this.refineTemplateWithIterator(analyses);
    }

    // 単一のリファイン処理（高速処理）
    return this.refineTemplateStep(
      this.initializeTemplate(),
      analyses
    );
  }
  
  private async refineTemplateWithIterator(analyses: ChunkAnalysis[], options?: ExtractionOptions): Promise<DocumentTemplate> {
    interface State {
      analyses: ChunkAnalysis[];
      template: DocumentTemplate;
      iteration: number;
    }

    const iterator = createIterator<ChunkAnalysis[], State, DocumentTemplate, DocumentTemplate>({
      initialize: async (input: ChunkAnalysis[]) => ({
        analyses: input,
        template: this.initializeTemplate(),
        iteration: 0
      }),

      act: async (state) => {
        const refinedTemplate = await this.refineTemplateStep(
          state.template,
          state.analyses
        );
        return { data: refinedTemplate };
      },

      evaluate: async (state, actionResult) => {
        const score = this.evaluateTemplate(actionResult.data, state.analyses);
        return {
          score,
          shouldContinue: score < this.config.minConfidence && state.iteration < 3,
          feedback: this.generateFeedback(actionResult.data, score)
        };
      },

      transition: async (state, actionResult) => ({
        ...state,
        template: actionResult.data,
        iteration: state.iteration + 1
      }),

      finalize: async (state) => state.template
    });

    const result = await iterator.run(analyses);
    return result.result;
  }

  // Removed - now using PromptBuilder

  // Removed - now using PromptBuilder

  // Removed - now using PromptBuilder

  private parseChunkResult(content: string): ChunkAnalysis {
    try {
      let jsonStr = content;

      // 1. Markdownコードブロックの除去 (複数のパターンに対応)
      const codeBlockPatterns = [
        /```(?:json)?\s*([\s\S]*?)```/i,  // ```json or ```
        /~~~(?:json)?\s*([\s\S]*?)~~~/i,   // ~~~json or ~~~
      ];
      
      for (const pattern of codeBlockPatterns) {
        const match = content.match(pattern);
        if (match) {
          jsonStr = match[1];
          break;
        }
      }

      // 2. 最初と最後の括弧を探して切り出し (JSON以外の冒頭/末尾のゴミを除去)
      const firstBrace = jsonStr.indexOf('{');
      const lastBrace = jsonStr.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
      }

      // 3. コメントとトレイリングカンマの削除
      jsonStr = jsonStr
        .replace(/\/\/.*$/gm, '')           // 単一行コメント削除
        .replace(/\/\*[\s\S]*?\*\//g, '')   // ブロックコメント削除
        .replace(/,\s*}/g, '}')             // オブジェクト末尾のカンマ削除
        .replace(/,\s*\]/g, ']');           // 配列末尾のカンマ削除

      // 4. エスケープされていない改行文字を修正
      jsonStr = jsonStr.replace(/([^\\])\\n/g, '$1\\\\n');

      // Parse the JSON
      const parsed = JSON.parse(jsonStr);
      
      // Validate and normalize the parsed data
      return this.normalizeParsedData(parsed);
    } catch (e) {
      console.warn('JSON Parse Warning:', e);
      console.warn('Attempting fallback parsing...');
      
      // Fallback: 部分的なパースを試みる
      try {
        const fallbackResult = this.attemptPartialParse(content);
        return fallbackResult;
      } catch (fallbackError) {
        console.error('Fallback parsing also failed:', fallbackError);
        return {
          elements: [],
          keywords: [],
          patterns: {},
          confidence: 0
        };
      }
    }
  }

  private normalizeParsedData(parsed: any): ChunkAnalysis {
    // Extract abstract template if present
    if (parsed.abstractTemplate) {
      this.lastAbstractTemplate = parsed.abstractTemplate;
    }
    
    // Normalize elements if they're strings
    if (parsed.elements && Array.isArray(parsed.elements)) {
      parsed.elements = parsed.elements.map((el: any) => {
        if (typeof el === 'string') {
          const typeMatch = el.match(/^(\S+)/);
          const type = typeMatch ? this.normalizeElementType(typeMatch[1]) : 'paragraph';
          const levelMatch = el.match(/#+(\s)/); 
          const level = levelMatch ? levelMatch[0].length - 1 : undefined;
          
          return { type, level };
        }
        return el;
      });
    }
    
    // Build ChunkAnalysis and validate
    const analysis: ChunkAnalysis = {
      elements: parsed.elements || [],
      keywords: parsed.keywords || [],
      patterns: parsed.patterns || {},
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5
    };
    
    // Validate and return
    return validateChunkAnalysis(analysis);
  }

  private attemptPartialParse(content: string): ChunkAnalysis {
    const result: ChunkAnalysis = {
      elements: [],
      keywords: [],
      patterns: {},
      confidence: 0.3
    };

    // Try to extract keywords using regex
    const keywordsMatch = content.match(/"keywords"\s*:\s*\[(.*?)\]/);
    if (keywordsMatch) {
      try {
        result.keywords = JSON.parse(`[${keywordsMatch[1]}]`);
      } catch {}
    }

    // Try to extract elements
    const elementsMatch = content.match(/"elements"\s*:\s*\[([\s\S]*?)\]/);
    if (elementsMatch) {
      try {
        result.elements = JSON.parse(`[${elementsMatch[1]}]`);
      } catch {}
    }

    // Try to extract patterns
    const patternsMatch = content.match(/"patterns"\s*:\s*\{([\s\S]*?)\}/);
    if (patternsMatch) {
      try {
        result.patterns = JSON.parse(`{${patternsMatch[1]}}`);
      } catch {}
    }

    return result;
  }
  
  private normalizeElementType(jpType: string): string {
    const typeMap: Record<string, string> = {
      '見出し': 'heading',
      '段落': 'paragraph',
      'リスト': 'list',
      '引用': 'quote',
      'コード': 'code',
      'セクション': 'section'
    };
    return typeMap[jpType] || jpType.toLowerCase();
  }

  private initializeTemplate(): DocumentTemplate {
    return {
      title: 'Extracted Template',
      structure: [],
      metadata: {},
      patterns: {},
      keywords: []
    };
  }

  private async refineTemplateStep(
    template: DocumentTemplate,
    analyses: ChunkAnalysis[]
  ): Promise<DocumentTemplate> {
    // Since merging is now done in FractalProcessor,
    // analyses should already be optimized (usually just 1 merged result)
    const primaryAnalysis = analyses[0] || {};
    
    const merged: DocumentTemplate = {
      title: template.title || 'Document Analysis',
      structure: primaryAnalysis.elements || [],
      abstractTemplate: this.extractAbstractTemplate(analyses),
      keywords: analyses.length > 0 ? this.mergeKeywords(analyses) : [],
      patterns: primaryAnalysis.patterns || {},
      metadata: this.extractMetadata(analyses)
    };

    return merged;
  }

  private mergeStructures(elements: TemplateElement[]): TemplateElement[] {
    
    // Group elements by chunk for context-aware merging
    const chunks: TemplateElement[][] = [];
    let currentChunk: TemplateElement[] = [];
    
    for (const element of elements) {
      currentChunk.push(element);
      // Start new chunk on major section changes
      if (element.type === 'heading' && element.level === 1) {
        if (currentChunk.length > 0) {
          chunks.push([...currentChunk]);
          currentChunk = [];
        }
      }
    }
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }
    
    // Merge chunks progressively using similarity-based deduplication
    if (chunks.length === 0) return [];
    
    let result = chunks[0];
    for (let i = 1; i < chunks.length; i++) {
      result = mergeElementLists(result, chunks[i]);
    }
    
    return result;
  }

  private mergeKeywords(analyses: ChunkAnalysis[]): DocumentTemplate['keywords'] {
    const keywordMap = new Map<string, { weight: number; contexts: Set<string> }>();

    for (const analysis of analyses) {
      for (const keyword of analysis.keywords) {
        // Handle both string and object formats
        let term: string;
        let weight = 1;
        
        if (typeof keyword === 'string') {
          term = keyword;
        } else if (typeof keyword === 'object' && keyword !== null) {
          term = (keyword as any).term || (keyword as any).keyword || String(keyword);
          weight = (keyword as any).weight || 1;
        } else {
          continue;
        }
        
        if (!keywordMap.has(term)) {
          keywordMap.set(term, { weight: 0, contexts: new Set() });
        }
        const entry = keywordMap.get(term)!;
        entry.weight += weight;
        entry.contexts.add('general');
      }
    }

    return Array.from(keywordMap.entries())
      .map(([term, data]) => ({
        term,
        weight: data.weight / analyses.length,
        context: Array.from(data.contexts).join(', ')
      }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 20);
  }

  private mergePatterns(analyses: ChunkAnalysis[]): DocumentTemplate['patterns'] {
    const patterns: DocumentTemplate['patterns'] = {};
    
    for (const analysis of analyses) {
      if (analysis.patterns && typeof analysis.patterns === 'object') {
        for (const [key, value] of Object.entries(analysis.patterns)) {
          // Convert to string if needed
          const strValue = typeof value === 'string' ? value : JSON.stringify(value);
          
          // Type-safe assignment
          if (key === 'introduction' || key === 'body' || key === 'conclusion') {
            patterns[key] = strValue;
          }
        }
      }
    }

    return patterns;
  }

  private extractMetadata(analyses: ChunkAnalysis[]): DocumentTemplate['metadata'] {
    // Simple implementation - could be enhanced with LLM
    return {
      genre: 'article',
      style: 'informative',
      purpose: 'explain',
      audience: 'general',
      tone: 'neutral'
    };
  }

  private evaluateTemplate(template: DocumentTemplate, analyses?: ChunkAnalysis[]): number {
    // Heuristic score (structure completeness)
    let heuristicScore = 0;
    let factors = 0;

    if (template.structure.length > 0) {
      heuristicScore += 0.3;
      factors += 0.3;
    }

    if (template.keywords.length > 0) {
      heuristicScore += 0.3;
      factors += 0.3;
    }

    if (Object.keys(template.patterns).length > 0) {
      heuristicScore += 0.2;
      factors += 0.2;
    }

    if (Object.keys(template.metadata).length > 0) {
      heuristicScore += 0.2;
      factors += 0.2;
    }

    const normalizedHeuristic = factors > 0 ? heuristicScore / factors : 0;
    
    // If analyses provided, incorporate LLM confidence
    if (analyses && analyses.length > 0) {
      const avgConfidence = analyses.reduce((sum, a) => sum + a.confidence, 0) / analyses.length;
      // Weight: 60% heuristic + 40% LLM confidence
      return (normalizedHeuristic * 0.6) + (avgConfidence * 0.4);
    }
    
    return normalizedHeuristic;
  }

  private generateFeedback(template: DocumentTemplate, score: number): string {
    const missing = [];
    
    if (template.structure.length === 0) missing.push('structure');
    if (template.keywords.length === 0) missing.push('keywords');
    if (Object.keys(template.patterns).length === 0) missing.push('patterns');
    if (Object.keys(template.metadata).length === 0) missing.push('metadata');

    return `Score: ${score.toFixed(2)}. Missing: ${missing.join(', ') || 'none'}`;
  }

  private calculateConfidence(analyses: ChunkAnalysis[]): number {
    if (analyses.length === 0) return 0;
    
    const confidences = analyses.map(a => a.confidence);
    return confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
  }
  
  private extractAbstractTemplate(analyses: ChunkAnalysis[]): any {
    // Return the last extracted abstract template if available
    if (this.lastAbstractTemplate) {
      return this.lastAbstractTemplate;
    }
    
    // Fallback: try to extract from analyses
    for (const analysis of analyses) {
      if ((analysis as any).abstractTemplate) {
        return (analysis as any).abstractTemplate;
      }
    }
    
    return undefined;
  }
}