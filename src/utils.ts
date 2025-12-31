import type { DocumentTemplate, TemplateElement } from './types.js';

export function formatTemplate(template: DocumentTemplate): string {
  const lines: string[] = [];
  
  lines.push(`# ${template.title || 'Document Template'}`);
  lines.push('');
  
  // Display abstract template if available
  if (template.abstractTemplate) {
    lines.push('## 🎯 Abstract Template Pattern');
    lines.push('');
    lines.push(`**Pattern Type**: ${template.abstractTemplate.name}`);
    lines.push('');
    lines.push(`**Formula**: \`${template.abstractTemplate.formula}\``);
    lines.push('');
    
    if (template.abstractTemplate.components && template.abstractTemplate.components.length > 0) {
      lines.push('### Components:');
      for (const comp of template.abstractTemplate.components) {
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
    }
    
    if (template.abstractTemplate.flow) {
      lines.push(`**Information Flow**: ${template.abstractTemplate.flow}`);
    }
    
    if (template.abstractTemplate.persuasionTechniques && template.abstractTemplate.persuasionTechniques.length > 0) {
      lines.push(`**Persuasion Techniques**: ${template.abstractTemplate.persuasionTechniques.join(', ')}`);
    }
    
    lines.push('');
    lines.push('━'.repeat(60));
    lines.push('');
  }
  
  if (Object.keys(template.metadata).length > 0) {
    lines.push('## Metadata');
    for (const [key, value] of Object.entries(template.metadata)) {
      lines.push(`- ${key}: ${value}`);
    }
    lines.push('');
  }
  
  if (template.structure.length > 0) {
    lines.push('## Structure');
    lines.push(...formatStructure(template.structure));
    lines.push('');
  }
  
  if (Object.keys(template.patterns).length > 0) {
    lines.push('## Patterns');
    for (const [key, value] of Object.entries(template.patterns)) {
      lines.push(`### ${key}`);
      lines.push(value);
      lines.push('');
    }
  }
  
  if (template.keywords.length > 0) {
    lines.push('## Keywords');
    for (const keyword of template.keywords.slice(0, 10)) {
      lines.push(`- ${keyword.term} (weight: ${keyword.weight.toFixed(2)})`);
    }
    lines.push('');
  }
  
  return lines.join('\n');
}

function formatStructure(elements: TemplateElement[], indent = 0): string[] {
  const lines: string[] = [];
  const prefix = '  '.repeat(indent);
  
  for (const element of elements) {
    lines.push(`${prefix}- **${element.type}${element.level ? ` (H${element.level})` : ''}**`);
    
    if (element.content) {
      lines.push(`${prefix}  📝 ${element.content}`);
    }
    
    if (element.intent) {
      lines.push(`${prefix}  🎯 意図: ${element.intent}`);
    }
    
    if (element.persuasion) {
      lines.push(`${prefix}  💡 訴求: ${element.persuasion}`);
    }
    
    if (element.technique) {
      lines.push(`${prefix}  🔨 技法: ${element.technique}`);
    }
    
    if (element.transition) {
      lines.push(`${prefix}  🔗 遷移: ${element.transition}`);
    }
    
    lines.push(''); // 空行を追加
    
    if (element.children && element.children.length > 0) {
      lines.push(...formatStructure(element.children, indent + 1));
    }
  }
  
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
    structure: [],
    metadata: {},
    patterns: {},
    keywords: []
  };
  
  // Merge structures
  const allStructures = templates.flatMap(t => t.structure);
  merged.structure = deduplicateElements(allStructures);
  
  // Merge metadata
  for (const template of templates) {
    Object.assign(merged.metadata, template.metadata);
  }
  
  // Merge patterns
  for (const template of templates) {
    Object.assign(merged.patterns, template.patterns);
  }
  
  // Merge and deduplicate keywords
  const keywordMap = new Map<string, { weight: number; context: string }>();
  for (const template of templates) {
    for (const keyword of template.keywords) {
      const existing = keywordMap.get(keyword.term);
      if (!existing || existing.weight < keyword.weight) {
        keywordMap.set(keyword.term, keyword);
      }
    }
  }
  merged.keywords = Array.from(keywordMap.entries())
    .map(([term, data]) => ({
      term,
      weight: data.weight,
      context: data.context
    }))
    .sort((a, b) => b.weight - a.weight);
  
  return merged;
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
  let similarity = 0;
  let factors = 0;
  
  // Compare structures
  const structSimilarity = compareStructures(a.structure, b.structure);
  similarity += structSimilarity * 0.4;
  factors += 0.4;
  
  // Compare keywords
  const keywordSimilarity = compareKeywords(a.keywords, b.keywords);
  similarity += keywordSimilarity * 0.3;
  factors += 0.3;
  
  // Compare metadata
  const metadataSimilarity = compareMetadata(a.metadata, b.metadata);
  similarity += metadataSimilarity * 0.15;
  factors += 0.15;
  
  // Compare patterns
  const patternSimilarity = comparePatterns(a.patterns, b.patterns);
  similarity += patternSimilarity * 0.15;
  factors += 0.15;
  
  return factors > 0 ? similarity / factors : 0;
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
    if (key in b && a[key] === b[key]) {
      matches++;
    }
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