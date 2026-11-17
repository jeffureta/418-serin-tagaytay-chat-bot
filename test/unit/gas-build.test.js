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
});
