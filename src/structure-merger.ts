/**
 * Structure merger for template elements
 * Implements various merging strategies for document structures
 */

import type { TemplateElement } from './types.js';
import { mergeElementLists } from './similarity.js';
import { keywordListSimilarity } from './keyword-utils.js';

/**
 * Interface for merge strategy
 */
export interface MergeStrategy {
  merge(elements: TemplateElement[]): TemplateElement[];
}

/**
 * Options for semantic merge strategy
 */
interface SemanticMergeOptions {
  minChunkSize: number;
  maxChunkSize: number;
  keywordSimilarityThreshold: number;
}

/**
 * Check if current element is a code block boundary
 */
function isCodeBlockBoundary(current: TemplateElement, previous: TemplateElement | null): boolean {
  if (current.type !== 'code' && previous?.type !== 'code') return false;
  return current.type !== previous?.type;
}

/**
 * Check if the element is a major heading boundary
 */
function isMajorHeadingBoundary(
  current: TemplateElement,
  chunkSize: number,
  minChunkSize: number
): boolean {
  if (current.type !== 'heading') return false;
  if (!current.level || current.level > 2) return false;
  return chunkSize >= minChunkSize;
}

/**
 * Check if there is a major type transition between elements
 */
function isMajorTypeTransition(from: string, to: string): boolean {
  const contentTypes = ['paragraph', 'list', 'quote'];
  const structuralTypes = ['heading', 'section', 'code'];

  if (contentTypes.includes(from) && structuralTypes.includes(to)) return true;
  if (from === 'code' && to !== 'code') return true;
  return false;
}

/**
 * Check if there is a significant type transition
 */
function isSignificantTypeTransition(
  current: TemplateElement,
  previous: TemplateElement | null,
  chunkSize: number
): boolean {
  if (!previous || previous.type === current.type) return false;
  if (current.type === 'heading' && chunkSize > 5) return true;
  return isMajorTypeTransition(previous.type, current.type);
}

/**
 * Check if keyword similarity indicates a boundary
 */
function isKeywordBoundary(
  current: TemplateElement,
  previous: TemplateElement | null,
  chunkSize: number,
  threshold: number
): boolean {
  if (!current.keywords || !previous?.keywords) return false;
  if (chunkSize <= 2) return false;
  const similarity = keywordListSimilarity(previous.keywords, current.keywords);
  return similarity < threshold;
}

/**
 * Semantic-based merging strategy using heuristics
 */
export class SemanticMergeStrategy implements MergeStrategy {
  private readonly options: SemanticMergeOptions;

  constructor(
    options: Partial<SemanticMergeOptions> = {}
  ) {
    this.options = {
      minChunkSize: options.minChunkSize ?? 3,
      maxChunkSize: options.maxChunkSize ?? 20,
      keywordSimilarityThreshold: options.keywordSimilarityThreshold ?? 0.3
    };
  }

  merge(elements: TemplateElement[]): TemplateElement[] {
    const chunks = this.detectSemanticChunks(elements);

    if (chunks.length === 0) return [];

    let result = chunks[0];
    for (let i = 1; i < chunks.length; i++) {
      result = mergeElementLists(result, chunks[i]);
    }

    return result;
  }

  private detectSemanticChunks(elements: TemplateElement[]): TemplateElement[][] {
    if (elements.length === 0) return [];

    const chunks: TemplateElement[][] = [];
    let currentChunk: TemplateElement[] = [];
    let previousElement: TemplateElement | null = null;

    for (const element of elements) {
      if (previousElement?.type === 'code' && element.type !== 'code') {
        if (currentChunk.length > 0) {
          chunks.push([...currentChunk]);
          currentChunk = [];
        }
      }

      const isBoundary = this.isSemanticBoundary(element, previousElement, currentChunk);

      if (isBoundary && currentChunk.length > 0) {
        chunks.push([...currentChunk]);
        currentChunk = [];
      }

      currentChunk.push(element);
      previousElement = element;
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  private isSemanticBoundary(
    current: TemplateElement,
    previous: TemplateElement | null,
    currentChunk: TemplateElement[]
  ): boolean {
    const { minChunkSize, maxChunkSize, keywordSimilarityThreshold } = this.options;

    if (isCodeBlockBoundary(current, previous)) return true;
    if (current.type === 'section') return true;
    if (isMajorHeadingBoundary(current, currentChunk.length, minChunkSize)) return true;
    if (isSignificantTypeTransition(current, previous, currentChunk.length)) return true;
    if (currentChunk.length >= maxChunkSize) return true;
    if (isKeywordBoundary(current, previous, currentChunk.length, keywordSimilarityThreshold)) return true;

    return false;
  }
}

/**
 * Factory for creating merge strategies
 */
export class MergeStrategyFactory {
  static create(
    type: 'semantic' | 'embedding' = 'semantic',
    options?: Record<string, unknown>
  ): MergeStrategy {
    switch (type) {
      case 'semantic':
        return new SemanticMergeStrategy(options as Partial<SemanticMergeOptions>);
      default:
        return new SemanticMergeStrategy(options as Partial<SemanticMergeOptions>);
    }
  }
}

/**
 * Main structure merger class that delegates to strategies
 */
export class StructureMerger {
  private strategy: MergeStrategy;

  constructor(strategy?: MergeStrategy) {
    this.strategy = strategy || new SemanticMergeStrategy();
  }

  setStrategy(strategy: MergeStrategy): void {
    this.strategy = strategy;
  }

  merge(elements: TemplateElement[]): TemplateElement[] {
    return this.strategy.merge(elements);
  }
}
