/**
 * Core Guest Relations Agent Coordinator.
 * Manages sessions, option navigation, tool execution, and LLM adapter fallback.
 */

import { OptionTree } from './option-tree.js';
import { ToolRegistry } from './tools/index.js';
import { getLlmAdapter } from './adapters/index.js';
import { ChatDatabase } from './chat-db.js';

export class CondoChatbotClient {
  /**
   * @param {Object} options
   * @param {Object} options.kb Parsed data/knowledge-base.json
   * @param {string} [options.dbPath=':memory:'] Path to SQLite database or ':memory:'
   * @param {string} [options.provider='statistical_nlu'] Default LLM adapter
   * @param {Object} [options.adapterConfig={}] Configuration for LLM adapter
   */
  constructor({
    kb,
    dbPath = ':memory:',
    provider = 'statistical_nlu',
    adapterConfig = {}
  }) {
    this.kb = kb;
    this.providerName = provider;
    this.db = new ChatDatabase(dbPath);
    this.optionTree = new OptionTree(kb);
    this.tools = new ToolRegistry({ kb, db: this.db });
    this.adapter = getLlmAdapter(provider, {
      kb,
      registry: this.tools,
      ...adapterConfig
    });
  }

  /**
   * Starts a new guest conversation session.
   */
  startSession({ guestName = null, guestContact = null, channel = 'web_widget' } = {}) {
    const session = this.db.createSession({
      guestName,
      guestContact,
      channel,
      providerUsed: this.providerName
    });

    const rootMenu = this.optionTree.getMenu('root');

    this.db.saveMessage({
      sessionId: session.id,
      sender: 'bot',
      content: rootMenu.message,
      optionId: 'root'
    });

    return {
      sessionId: session.id,
      message: rootMenu.message,
      menu: rootMenu
    };
  }

  /**
   * Processes a turn (either an option click or a free-text message).
   */
  async processTurn({ sessionId, optionId = null, message = null }) {
    const start = Date.now();

    // 1. Option-Tree Selection
    if (optionId) {
      this.db.saveMessage({
        sessionId,
        sender: 'guest',
        content: `[Clicked Option: ${optionId}]`,
        optionId
      });

      const resolved = this.optionTree.resolveOption(optionId);
      const latency = Date.now() - start;

      if (resolved.type === 'menu') {
        const menuData = resolved.data;
        this.db.saveMessage({
          sessionId,
          sender: 'bot',
          content: menuData.message || menuData.title,
          optionId,
          latencyMs: latency
        });
        return {
          type: 'menu',
          content: menuData.message || menuData.title,
          menu: menuData,
          latencyMs: latency
        };
      }

      if (resolved.type === 'resolution') {
        const resData = resolved.data;
        this.db.saveMessage({
          sessionId,
          sender: 'bot',
          content: resData.text,
          optionId,
          latencyMs: latency
        });
        return {
          type: 'resolution',
          title: resData.title,
          content: resData.text,
          actions: resData.actions || [],
          latencyMs: latency
        };
      }
    }

    // 2. Free-Text Turn via LLM Adapter
    if (message) {
      this.db.saveMessage({
        sessionId,
        sender: 'guest',
        content: message
      });

      const history = this.db.getSessionHistory(sessionId, 6);
      const toolSchemas = this.tools.getToolSchemas();

      const response = await this.adapter.generateResponse({
        prompt: message,
        systemPrompt: `You are the friendly, verified 24/7 guest relations concierge for Unit 418 Serin East Tagaytay (2BR, 70sqm). Ground all answers strictly on verified policies: 2:00 PM check-in, 12:00 NN check-out, ₱350/night covered parking slot, Carrd link https://serineasttagaytayendorsement.carrd.co/, ₱3,000 security deposit for direct/Agoda bookings, and light cooking only with no smelly frying (no tuyo).`,
        tools: toolSchemas,
        history
      });

      const latency = Date.now() - start;
      this.db.saveMessage({
        sessionId,
        sender: 'bot',
        content: response.content,
        latencyMs: latency
      });

      return {
        type: 'text',
        content: response.content,
        language: response.language || 'auto',
        intent: response.intent || 'general',
        latencyMs: latency
      };
    }

    return { error: 'Either optionId or message is required' };
  }

  getHistory(sessionId) {
    return this.db.getSessionHistory(sessionId);
  }

  getStats() {
    return this.db.getAnalyticsSummary();
  }

  close() {
    this.db.close();
  }
}

export { OptionTree } from './option-tree.js';
export { ToolRegistry } from './tools/index.js';
export { ChatDatabase } from './chat-db.js';
export * from './adapters/index.js';
