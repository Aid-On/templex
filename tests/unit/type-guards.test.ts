import { describe, it, expect } from 'vitest';
import {
  isTemplateElement,
  isTemplateElementArray,
  isAbstractTemplate,
  isStringRecord,
  parseTemplateElements,
  parsePatterns,
  parseAbstractTemplate
} from '../../src/type-guards';

describe('type-guards', () => {
  describe('isTemplateElement', () => {
    it('should validate valid template elements', () => {
      expect(isTemplateElement({ type: 'heading', level: 1 })).toBe(true);
      expect(isTemplateElement({ type: 'paragraph' })).toBe(true);
      expect(isTemplateElement({ type: 'list' })).toBe(true);
      expect(isTemplateElement({ type: 'quote' })).toBe(true);
      expect(isTemplateElement({ type: 'code' })).toBe(true);
      expect(isTemplateElement({ type: 'section' })).toBe(true);
    });

    it('should reject invalid types', () => {
      expect(isTemplateElement({ type: 'invalid' })).toBe(false);
      expect(isTemplateElement({ type: 123 })).toBe(false);
      expect(isTemplateElement({ notType: 'heading' })).toBe(false);
    });

    it('should validate heading levels', () => {
      expect(isTemplateElement({ type: 'heading', level: 1 })).toBe(true);
      expect(isTemplateElement({ type: 'heading', level: 6 })).toBe(true);
      expect(isTemplateElement({ type: 'heading', level: 0 })).toBe(false);
      expect(isTemplateElement({ type: 'heading', level: 7 })).toBe(false);
    });

    it('should reject non-objects', () => {
      expect(isTemplateElement(null)).toBe(false);
      expect(isTemplateElement(undefined)).toBe(false);
      expect(isTemplateElement('string')).toBe(false);
      expect(isTemplateElement(123)).toBe(false);
    });
  });

  describe('isTemplateElementArray', () => {
    it('should validate array of template elements', () => {
      const elements = [
        { type: 'heading', level: 1 },
        { type: 'paragraph' },
        { type: 'list' }
      ];
      expect(isTemplateElementArray(elements)).toBe(true);
    });

    it('should reject mixed arrays', () => {
      const mixed = [
        { type: 'heading' },
        'not an element',
        { type: 'paragraph' }
      ];
      expect(isTemplateElementArray(mixed)).toBe(false);
    });

    it('should accept empty arrays', () => {
      expect(isTemplateElementArray([])).toBe(true);
    });

    it('should reject non-arrays', () => {
      expect(isTemplateElementArray({ type: 'heading' })).toBe(false);
      expect(isTemplateElementArray(null)).toBe(false);
    });
  });

  describe('isAbstractTemplate', () => {
    it('should validate complete abstract template', () => {
      const template = {
        name: 'Test Template',
        formula: 'A + B + C',
        components: [
          {
            name: 'Component A',
            purpose: 'Test purpose',
            position: 1,
            weight: 0.5,
            examples: ['example1'],
            patterns: ['pattern1']
          }
        ],
        flow: 'Linear',
        persuasionTechniques: ['technique1', 'technique2']
      };
      expect(isAbstractTemplate(template)).toBe(true);
    });

    it('should reject invalid flow types', () => {
      const template = {
        name: 'Test',
        formula: 'A + B',
        components: [],
        flow: 'Invalid',
        persuasionTechniques: []
      };
      expect(isAbstractTemplate(template)).toBe(false);
    });

    it('should validate component weights', () => {
      const template = {
        name: 'Test',
        formula: 'A',
        components: [
          {
            name: 'A',
            purpose: 'Test',
            position: 1,
            weight: 1.5 // Invalid weight
          }
        ],
        flow: 'Linear',
        persuasionTechniques: []
      };
      expect(isAbstractTemplate(template)).toBe(false);
    });

    it('should reject templates missing required properties', () => {
      expect(isAbstractTemplate({ name: 'Test' })).toBe(false);
      expect(isAbstractTemplate({ formula: 'A + B' })).toBe(false);
      expect(isAbstractTemplate(null)).toBe(false);
    });
  });

  describe('isStringRecord', () => {
    it('should validate string records', () => {
      expect(isStringRecord({ key1: 'value1', key2: 'value2' })).toBe(true);
      expect(isStringRecord({})).toBe(true);
    });

    it('should reject non-string values', () => {
      expect(isStringRecord({ key: 123 })).toBe(false);
      expect(isStringRecord({ key: null })).toBe(false);
      expect(isStringRecord({ key: ['array'] })).toBe(false);
    });

    it('should reject non-objects', () => {
      expect(isStringRecord(null)).toBe(false);
      expect(isStringRecord('string')).toBe(false);
      expect(isStringRecord([])).toBe(false);
    });
  });

  describe('parseTemplateElements', () => {
    it('should parse valid element array', () => {
      const input = [
        { type: 'heading', level: 1 },
        { type: 'paragraph' }
      ];
      const result = parseTemplateElements(input);
      expect(result).toEqual(input);
    });

    it('should convert strings to elements', () => {
      const input = ['見出し', 'paragraph'];
      const result = parseTemplateElements(input);
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('heading');
      expect(result[1].type).toBe('paragraph');
    });

    it('should filter invalid elements', () => {
      const input = [
        { type: 'heading' },
        'invalid_type',
        null,
        { type: 'invalid' }
      ];
      const result = parseTemplateElements(input);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('heading');
    });

    it('should handle empty or invalid input', () => {
      expect(parseTemplateElements(null)).toEqual([]);
      expect(parseTemplateElements(undefined)).toEqual([]);
      expect(parseTemplateElements('not array')).toEqual([]);
    });
  });

  describe('parsePatterns', () => {
    it('should parse valid string record', () => {
      const input = { pattern1: 'value1', pattern2: 'value2' };
      expect(parsePatterns(input)).toEqual(input);
    });

    it('should convert arrays to strings', () => {
      const input = { pattern1: ['a', 'b', 'c'] };
      const result = parsePatterns(input);
      expect(result.pattern1).toBe('a, b, c');
    });

    it('should convert non-strings to strings', () => {
      const input = { 
        num: 123,
        bool: true,
        obj: { nested: 'value' }
      };
      const result = parsePatterns(input);
      expect(result.num).toBe('123');
      expect(result.bool).toBe('true');
      expect(result.obj).toBe('[object Object]');
    });

    it('should handle empty or invalid input', () => {
      expect(parsePatterns(null)).toEqual({});
      expect(parsePatterns(undefined)).toEqual({});
      expect(parsePatterns('string')).toEqual({});
    });

    it('should skip null and undefined values', () => {
      const input = {
        valid: 'value',
        nullVal: null,
        undefinedVal: undefined
      };
      const result = parsePatterns(input);
      expect(result).toEqual({ valid: 'value' });
    });
  });

  describe('parseAbstractTemplate', () => {
    it('should parse valid template', () => {
      const input = {
        name: 'Test',
        formula: 'A + B',
        components: [
          {
            name: 'A',
            purpose: 'Test',
            position: 1,
            weight: 0.5
          }
        ],
        flow: 'Linear',
        persuasionTechniques: ['technique1']
      };
      const result = parseAbstractTemplate(input);
      expect(result).toEqual(input);
    });

    it('should construct template from partial data', () => {
      const input = {
        name: 'Test',
        formula: 'A + B',
        invalidProp: 'ignored'
      };
      const result = parseAbstractTemplate(input);
      expect(result).toEqual({
        name: 'Test',
        formula: 'A + B',
        components: [],
        flow: 'Linear',
        persuasionTechniques: []
      });
    });

    it('should normalize flow type', () => {
      const input = {
        name: 'Test',
        formula: 'A',
        flow: 'Pyramid'
      };
      const result = parseAbstractTemplate(input);
      expect(result?.flow).toBe('Pyramid');

      const invalidFlow = {
        name: 'Test',
        formula: 'A',
        flow: 'Invalid'
      };
      const result2 = parseAbstractTemplate(invalidFlow);
      expect(result2?.flow).toBe('Linear');
    });

    it('should filter invalid components and techniques', () => {
      const input = {
        name: 'Test',
        formula: 'A',
        components: [
          { name: 'Valid', purpose: 'Test', position: 1, weight: 0.5 },
          { invalid: 'component' },
          null
        ],
        persuasionTechniques: ['valid', 123, null]
      };
      const result = parseAbstractTemplate(input);
      expect(result?.components).toHaveLength(1);
      expect(result?.persuasionTechniques).toEqual(['valid']);
    });

    it('should return undefined for invalid input', () => {
      expect(parseAbstractTemplate(null)).toBeUndefined();
      expect(parseAbstractTemplate(undefined)).toBeUndefined();
      expect(parseAbstractTemplate({ invalid: 'data' })).toBeUndefined();
      expect(parseAbstractTemplate({ name: 'OnlyName' })).toBeUndefined();
    });
  });
});