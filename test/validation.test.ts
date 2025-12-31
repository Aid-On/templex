import { describe, it, expect } from 'vitest';
import {
  validateWeight,
  validateAbstractTemplate,
  validateTemplateElement,
  validateDocumentTemplate,
  validateChunkAnalysis,
  validateExtractionConfig,
  isMetadataKey,
  compareMetadataValues
} from '../src/validation';
import type { 
  AbstractTemplate, 
  DocumentTemplate, 
  TemplateElement, 
  ChunkAnalysis,
  ExtractionConfig,
  LLMProvider
} from '../src/types';

describe('validation functions', () => {
  describe('validateWeight', () => {
    it('should clamp values between 0 and 1', () => {
      expect(validateWeight(0.5)).toBe(0.5);
      expect(validateWeight(-1)).toBe(0);
      expect(validateWeight(2)).toBe(1);
      expect(validateWeight(0)).toBe(0);
      expect(validateWeight(1)).toBe(1);
    });
  });

  describe('validateAbstractTemplate', () => {
    it('should throw error for missing name', () => {
      const template = {
        formula: 'test formula',
        components: [],
        flow: 'Linear',
        persuasionTechniques: []
      } as any;
      
      expect(() => validateAbstractTemplate(template)).toThrow('must have a valid name');
    });

    it('should throw error for missing formula', () => {
      const template = {
        name: 'Test Template',
        components: [],
        flow: 'Linear',
        persuasionTechniques: []
      } as any;
      
      expect(() => validateAbstractTemplate(template)).toThrow('must have a valid formula');
    });

    it('should normalize component weights', () => {
      const template: AbstractTemplate = {
        name: 'Test',
        formula: 'Formula',
        components: [
          {
            name: 'Component',
            purpose: 'Purpose',
            examples: [],
            patterns: [],
            position: 1,
            weight: 1.5 // Invalid weight
          }
        ],
        flow: 'Linear',
        persuasionTechniques: []
      };
      
      const validated = validateAbstractTemplate(template);
      expect(validated.components[0].weight).toBe(1);
    });

    it('should set default flow if invalid', () => {
      const template: AbstractTemplate = {
        name: 'Test',
        formula: 'Formula',
        components: [],
        flow: 'InvalidFlow' as any,
        persuasionTechniques: []
      };
      
      const validated = validateAbstractTemplate(template);
      expect(validated.flow).toBe('Linear');
    });

    it('should ensure arrays are properly initialized', () => {
      const template: AbstractTemplate = {
        name: 'Test',
        formula: 'Formula',
        components: null as any,
        flow: 'Pyramid',
        persuasionTechniques: null as any
      };
      
      const validated = validateAbstractTemplate(template);
      expect(validated.components).toEqual([]);
      expect(validated.persuasionTechniques).toEqual([]);
    });

    it('should validate valid template correctly', () => {
      const template: AbstractTemplate = {
        name: 'Valid Template',
        formula: '[A] + [B] + [C]',
        components: [
          {
            name: 'Component A',
            purpose: 'Purpose A',
            examples: ['Example 1'],
            patterns: ['Pattern 1'],
            position: 1,
            weight: 0.8
          }
        ],
        flow: 'Circular',
        persuasionTechniques: ['Authority', 'Social Proof']
      };
      
      const validated = validateAbstractTemplate(template);
      expect(validated).toEqual(template);
    });
  });

  describe('validateTemplateElement', () => {
    it('should throw error for invalid element type', () => {
      const element = {
        type: 'invalid' as any
      };
      
      expect(() => validateTemplateElement(element)).toThrow('Invalid element type');
    });

    it('should validate heading levels', () => {
      const heading1: TemplateElement = {
        type: 'heading',
        level: 10 // Invalid level
      };
      
      const validated1 = validateTemplateElement(heading1);
      expect(validated1.level).toBe(1);

      const heading2: TemplateElement = {
        type: 'heading'
        // Missing level
      };
      
      const validated2 = validateTemplateElement(heading2);
      expect(validated2.level).toBe(1);
    });

    it('should ensure keywords is an array', () => {
      const element: TemplateElement = {
        type: 'paragraph',
        keywords: 'not an array' as any
      };
      
      const validated = validateTemplateElement(element);
      expect(validated.keywords).toEqual([]);
    });

    it('should recursively validate children', () => {
      const element: TemplateElement = {
        type: 'section',
        children: [
          {
            type: 'heading',
            level: 1
          },
          {
            type: 'invalid' as any
          }
        ]
      };
      
      expect(() => validateTemplateElement(element)).toThrow('Invalid element type');
    });

    it('should handle valid elements correctly', () => {
      const element: TemplateElement = {
        type: 'paragraph',
        content: 'Some content',
        keywords: ['keyword1', 'keyword2'],
        children: [
          { type: 'quote', content: 'A quote' }
        ]
      };
      
      const validated = validateTemplateElement(element);
      expect(validated.type).toBe('paragraph');
      expect(validated.keywords).toHaveLength(2);
      expect(validated.children).toHaveLength(1);
    });
  });

  describe('validateDocumentTemplate', () => {
    it('should set default title if missing', () => {
      const template: DocumentTemplate = {
        title: '',
        structure: [],
        metadata: {},
        patterns: {},
        keywords: []
      };
      
      const validated = validateDocumentTemplate(template);
      expect(validated.title).toBe('Untitled Template');
    });

    it('should validate structure elements', () => {
      const template: DocumentTemplate = {
        title: 'Test',
        structure: [
          { type: 'heading', level: 1 },
          { type: 'paragraph' }
        ],
        metadata: {},
        patterns: {},
        keywords: []
      };
      
      const validated = validateDocumentTemplate(template);
      expect(validated.structure).toHaveLength(2);
      expect(validated.structure[0].type).toBe('heading');
    });

    it('should validate abstract template if present', () => {
      const template: DocumentTemplate = {
        title: 'Test',
        structure: [],
        abstractTemplate: {
          name: 'Test Template',
          formula: 'Formula',
          components: [],
          flow: 'InvalidFlow' as any,
          persuasionTechniques: []
        },
        metadata: {},
        patterns: {},
        keywords: []
      };
      
      const validated = validateDocumentTemplate(template);
      expect(validated.abstractTemplate?.flow).toBe('Linear');
    });

    it('should normalize keywords', () => {
      const template: DocumentTemplate = {
        title: 'Test',
        structure: [],
        metadata: {},
        patterns: {},
        keywords: [
          'string keyword',
          { term: 'object keyword', weight: 2, context: 'test' },
          { term: '', weight: -1, context: '' }
        ] as any
      };
      
      const validated = validateDocumentTemplate(template);
      expect(validated.keywords[0]).toEqual({
        term: 'string keyword',
        weight: 1,
        context: 'general'
      });
      expect(validated.keywords[1].weight).toBe(1); // Clamped from 2
      expect(validated.keywords[2].weight).toBe(0); // Clamped from -1
    });

    it('should ensure objects are initialized', () => {
      const template: DocumentTemplate = {
        title: 'Test',
        structure: null as any,
        metadata: null as any,
        patterns: null as any,
        keywords: null as any
      };
      
      const validated = validateDocumentTemplate(template);
      expect(validated.structure).toEqual([]);
      expect(validated.metadata).toEqual({});
      expect(validated.patterns).toEqual({});
      expect(validated.keywords).toEqual([]);
    });
  });

  describe('validateChunkAnalysis', () => {
    it('should validate all fields', () => {
      const analysis: ChunkAnalysis = {
        elements: [
          { type: 'heading', level: 1 }
        ],
        keywords: ['keyword1', 'keyword2'],
        patterns: { intro: 'pattern' },
        confidence: 1.5 // Invalid confidence
      };
      
      const validated = validateChunkAnalysis(analysis);
      expect(validated.confidence).toBe(1);
      expect(validated.elements).toHaveLength(1);
      expect(validated.keywords).toHaveLength(2);
    });

    it('should handle missing fields', () => {
      const analysis = {} as ChunkAnalysis;
      
      const validated = validateChunkAnalysis(analysis);
      expect(validated.elements).toEqual([]);
      expect(validated.keywords).toEqual([]);
      expect(validated.patterns).toEqual({});
      expect(validated.confidence).toBe(0);
    });

    it('should validate nested elements', () => {
      const analysis: ChunkAnalysis = {
        elements: [
          { type: 'invalid' as any }
        ],
        keywords: [],
        patterns: {},
        confidence: 0.5
      };
      
      expect(() => validateChunkAnalysis(analysis)).toThrow('Invalid element type');
    });
  });

  describe('validateExtractionConfig', () => {
    const mockProvider: LLMProvider = {
      chat: async () => 'response'
    };

    it('should set default values', () => {
      const config: ExtractionConfig = {
        provider: mockProvider
      };
      
      const validated = validateExtractionConfig(config);
      expect(validated.model).toBe('gpt-4');
      expect(validated.maxDepth).toBe(3);
      expect(validated.minConfidence).toBe(0.7);
      expect(validated.extractPatterns).toBe(true);
      expect(validated.extractKeywords).toBe(true);
      expect(validated.extractMetadata).toBe(true);
      expect(validated.language).toBe('ja');
      expect(validated.useIterativeRefinement).toBe(false);
    });

    it('should clamp maxDepth between 1 and 10', () => {
      const config1: ExtractionConfig = {
        provider: mockProvider,
        maxDepth: 0
      };
      const validated1 = validateExtractionConfig(config1);
      expect(validated1.maxDepth).toBe(1);

      const config2: ExtractionConfig = {
        provider: mockProvider,
        maxDepth: 20
      };
      const validated2 = validateExtractionConfig(config2);
      expect(validated2.maxDepth).toBe(10);
    });

    it('should validate language', () => {
      const config1: ExtractionConfig = {
        provider: mockProvider,
        language: 'en'
      };
      const validated1 = validateExtractionConfig(config1);
      expect(validated1.language).toBe('en');

      const config2: ExtractionConfig = {
        provider: mockProvider,
        language: 'invalid'
      };
      const validated2 = validateExtractionConfig(config2);
      expect(validated2.language).toBe('ja');
    });

    it('should preserve valid custom values', () => {
      const config: ExtractionConfig = {
        provider: mockProvider,
        model: 'gpt-3.5-turbo',
        maxDepth: 5,
        minConfidence: 0.9,
        extractPatterns: false,
        extractKeywords: false,
        extractMetadata: false,
        language: 'en',
        useIterativeRefinement: true
      };
      
      const validated = validateExtractionConfig(config);
      expect(validated.model).toBe('gpt-3.5-turbo');
      expect(validated.maxDepth).toBe(5);
      expect(validated.minConfidence).toBe(0.9);
      expect(validated.extractPatterns).toBe(false);
      expect(validated.extractKeywords).toBe(false);
      expect(validated.extractMetadata).toBe(false);
      expect(validated.language).toBe('en');
      expect(validated.useIterativeRefinement).toBe(true);
    });
  });

  describe('isMetadataKey', () => {
    it('should return true for valid metadata keys', () => {
      expect(isMetadataKey('genre')).toBe(true);
      expect(isMetadataKey('style')).toBe(true);
      expect(isMetadataKey('purpose')).toBe(true);
      expect(isMetadataKey('audience')).toBe(true);
      expect(isMetadataKey('tone')).toBe(true);
    });

    it('should return false for invalid keys', () => {
      expect(isMetadataKey('invalid')).toBe(false);
      expect(isMetadataKey('')).toBe(false);
      expect(isMetadataKey('Genre')).toBe(false); // Case sensitive
    });
  });

  describe('compareMetadataValues', () => {
    it('should compare metadata values correctly', () => {
      const template1: DocumentTemplate = {
        title: 'Test 1',
        structure: [],
        metadata: {
          genre: 'Article',
          style: 'Formal',
          purpose: 'Inform'
        },
        patterns: {},
        keywords: []
      };

      const template2: DocumentTemplate = {
        title: 'Test 2',
        structure: [],
        metadata: {
          genre: 'Article',
          style: 'Casual',
          purpose: 'Inform'
        },
        patterns: {},
        keywords: []
      };

      expect(compareMetadataValues(template1, template2, 'genre')).toBe(true);
      expect(compareMetadataValues(template1, template2, 'style')).toBe(false);
      expect(compareMetadataValues(template1, template2, 'purpose')).toBe(true);
    });

    it('should handle missing metadata values', () => {
      const template1: DocumentTemplate = {
        title: 'Test 1',
        structure: [],
        metadata: { genre: 'Article' },
        patterns: {},
        keywords: []
      };

      const template2: DocumentTemplate = {
        title: 'Test 2',
        structure: [],
        metadata: {},
        patterns: {},
        keywords: []
      };

      expect(compareMetadataValues(template1, template2, 'genre')).toBe(false);
      expect(compareMetadataValues(template1, template2, 'style')).toBe(true); // Both undefined
    });
  });
});