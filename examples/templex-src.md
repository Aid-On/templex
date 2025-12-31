/Users/o6lvl4/workspace/github.com/Aid-On/aid-on-platform/packages/templex/src
├── core.ts
├── generator.ts
├── index.ts
├── mock-provider.ts
├── types.ts
└── utils.ts

/core.ts:
--------------------------------------------------------------------------------
1 | import { FractalProcessor } from '@aid-on/fractop';
2 | import { createIterator } from '@aid-on/iteratop';
3 | import type {
4 |   DocumentTemplate,
5 |   ExtractionConfig,
6 |   ExtractionOptions,
7 |   ExtractionResult,
8 |   ChunkAnalysis,
9 |   TemplateElement,
10 |   LLMProvider
11 | } from './types';
12 | 
13 | export class TemplateExtractor {
14 |   private config: Required<ExtractionConfig>;
15 |   private fractalProcessor: FractalProcessor<ChunkAnalysis>;
16 |   private lastAbstractTemplate?: any;
17 | 
18 |   constructor(config: ExtractionConfig) {
19 |     this.config = {
20 |       model: config.model || 'gpt-4',
21 |       maxDepth: config.maxDepth ?? 3,
22 |       minConfidence: config.minConfidence ?? 0.7,
23 |       extractPatterns: config.extractPatterns ?? true,
24 |       extractKeywords: config.extractKeywords ?? true,
25 |       extractMetadata: config.extractMetadata ?? true,
26 |       language: config.language ?? 'ja',
27 |       ...config
28 |     };
29 | 
30 |     this.fractalProcessor = new FractalProcessor<ChunkAnalysis>(
31 |       config.provider,
32 |       {
33 |         chunkSize: 2000,
34 |         overlapSize: 200,
35 |         maxRetries: 3,
36 |         timeout: 30000,
37 |       }
38 |     );
39 |   }
40 | 
41 |   async extract(text: string, options: ExtractionOptions = {}): Promise<ExtractionResult> {
42 |     const startTime = Date.now();
43 |     const errors: string[] = [];
44 | 
45 |     try {
46 |       // Step 1: Use FractalProcessor to analyze chunks
47 |       const chunkAnalyses = await this.analyzeChunks(text, options);
48 | 
49 |       // Step 2: Use IterationProcessor to refine template
50 |       const template = await this.refineTemplate(chunkAnalyses);
51 | 
52 |       // Step 3: Calculate confidence
53 |       const confidence = this.calculateConfidence(chunkAnalyses);
54 | 
55 |       return {
56 |         template,
57 |         confidence,
58 |         processingTime: Date.now() - startTime,
59 |         chunks: chunkAnalyses.length,
60 |         errors: errors.length > 0 ? errors : undefined
61 |       };
62 |     } catch (error) {
63 |       errors.push(error instanceof Error ? error.message : String(error));
64 |       throw new Error(`Template extraction failed: ${errors.join(', ')}`);
65 |     }
66 |   }
67 | 
68 |   private async analyzeChunks(text: string, options: ExtractionOptions): Promise<ChunkAnalysis[]> {
69 |     const prompt = this.buildAnalysisPrompt();
70 |     
71 |     const items = await this.fractalProcessor.process(text, {
72 |       generateContext: async (text: string) => 'Analyzing document structure',
73 |       processChunk: async (chunk: string, context) => {
74 |         const response = await this.config.provider.chat(
75 |           prompt,
76 |           chunk
77 |         );
78 |         return {
79 |           items: [this.parseChunkResult(response)],
80 |           summary: ''
81 |         };
82 |       },
83 |       mergeResults: (results) => ({
84 |         items: results.flat(),
85 |         needsSupplement: false
86 |       }),
87 |       getKey: (item) => JSON.stringify(item)
88 |     });
89 | 
90 |     return items;
91 |   }
92 | 
93 |   private async refineTemplate(analyses: ChunkAnalysis[]): Promise<DocumentTemplate> {
94 |     // If no analyses, return empty template
95 |     if (analyses.length === 0) {
96 |       return this.initializeTemplate();
97 |     }
98 |     
99 |     // Direct merge without iteration for simplicity
100 |     const template = await this.refineTemplateStep(
101 |       this.initializeTemplate(),
102 |       analyses
103 |     );
104 |     
105 |     return template;
106 |   }
107 |   
108 |   private async refineTemplateWithIterator(analyses: ChunkAnalysis[]): Promise<DocumentTemplate> {
109 |     interface State {
110 |       analyses: ChunkAnalysis[];
111 |       template: DocumentTemplate;
112 |       iteration: number;
113 |     }
114 | 
115 |     const iterator = createIterator<ChunkAnalysis[], State, DocumentTemplate, DocumentTemplate>({
116 |       initialize: async (input: ChunkAnalysis[]) => ({
117 |         analyses: input,
118 |         template: this.initializeTemplate(),
119 |         iteration: 0
120 |       }),
121 | 
122 |       act: async (state) => {
123 |         const refinedTemplate = await this.refineTemplateStep(
124 |           state.template,
125 |           state.analyses
126 |         );
127 |         return { data: refinedTemplate };
128 |       },
129 | 
130 |       evaluate: async (state, actionResult) => {
131 |         const score = this.evaluateTemplate(actionResult.data);
132 |         return {
133 |           score,
134 |           shouldContinue: score < this.config.minConfidence && state.iteration < 3,
135 |           feedback: this.generateFeedback(actionResult.data, score)
136 |         };
137 |       },
138 | 
139 |       transition: async (state, actionResult) => ({
140 |         ...state,
141 |         template: actionResult.data,
142 |         iteration: state.iteration + 1
143 |       }),
144 | 
145 |       finalize: async (state) => state.template
146 |     });
147 | 
148 |     const result = await iterator.run(analyses);
149 |     return result.result;
150 |   }
151 | 
152 |   private buildAnalysisPrompt(): string {
153 |     return `
154 | 文章を分析して、以下の2つを抽出してください：
155 | 
156 | 1. 文章の抽象的なテンプレート構造（エレベーターピッチ、問題解決型、ストーリーテリング型など）
157 | 2. 各セクションの具体的な内容と役割
158 | 
159 | JSON形式で出力してください：
160 | {
161 |   "abstractTemplate": {
162 |     "name": "識別されたテンプレートパターン名（例：Problem-Solution、AIDA、Hero's Journey）",
163 |     "formula": "抽象的な構成式（例：[問題提起] → [現状分析] → [解決策] → [ベネフィット] → [行動喚起]）",
164 |     "components": [
165 |       {
166 |         "name": "コンポーネント名（例：Hook、Problem Statement）",
167 |         "purpose": "このコンポーネントの目的",
168 |         "examples": ["実際の文章から抽出した例"],
169 |         "patterns": ["使用されているパターン"],
170 |         "position": 順序,
171 |         "weight": 重要度(0-1)
172 |       }
173 |     ],
174 |     "flow": "情報の流れ方（Linear/Pyramid/Circular）",
175 |     "persuasionTechniques": ["使用されている説得技法"]
176 |   },
177 |   "elements": [
178 |     {
179 |       "type": "heading"|"paragraph"|"list"|"code",
180 |       "level": 1-6,
181 |       "content": "内容要約",
182 |       "intent": "意図",
183 |       "persuasion": "訴求ポイント",
184 |       "technique": "技法"
185 |     }
186 |   ],
187 |   "keywords": ["キーワード"],
188 |   "patterns": {
189 |     "introduction": "導入パターン",
190 |     "body": "展開パターン",
191 |     "conclusion": "結論パターン"
192 |   },
193 |   "confidence": 0.0-1.0
194 | }
195 | 
196 | 重要：abstractTemplateで汎用的に再利用可能なパターンを抽出してください。
197 | `;
198 |   }
199 | 
200 |   private buildMergePrompt(): string {
201 |     return `
202 | 複数の分析結果を統合して、一貫性のあるテンプレートを作成してください。
203 | 重複を排除し、パターンを一般化してください。
204 | `;
205 |   }
206 | 
207 |   private buildSupplementPrompt(): string {
208 |     return `
209 | テンプレートの不足部分を補完し、全体の整合性を確認してください。
210 | `;
211 |   }
212 | 
213 |   private parseChunkResult(content: string): ChunkAnalysis {
214 |     try {
215 |       // Try to extract JSON from markdown code blocks if present
216 |       let jsonStr = content;
217 |       
218 |       // Try to extract from ```json blocks
219 |       const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
220 |       if (jsonMatch) {
221 |         jsonStr = jsonMatch[1];
222 |       } else {
223 |         // Try to extract raw JSON (find first { and last })
224 |         const startIdx = content.indexOf('{');
225 |         const endIdx = content.lastIndexOf('}');
226 |         if (startIdx !== -1 && endIdx !== -1) {
227 |           jsonStr = content.substring(startIdx, endIdx + 1);
228 |         }
229 |       }
230 |       
231 |       // Parse the JSON
232 |       const parsed = JSON.parse(jsonStr);
233 |       
234 |       // Extract abstract template if present
235 |       if (parsed.abstractTemplate) {
236 |         // Store it separately for later processing
237 |         this.lastAbstractTemplate = parsed.abstractTemplate;
238 |       }
239 |       
240 |       // Normalize elements if they're strings
241 |       if (parsed.elements && Array.isArray(parsed.elements)) {
242 |         parsed.elements = parsed.elements.map((el: any) => {
243 |           if (typeof el === 'string') {
244 |             // Parse string like "見出し (# Title)" or "段落 (text...)"
245 |             const typeMatch = el.match(/^(\S+)/);
246 |             const type = typeMatch ? this.normalizeElementType(typeMatch[1]) : 'paragraph';
247 |             const levelMatch = el.match(/#+(\s)/); 
248 |             const level = levelMatch ? levelMatch[0].length - 1 : undefined;
249 |             
250 |             return { type, level };
251 |           }
252 |           return el;
253 |         });
254 |       }
255 |       
256 |       return parsed;
257 |     } catch (e) {
258 |       console.error('Failed to parse LLM response:', e);
259 |       console.error('Raw content:', content.substring(0, 500));
260 |       return {
261 |         elements: [],
262 |         keywords: [],
263 |         patterns: {},
264 |         confidence: 0
265 |       };
266 |     }
267 |   }
268 |   
269 |   private normalizeElementType(jpType: string): string {
270 |     const typeMap: Record<string, string> = {
271 |       '見出し': 'heading',
272 |       '段落': 'paragraph',
273 |       'リスト': 'list',
274 |       '引用': 'quote',
275 |       'コード': 'code',
276 |       'セクション': 'section'
277 |     };
278 |     return typeMap[jpType] || jpType.toLowerCase();
279 |   }
280 | 
281 |   private initializeTemplate(): DocumentTemplate {
282 |     return {
283 |       title: 'Extracted Template',
284 |       structure: [],
285 |       metadata: {},
286 |       patterns: {},
287 |       keywords: []
288 |     };
289 |   }
290 | 
291 |   private async refineTemplateStep(
292 |     template: DocumentTemplate,
293 |     analyses: ChunkAnalysis[]
294 |   ): Promise<DocumentTemplate> {
295 |     // Merge all analysis results
296 |     const merged: DocumentTemplate = {
297 |       title: template.title || 'Document Analysis',
298 |       structure: this.mergeStructures(analyses.map(a => a.elements).flat()),
299 |       abstractTemplate: this.extractAbstractTemplate(analyses),
300 |       keywords: this.mergeKeywords(analyses),
301 |       patterns: this.mergePatterns(analyses),
302 |       metadata: this.extractMetadata(analyses)
303 |     };
304 | 
305 |     return merged;
306 |   }
307 | 
308 |   private mergeStructures(elements: TemplateElement[]): TemplateElement[] {
309 |     const merged: TemplateElement[] = [];
310 |     const seen = new Set<string>();
311 | 
312 |     for (const element of elements) {
313 |       const key = `${element.type}-${element.level || 0}`;
314 |       if (!seen.has(key)) {
315 |         seen.add(key);
316 |         merged.push(element);
317 |       }
318 |     }
319 | 
320 |     return merged;
321 |   }
322 | 
323 |   private mergeKeywords(analyses: ChunkAnalysis[]): DocumentTemplate['keywords'] {
324 |     const keywordMap = new Map<string, { weight: number; contexts: Set<string> }>();
325 | 
326 |     for (const analysis of analyses) {
327 |       for (const keyword of analysis.keywords) {
328 |         // Handle both string and object formats
329 |         let term: string;
330 |         let weight = 1;
331 |         
332 |         if (typeof keyword === 'string') {
333 |           term = keyword;
334 |         } else if (typeof keyword === 'object' && keyword !== null) {
335 |           term = (keyword as any).term || (keyword as any).keyword || String(keyword);
336 |           weight = (keyword as any).weight || 1;
337 |         } else {
338 |           continue;
339 |         }
340 |         
341 |         if (!keywordMap.has(term)) {
342 |           keywordMap.set(term, { weight: 0, contexts: new Set() });
343 |         }
344 |         const entry = keywordMap.get(term)!;
345 |         entry.weight += weight;
346 |         entry.contexts.add('general');
347 |       }
348 |     }
349 | 
350 |     return Array.from(keywordMap.entries())
351 |       .map(([term, data]) => ({
352 |         term,
353 |         weight: data.weight / analyses.length,
354 |         context: Array.from(data.contexts).join(', ')
355 |       }))
356 |       .sort((a, b) => b.weight - a.weight)
357 |       .slice(0, 20);
358 |   }
359 | 
360 |   private mergePatterns(analyses: ChunkAnalysis[]): DocumentTemplate['patterns'] {
361 |     const patterns: DocumentTemplate['patterns'] = {};
362 |     
363 |     for (const analysis of analyses) {
364 |       if (analysis.patterns && typeof analysis.patterns === 'object') {
365 |         for (const [key, value] of Object.entries(analysis.patterns)) {
366 |           // Convert to string if needed
367 |           const strValue = typeof value === 'string' ? value : JSON.stringify(value);
368 |           
369 |           // Type-safe assignment
370 |           if (key === 'introduction' || key === 'body' || key === 'conclusion') {
371 |             patterns[key] = strValue;
372 |           }
373 |         }
374 |       }
375 |     }
376 | 
377 |     return patterns;
378 |   }
379 | 
380 |   private extractMetadata(analyses: ChunkAnalysis[]): DocumentTemplate['metadata'] {
381 |     // Simple implementation - could be enhanced with LLM
382 |     return {
383 |       genre: 'article',
384 |       style: 'informative',
385 |       purpose: 'explain',
386 |       audience: 'general',
387 |       tone: 'neutral'
388 |     };
389 |   }
390 | 
391 |   private evaluateTemplate(template: DocumentTemplate): number {
392 |     let score = 0;
393 |     let factors = 0;
394 | 
395 |     if (template.structure.length > 0) {
396 |       score += 0.3;
397 |       factors += 0.3;
398 |     }
399 | 
400 |     if (template.keywords.length > 0) {
401 |       score += 0.3;
402 |       factors += 0.3;
403 |     }
404 | 
405 |     if (Object.keys(template.patterns).length > 0) {
406 |       score += 0.2;
407 |       factors += 0.2;
408 |     }
409 | 
410 |     if (Object.keys(template.metadata).length > 0) {
411 |       score += 0.2;
412 |       factors += 0.2;
413 |     }
414 | 
415 |     return factors > 0 ? score / factors : 0;
416 |   }
417 | 
418 |   private generateFeedback(template: DocumentTemplate, score: number): string {
419 |     const missing = [];
420 |     
421 |     if (template.structure.length === 0) missing.push('structure');
422 |     if (template.keywords.length === 0) missing.push('keywords');
423 |     if (Object.keys(template.patterns).length === 0) missing.push('patterns');
424 |     if (Object.keys(template.metadata).length === 0) missing.push('metadata');
425 | 
426 |     return `Score: ${score.toFixed(2)}. Missing: ${missing.join(', ') || 'none'}`;
427 |   }
428 | 
429 |   private calculateConfidence(analyses: ChunkAnalysis[]): number {
430 |     if (analyses.length === 0) return 0;
431 |     
432 |     const confidences = analyses.map(a => a.confidence);
433 |     return confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
434 |   }
435 |   
436 |   private extractAbstractTemplate(analyses: ChunkAnalysis[]): any {
437 |     // Return the last extracted abstract template if available
438 |     if (this.lastAbstractTemplate) {
439 |       return this.lastAbstractTemplate;
440 |     }
441 |     
442 |     // Fallback: try to extract from analyses
443 |     for (const analysis of analyses) {
444 |       if ((analysis as any).abstractTemplate) {
445 |         return (analysis as any).abstractTemplate;
446 |       }
447 |     }
448 |     
449 |     return undefined;
450 |   }
451 | }


/generator.ts:
--------------------------------------------------------------------------------
1 | import type { LLMProvider } from '@aid-on/unilmp';
2 | import type { AbstractTemplate } from './types';
3 | 
4 | export interface ArticleData {
5 |   topic: string;
6 |   fearHook?: string;
7 |   evidence?: string;
8 |   solution?: string;
9 |   examples?: Array<{
10 |     industry: string;
11 |     company: string;
12 |     result: string;
13 |   }>;
14 |   japanContext?: string;
15 |   urgency?: string;
16 |   cta?: string;
17 | }
18 | 
19 | export class ArticleGenerator {
20 |   private provider: LLMProvider;
21 | 
22 |   constructor(provider: LLMProvider) {
23 |     this.provider = provider;
24 |   }
25 | 
26 |   async generate(
27 |     template: AbstractTemplate,
28 |     data: ArticleData
29 |   ): Promise<string> {
30 |     const prompt = this.buildPrompt(template, data);
31 |     
32 |     const response = await this.provider.generateText({
33 |       messages: [
34 |         {
35 |           role: 'system',
36 |           content: 'あなたは説得力のある記事を書くプロのライターです。与えられたテンプレートとデータを使って、読者の心を動かす記事を生成してください。'
37 |         },
38 |         {
39 |           role: 'user',
40 |           content: prompt
41 |         }
42 |       ],
43 |       model: 'gpt-4',
44 |       temperature: 0.7,
45 |       maxTokens: 3000
46 |     });
47 | 
48 |     return response.text;
49 |   }
50 | 
51 |   private buildPrompt(template: AbstractTemplate, data: ArticleData): string {
52 |     return `
53 | 以下のテンプレート構造とデータを使って、説得力のある記事を生成してください。
54 | 
55 | ## テンプレート情報
56 | 名前: ${template.name}
57 | 構造: ${template.formula}
58 | 
59 | ## コンポーネント詳細
60 | ${template.components.map(c => `
61 | - ${c.name}
62 |   目的: ${c.purpose}
63 |   重要度: ${c.weight}
64 |   パターン例: ${c.patterns.join(', ')}
65 | `).join('')}
66 | 
67 | ## 記事データ
68 | トピック: ${data.topic}
69 | ${data.fearHook ? `恐怖フック: ${data.fearHook}` : ''}
70 | ${data.evidence ? `証拠/事例: ${data.evidence}` : ''}
71 | ${data.solution ? `解決策: ${data.solution}` : ''}
72 | ${data.examples ? `
73 | 業界別事例:
74 | ${data.examples.map(e => `- ${e.industry}: ${e.company} - ${e.result}`).join('\n')}
75 | ` : ''}
76 | ${data.japanContext ? `日本の文脈: ${data.japanContext}` : ''}
77 | ${data.urgency ? `緊急性: ${data.urgency}` : ''}
78 | ${data.cta ? `CTA: ${data.cta}` : ''}
79 | 
80 | ## 生成ルール
81 | 1. マークダウン形式で出力
82 | 2. 見出しは階層的に構成
83 | 3. 具体的な数値を含める
84 | 4. 感情に訴える表現を使う
85 | 5. 読者が行動したくなるように書く
86 | 6. テンプレートの構造を厳密に守る
87 | 
88 | 記事を生成してください：
89 | `;
90 |   }
91 | 
92 |   async generateFromPattern(
93 |     patternName: string,
94 |     data: ArticleData
95 |   ): Promise<string> {
96 |     // プリセットパターンから生成
97 |     const patterns: Record<string, AbstractTemplate> = {
98 |       'fear-driven': {
99 |         name: 'Fear-Driven Persuasion',
100 |         formula: '[恐怖フック] + [身近な例証] + [簡単な解説] + [業界別実例] + [段階的行動] + [緊急性強調]',
101 |         components: [
102 |           {
103 |             name: '恐怖フック',
104 |             purpose: '読者の現状への危機感を煽る',
105 |             examples: ['あなたの〇〇は本当に〇〇ですか？'],
106 |             patterns: ['疑問形', '警告形'],
107 |             position: 1,
108 |             weight: 0.25
109 |           },
110 |           {
111 |             name: '身近な例証',
112 |             purpose: '実例で恐怖を裏付ける',
113 |             examples: ['個人の成功/失敗ストーリー'],
114 |             patterns: ['個人ストーリー', '企業事例'],
115 |             position: 2,
116 |             weight: 0.20
117 |           },
118 |           {
119 |             name: '簡単な解説',
120 |             purpose: '複雑な技術を分かりやすく',
121 |             examples: ['〇〇は「〇〇」だと思ってください'],
122 |             patterns: ['メタファー', '箇条書き'],
123 |             position: 3,
124 |             weight: 0.15
125 |           },
126 |           {
127 |             name: '業界別実例',
128 |             purpose: '具体的な成功事例を示す',
129 |             examples: ['業界名 + 企業名 + 数値成果'],
130 |             patterns: ['3業界展開', '数値強調'],
131 |             position: 4,
132 |             weight: 0.20
133 |           },
134 |           {
135 |             name: '段階的行動',
136 |             purpose: 'すぐ始められるステップを提示',
137 |             examples: ['Step1: 5分で完了'],
138 |             patterns: ['3段階', '投資額明示'],
139 |             position: 5,
140 |             weight: 0.10
141 |           },
142 |           {
143 |             name: '緊急性強調',
144 |             purpose: '今すぐ行動する理由を提供',
145 |             examples: ['今なら〇〇'],
146 |             patterns: ['時限メリット', '未来予測'],
147 |             position: 6,
148 |             weight: 0.10
149 |           }
150 |         ],
151 |         persuasionTechniques: ['損失回避', '社会的証明', '権威性', '希少性'],
152 |         keywords: []
153 |       },
154 |       'problem-solution': {
155 |         name: 'Problem-Solution Framework',
156 |         formula: '[問題提起] + [深刻性強調] + [解決策提示] + [実装方法] + [成果予測]',
157 |         components: [
158 |           {
159 |             name: '問題提起',
160 |             purpose: '読者が抱える問題を明確化',
161 |             examples: ['〇〇で困っていませんか？'],
162 |             patterns: ['共感型', '統計型'],
163 |             position: 1,
164 |             weight: 0.20
165 |           },
166 |           {
167 |             name: '深刻性強調',
168 |             purpose: '問題を放置するリスクを示す',
169 |             examples: ['このままだと〇〇になります'],
170 |             patterns: ['将来予測', '比較'],
171 |             position: 2,
172 |             weight: 0.20
173 |           },
174 |           {
175 |             name: '解決策提示',
176 |             purpose: '具体的な解決方法を提案',
177 |             examples: ['〇〇を使えば解決できます'],
178 |             patterns: ['ツール紹介', 'メソッド紹介'],
179 |             position: 3,
180 |             weight: 0.30
181 |           },
182 |           {
183 |             name: '実装方法',
184 |             purpose: '具体的な手順を説明',
185 |             examples: ['3つのステップで実現'],
186 |             patterns: ['段階的', 'チェックリスト'],
187 |             position: 4,
188 |             weight: 0.20
189 |           },
190 |           {
191 |             name: '成果予測',
192 |             purpose: '実行後の成果を描く',
193 |             examples: ['〇〇が実現します'],
194 |             patterns: ['数値予測', 'ビフォーアフター'],
195 |             position: 5,
196 |             weight: 0.10
197 |           }
198 |         ],
199 |         persuasionTechniques: ['論理的説得', '実績提示', '段階的誘導'],
200 |         keywords: []
201 |       }
202 |     };
203 | 
204 |     const template = patterns[patternName];
205 |     if (!template) {
206 |       throw new Error(`Unknown pattern: ${patternName}`);
207 |     }
208 | 
209 |     return this.generate(template, data);
210 |   }
211 | }


/index.ts:
--------------------------------------------------------------------------------
1 | /**
2 |  * Templex - Template Extractor
3 |  * 
4 |  * A library for extracting abstract templates and document structures from text.
5 |  * Uses FractoP for chunking, IteratoP for iterative refinement, and UniLMP for LLM processing.
6 |  * 
7 |  * @example
8 |  * ```typescript
9 |  * import { TemplateExtractor } from '@aid-on/templex';
10 |  * import { createOpenAIProvider } from '@aid-on/unilmp';
11 |  * 
12 |  * const extractor = new TemplateExtractor({
13 |  *   provider: createOpenAIProvider({ apiKey: 'xxx' }),
14 |  *   model: 'gpt-4',
15 |  *   extractPatterns: true,
16 |  *   extractKeywords: true
17 |  * });
18 |  * 
19 |  * const result = await extractor.extract(articleText);
20 |  * console.log(formatTemplate(result.template));
21 |  * ```
22 |  */
23 | 
24 | // Core
25 | export { TemplateExtractor } from './core';
26 | export { ArticleGenerator } from './generator';
27 | 
28 | // Types
29 | export type {
30 |   TemplateElement,
31 |   DocumentTemplate,
32 |   ExtractionConfig,
33 |   ExtractionOptions,
34 |   ExtractionResult,
35 |   ChunkAnalysis,
36 |   AbstractTemplate,
37 | } from './types';
38 | 
39 | export type { ArticleData } from './generator';
40 | 
41 | // Utilities
42 | export {
43 |   formatTemplate,
44 |   mergeTemplates,
45 |   simplifyTemplate,
46 |   compareTemplates,
47 | } from './utils';


/mock-provider.ts:
--------------------------------------------------------------------------------
1 | import type { LLMProvider, GenerateTextOptions, GenerateTextResult } from '@aid-on/unilmp';
2 | 
3 | export class MockLLMProvider implements LLMProvider {
4 |   async generateText(options: GenerateTextOptions): Promise<GenerateTextResult> {
5 |     // 記事生成用のモックレスポンス
6 |     if (options.messages.some(m => m.content.includes('記事を生成'))) {
7 |       const userMessage = options.messages.find(m => m.role === 'user');
8 |       const topicMatch = userMessage?.content.match(/トピック: (.+)/);
9 |       const topic = topicMatch?.[1] || 'テクノロジー';
10 |       
11 |       return {
12 |         text: `# ${topic}が日本のビジネスを根本から変える日
13 | 
14 | ## あなたの会社の${topic}戦略、本当に大丈夫ですか？
15 | 
16 | 昨年、ある大手企業が突然の業績悪化に見舞われました。理由は単純です。競合他社が${topic}を導入し、業務効率を3倍に高めていたからです。
17 | 
18 | この話、他人事だと思いますか？
19 | 
20 | ## ${topic}とは「ビジネスの新しいOS」だと思ってください
21 | 
22 | 難しく考える必要はありません。${topic}は、以下のような「革新的なシステム」です：
23 | 
24 | - **従来の10倍の速度で処理が可能**
25 | - **コストは3分の1に削減**
26 | - **24時間365日稼働し続ける**
27 | - **人的エラーをゼロに近づける**
28 | 
29 | たとえば、これまで1週間かかっていた業務が、${topic}を導入すれば1日で完了します。しかも、品質は向上し、コストは大幅に削減されます。
30 | 
31 | ## 「うちの業界には関係ない」は、もはや通用しない
32 | 
33 | ### IT業界の場合
34 | 大手テック企業「イノベーション社」は、${topic}導入により開発速度を5倍に向上。年間10億円のコスト削減に成功しました。
35 | 
36 | ### 製造業の場合
37 | 中堅メーカー「プロダクション社」は、${topic}で生産ラインを最適化。不良品率を95%削減し、利益率が2倍になりました。
38 | 
39 | ### サービス業の場合  
40 | サービス企業「カスタマー社」は、${topic}で顧客対応を自動化。顧客満足度が45%向上し、売上が1.8倍に成長しました。
41 | 
42 | ## 今すぐできる、3つの${topic}導入ステップ
43 | 
44 | ### ステップ1：小規模なパイロットプロジェクト（投資額：50万円〜）
45 | - 一部門での試験導入
46 | - 効果測定とフィードバック収集
47 | - 成功事例の社内共有
48 | 
49 | ### ステップ2：部門横断的な展開（投資額：500万円〜）
50 | - 複数部門での本格導入
51 | - プロセスの標準化
52 | - 従業員トレーニングの実施
53 | 
54 | ### ステップ3：全社的な変革（投資額：要相談）
55 | - 企業文化の変革
56 | - ビジネスモデルの再構築
57 | - 新たな収益源の創出
58 | 
59 | ## もう待てない。今が決断の時
60 | 
61 | 6ヶ月後、${topic}を導入している企業と、していない企業の差は取り返しがつかないほど広がります。
62 | 
63 | かつてデジタル化を「様子見」した企業がどうなったか、覚えていますか？
64 | 
65 | **今なら、経済産業省のDX推進補助金で最大1000万円の支援が受けられます。**
66 | 
67 | 私たちは、500社以上の${topic}導入を支援してきました。
68 | まずは無料診断から始めませんか？
69 | 
70 | ---
71 | 
72 | [無料診断を申し込む]
73 | 
74 | *⚡ ${topic}で、あなたのビジネスに革命を。*`,
75 |         usage: { promptTokens: 100, completionTokens: 500, totalTokens: 600 }
76 |       };
77 |     }
78 |     
79 |     // デフォルトのモックレスポンス
80 |     return {
81 |       text: 'Mock response for: ' + options.messages[0].content.slice(0, 50),
82 |       usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }
83 |     };
84 |   }
85 | 
86 |   async *generateTextStream(options: GenerateTextOptions): AsyncGenerator<string> {
87 |     const result = await this.generateText(options);
88 |     yield result.text;
89 |   }
90 | }


/types.ts:
--------------------------------------------------------------------------------
1 | export interface LLMProvider {
2 |   chat(
3 |     systemPrompt: string,
4 |     userPrompt: string,
5 |     options?: {
6 |       temperature?: number;
7 |       maxTokens?: number;
8 |     }
9 |   ): Promise<string>;
10 | }
11 | 
12 | export interface TemplateElement {
13 |   type: 'heading' | 'paragraph' | 'list' | 'quote' | 'code' | 'section';
14 |   level?: number;
15 |   content?: string;  // 実際の内容の要約
16 |   intent?: string;   // このセクションの意図・役割
17 |   persuasion?: string;  // 訴求ポイント
18 |   technique?: string;   // 使われている文章技法
19 |   keywords?: string[];  // このセクション特有のキーワード
20 |   transition?: string;  // 前後との繋がり
21 |   children?: TemplateElement[];
22 | }
23 | 
24 | export interface AbstractTemplate {
25 |   name: string;  // e.g., "Elevator Pitch", "Problem-Solution", "Hero's Journey"
26 |   formula: string;  // e.g., "[Hook] + [Problem] + [Solution] + [Value] + [Call to Action]"
27 |   components: Array<{
28 |     name: string;  // e.g., "Hook", "Problem Statement"
29 |     purpose: string;  // e.g., "Grab attention in 5 seconds"
30 |     examples: string[];  // Actual examples from the text
31 |     patterns: string[];  // Common patterns used
32 |     position: number;  // Order in the formula
33 |     weight: number;  // Importance (0-1)
34 |   }>;
35 |   flow: string;  // e.g., "Linear", "Circular", "Pyramid"
36 |   persuasionTechniques: string[];  // e.g., "Social Proof", "Urgency", "Authority"
37 | }
38 | 
39 | export interface DocumentTemplate {
40 |   title: string;
41 |   structure: TemplateElement[];
42 |   abstractTemplate?: AbstractTemplate;  // The extracted abstract pattern
43 |   metadata: {
44 |     genre?: string;
45 |     style?: string;
46 |     purpose?: string;
47 |     audience?: string;
48 |     tone?: string;
49 |   };
50 |   patterns: {
51 |     introduction?: string;
52 |     body?: string;
53 |     conclusion?: string;
54 |   };
55 |   keywords: Array<{
56 |     term: string;
57 |     weight: number;
58 |     context: string;
59 |   }>;
60 | }
61 | 
62 | export interface ExtractionConfig {
63 |   provider: LLMProvider;
64 |   model?: string;
65 |   maxDepth?: number;
66 |   minConfidence?: number;
67 |   extractPatterns?: boolean;
68 |   extractKeywords?: boolean;
69 |   extractMetadata?: boolean;
70 |   language?: string;
71 | }
72 | 
73 | export interface ExtractionOptions {
74 |   chunkSize?: number;
75 |   overlapRatio?: number;
76 |   timeout?: number;
77 |   retries?: number;
78 |   verbose?: boolean;
79 | }
80 | 
81 | export interface ExtractionResult {
82 |   template: DocumentTemplate;
83 |   confidence: number;
84 |   processingTime: number;
85 |   chunks: number;
86 |   errors?: string[];
87 | }
88 | 
89 | export interface ChunkAnalysis {
90 |   elements: TemplateElement[];
91 |   keywords: string[];
92 |   patterns: Record<string, string>;
93 |   confidence: number;
94 | }


/utils.ts:
--------------------------------------------------------------------------------
1 | import type { DocumentTemplate, TemplateElement } from './types';
2 | 
3 | export function formatTemplate(template: DocumentTemplate): string {
4 |   const lines: string[] = [];
5 |   
6 |   lines.push(`# ${template.title || 'Document Template'}`);
7 |   lines.push('');
8 |   
9 |   // Display abstract template if available
10 |   if (template.abstractTemplate) {
11 |     lines.push('## 🎯 Abstract Template Pattern');
12 |     lines.push('');
13 |     lines.push(`**Pattern Type**: ${template.abstractTemplate.name}`);
14 |     lines.push('');
15 |     lines.push(`**Formula**: \`${template.abstractTemplate.formula}\``);
16 |     lines.push('');
17 |     
18 |     if (template.abstractTemplate.components && template.abstractTemplate.components.length > 0) {
19 |       lines.push('### Components:');
20 |       for (const comp of template.abstractTemplate.components) {
21 |         lines.push(`**${comp.position || 1}. ${comp.name}**`);
22 |         lines.push(`- Purpose: ${comp.purpose}`);
23 |         if (comp.examples && comp.examples.length > 0) {
24 |           lines.push(`- Example: "${comp.examples[0]}"`);
25 |         }
26 |         if (comp.patterns && comp.patterns.length > 0) {
27 |           lines.push(`- Pattern: ${comp.patterns.join(', ')}`);
28 |         }
29 |         lines.push(`- Weight: ${(comp.weight * 100).toFixed(0)}%`);
30 |         lines.push('');
31 |       }
32 |     }
33 |     
34 |     if (template.abstractTemplate.flow) {
35 |       lines.push(`**Information Flow**: ${template.abstractTemplate.flow}`);
36 |     }
37 |     
38 |     if (template.abstractTemplate.persuasionTechniques && template.abstractTemplate.persuasionTechniques.length > 0) {
39 |       lines.push(`**Persuasion Techniques**: ${template.abstractTemplate.persuasionTechniques.join(', ')}`);
40 |     }
41 |     
42 |     lines.push('');
43 |     lines.push('━'.repeat(60));
44 |     lines.push('');
45 |   }
46 |   
47 |   if (Object.keys(template.metadata).length > 0) {
48 |     lines.push('## Metadata');
49 |     for (const [key, value] of Object.entries(template.metadata)) {
50 |       lines.push(`- ${key}: ${value}`);
51 |     }
52 |     lines.push('');
53 |   }
54 |   
55 |   if (template.structure.length > 0) {
56 |     lines.push('## Structure');
57 |     lines.push(...formatStructure(template.structure));
58 |     lines.push('');
59 |   }
60 |   
61 |   if (Object.keys(template.patterns).length > 0) {
62 |     lines.push('## Patterns');
63 |     for (const [key, value] of Object.entries(template.patterns)) {
64 |       lines.push(`### ${key}`);
65 |       lines.push(value);
66 |       lines.push('');
67 |     }
68 |   }
69 |   
70 |   if (template.keywords.length > 0) {
71 |     lines.push('## Keywords');
72 |     for (const keyword of template.keywords.slice(0, 10)) {
73 |       lines.push(`- ${keyword.term} (weight: ${keyword.weight.toFixed(2)})`);
74 |     }
75 |     lines.push('');
76 |   }
77 |   
78 |   return lines.join('\n');
79 | }
80 | 
81 | function formatStructure(elements: TemplateElement[], indent = 0): string[] {
82 |   const lines: string[] = [];
83 |   const prefix = '  '.repeat(indent);
84 |   
85 |   for (const element of elements) {
86 |     lines.push(`${prefix}- **${element.type}${element.level ? ` (H${element.level})` : ''}**`);
87 |     
88 |     if (element.content) {
89 |       lines.push(`${prefix}  📝 ${element.content}`);
90 |     }
91 |     
92 |     if (element.intent) {
93 |       lines.push(`${prefix}  🎯 意図: ${element.intent}`);
94 |     }
95 |     
96 |     if (element.persuasion) {
97 |       lines.push(`${prefix}  💡 訴求: ${element.persuasion}`);
98 |     }
99 |     
100 |     if (element.technique) {
101 |       lines.push(`${prefix}  🔨 技法: ${element.technique}`);
102 |     }
103 |     
104 |     if (element.transition) {
105 |       lines.push(`${prefix}  🔗 遷移: ${element.transition}`);
106 |     }
107 |     
108 |     lines.push(''); // 空行を追加
109 |     
110 |     if (element.children && element.children.length > 0) {
111 |       lines.push(...formatStructure(element.children, indent + 1));
112 |     }
113 |   }
114 |   
115 |   return lines;
116 | }
117 | 
118 | export function mergeTemplates(templates: DocumentTemplate[]): DocumentTemplate {
119 |   if (templates.length === 0) {
120 |     throw new Error('No templates to merge');
121 |   }
122 |   
123 |   if (templates.length === 1) {
124 |     return templates[0];
125 |   }
126 |   
127 |   const merged: DocumentTemplate = {
128 |     title: templates[0].title,
129 |     structure: [],
130 |     metadata: {},
131 |     patterns: {},
132 |     keywords: []
133 |   };
134 |   
135 |   // Merge structures
136 |   const allStructures = templates.flatMap(t => t.structure);
137 |   merged.structure = deduplicateElements(allStructures);
138 |   
139 |   // Merge metadata
140 |   for (const template of templates) {
141 |     Object.assign(merged.metadata, template.metadata);
142 |   }
143 |   
144 |   // Merge patterns
145 |   for (const template of templates) {
146 |     Object.assign(merged.patterns, template.patterns);
147 |   }
148 |   
149 |   // Merge and deduplicate keywords
150 |   const keywordMap = new Map<string, { weight: number; context: string }>();
151 |   for (const template of templates) {
152 |     for (const keyword of template.keywords) {
153 |       const existing = keywordMap.get(keyword.term);
154 |       if (!existing || existing.weight < keyword.weight) {
155 |         keywordMap.set(keyword.term, keyword);
156 |       }
157 |     }
158 |   }
159 |   merged.keywords = Array.from(keywordMap.entries())
160 |     .map(([term, data]) => ({
161 |       term,
162 |       weight: data.weight,
163 |       context: data.context
164 |     }))
165 |     .sort((a, b) => b.weight - a.weight);
166 |   
167 |   return merged;
168 | }
169 | 
170 | function deduplicateElements(elements: TemplateElement[]): TemplateElement[] {
171 |   const seen = new Map<string, TemplateElement>();
172 |   
173 |   for (const element of elements) {
174 |     const key = `${element.type}-${element.level || 0}-${element.content || ''}`;
175 |     if (!seen.has(key)) {
176 |       seen.set(key, element);
177 |     }
178 |   }
179 |   
180 |   return Array.from(seen.values());
181 | }
182 | 
183 | export function simplifyTemplate(template: DocumentTemplate): DocumentTemplate {
184 |   return {
185 |     ...template,
186 |     structure: simplifyStructure(template.structure),
187 |     keywords: template.keywords.slice(0, 10)
188 |   };
189 | }
190 | 
191 | function simplifyStructure(elements: TemplateElement[]): TemplateElement[] {
192 |   return elements.map(element => ({
193 |     type: element.type,
194 |     level: element.level,
195 |     intent: element.intent,
196 |     children: element.children ? simplifyStructure(element.children) : undefined
197 |   }));
198 | }
199 | 
200 | export function compareTemplates(a: DocumentTemplate, b: DocumentTemplate): number {
201 |   let similarity = 0;
202 |   let factors = 0;
203 |   
204 |   // Compare structures
205 |   const structSimilarity = compareStructures(a.structure, b.structure);
206 |   similarity += structSimilarity * 0.4;
207 |   factors += 0.4;
208 |   
209 |   // Compare keywords
210 |   const keywordSimilarity = compareKeywords(a.keywords, b.keywords);
211 |   similarity += keywordSimilarity * 0.3;
212 |   factors += 0.3;
213 |   
214 |   // Compare metadata
215 |   const metadataSimilarity = compareMetadata(a.metadata, b.metadata);
216 |   similarity += metadataSimilarity * 0.15;
217 |   factors += 0.15;
218 |   
219 |   // Compare patterns
220 |   const patternSimilarity = comparePatterns(a.patterns, b.patterns);
221 |   similarity += patternSimilarity * 0.15;
222 |   factors += 0.15;
223 |   
224 |   return factors > 0 ? similarity / factors : 0;
225 | }
226 | 
227 | function compareStructures(a: TemplateElement[], b: TemplateElement[]): number {
228 |   if (a.length === 0 || b.length === 0) return 0;
229 |   
230 |   const aTypes = new Set(a.map(e => e.type));
231 |   const bTypes = new Set(b.map(e => e.type));
232 |   const intersection = new Set([...aTypes].filter(x => bTypes.has(x)));
233 |   const union = new Set([...aTypes, ...bTypes]);
234 |   
235 |   return intersection.size / union.size;
236 | }
237 | 
238 | function compareKeywords(
239 |   a: Array<{ term: string; weight: number }>,
240 |   b: Array<{ term: string; weight: number }>
241 | ): number {
242 |   if (a.length === 0 || b.length === 0) return 0;
243 |   
244 |   const aTerms = new Set(a.map(k => k.term));
245 |   const bTerms = new Set(b.map(k => k.term));
246 |   const intersection = new Set([...aTerms].filter(x => bTerms.has(x)));
247 |   const union = new Set([...aTerms, ...bTerms]);
248 |   
249 |   return intersection.size / union.size;
250 | }
251 | 
252 | function compareMetadata(
253 |   a: DocumentTemplate['metadata'],
254 |   b: DocumentTemplate['metadata']
255 | ): number {
256 |   const aKeys = Object.keys(a);
257 |   const bKeys = Object.keys(b);
258 |   
259 |   if (aKeys.length === 0 || bKeys.length === 0) return 0;
260 |   
261 |   let matches = 0;
262 |   for (const key of aKeys) {
263 |     if (key in b && (a as any)[key] === (b as any)[key]) {
264 |       matches++;
265 |     }
266 |   }
267 |   
268 |   return matches / Math.max(aKeys.length, bKeys.length);
269 | }
270 | 
271 | function comparePatterns(
272 |   a: DocumentTemplate['patterns'],
273 |   b: DocumentTemplate['patterns']
274 | ): number {
275 |   const aKeys = Object.keys(a);
276 |   const bKeys = Object.keys(b);
277 |   
278 |   if (aKeys.length === 0 || bKeys.length === 0) return 0;
279 |   
280 |   const intersection = aKeys.filter(k => bKeys.includes(k));
281 |   const union = new Set([...aKeys, ...bKeys]);
282 |   
283 |   return intersection.length / union.size;
284 | }

