/**
 * Client-Side Controller for Unit 418 Web Chatbot.
 */

let currentSessionId = localStorage.getItem('condo_session_id') || null;

const messagesContainer = document.getElementById('chatMessages');
const optionsTray = document.getElementById('quickOptionsTray');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const engineBadge = document.getElementById('engineStatusBadge');

// Detect Chrome Built-In Prompt API
if (window.ai && window.ai.languageModel) {
  engineBadge.textContent = 'Chrome Built-in AI (Gemini Nano)';
  engineBadge.style.background = '#10b981';
}

function appendMessage(sender, text) {
  const el = document.createElement('div');
  el.className = `message ${sender}`;
  // Basic markdown conversion for links and bold
  let html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[(.*?)\]\((https?:\/\/.*?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\n/g, '<br/>');
  el.innerHTML = html;
  messagesContainer.appendChild(el);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function isTouchDevice() {
  try {
    return ('ontouchstart' in window) || (navigator && navigator.maxTouchPoints > 0);
  } catch (e) {
    return false;
  }
}

function clearActiveOptions() {
  const initialList = document.getElementById('quickOptionsList');
  if (initialList) initialList.innerHTML = '';
  const initialHint = document.getElementById('quickOptionHint');
  if (initialHint) initialHint.textContent = '';

  const activeInlines = document.querySelectorAll('.inline-options-container');
  activeInlines.forEach(el => el.remove());
}

function showThinking(callback) {
  const thinkingEl = document.createElement('div');
  thinkingEl.className = 'chatbot-thinking-indicator';
  thinkingEl.id = 'activeThinkingIndicator';
  thinkingEl.textContent = 'Analyzing the query...';
  messagesContainer.appendChild(thinkingEl);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  setTimeout(() => {
    const active = document.getElementById('activeThinkingIndicator');
    if (active) active.remove();
    if (callback) callback();
  }, 1000);
}

function renderOptions(options, targetContainer) {
  const container = targetContainer || document.getElementById('quickOptionsList');
  if (!container) return;
  container.innerHTML = '';
  if (!Array.isArray(options) || options.length === 0) return;

  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = (opt.icon ? `${opt.icon} ` : '') + opt.label;
    btn.addEventListener('click', () => {
      sendOption(opt.id, opt.label);
    });
    container.appendChild(btn);
  });
}

function appendInlineOptions(options) {
  if (!Array.isArray(options) || options.length === 0) return;

  const inlineBox = document.createElement('div');
  inlineBox.className = 'inline-options-container';

  renderOptions(options, inlineBox);

  const hint = document.createElement('div');
  hint.className = 'chatbot-option-hint';
  hint.textContent = isTouchDevice() ? 'Tap an option' : 'Click an option';
  inlineBox.appendChild(hint);

  messagesContainer.appendChild(inlineBox);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function initChat() {
  try {
    const res = await fetch('/api/chat/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestName: 'Guest' })
    });
    const data = await res.json();
    currentSessionId = data.sessionId;
    localStorage.setItem('condo_session_id', currentSessionId);

    if (data.menu && data.menu.options) {
      clearActiveOptions();
      renderOptions(data.menu.options, document.getElementById('quickOptionsList'));
      const hint = document.getElementById('quickOptionHint');
      if (hint) {
        hint.textContent = isTouchDevice() ? 'Tap an option' : 'Click an option';
      }
    }
  } catch (err) {
    console.error('Failed to init chat:', err);
    appendMessage('bot', 'Welcome to Unit 418 Serin East Tagaytay! How can I help you today?');
  }
}

let bookingState = {
  dates: null,
  guests: null,
  step: null
};

async function sendOption(optionId, label) {
  clearActiveOptions();
  appendMessage('guest', label);

  if (optionId === 'sub_dates_custom') {
    bookingState.step = 'awaiting_custom_dates';
    showThinking(() => {
      appendMessage('bot', 'Alright! Which dates?');
      chatInput.placeholder = 'e.g. Dec 20-22, next weekend, etc.';
      chatInput.focus();
    });
    return;
  }

  if (optionId === 'sub_dates_weekend') {
    bookingState.dates = 'Upcoming weekend';
  } else if (optionId === 'sub_dates_weekday') {
    bookingState.dates = 'Weekday staycation';
  }

  if (optionId === 'sub_guests_small') bookingState.guests = '1-2 Guests';
  if (optionId === 'sub_guests_family') bookingState.guests = '3-4 Guests';
  if (optionId === 'sub_guests_group') bookingState.guests = '5-6 Guests';

  showThinking(async () => {
    try {
      const res = await fetch('/api/chat/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId,
          optionId
        })
      });
      const data = await res.json();

      let botContent = data.content;
      if (bookingState.dates && bookingState.guests && data.type === 'resolution') {
        botContent = `Direct Reservation Summary (${bookingState.dates}, ${bookingState.guests}):\n\n` + botContent;
      }
      appendMessage('bot', botContent);

      if (data.type === 'menu' && data.menu) {
        appendInlineOptions(data.menu.options);
      } else if (data.actions) {
        appendInlineOptions(data.actions.map(a => ({
          id: a.target || 'root',
          label: a.label,
          icon: ''
        })));
      }
    } catch (err) {
      console.error(err);
      appendMessage('bot', 'Sorry, I encountered an issue retrieving that option. Please try again.');
    }
  });
}

async function sendMessage(text) {
  if (!text) return;
  clearActiveOptions();
  appendMessage('guest', text);

  // If in custom dates step
  if (bookingState.step === 'awaiting_custom_dates') {
    bookingState.dates = text;
    bookingState.step = 'awaiting_guests';
    showThinking(() => {
      appendMessage('bot', 'How many guests?');
      appendInlineOptions([
        { id: 'sub_guests_small', label: '1 to 2 Guests (Couple / Solo)' },
        { id: 'sub_guests_family', label: '3 to 4 Guests (Small Family)' },
        { id: 'sub_guests_group', label: '5 to 6 Guests (Maximum Group)' },
        { id: 'back_dates', label: 'Back to Dates' }
      ]);
      chatInput.placeholder = 'Ask a question in English, Tagalog, or Taglish...';
    });
    return;
  }

  showThinking(async () => {
    try {
      const res = await fetch('/api/chat/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId,
          query: text
        })
      });
      const data = await res.json();

      appendMessage('bot', data.content);

      if (data.type === 'menu' && data.menu) {
        appendInlineOptions(data.menu.options);
      } else if (data.actions) {
        appendInlineOptions(data.actions.map(a => ({
          id: a.target || 'root',
          label: a.label,
          icon: ''
        })));
      }
    } catch (err) {
      console.error(err);
      appendMessage('bot', 'Maraming salamat po! For detailed information, please select an option.');
    }
  });
}

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (text) {
    sendMessage(text);
  }
});

initChat();
