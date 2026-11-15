/**
 * Google Gemini REST API Adapter.
 */

import { BaseLlmAdapter } from './base-adapter.js';

export class GeminiApiAdapter extends BaseLlmAdapter {
  constructor({
    apiKey = process.env.GEMINI_API_KEY || '',
    model = 'gemini-1.5-flash',
    baseUrl = 'https://generativelanguage.googleapis.com/v1beta'
  } = {}) {
    super();
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = baseUrl;
  }

  async generateResponse({ prompt, systemPrompt, tools, history = [] }) {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is required for GeminiApiAdapter');
    }

    const contents = [];
    if (Array.isArray(history)) {
      for (const msg of history) {
        contents.push({
          role: msg.sender === 'bot' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: prompt }]
    });

    const body = { contents };
    if (systemPrompt) {
      body.systemInstruction = {
        parts: [{ text: systemPrompt }]
      };
    }

    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini API error [${res.status}]: ${err}`);
    }

    const data = await res.json();
    const candidate = data.candidates && data.candidates[0];
    const textPart = candidate?.content?.parts?.find(p => p.text);

    return {
      content: textPart ? textPart.text : '',
      metadata: { model: this.model }
    };
  }
}
