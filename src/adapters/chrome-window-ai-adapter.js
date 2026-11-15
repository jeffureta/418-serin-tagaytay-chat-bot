/**
 * Chrome Built-In Prompt API Adapter (window.ai / window.LanguageModel / Gemini Nano).
 * Safe for browser environments; gracefully degrades if API is absent.
 */

import { BaseLlmAdapter } from './base-adapter.js';

export class ChromeWindowAiAdapter extends BaseLlmAdapter {
  constructor(options = {}) {
    super(options);
  }

  isAvailable() {
    if (typeof window === 'undefined') return false;
    return Boolean(
      (window.ai && window.ai.languageModel) ||
      (window.LanguageModel)
    );
  }

  async generateResponse({ prompt, systemPrompt, tools, history = [] }) {
    if (!this.isAvailable()) {
      throw new Error('Chrome window.ai is not available in this environment');
    }

    let session = null;
    try {
      if (window.ai && window.ai.languageModel) {
        session = await window.ai.languageModel.create({
          systemPrompt: systemPrompt || 'You are the helpful 24/7 guest relations assistant for Unit 418 Serin East Tagaytay.'
        });
      } else if (window.LanguageModel) {
        session = await window.LanguageModel.create({
          systemPrompt: systemPrompt || 'You are the helpful 24/7 guest relations assistant for Unit 418 Serin East Tagaytay.'
        });
      }

      const responseText = await session.prompt(prompt);
      return {
        content: responseText,
        metadata: { engine: 'chrome-gemini-nano' }
      };
    } finally {
      if (session && typeof session.destroy === 'function') {
        session.destroy();
      }
    }
  }
}
