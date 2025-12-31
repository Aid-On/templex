import type { TemplateElement } from './types';

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,     // deletion
          dp[i][j - 1] + 1,     // insertion
          dp[i - 1][j - 1] + 1  // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate string similarity (0-1 scale) using normalized Levenshtein distance
 */
export function stringSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (!str1 || !str2) return 0.0;
  
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1.0;
  
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return 1 - (distance / maxLength);
}

/**
 * Calculate Jaccard similarity between two sets of keywords
 */
export function jaccardSimilarity(set1: string[], set2: string[]): number {
  if (set1.length === 0 && set2.length === 0) return 1.0;
  if (set1.length === 0 || set2.length === 0) return 0.0;

  const s1 = new Set(set1.map(s => s.toLowerCase()));
  const s2 = new Set(set2.map(s => s.toLowerCase()));
  
  const intersection = new Set([...s1].filter(x => s2.has(x)));
  const union = new Set([...s1, ...s2]);
  
  return intersection.size / union.size;
}

/**
 * Calculate similarity between two template elements
 */
export function elementSimilarity(elem1: TemplateElement, elem2: TemplateElement): number {
  // Different types are not similar
  if (elem1.type !== elem2.type) return 0.0;
  
  // Different levels (for headings) reduce similarity
  let levelScore = 1.0;
  if (elem1.type === 'heading') {
    if (elem1.level === elem2.level) {
      levelScore = 1.0;
    } else if (elem1.level && elem2.level && Math.abs(elem1.level - elem2.level) === 1) {
      levelScore = 0.5;
    } else {
      levelScore = 0.0;
    }
  }
  
  // If both have no content, they are considered similar
  if (!elem1.content && !elem2.content && !elem1.intent && !elem2.intent && 
      (!elem1.keywords || elem1.keywords.length === 0) && (!elem2.keywords || elem2.keywords.length === 0)) {
    return levelScore; // Only level matters for empty elements
  }
  
  // Content similarity
  const contentScore = stringSimilarity(elem1.content || '', elem2.content || '');
  
  // Intent similarity
  const intentScore = stringSimilarity(elem1.intent || '', elem2.intent || '');
  
  // Keywords similarity
  const keywordsScore = jaccardSimilarity(elem1.keywords || [], elem2.keywords || []);
  
  // Weighted average
  return (
    levelScore * 0.2 +
    contentScore * 0.4 +
    intentScore * 0.2 +
    keywordsScore * 0.2
  );
}

/**
 * Merge two similar elements, combining their information
 */
export function mergeSimilarElements(elem1: TemplateElement, elem2: TemplateElement): TemplateElement {
  const merged: TemplateElement = {
    type: elem1.type,
    level: elem1.level || elem2.level,
  };

  // Prefer longer content
  if (elem1.content || elem2.content) {
    merged.content = (elem1.content?.length || 0) >= (elem2.content?.length || 0) 
      ? elem1.content 
      : elem2.content;
  }

  // Combine intents
  if (elem1.intent || elem2.intent) {
    if (elem1.intent && elem2.intent && elem1.intent !== elem2.intent) {
      merged.intent = `${elem1.intent} / ${elem2.intent}`;
    } else {
      merged.intent = elem1.intent || elem2.intent;
    }
  }

  // Combine persuasion points
  if (elem1.persuasion || elem2.persuasion) {
    merged.persuasion = elem1.persuasion || elem2.persuasion;
  }

  // Combine techniques
  if (elem1.technique || elem2.technique) {
    merged.technique = elem1.technique || elem2.technique;
  }

  // Merge keywords
  if (elem1.keywords || elem2.keywords) {
    const keywordSet = new Set([...(elem1.keywords || []), ...(elem2.keywords || [])]);
    merged.keywords = Array.from(keywordSet);
  }

  // Handle transitions
  if (elem1.transition || elem2.transition) {
    merged.transition = elem1.transition || elem2.transition;
  }

  // Recursively merge children
  if (elem1.children || elem2.children) {
    merged.children = mergeElementLists(elem1.children || [], elem2.children || []);
  }

  return merged;
}

/**
 * Merge two lists of template elements with similarity-based deduplication
 */
export function mergeElementLists(list1: TemplateElement[], list2: TemplateElement[]): TemplateElement[] {
  const merged: TemplateElement[] = [...list1];
  const similarityThreshold = 0.7;

  for (const elem2 of list2) {
    // Find the most similar element in merged list
    let bestMatch: { index: number; similarity: number } | null = null;

    for (let i = 0; i < merged.length; i++) {
      const similarity = elementSimilarity(merged[i], elem2);
      if (similarity > similarityThreshold) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { index: i, similarity };
        }
      }
    }

    if (bestMatch) {
      // Merge with the best match
      merged[bestMatch.index] = mergeSimilarElements(merged[bestMatch.index], elem2);
    } else {
      // Add as new element
      merged.push(elem2);
    }
  }

  return merged;
}

/**
 * Find the optimal position to insert an element based on context
 */
export function findInsertPosition(
  element: TemplateElement, 
  existingElements: TemplateElement[],
  previousContext?: TemplateElement,
  nextContext?: TemplateElement
): number {
  // If we have context, try to maintain relative positioning
  if (previousContext) {
    const prevIndex = existingElements.findIndex(e => 
      elementSimilarity(e, previousContext) > 0.8
    );
    if (prevIndex !== -1) {
      return prevIndex + 1;
    }
  }

  if (nextContext) {
    const nextIndex = existingElements.findIndex(e => 
      elementSimilarity(e, nextContext) > 0.8
    );
    if (nextIndex !== -1) {
      return Math.max(0, nextIndex);
    }
  }

  // Default: append to end
  return existingElements.length;
}