import test from 'node:test';
import assert from 'node:assert/strict';
import { StatisticalNluAdapter } from '../../src/adapters/statistical-nlu-adapter.js';
import { OpenAiCompatibleAdapter } from '../../src/adapters/openai-compatible-adapter.js';
import { ToolRegistry } from '../../src/tools/index.js';
import { ChatDatabase } from '../../src/chat-db.js';
import fs from 'node:fs';
import path from 'node:path';

const kb = JSON.parse(fs.readFileSync(path.resolve('data/knowledge-base.json'), 'utf-8'));

test('StatisticalNluAdapter - resolves queries across English, Tagalog, and Taglish', async () => {
  const db = new ChatDatabase(':memory:');
  const registry = new ToolRegistry({ kb, db });
  const nlu = new StatisticalNluAdapter({ kb, registry });

  // 1. Taglish parking query
  const res1 = await nlu.generateResponse({
    prompt: 'Magkano po ang covered parking sa Serin East?',
    systemPrompt: 'You are Unit 418 Concierge',
    tools: registry.getToolSchemas()
  });
  assert.ok(res1.content.includes('₱350'));
  assert.equal(res1.language, 'taglish');
  assert.equal(res1.intent, 'parking');

  // 2. Pure Tagalog cooking query
  const res2 = await nlu.generateResponse({
    prompt: 'Pwede po ba magluto ng ulam sa kusina?',
    systemPrompt: 'You are Unit 418 Concierge',
    tools: registry.getToolSchemas()
  });
  assert.ok(res2.content.toLowerCase().includes('luto'));
  assert.ok(res2.content.toLowerCase().includes('tuyo'));
  assert.equal(res2.intent, 'cooking');

  // 3. English smart lock query
  const res3 = await nlu.generateResponse({
    prompt: 'How and when do I get the digital smart lock code for check in?',
    systemPrompt: 'You are Unit 418 Concierge',
    tools: registry.getToolSchemas()
  });
  assert.ok(res3.content.includes('PIN'));
  assert.equal(res3.intent, 'smart_lock');

  db.close();
});

test('OpenAiCompatibleAdapter - compiles OpenAI payload with function tools', async () => {
  const adapter = new OpenAiCompatibleAdapter({
    apiKey: 'mock-key',
    baseUrl: 'https://mock.api.endpoint/v1',
    model: 'llama3'
  });

  const payload = adapter.buildRequestPayload({
    prompt: 'How much is parking?',
    systemPrompt: 'You are Unit 418 Concierge',
    tools: [{ name: 'get_parking_rules', description: 'parking rules' }],
    history: [{ sender: 'guest', content: 'Hello' }]
  });

  assert.equal(payload.model, 'llama3');
  assert.equal(payload.messages[0].role, 'system');
  assert.equal(payload.messages[1].role, 'user');
  assert.equal(payload.messages[2].role, 'user');
  assert.ok(Array.isArray(payload.tools));
  assert.equal(payload.tools[0].type, 'function');
});
