import test from 'node:test';
import assert from 'node:assert/strict';
import { ToolRegistry } from '../../src/tools/index.js';
import { ChatDatabase } from '../../src/chat-db.js';
import fs from 'node:fs';
import path from 'node:path';

const kb = JSON.parse(fs.readFileSync(path.resolve('data/knowledge-base.json'), 'utf-8'));

test('ToolRegistry - validates tool schemas and executes handlers', async () => {
  const db = new ChatDatabase(':memory:');
  const session = db.createSession({ guestName: 'Test Guest' });
  const registry = new ToolRegistry({ kb, db });

  // 1. Tool Schemas
  const schemas = registry.getToolSchemas();
  assert.ok(Array.isArray(schemas));
  const toolNames = schemas.map(s => s.name);
  assert.ok(toolNames.includes('search_faq'));
  assert.ok(toolNames.includes('calculate_pricing_quote'));
  assert.ok(toolNames.includes('get_parking_rules'));
  assert.ok(toolNames.includes('get_endorsement_info'));
  assert.ok(toolNames.includes('get_smart_lock_policy'));
  assert.ok(toolNames.includes('save_guest_lead'));

  // 2. Execute get_parking_rules
  const parkingRes = await registry.executeTool('get_parking_rules', {}, session.id);
  assert.equal(parkingRes.covered_nightly_php, 350);
  assert.ok(parkingRes.details.includes('Tower'));

  // 3. Execute calculate_pricing_quote
  const quoteRes = await registry.executeTool('calculate_pricing_quote', {
    nights: 2,
    weekendNights: 1,
    coveredParkingNights: 2
  }, session.id);
  assert.ok(quoteRes.total_estimate_php > 0);
  assert.equal(quoteRes.covered_parking_total_php, 700);

  // 4. Execute search_faq
  const faqRes = await registry.executeTool('search_faq', { query: 'cooking tuyo' }, session.id);
  assert.ok(faqRes.found);
  assert.equal(faqRes.topicId, 'cooking');

  // 5. Execute save_guest_lead
  const leadRes = await registry.executeTool('save_guest_lead', {
    name: 'Maria Santos',
    contact: '+639180001122',
    notes: 'Inquiring for 4 pax'
  }, session.id);
  assert.ok(leadRes.success);
  assert.ok(leadRes.leadId);

  // Check lead persisted in SQLite
  const summary = db.getAnalyticsSummary();
  assert.equal(summary.totalLeads, 1);

  db.close();
});
