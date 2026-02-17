/**
 * Template refinement helpers for TemplateExtractor
 * Extracted from core.ts to keep file size under 300 lines
 */

import { createIterator } from '@aid-on/iteratop';
import type {
  DocumentTemplate,
  AbstractTemplate,
  ChunkAnalysis,
  ExtractionConfig,
  ExtractionOptions,
} from './types.js';
import {
  mergeAnalysisKeywords,
  mergeAnalysisPatterns,
  calculateConfidence,
} from './core-analysis.js';

/**
 * Context shared between refinement functions
 */
export interface RefinementContext {
  config: Required<ExtractionConfig>;
  lastAbstractTemplate?: AbstractTemplate;
}

/**
 * Refine template from analyses, choosing single-pass or iterative approach
 */
export async function refineTemplate(
  ctx: RefinementContext,
  analyses: ChunkAnalysis[],
  _options?: ExtractionOptions
): Promise<DocumentTemplate> {
  if (analyses.length === 0) {
    return initializeTemplate();
  }

  const shouldUseIterative =
    (ctx.config.maxDepth && ctx.config.maxDepth > 1) ||
    ctx.config.useIterativeRefinement === true;

  if (shouldUseIterative && analyses.length > 1) {
    return refineTemplateWithIterator(ctx, analyses);
  }

  return refineTemplateStep(ctx, initializeTemplate(), analyses);
}

/**
 * Iterative template refinement using createIterator
 */
async function refineTemplateWithIterator(
  ctx: RefinementContext,
  analyses: ChunkAnalysis[]
): Promise<DocumentTemplate> {
  interface State {
    analyses: ChunkAnalysis[];
    template: DocumentTemplate;
    iteration: number;
  }

  const iterator = createIterator<ChunkAnalysis[], State, DocumentTemplate, DocumentTemplate>({
    initialize: async (input: ChunkAnalysis[]) => ({
      analyses: input,
      template: initializeTemplate(),
      iteration: 0
    }),

    act: async (state: State) => {
      const refinedTemplate = await refineTemplateStep(
        ctx,
        state.template,
        state.analyses
      );
      return { data: refinedTemplate };
    },

    evaluate: async (state: State, actionResult: { data: DocumentTemplate }) => {
      const score = evaluateTemplate(actionResult.data, state.analyses);
      return {
        score,
        shouldContinue: score < ctx.config.minConfidence && state.iteration < 3,
        feedback: generateFeedback(actionResult.data, score)
      };
    },

    transition: async (state: State, actionResult: { data: DocumentTemplate }) => ({
      ...state,
      template: actionResult.data,
      iteration: state.iteration + 1
    }),

    finalize: async (state: State) => state.template
  });

  const result = await iterator.run(analyses);
  return result.result;
}

/**
 * Single-step template refinement
 */
async function refineTemplateStep(
  ctx: RefinementContext,
  template: DocumentTemplate,
  analyses: ChunkAnalysis[]
): Promise<DocumentTemplate> {
  const primaryAnalysis = analyses[0] || {};

  const merged: DocumentTemplate = {
    title: template.title || 'Document Analysis',
    structure: primaryAnalysis.elements || [],
    abstractTemplate: extractAbstractTemplate(ctx, analyses),
    keywords: analyses.length > 0 ? mergeAnalysisKeywords(analyses) : [],
    patterns: primaryAnalysis.patterns || {},
    metadata: extractMetadata()
  };

  return merged;
}

/**
 * Initialize an empty template
 */
export function initializeTemplate(): DocumentTemplate {
  return {
    title: 'Extracted Template',
    structure: [],
    metadata: {},
    patterns: {},
    keywords: []
  };
}

/**
 * Evaluate template quality with heuristic scoring
 */
export function evaluateTemplate(
  template: DocumentTemplate,
  analyses?: ChunkAnalysis[]
): number {
  let heuristicScore = 0;
  let factors = 0;

  if (template.structure.length > 0) {
    heuristicScore += 0.3;
    factors += 0.3;
  }

  if (template.keywords.length > 0) {
    heuristicScore += 0.3;
    factors += 0.3;
  }

  if (Object.keys(template.patterns).length > 0) {
    heuristicScore += 0.2;
    factors += 0.2;
  }

  if (Object.keys(template.metadata).length > 0) {
    heuristicScore += 0.2;
    factors += 0.2;
  }

  const normalizedHeuristic = factors > 0 ? heuristicScore / factors : 0;

  if (analyses && analyses.length > 0) {
    const avgConfidence = calculateConfidence(analyses);
    return (normalizedHeuristic * 0.6) + (avgConfidence * 0.4);
  }

  return normalizedHeuristic;
}

/**
 * Generate feedback string for iterative refinement
 */
export function generateFeedback(
  template: DocumentTemplate,
  score: number
): string {
  const missing = [];

  if (template.structure.length === 0) missing.push('structure');
  if (template.keywords.length === 0) missing.push('keywords');
  if (Object.keys(template.patterns).length === 0) missing.push('patterns');
  if (Object.keys(template.metadata).length === 0) missing.push('metadata');

  return `Score: ${score.toFixed(2)}. Missing: ${missing.join(', ') || 'none'}`;
}

/**
 * Extract abstract template from analyses
 */
function extractAbstractTemplate(
  ctx: RefinementContext,
  analyses: ChunkAnalysis[]
): AbstractTemplate | undefined {
  if (ctx.lastAbstractTemplate) {
    return ctx.lastAbstractTemplate;
  }

  for (const analysis of analyses) {
    if (analysis.abstractTemplate) {
      return analysis.abstractTemplate;
    }
  }

  return undefined;
}

/**
 * Extract metadata from analyses
 */
function extractMetadata(): DocumentTemplate['metadata'] {
  return {
    genre: 'article',
    style: 'informative',
    purpose: 'explain',
    audience: 'general',
    tone: 'neutral'
  };
}
