import test from 'node:test';
import assert from 'node:assert/strict';
import { ChatDatabase } from '../../src/chat-db.js';
import fs from 'node:fs';
import path from 'node:path';

test('ChatDatabase - initializes in-memory or file database and performs CRUD', () => {
  const db = new ChatDatabase(':memory:');
  
  // 1. Create Session
  const session = db.createSession({
    guestName: 'Juan Dela Cruz',
    guestContact: '+639171234567',
    channel: 'web_widget',
    providerUsed: 'statistical_nlu'
  });
  
  assert.ok(session.id, 'Session must have an ID');
  assert.equal(session.guestName, 'Juan Dela Cruz');
  
  // 2. Save Message
  const msg1 = db.saveMessage({
    sessionId: session.id,
    sender: 'guest',
    content: 'Magkano parking?',
    optionId: null,
    latencyMs: 12
  });
  assert.ok(msg1.id);
  
  const msg2 = db.saveMessage({
    sessionId: session.id,
    sender: 'bot',
    content: 'Covered parking is ₱350/night.',
    optionId: 'res_parking',
    latencyMs: 5
  });
  assert.ok(msg2.id);

  // 3. Log Tool Execution
  const toolExec = db.logToolExecution({
    sessionId: session.id,
    toolName: 'get_parking_rules',
    argumentsJson: JSON.stringify({}),
    resultJson: JSON.stringify({ nightly_rate: 350 })
  });
  assert.ok(toolExec.id);

  // 4. Save Lead
  const lead = db.saveLead({
    sessionId: session.id,
    name: 'Juan Dela Cruz',
    contact: '+639171234567',
    datesRequested: 'Dec 20-22',
    notes: 'Needs 1 covered parking slot'
  });
  assert.ok(lead.id);

  // 5. Query Session History
  const history = db.getSessionHistory(session.id);
  assert.equal(history.length, 2);
  assert.equal(history[0].content, 'Magkano parking?');
  assert.equal(history[1].content, 'Covered parking is ₱350/night.');

  // 6. Analytics Summary
  const summary = db.getAnalyticsSummary();
  assert.equal(summary.totalSessions, 1);
  assert.equal(summary.totalMessages, 2);
  assert.equal(summary.totalLeads, 1);
  assert.equal(summary.totalToolExecutions, 1);
  
  db.close();
});
