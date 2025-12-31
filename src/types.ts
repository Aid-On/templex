// LLMProvider interface for extractor
export interface LLMProvider {
  chat(
    systemPrompt: string,
    userPrompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string>;
}

export interface TemplateElement {
  type: 'heading' | 'paragraph' | 'list' | 'quote' | 'code' | 'section';
  level?: number;
  content?: string;  // 実際の内容の要約
  intent?: string;   // このセクションの意図・役割
  persuasion?: string;  // 訴求ポイント
  technique?: string;   // 使われている文章技法
  keywords?: string[];  // このセクション特有のキーワード
  transition?: string;  // 前後との繋がり
  children?: TemplateElement[];
}

export interface AbstractTemplate {
  name: string;  // e.g., "Elevator Pitch", "Problem-Solution", "Hero's Journey"
  formula: string;  // e.g., "[Hook] + [Problem] + [Solution] + [Value] + [Call to Action]"
  components: Array<{
    name: string;  // e.g., "Hook", "Problem Statement"
    purpose: string;  // e.g., "Grab attention in 5 seconds"
    examples: string[];  // Actual examples from the text
    patterns: string[];  // Common patterns used
    position: number;  // Order in the formula
    weight: number;  // Importance (0-1)
  }>;
  flow: string;  // e.g., "Linear", "Circular", "Pyramid"
  persuasionTechniques: string[];  // e.g., "Social Proof", "Urgency", "Authority"
}

export interface DocumentTemplate {
  title: string;
  structure: TemplateElement[];
  abstractTemplate?: AbstractTemplate;  // The extracted abstract pattern
  metadata: {
    genre?: string;
    style?: string;
    purpose?: string;
    audience?: string;
    tone?: string;
  };
  patterns: {
    introduction?: string;
    body?: string;
    conclusion?: string;
  };
  keywords: Array<{
    term: string;
    weight: number;
    context: string;
  }>;
}

export interface ExtractionConfig {
  provider: LLMProvider;
  model?: string;
  maxDepth?: number;
  minConfidence?: number;
  extractPatterns?: boolean;
  extractKeywords?: boolean;
  extractMetadata?: boolean;
  language?: string;
  useIterativeRefinement?: boolean;  // 反復的改善を使用するか
}

export interface ProgressInfo {
  phase: 'chunking' | 'analyzing' | 'refining' | 'finalizing';
  current: number;
  total: number;
  message?: string;
}

export type ProgressCallback = (progress: ProgressInfo) => void;

export interface ExtractionOptions {
  chunkSize?: number;
  overlapRatio?: number;
  timeout?: number;
  retries?: number;
  verbose?: boolean;
  onProgress?: ProgressCallback;
}

export interface ExtractionResult {
  template: DocumentTemplate;
  confidence: number;
  processingTime: number;
  chunks: number;
  errors?: string[];
}

export interface ChunkAnalysis {
  elements: TemplateElement[];
  keywords: string[] | Array<{term: string; weight: number}>;
  patterns: Record<string, string>;
  confidence: number;
}