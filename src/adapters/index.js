/**
 * LLM Adapter Factory.
 */

import { BaseLlmAdapter } from './base-adapter.js';
import { StatisticalNluAdapter } from './statistical-nlu-adapter.js';
import { ChromeWindowAiAdapter } from './chrome-window-ai-adapter.js';
import { OpenAiCompatibleAdapter } from './openai-compatible-adapter.js';
import { GeminiApiAdapter } from './gemini-api-adapter.js';

export function getLlmAdapter(providerName = 'statistical_nlu', config = {}) {
  const norm = (providerName || '').toLowerCase();

  switch (norm) {
    case 'chrome_window_ai':
    case 'window_ai':
    case 'gemini_nano':
      return new ChromeWindowAiAdapter(config);
    case 'openai':
    case 'openai_compatible':
    case 'ollama':
      return new OpenAiCompatibleAdapter(config);
    case 'gemini':
    case 'gemini_api':
      return new GeminiApiAdapter(config);
    case 'statistical_nlu':
    default:
      return new StatisticalNluAdapter(config);
  }
}

export {
  BaseLlmAdapter,
  StatisticalNluAdapter,
  ChromeWindowAiAdapter,
  OpenAiCompatibleAdapter,
  GeminiApiAdapter
};
