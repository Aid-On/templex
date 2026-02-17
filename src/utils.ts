import type { DocumentTemplate, TemplateElement, AbstractTemplate } from './types.js';

/**
 * Format abstract template section
 */
function formatAbstractTemplate(at: AbstractTemplate): string[] {
  const lines: string[] = [];
  lines.push('## Abstract Template Pattern');
  lines.push('');
  lines.push(`**Pattern Type**: ${at.name}`);
  lines.push('');
  lines.push(`**Formula**: \`${at.formula}\``);
  lines.push('');

  if (at.components && at.components.length > 0) {
    lines.push('### Components:');
    lines.push(...formatComponents(at.components));
  }

  if (at.flow) {
    lines.push(`**Information Flow**: ${at.flow}`);
  }

  if (at.persuasionTechniques && at.persuasionTechniques.length > 0) {
    lines.push(`**Persuasion Techniques**: ${at.persuasionTechniques.join(', ')}`);
  }

  lines.push('');
  lines.push('\u2501'.repeat(60));
  lines.push('');
  return lines;
}

/**
 * Format abstract template components
 */
function formatComponents(components: AbstractTemplate['components']): string[] {
  const lines: string[] = [];
  for (const comp of components) {
    lines.push(`**${comp.position || 1}. ${comp.name}**`);
    lines.push(`- Purpose: ${comp.purpose}`);
    if (comp.examples && comp.examples.length > 0) {
      lines.push(`- Example: "${comp.examples[0]}"`);
    }
    if (comp.patterns && comp.patterns.length > 0) {
      lines.push(`- Pattern: ${comp.patterns.join(', ')}`);
    }
    lines.push(`- Weight: ${(comp.weight * 100).toFixed(0)}%`);
    lines.push('');
  }
  return lines;
}

/**
 * Format a single template element
 */
function formatElement(element: TemplateElement, prefix: string): string[] {
  const lines: string[] = [];
  lines.push(`${prefix}- **${element.type}${element.level ? ` (H${element.level})` : ''}**`);

  if (element.content) lines.push(`${prefix}  Content: ${element.content}`);
  if (element.intent) lines.push(`${prefix}  Intent: ${element.intent}`);
  if (element.persuasion) lines.push(`${prefix}  Appeal: ${element.persuasion}`);
  if (element.technique) lines.push(`${prefix}  Technique: ${element.technique}`);
  if (element.transition) lines.push(`${prefix}  Transition: ${element.transition}`);
  lines.push('');

  return lines;
}

function formatStructure(elements: TemplateElement[], indent = 0): string[] {
  const lines: string[] = [];
  const prefix = '  '.repeat(indent);

  for (const element of elements) {
    lines.push(...formatElement(element, prefix));
    if (element.children && element.children.length > 0) {
      lines.push(...formatStructure(element.children, indent + 1));
    }
  }

  return lines;
}

export function formatTemplate(template: DocumentTemplate): string {
  const lines: string[] = [];

  lines.push(`# ${template.title || 'Document Template'}`);
  lines.push('');

  if (template.abstractTemplate) {
    lines.push(...formatAbstractTemplate(template.abstractTemplate));
  }

  if (Object.keys(template.metadata).length > 0) {
    lines.push(...formatMetadataSection(template.metadata));
  }

  if (template.structure.length > 0) {
    lines.push('## Structure');
    lines.push(...formatStructure(template.structure));
    lines.push('');
  }

  if (Object.keys(template.patterns).length > 0) {
    lines.push(...formatPatternsSection(template.patterns));
  }

  if (template.keywords.length > 0) {
    lines.push(...formatKeywordsSection(template.keywords));
  }

  return lines.join('\n');
}

function formatMetadataSection(metadata: DocumentTemplate['metadata']): string[] {
  const lines = ['## Metadata'];
  for (const [key, value] of Object.entries(metadata)) {
    lines.push(`- ${key}: ${value}`);
  }
  lines.push('');
  return lines;
}

function formatPatternsSection(patterns: DocumentTemplate['patterns']): string[] {
  const lines = ['## Patterns'];
  for (const [key, value] of Object.entries(patterns)) {
    lines.push(`### ${key}`);
    lines.push(value);
    lines.push('');
  }
  return lines;
}

function formatKeywordsSection(keywords: DocumentTemplate['keywords']): string[] {
  const lines = ['## Keywords'];
  for (const keyword of keywords.slice(0, 10)) {
    lines.push(`- ${keyword.term} (weight: ${keyword.weight.toFixed(2)})`);
  }
  lines.push('');
  return lines;
}

export function mergeTemplates(templates: DocumentTemplate[]): DocumentTemplate {
  if (templates.length === 0) {
    throw new Error('No templates to merge');
  }

  if (templates.length === 1) {
    return templates[0];
  }

  const merged: DocumentTemplate = {
    title: templates[0].title,
    structure: deduplicateElements(templates.flatMap(t => t.structure)),
    metadata: {},
    patterns: {},
    keywords: mergeTemplateKeywords(templates)
  };

  for (const template of templates) {
    Object.assign(merged.metadata, template.metadata);
    Object.assign(merged.patterns, template.patterns);
  }

  return merged;
}

function mergeTemplateKeywords(templates: DocumentTemplate[]): DocumentTemplate['keywords'] {
  const keywordMap = new Map<string, { weight: number; context: string }>();
  for (const template of templates) {
    for (const keyword of template.keywords) {
      const existing = keywordMap.get(keyword.term);
      if (!existing || existing.weight < keyword.weight) {
        keywordMap.set(keyword.term, keyword);
      }
    }
  }
  return Array.from(keywordMap.entries())
    .map(([term, data]) => ({ term, weight: data.weight, context: data.context }))
    .sort((a, b) => b.weight - a.weight);
}

function deduplicateElements(elements: TemplateElement[]): TemplateElement[] {
  const seen = new Map<string, TemplateElement>();

  for (const element of elements) {
    const key = `${element.type}-${element.level || 0}-${element.content || ''}`;
    if (!seen.has(key)) {
      seen.set(key, element);
    }
  }

  return Array.from(seen.values());
}

export function simplifyTemplate(template: DocumentTemplate): DocumentTemplate {
  return {
    ...template,
    structure: simplifyStructure(template.structure),
    keywords: template.keywords.slice(0, 10)
  };
}

function simplifyStructure(elements: TemplateElement[]): TemplateElement[] {
  return elements.map(element => ({
    type: element.type,
    level: element.level,
    intent: element.intent,
    children: element.children ? simplifyStructure(element.children) : undefined
  }));
}

export function compareTemplates(a: DocumentTemplate, b: DocumentTemplate): number {
  const structSimilarity = compareStructures(a.structure, b.structure);
  const keywordSimilarity = compareKeywords(a.keywords, b.keywords);
  const metadataSimilarity = compareMetadata(a.metadata, b.metadata);
  const patternSimilarity = comparePatterns(a.patterns, b.patterns);

  return (
    structSimilarity * 0.4 +
    keywordSimilarity * 0.3 +
    metadataSimilarity * 0.15 +
    patternSimilarity * 0.15
  );
}

function compareStructures(a: TemplateElement[], b: TemplateElement[]): number {
  if (a.length === 0 || b.length === 0) return 0;

  const aTypes = new Set(a.map(e => e.type));
  const bTypes = new Set(b.map(e => e.type));
  const intersection = new Set([...aTypes].filter(x => bTypes.has(x)));
  const union = new Set([...aTypes, ...bTypes]);

  return intersection.size / union.size;
}

function compareKeywords(
  a: Array<{ term: string; weight: number }>,
  b: Array<{ term: string; weight: number }>
): number {
  if (a.length === 0 || b.length === 0) return 0;

  const aTerms = new Set(a.map(k => k.term));
  const bTerms = new Set(b.map(k => k.term));
  const intersection = new Set([...aTerms].filter(x => bTerms.has(x)));
  const union = new Set([...aTerms, ...bTerms]);

  return intersection.size / union.size;
}

function compareMetadata(
  a: DocumentTemplate['metadata'],
  b: DocumentTemplate['metadata']
): number {
  const aKeys = Object.keys(a) as Array<keyof DocumentTemplate['metadata']>;
  const bKeys = Object.keys(b) as Array<keyof DocumentTemplate['metadata']>;

  if (aKeys.length === 0 || bKeys.length === 0) return 0;

  let matches = 0;
  for (const key of aKeys) {
    if (key in b && a[key] === b[key]) matches++;
  }

  return matches / Math.max(aKeys.length, bKeys.length);
}

function comparePatterns(
  a: DocumentTemplate['patterns'],
  b: DocumentTemplate['patterns']
): number {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);

  if (aKeys.length === 0 || bKeys.length === 0) return 0;

  const intersection = aKeys.filter(k => bKeys.includes(k));
  const union = new Set([...aKeys, ...bKeys]);

  return intersection.length / union.size;
}
