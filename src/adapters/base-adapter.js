/**
 * Abstract Base Class for LLM Adapters.
 * Defines the model-agnostic contract for generating responses with tool schemas.
 */

export class BaseLlmAdapter {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * Generates a response from the model.
   * @param {Object} params
   * @param {string} params.prompt
   * @param {string} [params.systemPrompt]
   * @param {Array<Object>} [params.tools]
   * @param {Array<Object>} [params.history]
   * @param {Object} [params.options]
   * @returns {Promise<{ content: string, toolCalls?: Array<Object>, metadata?: Object }>}
   */
  async generateResponse(params) {
    throw new Error('generateResponse() must be implemented by subclass');
  }
}
