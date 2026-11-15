/**
 * Universal OpenAI-Compatible REST Adapter.
 * Works with Ollama local LLMs (e.g. Llama 3, Mistral), Groq, LM Studio, vLLM, and OpenAI.
 */

import { BaseLlmAdapter } from './base-adapter.js';

export class OpenAiCompatibleAdapter extends BaseLlmAdapter {
  constructor({
    apiKey = process.env.OPENAI_API_KEY || 'no-key',
    baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    model = process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature = 0.2
  } = {}) {
    super();
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.model = model;
    this.temperature = temperature;
  }

  buildRequestPayload({ prompt, systemPrompt, tools, history = [] }) {
    const messages = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    if (Array.isArray(history)) {
      for (const msg of history) {
        messages.push({
          role: msg.sender === 'bot' ? 'assistant' : 'user',
          content: msg.content
        });
      }
    }

    messages.push({ role: 'user', content: prompt });

    const payload = {
      model: this.model,
      messages,
      temperature: this.temperature
    };

    if (Array.isArray(tools) && tools.length > 0) {
      payload.tools = tools.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }
      }));
      payload.tool_choice = 'auto';
    }

    return payload;
  }

  async generateResponse(params) {
    const payload = this.buildRequestPayload(params);

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API error [${res.status}]: ${errText}`);
    }

    const data = await res.json();
    const choice = data.choices && data.choices[0];
    const message = choice ? choice.message : {};

    return {
      content: message.content || '',
      toolCalls: message.tool_calls || null,
      metadata: {
        usage: data.usage,
        model: data.model
      }
    };
  }
}
