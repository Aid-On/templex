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

// Types
export type {
  TemplateElement,
  DocumentTemplate,
  ExtractionConfig,
  ExtractionOptions,
  ExtractionResult,
  ChunkAnalysis,
} from './types';

// Utilities
export {
  formatTemplate,
  mergeTemplates,
  simplifyTemplate,
  compareTemplates,
} from './utils';