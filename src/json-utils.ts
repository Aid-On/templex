/**
 * Robust JSON utilities for parsing LLM responses
 * Addresses the JSON parsing robustness issues
 */

/**
 * Extract JSON from text with multiple fallback strategies
 */
export function extractJSON<T = any>(text: string): T | null {
  if (!text) return null;
  
  // Strategy 1: Direct parse if already valid JSON
  try {
    return JSON.parse(text);
  } catch {
    // Continue to fallback strategies
  }
  
  // Strategy 2: Extract JSON block from markdown code fence
  const markdownMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (markdownMatch) {
    try {
      return JSON.parse(markdownMatch[1]);
    } catch {
      // Continue to next strategy
    }
  }
  
  // Strategy 3: Find JSON-like structure with balanced braces
  const jsonStructure = extractBalancedJSON(text);
  if (jsonStructure) {
    try {
      return JSON.parse(jsonStructure);
    } catch {
      // Continue to next strategy
    }
  }
  
  // Strategy 4: Clean and retry
  const cleaned = cleanJSONString(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

/**
 * Extract balanced JSON structure from text
 */
function extractBalancedJSON(text: string): string | null {
  const starts = ['{', '['];
  let firstStart = -1;
  let startChar = '';
  
  // Find first JSON start
  for (const char of starts) {
    const idx = text.indexOf(char);
    if (idx !== -1 && (firstStart === -1 || idx < firstStart)) {
      firstStart = idx;
      startChar = char;
    }
  }
  
  if (firstStart === -1) return null;
  
  const endChar = startChar === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;
  
  for (let i = firstStart; i < text.length; i++) {
    const char = text[i];
    
    if (escaped) {
      escaped = false;
      continue;
    }
    
    if (char === '\\') {
      escaped = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (!inString) {
      if (char === startChar) {
        depth++;
      } else if (char === endChar) {
        depth--;
        if (depth === 0) {
          return text.substring(firstStart, i + 1);
        }
      }
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
  validator?: (obj: any) => obj is T
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
export function formatForLLM(obj: any, pretty: boolean = true): string {
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
  typeChecks?: Record<string, (val: any) => boolean>
): (obj: any) => obj is T {
  return (obj: any): obj is T => {
    if (!obj || typeof obj !== 'object') {
      return false;
    }
    
    // Check required keys
    for (const key of requiredKeys) {
      if (!(key in obj)) {
        return false;
      }
    }
    
    // Check types if provided
    if (typeChecks) {
      for (const [key, check] of Object.entries(typeChecks)) {
        if (key in obj && !check(obj[key])) {
          return false;
        }
      }
    }
    
    return true;
  };
}