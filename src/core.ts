import { FractalProcessor, type ChunkContext } from '@aid-on/fractop';
import { createIterator } from '@aid-on/iteratop';
import type {
  DocumentTemplate,
  AbstractTemplate,
  ExtractionConfig,
  ExtractionOptions,
  ExtractionResult,
  ChunkAnalysis,
  TemplateElement,
  LLMProvider
} from './types.js';
import { PromptBuilder, type PromptLanguage } from './prompts.js';
import { validateExtractionConfig, validateChunkAnalysis, validateDocumentTemplate } from './validation.js';
import { mergeElementLists } from './similarity.js';
import { normalizeKeywords, mergeKeywordLists, toDocumentKeywords, keywordListSimilarity } from './keyword-utils.js';
import { extractJSON } from './json-utils.js';
import { StructureMerger, MergeStrategyFactory } from './structure-merger.js';
import { parseTemplateElements, parsePatterns, parseAbstractTemplate } from './type-guards.js';

export class TemplateExtractor {
  private config: Required<ExtractionConfig>;
  private lastAbstractTemplate?: AbstractTemplate;
  private promptBuilder: PromptBuilder;
  private structureMerger: StructureMerger;

  constructor(config: ExtractionConfig) {
    // Validate and normalize configuration
    this.config = validateExtractionConfig(config);

    const language: PromptLanguage = 
      this.config.language === 'en' ? 'en' : 'ja';
    this.promptBuilder = new PromptBuilder(language);

    // Initialize structure merger with semantic strategy
    const mergeStrategy = MergeStrategyFactory.create('semantic');
    this.structureMerger = new StructureMerger(mergeStrategy);
  }

  async extract(text: string, options: ExtractionOptions = {}): Promise<ExtractionResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const { onProgress } = options;

    // Initialize FractalProcessor with user-provided options
    const fractalProcessor = new FractalProcessor<ChunkAnalysis>(
      this.config.provider,
      {
        chunkSize: options.chunkSize || 2000,
        overlapSize: options.overlapRatio ? 
          Math.floor((options.chunkSize || 2000) * options.overlapRatio) : 200,
        maxRetries: options.retries || 3,
        timeout: options.timeout || 30000,
      }
    );

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
      
      const chunkAnalyses = await this.analyzeChunks(text, options, fractalProcessor);

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
      const message = error instanceof Error ? error.message : String(error);
      errors.push(message);
      
      // Create error with cause for better debugging (ES2022+)
      throw new Error(`Template extraction failed: ${errors.join(', ')}`, {
        cause: error
      });
    }
  }

  private async analyzeChunks(
    text: string, 
    options: ExtractionOptions,
    fractalProcessor: FractalProcessor<ChunkAnalysis>
  ): Promise<ChunkAnalysis[]> {
    const prompt = this.promptBuilder.getAnalysisPrompt();
    const { onProgress } = options;
    
    let processedChunks = 0;
    const estimatedChunks = Math.ceil(text.length / (options.chunkSize || 2000));
    let hadError = false;
    
    const items = await fractalProcessor.process(text, {
      generateContext: async (text: string) => 'Analyzing document structure',
      processChunk: async (chunk: string, context: ChunkContext) => {
        if (onProgress) {
          onProgress({
            phase: 'analyzing',
            current: processedChunks,
            total: estimatedChunks,
            message: `Analyzing chunk ${processedChunks + 1} of ${estimatedChunks}`
          });
        }
        
        let response: string;
        try {
          response = await this.config.provider.chat(
            prompt,
            chunk
          );
        } catch (error) {
          hadError = true;
          // Re-throw provider errors to prevent silent failures
          throw error;
        }
        
        processedChunks++;
        
        return {
          items: [this.parseChunkResult(response)],
          summary: ''
        };
      },
      mergeResults: (results: ChunkAnalysis[][]) => {
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
      getKey: (item: ChunkAnalysis) => JSON.stringify(item)
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
      this.config.useIterativeRefinement === true;

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

      act: async (state: any) => {
        const refinedTemplate = await this.refineTemplateStep(
          state.template,
          state.analyses
        );
        return { data: refinedTemplate };
      },

      evaluate: async (state: any, actionResult: any) => {
        const score = this.evaluateTemplate(actionResult.data, state.analyses);
        return {
          score,
          shouldContinue: score < this.config.minConfidence && state.iteration < 3,
          feedback: this.generateFeedback(actionResult.data, score)
        };
      },

      transition: async (state: any, actionResult: any) => ({
        ...state,
        template: actionResult.data,
        iteration: state.iteration + 1
      }),

      finalize: async (state: any) => state.template
    });

    const result = await iterator.run(analyses);
    return result.result;
  }

  // Removed - now using PromptBuilder

  // Removed - now using PromptBuilder

  // Removed - now using PromptBuilder

  private parseChunkResult(content: string): ChunkAnalysis {
    // Define expected shape of parsed JSON
    interface ParsedAnalysis {
      elements?: unknown[];
      keywords?: unknown[];
      patterns?: Record<string, unknown>;
      confidence?: number;
      abstractTemplate?: unknown;
    }
    
    // Use robust JSON extraction utility
    const parsed = extractJSON<ParsedAnalysis>(content);

    if (!parsed) {
      console.warn('JSON Parse Failed, attempting partial fallback...');
      return this.attemptPartialParse(content);
    }

    try {
      return this.normalizeParsedData(parsed);
    } catch (e) {
      console.warn('Normalization failed:', e);
      // normalization failed, fallback to partial parse
      return this.attemptPartialParse(content);
    }
  }

  private normalizeParsedData(parsed: {
    elements?: unknown[];
    keywords?: unknown[];
    patterns?: Record<string, unknown>;
    confidence?: number;
    abstractTemplate?: unknown;
  }): ChunkAnalysis {
    // Extract abstract template if present using type guard
    const abstractTemplate = parseAbstractTemplate(parsed.abstractTemplate);
    if (abstractTemplate) {
      this.lastAbstractTemplate = abstractTemplate;
    }
    
    // Parse elements safely without type assertion
    const elements = parseTemplateElements(parsed.elements);
    
    // Normalize keywords to ensure consistent type
    const normalizedKeywords = normalizeKeywords(parsed.keywords || []);
    
    // Parse patterns safely without type assertion
    const patterns = parsePatterns(parsed.patterns);
    
    // Build ChunkAnalysis with parsed data
    const analysis: ChunkAnalysis = {
      elements,
      keywords: normalizedKeywords.map(kw => ({
        term: kw.term,
        weight: kw.weight,
        context: kw.context
      })),
      patterns,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5
    };
    
    // Validate and return
    return validateChunkAnalysis(analysis);
  }

  private attemptPartialParse(content: string): ChunkAnalysis {
    const result: ChunkAnalysis = {
      elements: [],
      keywords: [], // Will be normalized below
      patterns: {},
      confidence: 0.3
    };

    // Try to extract keywords using regex
    const keywordsMatch = content.match(/"keywords"\s*:\s*\[(.*?)\]/);
    if (keywordsMatch) {
      try {
        const rawKeywords = JSON.parse(`[${keywordsMatch[1]}]`);
        // Normalize keywords to consistent type
        const normalized = normalizeKeywords(rawKeywords);
        result.keywords = normalized.map(kw => ({
          term: kw.term,
          weight: kw.weight,
          context: kw.context
        }));
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
    // Delegate to structure merger
    return this.structureMerger.merge(elements);
  }

  private mergeKeywords(analyses: ChunkAnalysis[]): DocumentTemplate['keywords'] {
    // Use unified keyword handling
    const allKeywords = analyses.map(a => a.keywords || []);
    const merged = mergeKeywordLists(...allKeywords);
    
    // Limit to top 50 keywords
    const top50 = merged.slice(0, 50);
    
    return toDocumentKeywords(top50);
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
  
  private extractAbstractTemplate(analyses: ChunkAnalysis[]): AbstractTemplate | undefined {
    // Return the last extracted abstract template if available
    if (this.lastAbstractTemplate) {
      return this.lastAbstractTemplate;
    }
    
    // Fallback: try to extract from analyses
    for (const analysis of analyses) {
      if (analysis.abstractTemplate) {
        return analysis.abstractTemplate;
      }
    }
    
    return undefined;
  }
}