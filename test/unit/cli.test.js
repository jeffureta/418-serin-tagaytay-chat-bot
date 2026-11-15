import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';

test('CLI condo-bot - executes ask, eval, and stats commands', () => {
  // 1. Single ask command
  const askOut = execSync('node bin/condo-bot.js ask "Magkano covered parking?"', { encoding: 'utf-8' });
  assert.ok(askOut.includes('₱350'));
  assert.ok(askOut.includes('Unit 418 Concierge'));

  // 2. Eval regression suite
  const evalOut = execSync('node bin/condo-bot.js eval', { encoding: 'utf-8' });
  assert.ok(evalOut.includes('EVALUATION RESULTS'));
  assert.ok(evalOut.includes('Passed:'));

  // 3. Stats command
  const statsOut = execSync('node bin/condo-bot.js stats', { encoding: 'utf-8' });
  assert.ok(statsOut.includes('Total Sessions'));
  assert.ok(statsOut.includes('Total Messages'));
});
