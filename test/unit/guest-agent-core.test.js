import test from 'node:test';
import assert from 'node:assert/strict';
import { CondoChatbotClient } from '../../src/index.js';
import fs from 'node:fs';
import path from 'node:path';

const kb = JSON.parse(fs.readFileSync(path.resolve('data/knowledge-base.json'), 'utf-8'));

test('CondoChatbotClient - handles option clicks, free-text turns, and records history', async () => {
  const client = new CondoChatbotClient({
    kb,
    dbPath: ':memory:',
    provider: 'statistical_nlu'
  });

  // 1. Initial Greeting / Menu
  const init = client.startSession({ guestName: 'Ana Reyes' });
  assert.ok(init.sessionId);
  assert.ok(init.menu);
  assert.equal(init.menu.id, 'root');
  assert.ok(init.menu.options.length >= 5);

  // 2. Click Option (Parking)
  const turn1 = await client.processTurn({
    sessionId: init.sessionId,
    optionId: 'opt_parking'
  });
  assert.equal(turn1.type, 'resolution');
  assert.ok(turn1.content.includes('₱350'));
  assert.ok(turn1.actions.length >= 1);

  // 3. Click Option (Endorsement)
  const turn2 = await client.processTurn({
    sessionId: init.sessionId,
    optionId: 'opt_endorsement'
  });
  assert.equal(turn2.type, 'resolution');
  assert.ok(turn2.content.includes('serineasttagaytayendorsement.carrd.co'));

  // 4. Free-text query
  const turn3 = await client.processTurn({
    sessionId: init.sessionId,
    message: 'Pwede po ba magluto ng tuyo sa unit?'
  });
  assert.equal(turn3.type, 'text');
  assert.ok(turn3.content.toLowerCase().includes('tuyo'));
  assert.ok(turn3.content.toLowerCase().includes('bawal') || turn3.content.toLowerCase().includes('iwasan') || turn3.content.toLowerCase().includes('no smelly'));

  // 5. Verify conversation history logged in SQLite
  const history = client.getHistory(init.sessionId);
  assert.ok(history.length >= 3);

  // 6. Verify stats
  const stats = client.getStats();
  assert.equal(stats.totalSessions, 1);
  assert.ok(stats.totalMessages >= 3);

  client.close();
});
