import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

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
  assert.doesNotMatch(widgetContent, /📅 Book a stay/);
  assert.match(widgetContent, /Book a stay/);
  assert.doesNotMatch(widgetContent, /🔄 Already booked\? Sync reference/);
  assert.match(widgetContent, /Already booked\? Sync reference/);

  // Verify option-hint and thinking indicator presence
  assert.ok(widgetContent.includes('chatbotOptionHint'), 'chatbotOptionHint must exist');
  assert.ok(widgetContent.includes('Analyzing the query'), 'Analyzing the query thinking indicator must exist');
  assert.ok(widgetContent.includes('chatbot-thinking-indicator'), 'chatbot-thinking-indicator class must exist');

  // Verify 1-second animation classes and 1000ms delay
  assert.ok(widgetContent.includes('fadeInUp 1s'), 'fadeInUp 1s animation must be present in widget styles');
  assert.ok(widgetContent.includes('1000'), 'Thinking indicator delay must be 1000ms');

  // Verify zero emojis in compiled widget (excluding standard symbols like multiplication x &#10005;)
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{2714}\u{2716}-\u{27BF}]/u;
  assert.ok(!emojiRegex.test(widgetContent), 'ChatBotWidget.html must not contain any decorative unicode emojis');
});

test('ChatBotWidget.html - clicking #condoChatbotLauncher opens widget and exposes window.toggleCondoChatbot', () => {
  const widgetContent = fs.readFileSync(path.resolve('dist/ChatBotWidget.html'), 'utf-8');
  const scriptMatch = widgetContent.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(scriptMatch, 'ChatBotWidget.html must contain a <script> block');

  function makeClassList() {
    const set = new Set();
    return {
      add: (c) => set.add(c),
      remove: (c) => set.delete(c),
      contains: (c) => set.has(c)
    };
  }

  function makeElement(id) {
    const attrs = {};
    const listeners = {};
    return {
      id,
      classList: makeClassList(),
      style: {},
      value: '',
      innerHTML: '',
      textContent: '',
      setAttribute: (k, v) => { attrs[k] = String(v); },
      getAttribute: (k) => attrs[k] ?? null,
      addEventListener: (type, fn) => {
        listeners[type] = listeners[type] || [];
        listeners[type].push(fn);
      },
      dispatchEvent: (type) => {
        (listeners[type] || []).forEach(fn => fn({ preventDefault: () => {} }));
      },
      appendChild: () => {},
      focus: () => {}
    };
  }

  const elements = {
    'condo-chatbot-widget': makeElement('condo-chatbot-widget'),
    'condoChatbotLauncher': makeElement('condoChatbotLauncher'),
    'chatbotInput': makeElement('chatbotInput'),
    'chatbotMessages': makeElement('chatbotMessages'),
    'chatbotQuickActions': makeElement('chatbotQuickActions'),
    'chatbotOptionHint': makeElement('chatbotOptionHint')
  };

  const sandbox = {
    window: { innerWidth: 1024 },
    document: {
      readyState: 'complete',
      body: { style: {} },
      getElementById: (id) => elements[id] || null,
      createElement: () => makeElement('dynamic'),
      querySelectorAll: () => [],
      addEventListener: () => {}
    },
    localStorage: {
      getItem: () => null,
      setItem: () => {}
    },
    navigator: { maxTouchPoints: 0 },
    google: undefined,
    setTimeout: () => 0,
    console
  };
  sandbox.window.document = sandbox.document;
  vm.createContext(sandbox);
  vm.runInContext(scriptMatch[1], sandbox);

  assert.equal(typeof sandbox.window.toggleCondoChatbot, 'function', 'window.toggleCondoChatbot must be exposed');

  // Simulate clicking the launcher button without inline onclick
  elements.condoChatbotLauncher.dispatchEvent('click');

  assert.equal(elements['condo-chatbot-widget'].classList.contains('is-open'), true, 'Widget should open on launcher click');
  assert.equal(elements.condoChatbotLauncher.getAttribute('aria-expanded'), 'true', 'Launcher aria-expanded should be true');
  assert.equal(elements.condoChatbotLauncher.classList.contains('is-hidden'), true, 'Launcher should be hidden when open');
});

test('build-gas - generates appsscript.json manifest and gas webapp endpoints in dist/', () => {
  execSync('node scripts/build-gas.js', { encoding: 'utf-8' });

  const manifestPath = path.resolve('dist/appsscript.json');
  assert.ok(fs.existsSync(manifestPath), 'dist/appsscript.json must be generated');

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  assert.equal(manifest.timeZone, 'Asia/Manila');
  assert.equal(manifest.runtimeVersion, 'V8');
  assert.ok(manifest.webapp, 'manifest must define webapp config');
  assert.equal(manifest.webapp.access, 'ANYONE_ANONYMOUS');
  assert.equal(manifest.webapp.executeAs, 'USER_DEPLOYING');

  const coreContent = fs.readFileSync(path.resolve('dist/ChatBotCore.gs'), 'utf-8');
  assert.match(coreContent, /function\s+doGet\s*\(/, 'ChatBotCore.gs must define doGet(e)');
  assert.match(coreContent, /function\s+lookupReservation\s*\(/, 'ChatBotCore.gs must define lookupReservation(ref)');
  assert.match(coreContent, /HtmlService\.createTemplateFromFile\(['"]ChatBotWidget['"]\)/);
});

