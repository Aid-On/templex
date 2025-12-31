import type { 
  AbstractTemplate, 
  DocumentTemplate, 
  TemplateElement,
  ChunkAnalysis,
  ExtractionConfig
} from './types';

/**
 * Validate weight is between 0 and 1
 */
export function validateWeight(weight: number): number {
  if (weight < 0) return 0;
  if (weight > 1) return 1;
  return weight;
}

/**
 * Validate and normalize AbstractTemplate components
 */
export function validateAbstractTemplate(template: AbstractTemplate): AbstractTemplate {
  if (!template.name || typeof template.name !== 'string') {
    throw new Error('AbstractTemplate must have a valid name');
  }

  if (!template.formula || typeof template.formula !== 'string') {
    throw new Error('AbstractTemplate must have a valid formula');
  }

  // Validate and normalize components
  if (!Array.isArray(template.components)) {
    template.components = [];
  } else {
    template.components = template.components.map(comp => ({
      ...comp,
      weight: validateWeight(comp.weight),
      position: typeof comp.position === 'number' ? comp.position : 0,
      examples: Array.isArray(comp.examples) ? comp.examples : [],
      patterns: Array.isArray(comp.patterns) ? comp.patterns : []
    }));
  }

  // Ensure flow is valid
  const validFlows = ['Linear', 'Pyramid', 'Circular'];
  if (!template.flow || !validFlows.includes(template.flow)) {
    template.flow = 'Linear';
  }

  // Ensure persuasionTechniques is an array
  if (!Array.isArray(template.persuasionTechniques)) {
    template.persuasionTechniques = [];
  }

  return template;
}

/**
 * Validate TemplateElement
 */
export function validateTemplateElement(element: TemplateElement): TemplateElement {
  const validTypes = ['heading', 'paragraph', 'list', 'quote', 'code', 'section'];
  
  if (!validTypes.includes(element.type)) {
    throw new Error(`Invalid element type: ${element.type}`);
  }

  // Validate level for headings
  if (element.type === 'heading') {
    if (element.level === undefined || element.level < 1 || element.level > 6) {
      element.level = 1;
    }
  }

  // Ensure keywords is an array
  if (element.keywords && !Array.isArray(element.keywords)) {
    element.keywords = [];
  }

  // Recursively validate children
  if (element.children) {
    if (!Array.isArray(element.children)) {
      element.children = [];
    } else {
      element.children = element.children.map(validateTemplateElement);
    }
  }

  return element;
}

/**
 * Validate DocumentTemplate
 */
export function validateDocumentTemplate(template: DocumentTemplate): DocumentTemplate {
  if (!template.title || typeof template.title !== 'string') {
    template.title = 'Untitled Template';
  }

  // Validate structure
  if (!Array.isArray(template.structure)) {
    template.structure = [];
  } else {
    template.structure = template.structure.map(validateTemplateElement);
  }

  // Validate abstractTemplate if present
  if (template.abstractTemplate) {
    template.abstractTemplate = validateAbstractTemplate(template.abstractTemplate);
  }

  // Ensure metadata is an object
  if (!template.metadata || typeof template.metadata !== 'object') {
    template.metadata = {};
  }

  // Ensure patterns is an object
  if (!template.patterns || typeof template.patterns !== 'object') {
    template.patterns = {};
  }

  // Validate keywords
  if (!Array.isArray(template.keywords)) {
    template.keywords = [];
  } else {
    template.keywords = template.keywords
      .map(kw => {
        if (typeof kw === 'string') {
          return { term: kw, weight: 1, context: 'general' };
        }
        return {
          term: kw.term || '',
          weight: validateWeight(kw.weight),
          context: kw.context || 'general'
        };
      })
      .filter(kw => kw.term.trim() !== ''); // Filter out empty keywords
  }

  return template;
}

/**
 * Validate ChunkAnalysis
 */
export function validateChunkAnalysis(analysis: ChunkAnalysis): ChunkAnalysis {
  return {
    elements: Array.isArray(analysis.elements) 
      ? analysis.elements.map(validateTemplateElement)
      : [],
    keywords: Array.isArray(analysis.keywords) 
      ? (() => {
          // Check if all items are strings
          const allStrings = analysis.keywords.every(kw => typeof kw === 'string');
          if (allStrings) {
            return analysis.keywords as string[];
          }
          // Otherwise treat as weighted keywords
          return analysis.keywords.map(kw => {
            if (typeof kw === 'string') {
              return { term: kw, weight: 1 };
            } else if (kw && typeof kw === 'object' && 'term' in kw) {
              return {
                term: String(kw.term),
                weight: typeof kw.weight === 'number' ? validateWeight(kw.weight) : 1
              };
            }
            return { term: '', weight: 0 };
          }).filter(kw => kw.term !== '') as Array<{term: string; weight: number}>;
        })()
      : [],
    patterns: analysis.patterns && typeof analysis.patterns === 'object' 
      ? analysis.patterns 
      : {},
    confidence: analysis.confidence !== undefined 
      ? validateWeight(analysis.confidence)
      : 0
  };
}

/**
 * Validate ExtractionConfig
 */
export function validateExtractionConfig(config: ExtractionConfig): Required<ExtractionConfig> {
  const validLanguages = ['ja', 'en'];
  
  return {
    provider: config.provider,
    model: config.model || 'gpt-4',
    maxDepth: Math.max(1, Math.min(10, config.maxDepth ?? 3)),
    minConfidence: validateWeight(config.minConfidence ?? 0.7),
    extractPatterns: config.extractPatterns ?? true,
    extractKeywords: config.extractKeywords ?? true,
    extractMetadata: config.extractMetadata ?? true,
    language: validLanguages.includes(config.language || '') 
      ? config.language! 
      : 'ja',
    useIterativeRefinement: config.useIterativeRefinement ?? false
  };
}

/**
 * Type guard for checking if metadata key exists
 */
export function isMetadataKey(key: string): key is keyof DocumentTemplate['metadata'] {
  const validKeys: (keyof DocumentTemplate['metadata'])[] = [
    'genre', 'style', 'purpose', 'audience', 'tone'
  ];
  return validKeys.includes(key as any);
}

/**
 * Safe metadata comparison
 */
export function compareMetadataValues(
  template1: DocumentTemplate,
  template2: DocumentTemplate,
  key: keyof DocumentTemplate['metadata']
): boolean {
  return template1.metadata[key] === template2.metadata[key];
}