// chat.js — Member 1
const Chat = (function () {

  const chatWindow = document.getElementById('chat-window');
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send-btn');
  const clearBtn = document.getElementById('clearChatBtn');
  const suggestedRow = document.getElementById('suggestedRow');

  const BACKEND_ENDPOINT = '/api/chat';

  function appendMessage(text, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `msg ${sender}`;
    msgDiv.textContent = text;
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    if (sender === 'bot') {
      window.AppState.lastCopilotReply = text;
    }
    return msgDiv;
  }

  function getScenarioContext() {
    const c = window.AppState.classification;
    return c
      ? { sourceLabel: c.sourceLabel, noiseClass: c.noiseClass, frequency: c.frequency, status: c.status, vesselType: c.vesselType }
      : { sourceLabel: 'No analysis yet' };
  }

  async function sendMessage(overrideText) {
    const question = (overrideText || chatInput.value).trim();
    if (!question) return;

    appendMessage(question, 'user');
    chatInput.value = '';

    const typing = document.createElement('div');
    typing.className = 'msg bot typing';
    typing.innerHTML = '<i></i><i></i><i></i>';
    chatWindow.appendChild(typing);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    try {
      const response = await fetch(BACKEND_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context: getScenarioContext() })
      });

      if (!response.ok) throw new Error(`Server returned ${response.status}`);
      const data = await response.json();
      typing.remove();
      appendMessage(data.reply || 'No response received.', 'bot');
    } catch (err) {
      console.error(err);
      typing.remove();
      const errMsg = document.createElement('div');
      errMsg.className = 'msg error';
      errMsg.textContent = 'Copilot is unavailable right now — backend not connected yet (waiting on Member 4).';
      chatWindow.appendChild(errMsg);
      chatWindow.scrollTop = chatWindow.scrollHeight;
      Toast.show('Copilot unavailable — backend not connected yet.', 'error');
    }
  }

  sendBtn.addEventListener('click', () => sendMessage());
  chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

  suggestedRow.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-q]');
    if (chip) sendMessage(chip.dataset.q);
  });

  clearBtn.addEventListener('click', () => {
    chatWindow.innerHTML = '';
    window.AppState.lastCopilotReply = null;
  });

  return { sendMessage, appendMessage };

})();