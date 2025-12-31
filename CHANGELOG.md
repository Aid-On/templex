# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-12-31

### Added
- Initial release of @aid-on/templex
- Template extraction from articles and text documents
- Article generation using extracted templates
- Multi-language support (Japanese and English)
- Integration with @aid-on/unillm for multiple LLM providers
- Progress tracking during extraction
- Advanced similarity-based merging logic
- Comprehensive validation and type safety
- Preset pattern templates (fear-driven, problem-solution)
- Iterative refinement support
- Keyword and pattern extraction
- Document structure analysis
- Persuasion techniques detection

### Features
- **TemplateExtractor**: Main class for extracting templates from text
- **ArticleGenerator**: Generate new articles using templates
- **PromptBuilder**: Externalized prompts with language support
- **Similarity utilities**: Advanced merge logic using Levenshtein distance
- **Validation utilities**: Comprehensive type validation

### Dependencies
- @aid-on/unillm ^0.3.0
- @aid-on/fractop ^0.5.0
- @aid-on/iteratop ^0.2.1

### Requirements
- Node.js >= 20.0.0
- TypeScript >= 5.0.0