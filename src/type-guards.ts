/**
 * Type guard functions for runtime type checking
 */

import type {
  TemplateElement,
  AbstractTemplate,
  DocumentTemplate,
  ChunkAnalysis
} from './types';

/**
 * Check if value is a TemplateElement
 */
export function isTemplateElement(value: unknown): value is TemplateElement {
  if (!value || typeof value !== 'object') {
    return false;
  }
  
  // Use Object.prototype methods to safely access properties
  const obj = Object(value);
  
  // Must have type property
  if (typeof obj.type !== 'string') {
    return false;
  }
  
  // Valid types
  const validTypes = ['heading', 'paragraph', 'list', 'quote', 'code', 'section'];
  if (!validTypes.includes(obj.type)) {
    return false;
  }
  
  // Optional level for headings
  if (obj.type === 'heading' && obj.level !== undefined) {
    if (typeof obj.level !== 'number' || obj.level < 1 || obj.level > 6) {
      return false;
    }
  }
  
  return true;
}

/**
 * Check if value is an array of TemplateElements
 */
export function isTemplateElementArray(value: unknown): value is TemplateElement[] {
  if (!Array.isArray(value)) {
    return false;
  }
  
  return value.every(isTemplateElement);
}

/**
 * Check if value is an AbstractTemplate
 */
export function isAbstractTemplate(value: unknown): value is AbstractTemplate {
  if (!value || typeof value !== 'object') {
    return false;
  }
  
  const obj = Object(value);
  
  // Required properties
  if (typeof obj.name !== 'string') return false;
  if (typeof obj.formula !== 'string') return false;
  if (!Array.isArray(obj.components)) return false;
  if (typeof obj.flow !== 'string') return false;
  if (!Array.isArray(obj.persuasionTechniques)) return false;
  
  // Validate flow value
  const validFlows = ['Linear', 'Pyramid', 'Circular'];
  if (!validFlows.includes(obj.flow)) return false;
  
  // Validate components
  for (const component of obj.components) {
    if (!isAbstractComponent(component)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Check if value is an AbstractTemplate component
 */
function isAbstractComponent(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }
  
  const obj = Object(value);
  
  // Required properties
  if (typeof obj.name !== 'string') return false;
  if (typeof obj.purpose !== 'string') return false;
  if (typeof obj.position !== 'number') return false;
  if (typeof obj.weight !== 'number') return false;
  
  // Weight must be between 0 and 1
  if (obj.weight < 0 || obj.weight > 1) return false;
  
  // Optional arrays
  if (obj.examples && !Array.isArray(obj.examples)) return false;
  if (obj.patterns && !Array.isArray(obj.patterns)) return false;
  
  return true;
}

/**
 * Check if value is a string record
 */
export function isStringRecord(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  
  const obj = Object(value);
  
  for (const key in obj) {
    if (typeof obj[key] !== 'string') {
      return false;
    }
  }
  
  return true;
}

/**
 * Safely parse elements from unknown value
 */
export function parseTemplateElements(value: unknown): TemplateElement[] {
  if (!value) return [];
  
  if (isTemplateElementArray(value)) {
    return value;
  }
  
  if (Array.isArray(value)) {
    // Try to convert each element
    const converted: TemplateElement[] = [];
    for (const item of value) {
      if (isTemplateElement(item)) {
        converted.push(item);
      } else if (typeof item === 'string') {
        // Try to parse string as element type
        const typeMatch = item.match(/^(\S+)/);
        if (typeMatch) {
          const type = normalizeElementType(typeMatch[1]);
          if (type) {
            const element: TemplateElement = { type };
            const levelMatch = item.match(/#+(\s)/);
            if (levelMatch && type === 'heading') {
              element.level = levelMatch[0].length - 1;
            }
            converted.push(element);
          }
        }
      }
    }
    return converted;
  }
  
  return [];
}

/**
 * Static mapping for element types
 */
const ELEMENT_TYPE_MAP: Record<string, TemplateElement['type']> = {
  'heading': 'heading',
  'paragraph': 'paragraph',
  'list': 'list',
  'quote': 'quote',
  'code': 'code',
  'section': 'section',
  // Japanese mappings
  '見出し': 'heading',
  '段落': 'paragraph',
  'リスト': 'list',
  '引用': 'quote',
  'コード': 'code',
  'セクション': 'section'
};

/**
 * Normalize element type from various formats
 */
function normalizeElementType(input: string): TemplateElement['type'] | null {
  const normalized = input.toLowerCase();
  return ELEMENT_TYPE_MAP[normalized] || ELEMENT_TYPE_MAP[input] || null;
}

/**
 * Safely parse patterns from unknown value
 */
export function parsePatterns(value: unknown): Record<string, string> {
  if (!value) return {};
  
  if (isStringRecord(value)) {
    return value;
  }
  
  if (typeof value === 'object' && value !== null) {
    const result: Record<string, string> = {};
    const obj = Object(value);
    
    for (const key in obj) {
      const val = obj[key];
      if (typeof val === 'string') {
        result[key] = val;
      } else if (Array.isArray(val)) {
        // Convert array to string
        result[key] = val.join(', ');
      } else if (val !== null && val !== undefined) {
        result[key] = String(val);
      }
    }
    
    return result;
  }
  
  return {};
}

/**
 * Safely parse abstract template from unknown value
 */
export function parseAbstractTemplate(value: unknown): AbstractTemplate | undefined {
  if (!value) return undefined;
  
  if (isAbstractTemplate(value)) {
    return value;
  }
  
  // Try to construct from partial data
  if (typeof value === 'object' && value !== null) {
    const obj = Object(value);
    
    // Must have at least name and formula
    if (typeof obj.name === 'string' && typeof obj.formula === 'string') {
      const flow = typeof obj.flow === 'string' ? obj.flow : 'Linear';
      const validFlow: 'Linear' | 'Pyramid' | 'Circular' = 
        flow === 'Pyramid' ? 'Pyramid' :
        flow === 'Circular' ? 'Circular' :
        'Linear';
      
      return {
        name: obj.name,
        formula: obj.formula,
        components: Array.isArray(obj.components) ? obj.components.filter(isAbstractComponent) : [],
        flow: validFlow,
        persuasionTechniques: Array.isArray(obj.persuasionTechniques) 
          ? obj.persuasionTechniques.filter((t: unknown): t is string => typeof t === 'string')
          : []
      };
    }
  }
  
  return undefined;
}