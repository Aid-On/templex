/**
 * Integration test setup
 * Configure real API providers for testing
 */

export function checkApiKeys() {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasGroq = !!process.env.GROQ_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;

  return {
    hasOpenAI,
    hasGroq,
    hasAnthropic,
    hasAny: hasOpenAI || hasGroq || hasAnthropic
  };
}

export function getAvailableProvider() {
  const keys = checkApiKeys();
  
  if (!keys.hasAny) {
    console.warn(`
=================================================================
No API keys found for integration tests.

To run integration tests, set one of the following environment variables:
- OPENAI_API_KEY
- GROQ_API_KEY  
- ANTHROPIC_API_KEY

Example:
  GROQ_API_KEY=your-key-here npm run test:integration
=================================================================
    `);
    return null;
  }

  if (keys.hasOpenAI) return 'openai';
  if (keys.hasGroq) return 'groq';
  if (keys.hasAnthropic) return 'anthropic';
  
  return null;
}