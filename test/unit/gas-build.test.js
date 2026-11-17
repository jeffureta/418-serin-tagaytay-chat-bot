import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

test('build-gas - compiles dist/ChatBotCore.gs and dist/ChatBotWidget.html with valid syntax', () => {
  // Execute gas builder script
  const output = execSync('node scripts/build-gas.js', { encoding: 'utf-8' });
  assert.ok(output.includes('Build successful'));

  const corePath = path.resolve('dist/ChatBotCore.gs');
  const widgetPath = path.resolve('dist/ChatBotWidget.html');

  assert.ok(fs.existsSync(corePath), 'ChatBotCore.gs must exist');
  assert.ok(fs.existsSync(widgetPath), 'ChatBotWidget.html must exist');

  const coreContent = fs.readFileSync(corePath, 'utf-8');
  assert.ok(coreContent.includes('ChatBotSdk'));
  assert.ok(coreContent.includes('createCore'));
  assert.ok(coreContent.includes('serineasttagaytayendorsement.carrd.co'));

  const widgetContent = fs.readFileSync(widgetPath, 'utf-8');
  assert.ok(widgetContent.includes('condo-chatbot-widget'));
  assert.ok(!widgetContent.includes('chatbotHeaderTitle'), 'chatbotHeaderTitle must be removed');
  assert.ok(!widgetContent.includes('engineBadge'), 'engineBadge must be removed');

  // Verify Header: Chat Bot on left, close btn on right
  assert.match(widgetContent, /<div class="chatbot-header">[\s\S]*<span class="chatbot-title">Chat Bot<\/span>[\s\S]*<button[^>]*class="chatbot-close-btn"[^>]*>✕<\/button>[\s\S]*<\/div>/);

  // Verify DOM order: quick actions placed before messages container
  const quickActionsIdx = widgetContent.indexOf('id="chatbotQuickActions"');
  const messagesIdx = widgetContent.indexOf('id="chatbotMessages"');
  assert.ok(quickActionsIdx !== -1 && messagesIdx !== -1 && quickActionsIdx < messagesIdx, 'Quick actions must be placed before messages container');

  // Verify launcher hides when opened
  assert.match(widgetContent, /launcher\.classList\.add\('is-hidden'\)/);
  assert.match(widgetContent, /launcher\.classList\.remove\('is-hidden'\)/);

  // Verify no emojis in root menu options or sync booking
  assert.doesNotMatch(widgetContent, /📅 How much are the rates/);
  assert.match(widgetContent, /How much are the rates/);
  assert.doesNotMatch(widgetContent, /🚗 Parking details/);
  assert.match(widgetContent, /Parking details/);
  assert.doesNotMatch(widgetContent, /🔄 Already booked\? Sync reference/);
  assert.match(widgetContent, /Already booked\? Sync reference/);
});
