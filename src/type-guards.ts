/**
 * Type guard functions for runtime type checking
 */

import type {
  TemplateElement,
  AbstractTemplate,
} from './types.js';

const VALID_ELEMENT_TYPES = new Set(['heading', 'paragraph', 'list', 'quote', 'code', 'section']);

/**
 * Check if a heading level is valid
 */
function isValidHeadingLevel(obj: Record<string, unknown>): boolean {
  if (obj.type !== 'heading' || obj.level === undefined) return true;
  return typeof obj.level === 'number' && obj.level >= 1 && obj.level <= 6;
}

/**
 * Check if value is a TemplateElement
 */
export function isTemplateElement(value: unknown): value is TemplateElement {
  if (!value || typeof value !== 'object') return false;

  const obj = Object(value) as Record<string, unknown>;
  if (typeof obj.type !== 'string') return false;
  if (!VALID_ELEMENT_TYPES.has(obj.type)) return false;

  return isValidHeadingLevel(obj);
}

/**
 * Check if value is an array of TemplateElements
 */
export function isTemplateElementArray(value: unknown): value is TemplateElement[] {
  if (!Array.isArray(value)) return false;
  return value.every(isTemplateElement);
}

const VALID_FLOWS = new Set(['Linear', 'Pyramid', 'Circular']);

/**
 * Validate that a component has the required properties
 */
function hasRequiredComponentProps(obj: Record<string, unknown>): boolean {
  if (typeof obj.name !== 'string') return false;
  if (typeof obj.purpose !== 'string') return false;
  if (typeof obj.position !== 'number') return false;
  if (typeof obj.weight !== 'number') return false;
  return true;
}

/**
 * Check if value is an AbstractTemplate component
 */
function isAbstractComponent(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;

  const obj = Object(value) as Record<string, unknown>;
  if (!hasRequiredComponentProps(obj)) return false;

  const weight = obj.weight as number;
  if (weight < 0 || weight > 1) return false;

  if (obj.examples && !Array.isArray(obj.examples)) return false;
  if (obj.patterns && !Array.isArray(obj.patterns)) return false;

  return true;
}

/**
 * Check if value is an AbstractTemplate
 */
export function isAbstractTemplate(value: unknown): value is AbstractTemplate {
  if (!value || typeof value !== 'object') return false;

  const obj = Object(value) as Record<string, unknown>;
  if (typeof obj.name !== 'string') return false;
  if (typeof obj.formula !== 'string') return false;
  if (!Array.isArray(obj.components)) return false;
  if (typeof obj.flow !== 'string') return false;
  if (!Array.isArray(obj.persuasionTechniques)) return false;
  if (!VALID_FLOWS.has(obj.flow)) return false;

  return obj.components.every(isAbstractComponent);
}

/**
 * Check if value is a string record
 */
export function isStringRecord(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  const obj = Object(value) as Record<string, unknown>;
  for (const key in obj) {
    if (typeof obj[key] !== 'string') return false;
  }
  return true;
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
  '\u898B\u51FA\u3057': 'heading',
  '\u6BB5\u843D': 'paragraph',
  '\u30EA\u30B9\u30C8': 'list',
  '\u5F15\u7528': 'quote',
  '\u30B3\u30FC\u30C9': 'code',
  '\u30BB\u30AF\u30B7\u30E7\u30F3': 'section'
};

/**
 * Normalize element type from various formats
 */
function normalizeElementType(input: string): TemplateElement['type'] | null {
  const normalized = input.toLowerCase();
  return ELEMENT_TYPE_MAP[normalized] || ELEMENT_TYPE_MAP[input] || null;
}

/**
 * Try to convert a string into a TemplateElement
 */
function tryConvertStringToElement(item: string): TemplateElement | null {
  const typeMatch = item.match(/^(\S+)/);
  if (!typeMatch) return null;

  const type = normalizeElementType(typeMatch[1]);
  if (!type) return null;

  const element: TemplateElement = { type };
  const levelMatch = item.match(/#+(\s)/);
  if (levelMatch && type === 'heading') {
    element.level = levelMatch[0].length - 1;
  }
  return element;
}

/**
 * Safely parse elements from unknown value
 */
export function parseTemplateElements(value: unknown): TemplateElement[] {
  if (!value) return [];
  if (isTemplateElementArray(value)) return value;
  if (!Array.isArray(value)) return [];

  const converted: TemplateElement[] = [];
  for (const item of value) {
    if (isTemplateElement(item)) {
      converted.push(item);
      continue;
    }
    if (typeof item === 'string') {
      const element = tryConvertStringToElement(item);
      if (element) converted.push(element);
    }
  }
  return converted;
}

/**
 * Safely parse patterns from unknown value
 */
export function parsePatterns(value: unknown): Record<string, string> {
  if (!value) return {};
  if (isStringRecord(value)) return value;
  if (typeof value !== 'object' || value === null) return {};

  const result: Record<string, string> = {};
  const obj = Object(value) as Record<string, unknown>;

  for (const key in obj) {
    const converted = convertToString(obj[key]);
    if (converted !== null) {
      result[key] = converted;
    }
  }

  return result;
}

/**
 * Convert an unknown value to a string representation, or null if not convertible
 */
function convertToString(val: unknown): string | null {
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val.join(', ');
  if (val !== null && val !== undefined) return String(val);
  return null;
}

/**
 * Normalize a flow string to one of the valid flow types
 */
function normalizeFlow(flow: unknown): 'Linear' | 'Pyramid' | 'Circular' {
  if (flow === 'Pyramid') return 'Pyramid';
  if (flow === 'Circular') return 'Circular';
  return 'Linear';
}

/**
 * Safely parse abstract template from unknown value
 */
export function parseAbstractTemplate(value: unknown): AbstractTemplate | undefined {
  if (!value) return undefined;
  if (isAbstractTemplate(value)) return value;
  if (typeof value !== 'object' || value === null) return undefined;

  const obj = Object(value) as Record<string, unknown>;

  if (typeof obj.name !== 'string' || typeof obj.formula !== 'string') {
    return undefined;
  }

  return {
    name: obj.name,
    formula: obj.formula,
    components: Array.isArray(obj.components) ? obj.components.filter(isAbstractComponent) : [],
    flow: normalizeFlow(obj.flow),
    persuasionTechniques: Array.isArray(obj.persuasionTechniques)
      ? obj.persuasionTechniques.filter((t: unknown): t is string => typeof t === 'string')
      : []
  };
}
