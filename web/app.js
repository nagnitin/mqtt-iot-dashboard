/*
  Frontend MQTT dashboard for Raspberry Pi broker.
  Topics used (mapped to your Python/Arduino code):
  - Publish
    - mobile/angle   : stringified angle (0..140)
    - mobile/mode    : 0 | 1
    - mobile/recipe  : 1 | 2 | 3
  - Subscribe
    - arduino/to/pi  : JSON { gas, flame, temp }
    - arduino/alert  : text ("Clear" or messages)
    - alert          : 0 | 1 (emergency flag)
    - mobile/angle   : mirror angle updates
*/

const els = {
  host: document.getElementById('host'),
  port: document.getElementById('port'),
  connectBtn: document.getElementById('connectBtn'),
  disconnectBtn: document.getElementById('disconnectBtn'),
  connStatus: document.getElementById('connStatus'),

  // Tabs
  tabs: Array.from(document.querySelectorAll('.tab')),
  panels: Array.from(document.querySelectorAll('.tab-panel')),

  // Servo panel
  servoSlider: document.getElementById('servoSlider'),
  servoSendBtn: document.getElementById('servoSendBtn'),
  servoAngleOut: document.getElementById('servoAngleOut'),
  servoLive: document.getElementById('servoLive'),

  // Dashboard mirrors
  servoAngleLabel: document.getElementById('servoAngleLabel'),
  servoSliderMirror: document.getElementById('servoSliderMirror'),
  servoSentTs: document.getElementById('servoSentTs'),
  servoRecvTs: document.getElementById('servoRecvTs'),

  // Mode
  modeToggle: document.getElementById('modeToggle'),
  modeToggleMirror: document.getElementById('modeToggleMirror'),
  modeSentTs: document.getElementById('modeSentTs'),
  modeRecvTs: document.getElementById('modeRecvTs'),
  modeStatus: document.getElementById('modeStatus'),

  // Recipe
  recipeSendBtn: document.getElementById('recipeSendBtn'),
  recipeActive: document.getElementById('recipeActive'),
  recipeSentTs: document.getElementById('recipeSentTs'),
  recipeRecvTs: document.getElementById('recipeRecvTs'),

  // Alerts
  alertsList: document.getElementById('alertsList'),

  // AI Recipe Generator
  aiKey: document.getElementById('aiKey'),
  aiMaxAngle: document.getElementById('aiMaxAngle'),
  aiPrompt: document.getElementById('aiPrompt'),
  aiGenerateBtn: document.getElementById('aiGenerateBtn'),
  aiApplyBtn: document.getElementById('aiApplyBtn'),
  aiOutput: document.getElementById('aiOutput'),
};

// Tab switching
els.tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    els.tabs.forEach((t) => t.classList.remove('active'));
    els.panels.forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    const id = tab.dataset.tab;
    document.getElementById(id).classList.add('active');
  });
});

// MQTT client state
let client = null;
let reconnectTimer = null;
let controlsLockedByAlert = false;
let lastAiRecipe = null;

function setStatus(text, good) {
  els.connStatus.textContent = text;
  els.connStatus.style.background = good ? '#113d26' : '#202734';
}

function now() {
  return new Date().toLocaleTimeString();
}

function connect() {
  if (typeof window.Paho === 'undefined' || !window.Paho?.MQTT) {
    alert('MQTT client library failed to load. Check internet connectivity/CDN.');
    return;
  }
  if (client) {
    try { client.disconnect(); } catch (_) {}
  }
  const host = els.host.value.trim();
  const port = Number(els.port.value);
  const clientId = 'web_' + Math.random().toString(16).slice(2);
  // Some bundles expose only Paho.MQTT.Client, so access via window.Paho
  client = new window.Paho.MQTT.Client(host, Number(port), '/mqtt', clientId);

  client.onConnectionLost = (resp) => {
    setStatus('Disconnected', false);
    els.connectBtn.disabled = false;
    els.disconnectBtn.disabled = true;
    setInteractive(false);
    if (resp.errorCode !== 0) scheduleReconnect();
  };

  client.onMessageArrived = handleMessage;

  client.connect({
    timeout: 5,
    useSSL: false,
    onSuccess: () => {
      setStatus('Connected', true);
      els.connectBtn.disabled = true;
      els.disconnectBtn.disabled = false;
      subscribeAll();
      setInteractive(true);
    },
    onFailure: () => {
      setStatus('Connection failed', false);
      scheduleReconnect();
    },
  });
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, 2000);
}

function disconnect() {
  if (!client) return;
  try { client.disconnect(); } catch (_) {}
  setStatus('Disconnected', false);
  els.connectBtn.disabled = false;
  els.disconnectBtn.disabled = true;
  setInteractive(false);
}

function subscribeAll() {
  const topics = [
    'arduino/to/pi',
    'arduino/alert',
    'alert',
    'mobile/angle', // mirror/feedback
    'mobile/mode',
    'mobile/recipe',
  ];
  topics.forEach((t) => client.subscribe(t, { qos: 0 }));
}

function publish(topic, payload) {
  const msg = new Paho.MQTT.Message(String(payload));
  msg.destinationName = topic;
  client.send(msg);
}

function handleMessage(message) {
  const topic = message.destinationName;
  const payload = message.payloadString;
  if (topic === 'arduino/to/pi') {
    try {
      const data = JSON.parse(payload);
      charts.pushPoint(data);
      els.servoRecvTs.textContent = now();
    } catch (e) {
      // ignore malformed
    }
    return;
  }
  if (topic === 'arduino/alert') {
    addAlert(payload);
    return;
  }
  if (topic === 'alert') {
    // 1 means emergency
    if (payload === '1') {
      addAlert('ALERT: Emergency detected');
      controlsLockedByAlert = true;
      setInteractive(false);
    }
    if (payload === '0') {
      controlsLockedByAlert = false;
      setInteractive(true);
    }
    return;
  }
  if (topic === 'mobile/angle') {
    const angle = Number(payload);
    els.servoAngleLabel.textContent = angle.toFixed(0);
    els.servoSliderMirror.value = angle;
    els.servoRecvTs.textContent = now();
  }
  if (topic === 'mobile/mode') {
    const val = Number(payload) === 1;
    els.modeToggleMirror.checked = val;
    els.modeToggle.checked = val;
    els.modeStatus.textContent = val ? 'Recipe' : 'Manual';
    els.modeRecvTs.textContent = now();
  }
  if (topic === 'mobile/recipe') {
    const num = Number(payload);
    if (!Number.isNaN(num)) {
      els.recipeActive.textContent = `recipe ${num}`;
      const radio = document.querySelector(`input[name="recipe"][value="${num}"]`);
      if (radio) radio.checked = true;
      els.recipeRecvTs.textContent = now();
    }
  }
}

function addAlert(text) {
  const li = document.createElement('li');
  li.textContent = `${new Date().toLocaleTimeString()} — ${text}`;
  els.alertsList.prepend(li);
}

// Charts
const charts = (() => {
  const gasCtx = document.getElementById('gasChart');
  const tempCtx = document.getElementById('tempChart');
  const times = [];
  const gasData = [];
  const tempData = [];

  // Create gradient strokes
  function makeGradient(ctx, color) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, color.replace('1)', '0.35)'));
    gradient.addColorStop(1, color.replace('1)', '0)'));
    return gradient;
  }

  const gasChart = new Chart(gasCtx, {
    type: 'line',
    data: {
      labels: times,
      datasets: [{
        label: 'Gas sensor',
        data: gasData,
        borderColor: '#2dd4bf',
        backgroundColor: makeGradient(gasCtx.getContext('2d'), 'rgba(45, 212, 191, 1)'),
        tension: 0.2,
        pointRadius: 0,
      }],
    },
    options: {
      responsive: true,
      animation: false,
      scales: { x: { ticks: { color: '#9aa4b2' } }, y: { ticks: { color: '#9aa4b2' } } },
      plugins: { legend: { labels: { color: '#e6edf3' } } },
    },
  });

  const tempChart = new Chart(tempCtx, {
    type: 'line',
    data: {
      labels: times,
      datasets: [{
        label: 'Flame temperature',
        data: tempData,
        borderColor: '#ff8c42',
        backgroundColor: makeGradient(tempCtx.getContext('2d'), 'rgba(255, 140, 66, 1)'),
        tension: 0.2,
        pointRadius: 0,
      }],
    },
    options: {
      responsive: true,
      animation: false,
      scales: { x: { ticks: { color: '#9aa4b2' } }, y: { ticks: { color: '#9aa4b2' } } },
      plugins: { legend: { labels: { color: '#e6edf3' } } },
    },
  });

  function pushPoint(sample) {
    const label = new Date().toLocaleTimeString();
    times.push(label);
    gasData.push(sample.gas ?? null);
    tempData.push(sample.temp ?? null);
    if (times.length > 120) {
      times.shift(); gasData.shift(); tempData.shift();
    }
    gasChart.update();
    tempChart.update();
  }
  return { pushPoint };
})();

// UI handlers
els.servoSlider.addEventListener('input', () => {
  const v = Number(els.servoSlider.value);
  els.servoAngleOut.textContent = v.toFixed(0);
  if (els.servoLive.checked && client?.isConnected()) {
    publish('mobile/angle', v);
    els.servoSentTs.textContent = now();
  }
});

els.servoSendBtn.addEventListener('click', () => {
  if (!client?.isConnected()) return;
  const v = Number(els.servoSlider.value);
  publish('mobile/angle', v);
  els.servoSentTs.textContent = now();
});

els.modeToggle.addEventListener('change', () => {
  if (!client?.isConnected()) return;
  const val = els.modeToggle.checked ? 1 : 0;
  publish('mobile/mode', val);
  els.modeToggleMirror.checked = els.modeToggle.checked;
  els.modeStatus.textContent = val === 1 ? 'Recipe' : 'Manual';
  els.modeStatus.classList.toggle('chip-muted', false);
  els.modeSentTs.textContent = now();
});

els.recipeSendBtn.addEventListener('click', () => {
  if (!client?.isConnected()) return;
  const sel = document.querySelector('input[name="recipe"]:checked');
  const value = Number(sel.value);
  publish('mobile/recipe', value);
  els.recipeActive.textContent = `recipe ${value}`;
  els.recipeSentTs.textContent = now();
});

// Connection buttons
els.connectBtn.addEventListener('click', connect);
els.disconnectBtn.addEventListener('click', disconnect);

// Initialize labels
els.servoAngleOut.textContent = els.servoSlider.value;
els.servoAngleLabel.textContent = '0';

// Enable/disable interactive controls
function setInteractive(enabled) {
  if (controlsLockedByAlert) enabled = false;
  els.servoSlider.disabled = !enabled;
  els.servoSendBtn.disabled = !enabled;
  els.servoLive.disabled = !enabled;
  els.modeToggle.disabled = !enabled;
  document.querySelectorAll('input[name="recipe"]').forEach((r) => r.disabled = !enabled);
  els.recipeSendBtn.disabled = !enabled;
}

// Persist host/port for convenience
(() => {
  try {
    const saved = JSON.parse(localStorage.getItem('mqttConn') || '{}');
    if (saved.host) els.host.value = saved.host;
    if (saved.port) els.port.value = String(saved.port);
  } catch (_) {}
  const save = () => {
    try { localStorage.setItem('mqttConn', JSON.stringify({ host: els.host.value.trim(), port: Number(els.port.value) })); } catch (_) {}
  };
  els.host.addEventListener('change', save);
  els.port.addEventListener('change', save);
})();

// ===== AI Recipe Generator =====
async function generateWithGemini(prompt, key) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${encodeURIComponent(key)}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 512 },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return text;
}

function extractJson(text) {
  if (!text) return null;
  // Strip code fences if present
  const fence = /```(?:json)?\n([\s\S]*?)\n```/i;
  const m = text.match(fence);
  const raw = m ? m[1] : text;
  try { return JSON.parse(raw); } catch (_) { return null; }
}

function validateRecipe(obj, maxAngle) {
  if (!obj || !Array.isArray(obj.angles) || !Array.isArray(obj.delays)) return 'Missing angles/delays arrays';
  if (obj.angles.length !== obj.delays.length) return 'angles and delays must be same length';
  if (obj.angles.length < 1 || obj.angles.length > 12) return 'steps should be between 1 and 12';
  for (const a of obj.angles) {
    if (typeof a !== 'number' || Number.isNaN(a)) return 'angles must be numbers';
    if (a < 0 || a > maxAngle) return `angle ${a} out of range 0..${maxAngle}`;
  }
  for (const d of obj.delays) {
    if (typeof d !== 'number' || d <= 0) return 'delays must be positive numbers (seconds)';
  }
  return null;
}

els.aiGenerateBtn?.addEventListener('click', async () => {
  try {
    const key = els.aiKey.value.trim();
    if (!key) throw new Error('Missing API key');
    // Persist key
    try { localStorage.setItem('geminiKey', key); } catch (_) {}
    const maxAngle = Number(els.aiMaxAngle.value) || 140;
    const userPrompt = els.aiPrompt.value.trim() || 'Generate a concise servo recipe.';
    const sysPrompt = `You control a servo (0..${maxAngle} degrees). Return ONLY minified JSON with shape {"angles":[...],"delays":[...]}. Length 3-8. Delays are seconds. No extra text.`;
    els.aiOutput.textContent = 'Generating…';
    const text = await generateWithGemini(`${sysPrompt}\n\nUser request: ${userPrompt}`, key);
    const parsed = extractJson(text);
    const err = validateRecipe(parsed, maxAngle);
    if (err) throw new Error(`Invalid recipe: ${err}\nRaw: ${text}`);
    lastAiRecipe = parsed;
    els.aiOutput.textContent = JSON.stringify(parsed, null, 2);
    els.aiApplyBtn.disabled = false;
  } catch (e) {
    els.aiOutput.textContent = `Error: ${e.message}`;
    els.aiApplyBtn.disabled = true;
  }
});

els.aiApplyBtn?.addEventListener('click', () => {
  if (!client?.isConnected() || !lastAiRecipe) return;
  // publish the JSON to backend and run selected slot
  const sel = document.querySelector('input[name="recipe"]:checked');
  const slot = Number(sel?.value || 1);
  const payload = JSON.stringify({ ...lastAiRecipe, slot });
  publish('mobile/recipe_json', payload);
  publish('mobile/recipe', slot);
  publish('mobile/mode', 1);
  els.recipeActive.textContent = `recipe ${slot}`;
  els.recipeSentTs.textContent = now();
});

// Restore saved Gemini key
(() => {
  try {
    const k = localStorage.getItem('geminiKey');
    if (k) els.aiKey.value = k;
  } catch (_) {}
})();

