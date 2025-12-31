import { describe, it, expect } from 'vitest';
import {
  extractJSON,
  parseJSONSafe,
  formatForLLM,
  createValidator
} from '../../src/json-utils';

describe('json-utils', () => {
  describe('extractJSON', () => {
    it('should parse valid JSON directly', () => {
      const input = '{"key": "value", "number": 42}';
      const result = extractJSON(input);
      expect(result).toEqual({ key: 'value', number: 42 });
    });

    it('should extract JSON from markdown code blocks', () => {
      const input = '```json\n{"key": "value"}\n```';
      const result = extractJSON(input);
      expect(result).toEqual({ key: 'value' });
    });

    it('should extract JSON from code blocks without language', () => {
      const input = '```\n{"key": "value"}\n```';
      const result = extractJSON(input);
      expect(result).toEqual({ key: 'value' });
    });

    it('should find balanced JSON structure in text', () => {
      const input = 'Some text before {"nested": {"key": "value"}} some text after';
      const result = extractJSON(input);
      expect(result).toEqual({ nested: { key: 'value' } });
    });

    it('should handle arrays', () => {
      const input = 'Text [1, 2, {"key": "value"}] more text';
      const result = extractJSON(input);
      expect(result).toEqual([1, 2, { key: 'value' }]);
    });

    it('should handle escaped quotes', () => {
      const input = '{"escaped": "value with \\"quotes\\""}';
      const result = extractJSON(input);
      expect(result).toEqual({ escaped: 'value with "quotes"' });
    });

    it('should clean common JSON issues', () => {
      // Trailing comma
      const input1 = '{"key": "value",}';
      expect(extractJSON(input1)).toEqual({ key: 'value' });

      // Comments
      const input2 = '{"key": "value" /* comment */}';
      expect(extractJSON(input2)).toEqual({ key: 'value' });

      // Single line comments
      const input3 = '{"key": "value" // comment\n}';
      expect(extractJSON(input3)).toEqual({ key: 'value' });
    });

    it('should handle unquoted keys (simple cases)', () => {
      const input = '{key: "value", number: 42}';
      const result = extractJSON(input);
      expect(result).toEqual({ key: 'value', number: 42 });
    });

    it('should return null for invalid JSON', () => {
      expect(extractJSON('')).toBeNull();
      expect(extractJSON('not json at all')).toBeNull();
      expect(extractJSON('{broken json')).toBeNull();
      expect(extractJSON('{"unclosed": ')).toBeNull();
    });

    it('should handle nested structures', () => {
      const input = `
        {
          "level1": {
            "level2": {
              "level3": ["a", "b", "c"],
              "value": 123
            }
          }
        }
      `;
      const result = extractJSON(input);
      expect(result).toEqual({
        level1: {
          level2: {
            level3: ['a', 'b', 'c'],
            value: 123
          }
        }
      });
    });
  });

  describe('parseJSONSafe', () => {
    it('should parse and validate JSON', () => {
      const validator = (obj: any): obj is { key: string } => {
        return typeof obj === 'object' && typeof obj.key === 'string';
      };
      
      const result = parseJSONSafe('{"key": "value"}', validator);
      expect(result).toEqual({ key: 'value' });
    });

    it('should return null for invalid structure', () => {
      const validator = (obj: any): obj is { key: string } => {
        return typeof obj === 'object' && typeof obj.key === 'string';
      };
      
      const result = parseJSONSafe('{"wrong": "structure"}', validator);
      expect(result).toBeNull();
    });

    it('should work without validator', () => {
      const result = parseJSONSafe('{"any": "structure"}');
      expect(result).toEqual({ any: 'structure' });
    });

    it('should return null for unparseable JSON', () => {
      const result = parseJSONSafe('not json');
      expect(result).toBeNull();
    });
  });

  describe('formatForLLM', () => {
    it('should format object as pretty JSON by default', () => {
      const obj = { key: 'value', nested: { inner: 42 } };
      const result = formatForLLM(obj);
      expect(result).toContain('\n');
      expect(result).toContain('  ');
      const parsed = JSON.parse(result);
      expect(parsed).toEqual(obj);
    });

    it('should format as compact JSON when pretty is false', () => {
      const obj = { key: 'value', nested: { inner: 42 } };
      const result = formatForLLM(obj, false);
      expect(result).not.toContain('\n');
      expect(result).toBe('{"key":"value","nested":{"inner":42}}');
    });

    it('should handle arrays', () => {
      const arr = [1, 2, { key: 'value' }];
      const result = formatForLLM(arr);
      const parsed = JSON.parse(result);
      expect(parsed).toEqual(arr);
    });

    it('should handle null and undefined', () => {
      expect(formatForLLM(null)).toBe('null');
      expect(formatForLLM(undefined)).toBe(undefined);
    });
  });

  describe('createValidator', () => {
    it('should create validator for required keys', () => {
      const validator = createValidator<{ name: string; age: number }>(['name', 'age']);
      
      expect(validator({ name: 'John', age: 30 })).toBe(true);
      expect(validator({ name: 'John' })).toBe(false);
      expect(validator({ age: 30 })).toBe(false);
      expect(validator(null)).toBe(false);
      expect(validator('not object')).toBe(false);
    });

    it('should validate with type checks', () => {
      const validator = createValidator<{ name: string; age: number }>(
        ['name', 'age'],
        {
          name: (val) => typeof val === 'string',
          age: (val) => typeof val === 'number' && val > 0
        }
      );
      
      expect(validator({ name: 'John', age: 30 })).toBe(true);
      expect(validator({ name: 'John', age: -5 })).toBe(false);
      expect(validator({ name: 123, age: 30 })).toBe(false);
    });

    it('should handle optional properties with type checks', () => {
      const validator = createValidator<{ required: string; optional?: number }>(
        ['required'],
        {
          required: (val) => typeof val === 'string',
          optional: (val) => typeof val === 'number'
        }
      );
      
      expect(validator({ required: 'value' })).toBe(true);
      expect(validator({ required: 'value', optional: 42 })).toBe(true);
      expect(validator({ required: 'value', optional: 'wrong' })).toBe(false);
    });

    it('should handle extra properties', () => {
      const validator = createValidator<{ key: string }>(['key']);
      
      expect(validator({ key: 'value', extra: 'ignored' })).toBe(true);
    });
  });
});