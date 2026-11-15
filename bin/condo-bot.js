#!/usr/bin/env node

/**
 * CLI binary for Unit 418 Serin East Tagaytay AI Concierge.
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { CondoChatbotClient } from '../src/index.js';

const kbPath = path.resolve('data/knowledge-base.json');
const kb = JSON.parse(fs.readFileSync(kbPath, 'utf-8'));
const dbPath = path.resolve('data/chat_bot.db');

const client = new CondoChatbotClient({
  kb,
  dbPath,
  provider: process.env.CONDO_BOT_PROVIDER || 'statistical_nlu'
});

const args = process.argv.slice(2);
const command = args[0] || 'chat';

async function main() {
  if (command === 'ask') {
    const query = args[1];
    if (!query) {
      console.error('Error: query string required. Example: condo-bot ask "Magkano parking?"');
      process.exit(1);
    }
    const session = client.startSession({ channel: 'cli_ask' });
    const turn = await client.processTurn({ sessionId: session.sessionId, message: query });
    console.log(`\n🤖 [Unit 418 Concierge]:\n${turn.content}\n`);
    process.exit(0);
  }

  if (command === 'stats') {
    const stats = client.getStats();
    console.log('\n📊 === Unit 418 Concierge Database Statistics ===');
    console.log(`• Total Sessions:        ${stats.totalSessions}`);
    console.log(`• Total Messages:        ${stats.totalMessages}`);
    console.log(`• Total Inquiries/Leads: ${stats.totalLeads}`);
    console.log(`• Total Tool Executions: ${stats.totalToolExecutions}\n`);
    process.exit(0);
  }

  if (command === 'eval') {
    const evalPath = path.resolve('data/golden-eval-suite.json');
    const testCases = JSON.parse(fs.readFileSync(evalPath, 'utf-8'));
    console.log(`\n🧪 Running Golden Evaluation Suite (${testCases.length} cases)...`);
    
    let passed = 0;
    const session = client.startSession({ channel: 'cli_eval' });

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const res = await client.processTurn({ sessionId: session.sessionId, message: tc.query });
      const ok = res.intent === tc.expected_intent;
      if (ok) passed++;
      console.log(`[${ok ? 'PASS' : 'FAIL'}] Query: "${tc.query}" -> Matched: ${res.intent} (Expected: ${tc.expected_intent})`);
    }

    const accuracy = ((passed / testCases.length) * 100).toFixed(1);
    console.log(`\n=== EVALUATION RESULTS ===`);
    console.log(`Total: ${testCases.length} | Passed: ${passed} | Failed: ${testCases.length - passed} | Accuracy: ${accuracy}%\n`);
    process.exit(passed >= testCases.length * 0.85 ? 0 : 1);
  }

  // Interactive REPL Menu
  if (command === 'chat') {
    console.log('\n======================================================');
    console.log('   🌴 Unit 418 Serin East Tagaytay - Guest Concierge 🌴');
    console.log('======================================================');
    
    const session = client.startSession({ channel: 'cli_interactive' });
    let currentMenu = session.menu;

    function renderMenu() {
      console.log(`\n🤖 [Concierge]: ${currentMenu.message || currentMenu.title}\n`);
      if (currentMenu.options) {
        currentMenu.options.forEach((opt, idx) => {
          console.log(`  [${idx + 1}] ${opt.icon || '•'} ${opt.label}`);
        });
        console.log(`  [0] 🚪 Exit`);
      }
      console.log('\nType an option number, or type any custom question:');
    }

    renderMenu();

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.on('line', async (line) => {
      const input = line.trim();
      if (!input) return;

      if (input === '0' || input.toLowerCase() === 'exit') {
        console.log('\nThank you for exploring Unit 418 Serin East Tagaytay. Have a wonderful day!\n');
        client.close();
        process.exit(0);
      }

      const num = parseInt(input, 10);
      if (!isNaN(num) && currentMenu.options && num >= 1 && num <= currentMenu.options.length) {
        const selectedOpt = currentMenu.options[num - 1];
        const res = await client.processTurn({
          sessionId: session.sessionId,
          optionId: selectedOpt.id
        });

        if (res.type === 'menu') {
          currentMenu = res.menu;
          renderMenu();
        } else if (res.type === 'resolution') {
          console.log(`\n🤖 [Concierge]:\n${res.content}\n`);
          if (res.actions) {
            console.log('--- Quick Actions ---');
            res.actions.forEach(a => {
              if (a.url) console.log(`👉 ${a.label}: ${a.url}`);
              else console.log(`👉 ${a.label}`);
            });
          }
          console.log('\n(Press Enter to return to main menu or ask another question)');
          currentMenu = client.optionTree.getMenu('root');
        }
      } else {
        // Free-text query
        const res = await client.processTurn({
          sessionId: session.sessionId,
          message: input
        });
        console.log(`\n🤖 [Concierge]:\n${res.content}\n`);
        console.log('\nType an option number from above or ask another question:');
      }
    });
  }
}

main().catch(err => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});
