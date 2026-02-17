import type { TemplateElement } from './types.js';

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
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + 1
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
 * Calculate heading level similarity score
 */
function headingLevelScore(elem1: TemplateElement, elem2: TemplateElement): number {
  if (elem1.type !== 'heading') return 1.0;
  if (elem1.level === elem2.level) return 1.0;
  if (elem1.level && elem2.level && Math.abs(elem1.level - elem2.level) === 1) return 0.5;
  return 0.0;
}

/**
 * Check if both elements have no meaningful content for comparison
 */
function areBothEmpty(elem1: TemplateElement, elem2: TemplateElement): boolean {
  const noContent = !elem1.content && !elem2.content;
  const noIntent = !elem1.intent && !elem2.intent;
  const noKeywords =
    (!elem1.keywords || elem1.keywords.length === 0) &&
    (!elem2.keywords || elem2.keywords.length === 0);
  return noContent && noIntent && noKeywords;
}

/**
 * Calculate similarity between two template elements
 */
export function elementSimilarity(elem1: TemplateElement, elem2: TemplateElement): number {
  if (elem1.type !== elem2.type) return 0.0;

  const levelScore = headingLevelScore(elem1, elem2);
  if (areBothEmpty(elem1, elem2)) return levelScore;

  const contentScore = stringSimilarity(elem1.content || '', elem2.content || '');
  const intentScore = stringSimilarity(elem1.intent || '', elem2.intent || '');
  const keywordsScore = jaccardSimilarity(elem1.keywords || [], elem2.keywords || []);

  return (
    levelScore * 0.2 +
    contentScore * 0.4 +
    intentScore * 0.2 +
    keywordsScore * 0.2
  );
}

/**
 * Merge an optional string field, preferring the first non-empty value
 */
function mergeStringField(a: string | undefined, b: string | undefined): string | undefined {
  return a || b;
}

/**
 * Merge two intent strings, combining if both present and different
 */
function mergeIntents(a: string | undefined, b: string | undefined): string | undefined {
  if (!a && !b) return undefined;
  if (a && b && a !== b) return `${a} / ${b}`;
  return a || b;
}

/**
 * Merge two keyword arrays, deduplicating
 */
function mergeKeywordArrays(
  a: string[] | undefined,
  b: string[] | undefined
): string[] | undefined {
  if (!a && !b) return undefined;
  const keywordSet = new Set([...(a || []), ...(b || [])]);
  return Array.from(keywordSet);
}

/**
 * Merge two similar elements, combining their information
 */
export function mergeSimilarElements(elem1: TemplateElement, elem2: TemplateElement): TemplateElement {
  const merged: TemplateElement = {
    type: elem1.type,
    level: elem1.level || elem2.level,
  };

  merged.content = selectLongerContent(elem1.content, elem2.content);
  merged.intent = mergeIntents(elem1.intent, elem2.intent);
  merged.persuasion = mergeStringField(elem1.persuasion, elem2.persuasion);
  merged.technique = mergeStringField(elem1.technique, elem2.technique);
  merged.keywords = mergeKeywordArrays(elem1.keywords, elem2.keywords);
  merged.transition = mergeStringField(elem1.transition, elem2.transition);

  if (elem1.children || elem2.children) {
    merged.children = mergeElementLists(elem1.children || [], elem2.children || []);
  }

  return merged;
}

/**
 * Select the longer of two optional content strings
 */
function selectLongerContent(a: string | undefined, b: string | undefined): string | undefined {
  if (!a && !b) return undefined;
  return (a?.length || 0) >= (b?.length || 0) ? a : b;
}

/**
 * Merge two lists of template elements with similarity-based deduplication
 */
export function mergeElementLists(list1: TemplateElement[], list2: TemplateElement[]): TemplateElement[] {
  const merged: TemplateElement[] = [...list1];
  const similarityThreshold = 0.7;

  for (const elem2 of list2) {
    const bestMatch = findBestMatch(merged, elem2, similarityThreshold);

    if (bestMatch) {
      merged[bestMatch.index] = mergeSimilarElements(merged[bestMatch.index], elem2);
    } else {
      merged.push(elem2);
    }
  }

  return merged;
}

/**
 * Find the most similar element in a list above a given threshold
 */
function findBestMatch(
  elements: TemplateElement[],
  target: TemplateElement,
  threshold: number
): { index: number; similarity: number } | null {
  let bestMatch: { index: number; similarity: number } | null = null;

  for (let i = 0; i < elements.length; i++) {
    const similarity = elementSimilarity(elements[i], target);
    if (similarity > threshold && (!bestMatch || similarity > bestMatch.similarity)) {
      bestMatch = { index: i, similarity };
    }
  }

  return bestMatch;
}

/**
 * Find the optimal position to insert an element based on context
 */
export function findInsertPosition(
  _element: TemplateElement,
  existingElements: TemplateElement[],
  previousContext?: TemplateElement,
  nextContext?: TemplateElement
): number {
  if (previousContext) {
    const prevIndex = existingElements.findIndex(e =>
      elementSimilarity(e, previousContext) > 0.8
    );
    if (prevIndex !== -1) return prevIndex + 1;
  }

  if (nextContext) {
    const nextIndex = existingElements.findIndex(e =>
      elementSimilarity(e, nextContext) > 0.8
    );
    if (nextIndex !== -1) return Math.max(0, nextIndex);
  }

  return existingElements.length;
}
