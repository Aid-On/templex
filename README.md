# @aid-on/templex

Extract reusable writing templates from any text using AI, then generate new content with those patterns.

## What is Templex?

Templex analyzes articles, blog posts, or any text to identify their underlying structure and persuasion techniques. It extracts these patterns as reusable templates that you can use to generate similar content on different topics.

Think of it as "learning the recipe" from existing content, not just copying it.

## Features

- **Template Extraction** - Identifies document structure, flow patterns, and rhetorical techniques
- **Pattern Recognition** - Detects persuasion methods like problem-solution, storytelling, or comparison formats  
- **Content Generation** - Creates new articles using extracted templates with your own topics and data
- **Multi-Language** - Supports both English and Japanese prompts
- **Progress Tracking** - Real-time updates during extraction process
- **Flexible Integration** - Works with multiple LLM providers via [@aid-on/unillm](https://www.npmjs.com/package/@aid-on/unillm)

## Installation

```bash
npm install @aid-on/templex
```

## Quick Start

### 1. Extract a template from existing content

```typescript
import { TemplateExtractor } from '@aid-on/templex';
import { generate } from '@aid-on/unillm';

// Create an LLM provider
const provider = {
  chat: async (systemPrompt, userPrompt) => {
    const result = await generate('gemini:gemini-2.0-flash', [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], {
      geminiApiKey: process.env.GEMINI_API_KEY
    });
    return result.text;
  }
};

// Extract template from an article
const extractor = new TemplateExtractor({
  provider,
  language: 'en',
  extractPatterns: true,
  extractKeywords: true
});

const article = `
# Why Every Business Needs AI Now

Did you know that 70% of businesses are losing money to inefficiency?

## The Problem
Manual processes are killing productivity...

## The Solution  
AI automation can transform your operations...

## Take Action
Start your free trial today!
`;

const result = await extractor.extract(article);
console.log('Extracted template:', result.template);
console.log('Confidence:', result.confidence);
```

### 2. Generate new content with the template

```typescript
import { ArticleGenerator } from '@aid-on/templex';

const generator = new ArticleGenerator('gemini:gemini-2.0-flash', {
  apiKeys: { geminiApiKey: process.env.GEMINI_API_KEY }
});

// Use the extracted template to generate new content
const newArticle = await generator.generate(
  result.template.abstractTemplate,
  {
    topic: 'Cloud Migration',
    fearHook: 'Is your on-premise infrastructure draining your budget?',
    solution: 'Cloud services that scale with your needs',
    cta: 'Get a free cloud assessment'
  }
);

console.log(newArticle);
```

## Template Patterns

Templex recognizes common content patterns:

### Problem-Solution
```typescript
const article = await generator.generateFromPattern('problem-solution', {
  topic: 'Remote Work Productivity',
  problem: 'Teams struggling with collaboration',  
  solution: 'Integrated communication platform',
  benefits: ['30% faster decisions', 'Better work-life balance']
});
```

### Fear-Driven Persuasion
```typescript
const article = await generator.generateFromPattern('fear-driven', {
  topic: 'Cybersecurity',
  fearHook: 'Your data could be stolen right now',
  evidence: 'Cyber attacks increased 40% this year',
  solution: 'AI-powered threat detection',
  urgency: 'Limited time offer - 50% off setup'
});
```

## API Reference

### TemplateExtractor

Extracts templates from text.

```typescript
new TemplateExtractor(config: ExtractionConfig)
```

**Config Options:**
- `provider` - LLM provider for analysis
- `language` - 'en' or 'ja' (default: 'en')  
- `extractPatterns` - Extract writing patterns
- `extractKeywords` - Extract key terms
- `maxDepth` - Iterations for refinement
- `useIterativeRefinement` - Enable multi-pass analysis

### ArticleGenerator  

Generates content from templates.

```typescript
new ArticleGenerator(model: string, options?: GeneratorOptions)
```

**Options:**
- `temperature` - Creativity level (0-1)
- `maxTokens` - Maximum output length
- `apiKeys` - API credentials for providers

### Template Structure

Extracted templates contain:

```typescript
{
  name: string;           // e.g., "Problem-Solution"
  formula: string;        // e.g., "[Hook] + [Problem] + [Solution]"
  components: [{
    name: string;         // e.g., "Hook"
    purpose: string;      // e.g., "Grab attention"
    examples: string[];   // Actual examples from source
    patterns: string[];   // Common patterns used
    weight: number;       // Importance (0-1)
  }],
  flow: string;          // e.g., "Linear", "Circular"
  persuasionTechniques: string[];  // e.g., ["urgency", "social proof"]
}
```

## Progress Tracking

Monitor extraction progress:

```typescript
const result = await extractor.extract(article, {
  onProgress: (progress) => {
    console.log(`${progress.phase}: ${progress.current}/${progress.total}`);
  }
});
```

## Requirements

- Node.js >= 20.0.0
- TypeScript >= 5.0.0

## Dependencies

- [@aid-on/unillm](https://www.npmjs.com/package/@aid-on/unillm) - Unified LLM interface
- [@aid-on/fractop](https://www.npmjs.com/package/@aid-on/fractop) - Fractal processing for long documents
- [@aid-on/iteratop](https://www.npmjs.com/package/@aid-on/iteratop) - Iterative refinement

## License

MIT

## Contributing

PRs welcome! Please open an issue first for major changes.

## Support

Report issues at [GitHub Issues](https://github.com/Aid-On/templex/issues)