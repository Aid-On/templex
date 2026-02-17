/**
 * TemplateExtractor - Main orchestrator for document template extraction
 *
 * Analysis logic is in core-analysis.ts
 * Refinement logic is in core-refinement.ts
 */

import { FractalProcessor } from '@aid-on/fractop';
import type {
  DocumentTemplate,
  AbstractTemplate,
  ExtractionConfig,
  ExtractionOptions,
  ExtractionResult,
  ChunkAnalysis,
  ProgressCallback,
  ProgressInfo,
} from './types.js';
import { PromptBuilder, type PromptLanguage } from './prompts.js';
import { validateExtractionConfig, validateDocumentTemplate } from './validation.js';
import { StructureMerger, MergeStrategyFactory } from './structure-merger.js';
import { analyzeChunks, calculateConfidence, type AnalysisContext } from './core-analysis.js';
import { refineTemplate, type RefinementContext } from './core-refinement.js';

/**
 * Report progress if callback is provided
 */
function reportProgress(
  onProgress: ProgressCallback | undefined,
  info: ProgressInfo
): void {
  if (onProgress) onProgress(info);
}

/**
 * Calculate overlap size from extraction options
 */
function calculateOverlapSize(options: ExtractionOptions): number {
  const chunkSize = options.chunkSize || 2000;
  if (!options.overlapRatio) return 200;
  return Math.floor(chunkSize * options.overlapRatio);
}

export class TemplateExtractor {
  private config: Required<ExtractionConfig>;
  private lastAbstractTemplate?: AbstractTemplate;
  private promptBuilder: PromptBuilder;
  private structureMerger: StructureMerger;

  constructor(config: ExtractionConfig) {
    this.config = validateExtractionConfig(config);

    const language: PromptLanguage =
      this.config.language === 'en' ? 'en' : 'ja';
    this.promptBuilder = new PromptBuilder(language);

    const mergeStrategy = MergeStrategyFactory.create('semantic');
    this.structureMerger = new StructureMerger(mergeStrategy);
  }

  async extract(text: string, options: ExtractionOptions = {}): Promise<ExtractionResult> {
    const startTime = Date.now();
    const { onProgress } = options;

    const fractalProcessor = new FractalProcessor<ChunkAnalysis>(
      this.config.provider,
      {
        chunkSize: options.chunkSize || 2000,
        overlapSize: calculateOverlapSize(options),
        maxRetries: options.retries || 3,
        timeout: options.timeout || 30000,
      }
    );

    try {
      return await this.performExtraction(text, options, fractalProcessor, startTime, onProgress);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Template extraction failed: ${message}`, { cause: error });
    }
  }

  private async performExtraction(
    text: string,
    options: ExtractionOptions,
    fractalProcessor: FractalProcessor<ChunkAnalysis>,
    startTime: number,
    onProgress?: ProgressCallback
  ): Promise<ExtractionResult> {
    reportProgress(onProgress, { phase: 'chunking', current: 0, total: 1, message: 'Preparing text chunks for analysis' });

    const analysisCtx: AnalysisContext = {
      config: this.config,
      promptBuilder: this.promptBuilder,
      structureMerger: this.structureMerger,
      lastAbstractTemplate: this.lastAbstractTemplate,
    };

    const analysisResult = await analyzeChunks(analysisCtx, text, options, fractalProcessor);
    const chunkAnalyses = analysisResult.analyses;
    this.lastAbstractTemplate = analysisResult.lastAbstractTemplate;

    reportProgress(onProgress, { phase: 'refining', current: 0, total: 1, message: 'Refining template structure' });

    const refinementCtx: RefinementContext = {
      config: this.config,
      lastAbstractTemplate: this.lastAbstractTemplate,
    };

    const template = await refineTemplate(refinementCtx, chunkAnalyses, options);

    reportProgress(onProgress, { phase: 'finalizing', current: 0, total: 1, message: 'Finalizing extraction results' });

    const confidence = calculateConfidence(chunkAnalyses);
    const validatedTemplate = validateDocumentTemplate(template);

    reportProgress(onProgress, { phase: 'finalizing', current: 1, total: 1, message: 'Extraction complete' });

    return {
      template: validatedTemplate,
      confidence,
      processingTime: Date.now() - startTime,
      chunks: chunkAnalyses.length,
    };
  }
}
