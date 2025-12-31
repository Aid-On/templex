import { describe, it, expect } from 'vitest';
import {
  levenshteinDistance,
  stringSimilarity,
  jaccardSimilarity,
  elementSimilarity,
  mergeSimilarElements,
  mergeElementLists,
  findInsertPosition
} from '../src/similarity';
import type { TemplateElement } from '../src/types';

describe('similarity functions', () => {
  describe('levenshteinDistance', () => {
    it('should return 0 for identical strings', () => {
      expect(levenshteinDistance('hello', 'hello')).toBe(0);
    });

    it('should calculate correct distance for different strings', () => {
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
      expect(levenshteinDistance('saturday', 'sunday')).toBe(3);
      expect(levenshteinDistance('', 'hello')).toBe(5);
      expect(levenshteinDistance('hello', '')).toBe(5);
    });

    it('should handle empty strings', () => {
      expect(levenshteinDistance('', '')).toBe(0);
    });

    it('should be case-sensitive', () => {
      expect(levenshteinDistance('Hello', 'hello')).toBe(1);
    });
  });

  describe('stringSimilarity', () => {
    it('should return 1.0 for identical strings', () => {
      expect(stringSimilarity('hello', 'hello')).toBe(1.0);
    });

    it('should return 0.0 for empty vs non-empty strings', () => {
      expect(stringSimilarity('', 'hello')).toBe(0.0);
      expect(stringSimilarity('hello', '')).toBe(0.0);
    });

    it('should be case-insensitive', () => {
      expect(stringSimilarity('Hello', 'hello')).toBeGreaterThan(0.7);
    });

    it('should calculate similarity correctly', () => {
      const similarity = stringSimilarity('kitten', 'sitting');
      expect(similarity).toBeGreaterThan(0.5);
      expect(similarity).toBeLessThan(0.7);
    });

    it('should handle both empty strings', () => {
      expect(stringSimilarity('', '')).toBe(1.0);
    });
  });

  describe('jaccardSimilarity', () => {
    it('should return 1.0 for identical sets', () => {
      expect(jaccardSimilarity(['a', 'b', 'c'], ['a', 'b', 'c'])).toBe(1.0);
    });

    it('should return 0.0 for disjoint sets', () => {
      expect(jaccardSimilarity(['a', 'b'], ['c', 'd'])).toBe(0.0);
    });

    it('should calculate partial overlap correctly', () => {
      expect(jaccardSimilarity(['a', 'b', 'c'], ['b', 'c', 'd'])).toBeCloseTo(0.5);
    });

    it('should be case-insensitive', () => {
      expect(jaccardSimilarity(['Hello', 'World'], ['hello', 'world'])).toBe(1.0);
    });

    it('should handle empty arrays', () => {
      expect(jaccardSimilarity([], [])).toBe(1.0);
      expect(jaccardSimilarity(['a'], [])).toBe(0.0);
      expect(jaccardSimilarity([], ['a'])).toBe(0.0);
    });

    it('should handle duplicates properly', () => {
      expect(jaccardSimilarity(['a', 'a', 'b'], ['a', 'b', 'b'])).toBe(1.0);
    });
  });

  describe('elementSimilarity', () => {
    it('should return 0 for different types', () => {
      const elem1: TemplateElement = { type: 'heading' };
      const elem2: TemplateElement = { type: 'paragraph' };
      expect(elementSimilarity(elem1, elem2)).toBe(0.0);
    });

    it('should consider level for headings', () => {
      const h1: TemplateElement = { type: 'heading', level: 1 };
      const h2: TemplateElement = { type: 'heading', level: 1 };
      const h3: TemplateElement = { type: 'heading', level: 2 };
      
      expect(elementSimilarity(h1, h2)).toBe(1.0); // Same level = 1.0 score
      expect(elementSimilarity(h1, h3)).toBe(0.5); // Adjacent levels = 0.5 score
    });

    it('should compare content similarity', () => {
      const elem1: TemplateElement = {
        type: 'paragraph',
        content: 'This is a test paragraph'
      };
      const elem2: TemplateElement = {
        type: 'paragraph',
        content: 'This is a test sentence'
      };
      
      const similarity = elementSimilarity(elem1, elem2);
      expect(similarity).toBeGreaterThan(0.5);
      expect(similarity).toBeLessThan(1.0);
    });

    it('should compare keywords', () => {
      const elem1: TemplateElement = {
        type: 'paragraph',
        keywords: ['test', 'example', 'demo']
      };
      const elem2: TemplateElement = {
        type: 'paragraph',
        keywords: ['test', 'example', 'sample']
      };
      
      expect(elementSimilarity(elem1, elem2)).toBeGreaterThan(0.3);
    });

    it('should handle missing optional fields', () => {
      const elem1: TemplateElement = { type: 'paragraph' };
      const elem2: TemplateElement = { type: 'paragraph' };
      
      expect(elementSimilarity(elem1, elem2)).toBeGreaterThan(0);
    });
  });

  describe('mergeSimilarElements', () => {
    it('should preserve type', () => {
      const elem1: TemplateElement = { type: 'heading', level: 1 };
      const elem2: TemplateElement = { type: 'heading', level: 2 };
      
      const merged = mergeSimilarElements(elem1, elem2);
      expect(merged.type).toBe('heading');
    });

    it('should prefer longer content', () => {
      const elem1: TemplateElement = {
        type: 'paragraph',
        content: 'Short'
      };
      const elem2: TemplateElement = {
        type: 'paragraph',
        content: 'This is a longer content'
      };
      
      const merged = mergeSimilarElements(elem1, elem2);
      expect(merged.content).toBe('This is a longer content');
    });

    it('should combine different intents', () => {
      const elem1: TemplateElement = {
        type: 'paragraph',
        intent: 'Introduction'
      };
      const elem2: TemplateElement = {
        type: 'paragraph',
        intent: 'Overview'
      };
      
      const merged = mergeSimilarElements(elem1, elem2);
      expect(merged.intent).toBe('Introduction / Overview');
    });

    it('should merge keywords without duplicates', () => {
      const elem1: TemplateElement = {
        type: 'paragraph',
        keywords: ['a', 'b', 'c']
      };
      const elem2: TemplateElement = {
        type: 'paragraph',
        keywords: ['b', 'c', 'd']
      };
      
      const merged = mergeSimilarElements(elem1, elem2);
      expect(merged.keywords).toHaveLength(4);
      expect(merged.keywords).toContain('a');
      expect(merged.keywords).toContain('d');
    });

    it('should handle undefined fields gracefully', () => {
      const elem1: TemplateElement = { type: 'paragraph' };
      const elem2: TemplateElement = {
        type: 'paragraph',
        content: 'Some content',
        intent: 'Purpose'
      };
      
      const merged = mergeSimilarElements(elem1, elem2);
      expect(merged.content).toBe('Some content');
      expect(merged.intent).toBe('Purpose');
    });
  });

  describe('mergeElementLists', () => {
    it('should merge similar elements', () => {
      const list1: TemplateElement[] = [
        { type: 'heading', level: 1, content: 'Introduction' },
        { type: 'paragraph', content: 'First paragraph' }
      ];
      const list2: TemplateElement[] = [
        { type: 'heading', level: 1, content: 'Introduction' },
        { type: 'paragraph', content: 'Second paragraph' }
      ];
      
      const merged = mergeElementLists(list1, list2);
      // Headings with identical content are merged
      // Paragraphs with different content are kept separate
      expect(merged.filter(e => e.type === 'heading' && e.content === 'Introduction')).toHaveLength(1);
      // But we may have merged paragraphs if they're similar enough
      const paragraphs = merged.filter(e => e.type === 'paragraph');
      expect(paragraphs.length).toBeGreaterThanOrEqual(1);
      expect(paragraphs.length).toBeLessThanOrEqual(2);
    });

    it('should add unique elements', () => {
      const list1: TemplateElement[] = [
        { type: 'heading', content: 'Title' }
      ];
      const list2: TemplateElement[] = [
        { type: 'paragraph', content: 'Content' },
        { type: 'list', content: 'List items' }
      ];
      
      const merged = mergeElementLists(list1, list2);
      expect(merged).toHaveLength(3);
      expect(merged.map(e => e.type)).toEqual(['heading', 'paragraph', 'list']);
    });

    it('should handle empty lists', () => {
      const list1: TemplateElement[] = [];
      const list2: TemplateElement[] = [
        { type: 'heading', content: 'Title' }
      ];
      
      expect(mergeElementLists([], [])).toEqual([]);
      expect(mergeElementLists(list1, list2)).toHaveLength(1);
      expect(mergeElementLists(list2, list1)).toHaveLength(1);
    });

    it('should merge based on similarity threshold', () => {
      const list1: TemplateElement[] = [
        { type: 'paragraph', content: 'This is a test paragraph with some content' }
      ];
      const list2: TemplateElement[] = [
        { type: 'paragraph', content: 'This is a test paragraph with similar content' },
        { type: 'paragraph', content: 'Completely different paragraph' }
      ];
      
      const merged = mergeElementLists(list1, list2);
      expect(merged).toHaveLength(2); // Similar paragraphs merged, different one added
    });
  });

  describe('findInsertPosition', () => {
    const existingElements: TemplateElement[] = [
      { type: 'heading', level: 1, content: 'Introduction' },
      { type: 'paragraph', content: 'First paragraph' },
      { type: 'heading', level: 2, content: 'Section 1' },
      { type: 'paragraph', content: 'Section content' }
    ];

    it('should find position after similar previous context', () => {
      const newElement: TemplateElement = { type: 'paragraph', content: 'New content' };
      const prevContext: TemplateElement = { type: 'heading', level: 1, content: 'Introduction' };
      
      const position = findInsertPosition(newElement, existingElements, prevContext);
      expect(position).toBe(1); // After Introduction heading
    });

    it('should find position before similar next context', () => {
      const newElement: TemplateElement = { type: 'paragraph', content: 'New content' };
      const nextContext: TemplateElement = { type: 'heading', level: 2, content: 'Section 1' };
      
      const position = findInsertPosition(newElement, existingElements, undefined, nextContext);
      expect(position).toBe(2); // Before Section 1 heading
    });

    it('should append to end when no context matches', () => {
      const newElement: TemplateElement = { type: 'paragraph', content: 'New content' };
      const prevContext: TemplateElement = { type: 'heading', content: 'Non-existent' };
      
      const position = findInsertPosition(newElement, existingElements, prevContext);
      expect(position).toBe(existingElements.length);
    });

    it('should handle empty existing elements', () => {
      const newElement: TemplateElement = { type: 'paragraph' };
      const position = findInsertPosition(newElement, []);
      expect(position).toBe(0);
    });

    it('should prioritize previous context over next context', () => {
      const newElement: TemplateElement = { type: 'paragraph', content: 'New' };
      const prevContext = existingElements[0];
      const nextContext = existingElements[2];
      
      const position = findInsertPosition(newElement, existingElements, prevContext, nextContext);
      expect(position).toBe(1); // After prevContext
    });
  });
});