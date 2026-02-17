/**
 * Robust JSON utilities for parsing LLM responses
 * Addresses the JSON parsing robustness issues
 */

/**
 * Extract JSON from text with multiple fallback strategies
 */
export function extractJSON<T = unknown>(text: string): T | null {
  if (!text) return null;
  
  // Strategy 1: Direct parse if already valid JSON
  try {
    return JSON.parse(text);
  } catch { /* direct parse failed, try next strategy */
    // Continue to fallback strategies
  }
  
  // Strategy 2: Extract JSON block from markdown code fence
  const markdownMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (markdownMatch) {
    try {
      return JSON.parse(markdownMatch[1]);
    } catch { /* code block extraction failed, try next */
      // Continue to next strategy
    }
  }
  
  // Strategy 3: Find JSON-like structure with balanced braces
  const jsonStructure = extractBalancedJSON(text);
  if (jsonStructure) {
    try {
      return JSON.parse(jsonStructure);
    } catch { /* brace extraction failed, try next */
      // Continue to next strategy
    }
  }
  
  // Strategy 4: Clean and retry
  const cleaned = cleanJSONString(text);
  try {
    return JSON.parse(cleaned);
  } catch { /* repair attempt failed */
    return null;
  }
}

/**
 * Find the position and character of the first JSON structure start
 */
function findJSONStart(text: string): { position: number; char: string } | null {
  const braceIdx = text.indexOf('{');
  const bracketIdx = text.indexOf('[');

  if (braceIdx === -1 && bracketIdx === -1) return null;
  if (braceIdx === -1) return { position: bracketIdx, char: '[' };
  if (bracketIdx === -1) return { position: braceIdx, char: '{' };

  return braceIdx < bracketIdx
    ? { position: braceIdx, char: '{' }
    : { position: bracketIdx, char: '[' };
}

/**
 * Process a single character during balanced JSON extraction
 */
function processChar(
  char: string,
  state: { depth: number; inString: boolean; escaped: boolean },
  startChar: string,
  endChar: string
): boolean {
  if (state.escaped) {
    state.escaped = false;
    return false;
  }

  if (char === '\\') { state.escaped = true; return false; }
  if (char === '"') { state.inString = !state.inString; return false; }

  if (!state.inString) {
    if (char === startChar) state.depth++;
    if (char === endChar) {
      state.depth--;
      if (state.depth === 0) return true;
    }
  }

  return false;
}

/**
 * Extract balanced JSON structure from text
 */
function extractBalancedJSON(text: string): string | null {
  const start = findJSONStart(text);
  if (!start) return null;

  const endChar = start.char === '{' ? '}' : ']';
  const state = { depth: 0, inString: false, escaped: false };

  for (let i = start.position; i < text.length; i++) {
    const complete = processChar(text[i], state, start.char, endChar);
    if (complete) {
      return text.substring(start.position, i + 1);
    }
  }

  return null;
}

/**
 * Clean common JSON formatting issues
 */
function cleanJSONString(text: string): string {
  return text
    // Remove comments
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove trailing commas
    .replace(/,\s*([}\]])/g, '$1')
    // Fix unquoted keys (simple cases)
    .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
    // Remove BOM and zero-width spaces
    .replace(/^\uFEFF/, '')
    .replace(/\u200B/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse JSON with validation and type checking
 */
export function parseJSONSafe<T>(
  text: string,
  validator?: (obj: unknown) => obj is T
): T | null {
  const parsed = extractJSON(text);
  
  if (parsed === null) {
    return null;
  }
  
  if (validator && !validator(parsed)) {
    return null;
  }
  
  return parsed as T;
}

/**
 * Format object as JSON for LLM consumption
 */
export function formatForLLM(obj: unknown, pretty: boolean = true): string {
  if (pretty) {
    return JSON.stringify(obj, null, 2);
  }
  return JSON.stringify(obj);
}

/**
 * Create a JSON schema validator
 */
export function createValidator<T>(
  requiredKeys: string[],
  typeChecks?: Record<string, (val: unknown) => boolean>
): (obj: unknown) => obj is T {
  return (obj: unknown): obj is T => {
    if (!obj || typeof obj !== 'object') {
      return false;
    }

    const record = obj as Record<string, unknown>;

    // Check required keys
    for (const key of requiredKeys) {
      if (!(key in record)) {
        return false;
      }
    }

    // Check types if provided
    if (typeChecks) {
      for (const [key, check] of Object.entries(typeChecks)) {
        if (key in record && !check(record[key])) {
          return false;
        }
      }
    }

    return true;
  };
}