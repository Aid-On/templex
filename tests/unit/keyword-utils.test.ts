import { describe, it, expect } from 'vitest';
import {
  normalizeKeyword,
  normalizeKeywords,
  mergeKeywordLists,
  keywordListSimilarity,
  filterByWeight,
  groupByContext,
  toDocumentKeywords,
  toStringArray
} from '../../src/keyword-utils';

describe('keyword-utils', () => {
  describe('normalizeKeyword', () => {
    it('should normalize string to keyword object', () => {
      const result = normalizeKeyword('test');
      expect(result).toEqual({
        term: 'test',
        weight: 1.0,
        context: 'general'
      });
    });

    it('should handle object with term property', () => {
      const result = normalizeKeyword({ term: 'test', weight: 0.5 });
      expect(result).toEqual({
        term: 'test',
        weight: 0.5,
        context: 'general'
      });
    });

    it('should handle object with keyword property', () => {
      const result = normalizeKeyword({ keyword: 'test', score: 0.8 });
      expect(result).toEqual({
        term: 'test',
        weight: 0.8,
        context: 'general'
      });
    });

    it('should return null for invalid input', () => {
      expect(normalizeKeyword(null)).toBeNull();
      expect(normalizeKeyword(undefined)).toBeNull();
      expect(normalizeKeyword(123)).toBeNull();
    });

    it('should normalize weight to 0-1 range', () => {
      expect(normalizeKeyword({ term: 'test', weight: -1 })?.weight).toBe(0);
      expect(normalizeKeyword({ term: 'test', weight: 2 })?.weight).toBe(1);
    });
  });

  describe('normalizeKeywords', () => {
    it('should normalize array of mixed formats', () => {
      const input = [
        'string1',
        { term: 'object1', weight: 0.5 },
        { keyword: 'object2', score: 0.8 },
        null,
        undefined
      ];
      const result = normalizeKeywords(input);
      expect(result).toHaveLength(3);
      expect(result[0].term).toBe('string1');
      expect(result[1].term).toBe('object1');
      expect(result[2].term).toBe('object2');
    });

    it('should filter out empty terms', () => {
      const input = ['', '  ', 'valid'];
      const result = normalizeKeywords(input);
      expect(result).toHaveLength(1);
      expect(result[0].term).toBe('valid');
    });
  });

  describe('mergeKeywordLists', () => {
    it('should merge multiple keyword lists', () => {
      const list1 = ['keyword1', 'keyword2'];
      const list2 = ['keyword2', 'keyword3'];
      const result = mergeKeywordLists(list1, list2);
      
      expect(result).toHaveLength(3);
      const terms = result.map(k => k.term);
      expect(terms).toContain('keyword1');
      expect(terms).toContain('keyword2');
      expect(terms).toContain('keyword3');
    });

    it('should accumulate weights for duplicate keywords', () => {
      const list1 = [{ term: 'test', weight: 0.5 }];
      const list2 = [{ term: 'test', weight: 0.5 }];
      const result = mergeKeywordLists(list1, list2);
      
      expect(result).toHaveLength(1);
      expect(result[0].weight).toBeGreaterThan(0.5);
      expect(result[0].weight).toBeLessThanOrEqual(1.0);
    });

    it('should sort by weight descending', () => {
      const list = [
        { term: 'low', weight: 0.2 },
        { term: 'high', weight: 0.9 },
        { term: 'medium', weight: 0.5 }
      ];
      const result = mergeKeywordLists(list);
      
      expect(result[0].term).toBe('high');
      expect(result[1].term).toBe('medium');
      expect(result[2].term).toBe('low');
    });
  });

  describe('keywordListSimilarity', () => {
    it('should return 1 for identical lists', () => {
      const list = ['keyword1', 'keyword2'];
      expect(keywordListSimilarity(list, list)).toBe(1);
    });

    it('should return 0 for completely different lists', () => {
      const list1 = ['keyword1', 'keyword2'];
      const list2 = ['keyword3', 'keyword4'];
      expect(keywordListSimilarity(list1, list2)).toBe(0);
    });

    it('should calculate Jaccard similarity', () => {
      const list1 = ['a', 'b', 'c'];
      const list2 = ['b', 'c', 'd'];
      // Intersection: {b, c} = 2
      // Union: {a, b, c, d} = 4
      // Similarity: 2/4 = 0.5
      expect(keywordListSimilarity(list1, list2)).toBe(0.5);
    });

    it('should be case-insensitive', () => {
      const list1 = ['Keyword'];
      const list2 = ['keyword'];
      expect(keywordListSimilarity(list1, list2)).toBe(1);
    });

    it('should handle empty lists', () => {
      expect(keywordListSimilarity([], [])).toBe(0);
      expect(keywordListSimilarity(['a'], [])).toBe(0);
    });
  });

  describe('filterByWeight', () => {
    it('should filter keywords by minimum weight', () => {
      const keywords = [
        { term: 'high', weight: 0.9, context: 'general' },
        { term: 'low', weight: 0.2, context: 'general' },
        { term: 'medium', weight: 0.5, context: 'general' }
      ];
      const result = filterByWeight(keywords, 0.4);
      expect(result).toHaveLength(2);
      expect(result.map(k => k.term)).toEqual(['high', 'medium']);
    });

    it('should use default threshold of 0.5', () => {
      const keywords = [
        { term: 'high', weight: 0.6, context: 'general' },
        { term: 'low', weight: 0.4, context: 'general' }
      ];
      const result = filterByWeight(keywords);
      expect(result).toHaveLength(1);
      expect(result[0].term).toBe('high');
    });
  });

  describe('groupByContext', () => {
    it('should group keywords by context', () => {
      const keywords = [
        { term: 'tech1', weight: 1, context: 'technology' },
        { term: 'tech2', weight: 1, context: 'technology' },
        { term: 'biz1', weight: 1, context: 'business' },
        { term: 'general1', weight: 1, context: undefined }
      ];
      const result = groupByContext(keywords);
      
      expect(Object.keys(result)).toHaveLength(3);
      expect(result.technology).toHaveLength(2);
      expect(result.business).toHaveLength(1);
      expect(result.general).toHaveLength(1);
    });
  });

  describe('toDocumentKeywords', () => {
    it('should convert normalized keywords to document format', () => {
      const keywords = [
        { term: 'test', weight: 0.5, context: 'tech' }
      ];
      const result = toDocumentKeywords(keywords);
      expect(result).toEqual([
        { term: 'test', weight: 0.5, context: 'tech' }
      ]);
    });
  });

  describe('toStringArray', () => {
    it('should extract terms as string array', () => {
      const keywords = [
        { term: 'a', weight: 1, context: 'general' },
        { term: 'b', weight: 1, context: 'general' }
      ];
      const result = toStringArray(keywords);
      expect(result).toEqual(['a', 'b']);
    });
  });
});