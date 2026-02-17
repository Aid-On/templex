/**
 * Chunk analysis helpers for TemplateExtractor
 * Extracted from core.ts to keep file size under 300 lines
 */

import type { FractalProcessor, ChunkContext } from '@aid-on/fractop';
import type {
  ChunkAnalysis,
  AbstractTemplate,
  ExtractionOptions,
  LLMProvider,
  TemplateElement,
  DocumentTemplate,
} from './types.js';
import { PromptBuilder } from './prompts.js';
import { validateChunkAnalysis } from './validation.js';
import { normalizeKeywords, mergeKeywordLists, toDocumentKeywords } from './keyword-utils.js';
import { extractJSON } from './json-utils.js';
import { parseTemplateElements, parsePatterns, parseAbstractTemplate } from './type-guards.js';
import { StructureMerger } from './structure-merger.js';

/**
 * Context shared between analysis functions
 */
export interface AnalysisContext {
  config: { provider: LLMProvider; minConfidence: number };
  promptBuilder: PromptBuilder;
  structureMerger: StructureMerger;
  lastAbstractTemplate?: AbstractTemplate;
}

/**
 * Analyze text chunks using FractalProcessor
 */
export async function analyzeChunks(
  ctx: AnalysisContext,
  text: string,
  options: ExtractionOptions,
  fractalProcessor: FractalProcessor<ChunkAnalysis>
): Promise<{ analyses: ChunkAnalysis[]; lastAbstractTemplate?: AbstractTemplate }> {
  const prompt = ctx.promptBuilder.getAnalysisPrompt();
  const { onProgress } = options;

  let processedChunks = 0;
  const estimatedChunks = Math.ceil(text.length / (options.chunkSize || 2000));

  const items = await fractalProcessor.process(text, {
    generateContext: async (_text: string) => 'Analyzing document structure',
    processChunk: async (chunk: string, _context: ChunkContext) => {
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
        response = await ctx.config.provider.chat(prompt, chunk);
      } catch (error) {
        // Re-throw provider errors to prevent silent failures
        throw error;
      }

      processedChunks++;

      return {
        items: [parseChunkResult(ctx, response)],
        summary: ''
      };
    },
    mergeResults: (results: ChunkAnalysis[][]) => {
      const flatResults = results.flat();

      if (flatResults.length <= 1) {
        return { items: flatResults, needsSupplement: false };
      }

      const mergedElements = ctx.structureMerger.merge(
        flatResults.map((r: ChunkAnalysis) => r.elements).flat()
      );
      const mergedKeywords = mergeAnalysisKeywords(flatResults);
      const mergedPatterns = mergeAnalysisPatterns(flatResults);

      const mergedAnalysis: ChunkAnalysis = {
        elements: mergedElements,
        keywords: mergedKeywords,
        patterns: mergedPatterns,
        confidence: calculateConfidence(flatResults)
      };

      return { items: [mergedAnalysis], needsSupplement: false };
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

  return { analyses: items, lastAbstractTemplate: ctx.lastAbstractTemplate };
}

/**
 * Parse a chunk result from LLM response
 */
function parseChunkResult(ctx: AnalysisContext, content: string): ChunkAnalysis {
  interface ParsedAnalysis {
    elements?: unknown[];
    keywords?: unknown[];
    patterns?: Record<string, unknown>;
    confidence?: number;
    abstractTemplate?: unknown;
  }

  const parsed = extractJSON<ParsedAnalysis>(content);

  if (!parsed) {
    return attemptPartialParse(content);
  }

  try {
    return normalizeParsedData(ctx, parsed);
  } catch {
    /* normalization failed, fallback to partial parse */
    return attemptPartialParse(content);
  }
}

/**
 * Normalize parsed JSON data into a ChunkAnalysis
 */
function normalizeParsedData(
  ctx: AnalysisContext,
  parsed: {
    elements?: unknown[];
    keywords?: unknown[];
    patterns?: Record<string, unknown>;
    confidence?: number;
    abstractTemplate?: unknown;
  }
): ChunkAnalysis {
  const abstractTemplate = parseAbstractTemplate(parsed.abstractTemplate);
  if (abstractTemplate) {
    ctx.lastAbstractTemplate = abstractTemplate;
  }

  const elements = parseTemplateElements(parsed.elements);
  const normalizedKeywords = normalizeKeywords(parsed.keywords || []);
  const patterns = parsePatterns(parsed.patterns);

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

  return validateChunkAnalysis(analysis);
}

/**
 * Attempt partial parse when full JSON parsing fails
 */
function attemptPartialParse(content: string): ChunkAnalysis {
  const result: ChunkAnalysis = {
    elements: [],
    keywords: [],
    patterns: {},
    confidence: 0.3
  };

  const keywordsMatch = content.match(/"keywords"\s*:\s*\[(.*?)\]/);
  if (keywordsMatch) {
    try {
      const rawKeywords = JSON.parse(`[${keywordsMatch[1]}]`);
      const normalized = normalizeKeywords(rawKeywords);
      result.keywords = normalized.map(kw => ({
        term: kw.term,
        weight: kw.weight,
        context: kw.context
      }));
    } catch { /* keyword extraction failed, skip */ }
  }

  const elementsMatch = content.match(/"elements"\s*:\s*\[([\s\S]*?)\]/);
  if (elementsMatch) {
    try {
      result.elements = JSON.parse(`[${elementsMatch[1]}]`);
    } catch { /* element extraction failed, skip */ }
  }

  const patternsMatch = content.match(/"patterns"\s*:\s*\{([\s\S]*?)\}/);
  if (patternsMatch) {
    try {
      result.patterns = JSON.parse(`{${patternsMatch[1]}}`);
    } catch { /* pattern extraction failed, skip */ }
  }

  return result;
}

/**
 * Merge keywords from multiple analyses
 */
export function mergeAnalysisKeywords(
  analyses: ChunkAnalysis[]
): DocumentTemplate['keywords'] {
  const allKeywords = analyses.map(a => a.keywords || []);
  const merged = mergeKeywordLists(...allKeywords);
  const top50 = merged.slice(0, 50);
  return toDocumentKeywords(top50);
}

const VALID_PATTERN_KEYS = new Set(['introduction', 'body', 'conclusion']);

/**
 * Extract valid pattern entries from a single analysis
 */
function extractPatternEntries(
  analysisPatterns: Record<string, string>
): Array<[string, string]> {
  return Object.entries(analysisPatterns)
    .filter(([key]) => VALID_PATTERN_KEYS.has(key))
    .map(([key, value]) => [key, typeof value === 'string' ? value : JSON.stringify(value)]);
}

/**
 * Merge patterns from multiple analyses
 */
export function mergeAnalysisPatterns(
  analyses: ChunkAnalysis[]
): DocumentTemplate['patterns'] {
  const patterns: DocumentTemplate['patterns'] = {};

  for (const analysis of analyses) {
    if (!analysis.patterns || typeof analysis.patterns !== 'object') continue;
    for (const [key, value] of extractPatternEntries(analysis.patterns)) {
      if (key === 'introduction' || key === 'body' || key === 'conclusion') {
        patterns[key] = value;
      }
    }
  }

  return patterns;
}

/**
 * Calculate average confidence from analyses
 */
export function calculateConfidence(analyses: ChunkAnalysis[]): number {
  if (analyses.length === 0) return 0;
  const confidences = analyses.map(a => a.confidence);
  return confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
}
