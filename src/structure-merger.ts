/**
 * Structure merger for template elements
 * Implements various merging strategies for document structures
 */

import type { TemplateElement } from './types';
import { mergeElementLists } from './similarity';
import { keywordListSimilarity } from './keyword-utils';

/**
 * Interface for merge strategy
 */
export interface MergeStrategy {
  merge(elements: TemplateElement[]): TemplateElement[];
}

/**
 * Semantic-based merging strategy using heuristics
 */
export class SemanticMergeStrategy implements MergeStrategy {
  private readonly options: Required<{
    minChunkSize: number;
    maxChunkSize: number;
    keywordSimilarityThreshold: number;
  }>;

  constructor(
    options: {
      minChunkSize?: number;
      maxChunkSize?: number;
      keywordSimilarityThreshold?: number;
    } = {}
  ) {
    // Merge with defaults to create fully typed options
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
      // Skip structural analysis for code blocks
      if (previousElement?.type === 'code' && element.type !== 'code') {
        // Code block ended, this might be a boundary
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
    
    // Don't analyze structure within code blocks
    if (current.type === 'code' || previous?.type === 'code') {
      // Code blocks are always boundaries
      return current.type !== previous?.type;
    }
    
    // Heuristic 1: Major heading changes (H1 or H2)
    if (current.type === 'heading' && current.level && current.level <= 2) {
      // But only if chunk has accumulated enough content
      if (currentChunk.length >= minChunkSize) {
        return true;
      }
    }
    
    // Heuristic 2: Section type elements always create boundaries
    if (current.type === 'section') {
      return true;
    }
    
    // Heuristic 3: Type transitions with significant content
    if (previous && previous.type !== current.type) {
      // Transition from content to heading
      if (current.type === 'heading' && currentChunk.length > 5) {
        return true;
      }
      // Transition from one major type to another
      if (this.isMajorTypeTransition(previous.type, current.type)) {
        return true;
      }
    }
    
    // Heuristic 4: Content size threshold
    if (currentChunk.length >= maxChunkSize) {
      return true;
    }
    
    // Heuristic 5: Keyword/pattern shifts (if available)
    if (current.keywords && previous?.keywords) {
      const similarity = keywordListSimilarity(previous.keywords, current.keywords);
      if (similarity < keywordSimilarityThreshold && currentChunk.length > 2) {
        return true;
      }
    }
    
    return false;
  }

  private isMajorTypeTransition(from: string, to: string): boolean {
    const contentTypes = ['paragraph', 'list', 'quote'];
    const structuralTypes = ['heading', 'section', 'code'];
    
    // From content to structural
    if (contentTypes.includes(from) && structuralTypes.includes(to)) {
      return true;
    }
    
    // From code to non-code (significant context change)
    if (from === 'code' && to !== 'code') {
      return true;
    }
    
    return false;
  }
}

/**
 * Factory for creating merge strategies
 */
export class MergeStrategyFactory {
  static create(type: 'semantic' | 'embedding' = 'semantic', options?: any): MergeStrategy {
    switch (type) {
      case 'semantic':
        return new SemanticMergeStrategy(options);
      // Future: Add embedding-based strategy
      // case 'embedding':
      //   return new EmbeddingMergeStrategy(options);
      default:
        return new SemanticMergeStrategy(options);
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