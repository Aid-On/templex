/**
 * Templex - Template Extractor
 * 
 * A library for extracting abstract templates and document structures from text.
 * Uses FractoP for chunking, IteratoP for iterative refinement, and UniLMP for LLM processing.
 * 
 * @example
 * ```typescript
 * import { TemplateExtractor } from '@aid-on/templex';
 * import { createOpenAIProvider } from '@aid-on/unillm';
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
export { TemplateExtractor } from './core.js';
export { ArticleGenerator, createUnillmProvider } from './generator.js';

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
} from './types.js';
export type { ArticleData, GeneratorOptions } from './generator.js';

// Utilities
export {
  formatTemplate,
  mergeTemplates,
  simplifyTemplate,
  compareTemplates,
} from './utils.js';

export {
  extractJSON,
  parseJSONSafe,
  formatForLLM,
  createValidator,
} from './json-utils.js';

export {
  normalizeKeyword,
  normalizeKeywords,
  mergeKeywordLists,
  keywordListSimilarity,
  filterByWeight,
  groupByContext,
  toDocumentKeywords,
  toStringArray,
} from './keyword-utils.js';
export type { NormalizedKeyword } from './keyword-utils.js';

// Pattern presets
export { PRESET_PATTERNS, getPresetPattern } from './patterns.js';