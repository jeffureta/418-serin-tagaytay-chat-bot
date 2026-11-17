import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('chat-app uses --bg-app and chat-input-area uses --bg-card', () => {
  const css = readFileSync(join(process.cwd(), 'public', 'styles.css'), 'utf8');

  const chatAppMatch = css.match(/\.chat-app\s*\{[^}]*\}/);
  assert.ok(chatAppMatch, '.chat-app rule should exist');
  assert.match(
    chatAppMatch[0],
    /background-color:\s*var\(--bg-app\)/,
    '.chat-app should use var(--bg-app) so chat messages and initial options share #f8fafc'
  );

  const inputAreaMatch = css.match(/\.chat-footer\s*\{[^}]*\}/);
  assert.ok(inputAreaMatch, '.chat-footer rule should exist');
  assert.match(
    inputAreaMatch[0],
    /background-color:\s*var\(--bg-card\)/,
    '.chat-footer should remain var(--bg-card)'
  );
});
