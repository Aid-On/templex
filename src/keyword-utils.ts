/**
 * Keyword utilities for unified type handling
 * Normalizes keywords to a consistent internal format
 */

import type { DocumentTemplate } from './types.js';

/**
 * Normalized keyword format used internally
 */
export interface NormalizedKeyword {
  term: string;
  weight: number;
  context?: string;
}

/**
 * Normalize any keyword format to the unified internal representation
 */
export function normalizeKeyword(keyword: any): NormalizedKeyword | null {
  if (!keyword) return null;
  
  // String format
  if (typeof keyword === 'string') {
    return {
      term: keyword.trim(),
      weight: 1.0,
      context: 'general'
    };
  }
  
  // Object format variations
  if (typeof keyword === 'object') {
    const term = keyword.term || keyword.keyword || keyword.text || '';
    const weight = normalizeWeight(keyword.weight ?? keyword.score ?? 1.0);
    const context = keyword.context || 'general';
    
    if (!term || typeof term !== 'string') {
      return null;
    }
    
    return {
      term: term.trim(),
      weight,
      context
    };
  }
  
  return null;
}

/**
 * Normalize an array of mixed keyword formats
 */
export function normalizeKeywords(keywords: any[]): NormalizedKeyword[] {
  if (!Array.isArray(keywords)) {
    return [];
  }
  
  return keywords
    .map(normalizeKeyword)
    .filter((kw): kw is NormalizedKeyword => kw !== null && kw.term.length > 0);
}

/**
 * Convert normalized keywords back to DocumentTemplate format
 */
export function toDocumentKeywords(
  keywords: NormalizedKeyword[]
): DocumentTemplate['keywords'] {
  return keywords.map(kw => ({
    term: kw.term,
    weight: kw.weight,
    context: kw.context || 'general'
  }));
}

/**
 * Convert normalized keywords to simple string array
 */
export function toStringArray(keywords: NormalizedKeyword[]): string[] {
  return keywords.map(kw => kw.term);
}

/**
 * Merge multiple keyword lists with weight accumulation
 */
export function mergeKeywordLists(
  ...keywordLists: any[][]
): NormalizedKeyword[] {
  const keywordMap = new Map<string, NormalizedKeyword>();
  
  for (const list of keywordLists) {
    const normalized = normalizeKeywords(list);
    
    for (const keyword of normalized) {
      const key = `${keyword.term.toLowerCase()}:${keyword.context}`;
      const existing = keywordMap.get(key);
      
      if (existing) {
        // Accumulate weights
        existing.weight = Math.min(
          1.0,
          existing.weight + keyword.weight * 0.5
        );
      } else {
        keywordMap.set(key, { ...keyword });
      }
    }
  }
  
  // Sort by weight descending
  return Array.from(keywordMap.values()).sort((a, b) => b.weight - a.weight);
}

/**
 * Calculate similarity between two keyword lists
 */
export function keywordListSimilarity(
  list1: any[],
  list2: any[]
): number {
  const norm1 = normalizeKeywords(list1);
  const norm2 = normalizeKeywords(list2);
  
  if (norm1.length === 0 || norm2.length === 0) {
    return 0;
  }
  
  const set1 = new Set(norm1.map(k => k.term.toLowerCase()));
  const set2 = new Set(norm2.map(k => k.term.toLowerCase()));
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  // Jaccard similarity
  return intersection.size / union.size;
}

/**
 * Filter keywords by minimum weight threshold
 */
export function filterByWeight(
  keywords: NormalizedKeyword[],
  minWeight: number = 0.5
): NormalizedKeyword[] {
  return keywords.filter(kw => kw.weight >= minWeight);
}

/**
 * Group keywords by context
 */
export function groupByContext(
  keywords: NormalizedKeyword[]
): Record<string, NormalizedKeyword[]> {
  const grouped: Record<string, NormalizedKeyword[]> = {};
  
  for (const keyword of keywords) {
    const context = keyword.context || 'general';
    if (!grouped[context]) {
      grouped[context] = [];
    }
    grouped[context].push(keyword);
  }
  
  return grouped;
}

/**
 * Normalize weight to 0-1 range
 */
function normalizeWeight(weight: any): number {
  const num = Number(weight);
  if (isNaN(num)) return 1.0;
  if (num < 0) return 0;
  if (num > 1) return 1;
  return num;
}