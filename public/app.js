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
  engineBadge.textContent = '✨ Chrome Built-in AI (Gemini Nano)';
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

function renderOptions(options) {
  optionsTray.innerHTML = '';
  if (!Array.isArray(options) || options.length === 0) return;

  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = `${opt.icon || '•'} ${opt.label}`;
    btn.addEventListener('click', () => {
      sendOption(opt.id, opt.label);
    });
    optionsTray.appendChild(btn);
  });
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

    appendMessage('bot', data.message);
    if (data.menu && data.menu.options) {
      renderOptions(data.menu.options);
    }
  } catch (err) {
    console.error('Failed to init chat:', err);
    appendMessage('bot', 'Welcome to Unit 418 Serin East Tagaytay! How can I help you today?');
  }
}

async function sendOption(optionId, label) {
  appendMessage('guest', label);
  optionsTray.innerHTML = '<span style="font-size:12px;color:#64748b;padding:8px;">Loading details...</span>';

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

    appendMessage('bot', data.content);

    if (data.type === 'menu' && data.menu) {
      renderOptions(data.menu.options);
    } else if (data.actions) {
      renderOptions(data.actions.map(a => ({
        id: a.target || 'root',
        label: a.label,
        icon: a.actionType === 'link' ? '🔗' : '👉'
      })));
    }
  } catch (err) {
    console.error(err);
    appendMessage('bot', 'Sorry, I encountered an issue retrieving that option. Please try again.');
  }
}

async function sendMessage(text) {
  appendMessage('guest', text);
  chatInput.value = '';

  try {
    const res = await fetch('/api/chat/turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: currentSessionId,
        message: text
      })
    });
    const data = await res.json();
    appendMessage('bot', data.content);
  } catch (err) {
    console.error(err);
    appendMessage('bot', 'Sorry, I could not process your query right now. Please select an option above.');
  }
}

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (text) {
    sendMessage(text);
  }
});

initChat();
