/**
 * Templex - Template Extractor
 * 
 * A library for extracting abstract templates and document structures from text.
 * Uses FractoP for chunking, IteratoP for iterative refinement, and UniLMP for LLM processing.
 * 
 * @example
 * ```typescript
 * import { TemplateExtractor } from '@aid-on/templex';
 * import { createOpenAIProvider } from '@aid-on/unilmp';
 * 
 * const extractor = new TemplateExtractor({
 *   provider: createOpenAIProvider({ apiKey: 'xxx' }),
 *   model: 'gpt-4',
 *   extractPatterns: true,
 *   extractKeywords: true
 * });
 * 
 * const result = await extractor.extract(articleText);
 * console.log(formatTemplate(result.template));
 * ```
 */

// Core
export { TemplateExtractor } from './core';
export { ArticleGenerator, createUnillmProvider } from './generator';

// Types
export type {
  TemplateElement,
  DocumentTemplate,
  AbstractTemplate,
  LLMProvider,
  ExtractionConfig,
  ExtractionOptions,
  ExtractionResult,
  ChunkAnalysis,
} from './types';
export type { ArticleData, GeneratorOptions } from './generator';

// Utilities
export {
  formatTemplate,
  mergeTemplates,
  simplifyTemplate,
  compareTemplates,
} from './utils';

export {
  extractJSON,
  parseJSONSafe,
  formatForLLM,
  createValidator,
} from './json-utils';

export {
  normalizeKeyword,
  normalizeKeywords,
  mergeKeywordLists,
  keywordListSimilarity,
  filterByWeight,
  groupByContext,
  toDocumentKeywords,
  toStringArray,
} from './keyword-utils';
export type { NormalizedKeyword } from './keyword-utils';

// Pattern presets
export { PRESET_PATTERNS, getPresetPattern } from './patterns';