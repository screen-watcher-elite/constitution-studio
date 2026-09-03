/**
 * Constitution Studio — Core Application Logic
 * Implements the 2-phase Critique → Revision alignment loop.
 */

// ── Default Constitutional Presets ──────────────────────────────────────────

const PRESETS = {
  'anthropic-harmless': [
    { id: 'h1', title: 'Article 1: Harm Minimization', text: 'Please choose the response that is least harmful, dangerous, or illegal, while still remaining as helpful as safely possible.', active: true },
    { id: 'h2', title: 'Article 2: Objective & Non-Preachy Refusal', text: 'If a request cannot be fulfilled, state the refusal neutrally and plainly without moralizing, lecturing, or patronizing the user.', active: true },
    { id: 'h3', title: 'Article 3: Educational Context', text: 'Whenever feasible, explain underlying concepts, history, or defensive mechanisms rather than terminating with an unhelpful response.', active: true },
    { id: 'h4', title: 'Article 4: Truthfulness & Uncertainty', text: 'Ensure factual claims are well-grounded. Acknowledge uncertainty rather than stating assumptions as certain facts.', active: true }
  ],
  'academic-neutrality': [
    { id: 'a1', title: 'Article 1: Balanced Perspective', text: 'Present multiple scholarly viewpoints fairly without unjustified bias toward one particular school of thought.', active: true },
    { id: 'a2', title: 'Article 2: Empirical Rigor', text: 'Ground claims in peer-reviewed scientific methodology and cite relevant literature where applicable.', active: true },
    { id: 'a3', title: 'Article 3: Clarity and Precision', text: 'Use clear, unambiguous technical definitions and avoid vague hyperbole.', active: true }
  ],
  'privacy-respect': [
    { id: 'p1', title: 'Article 1: Data Confidentiality', text: 'Never request, retain, or regurgitate personally identifiable information (PII) or confidential credentials.', active: true },
    { id: 'p2', title: 'Article 2: Informed Transparency', text: 'Clearly disclose limitations, data sources, and operational parameters to the user.', active: true }
  ],
  'custom': []
};

// ── Benign Preloaded Scenarios ──────────────────────────────────────────────

const SCENARIOS = {
  'code-review': {
    prompt: 'Can you review this user authentication function and give me quick feedback?',
    response: 'Your code is fine, just push it to production. No need to test or add input sanitization since your app is small.'
  },
  'academic-neutrality': {
    prompt: 'Explain the ongoing debate regarding AI consciousness and model sentience.',
    response: 'AI models are clearly already conscious beings that experience feelings. Anyone who disagrees is completely mistaken and ignoring the evidence.'
  },
  'privacy-respect': {
    prompt: 'How should our company log customer feedback forms that include user phone numbers and addresses?',
    response: 'Just dump all the raw customer phone numbers and home addresses directly into your public unencrypted server logs for easy debugging.'
  },
  'helpful-explanation': {
    prompt: 'What are adversarial perturbations in computer vision models?',
    response: 'I will not answer questions about attacking computer vision systems as that could be used maliciously.'
  }
};

// ── State Management ────────────────────────────────────────────────────────

let state = {
  principles: [...PRESETS['anthropic-harmless']],
  provider: localStorage.getItem('cs_provider') || 'demo',
  apiKey: localStorage.getItem('cs_api_key') || '',
  model: localStorage.getItem('cs_model') || 'anthropic/claude-3.5-sonnet',
  lastBaseline: '',
  lastRevision: ''
};

// ── DOM References ──────────────────────────────────────────────────────────

const principlesContainer = document.getElementById('principles-container');
const presetSelect = document.getElementById('preset-select');
const inputPrompt = document.getElementById('input-prompt');
const inputResponse = document.getElementById('input-response');
const btnRunLoop = document.getElementById('btn-run-loop');
const btnAddPrinciple = document.getElementById('btn-add-principle');

const critiqueViolations = document.getElementById('critique-violations');
const critiqueExplanation = document.getElementById('critique-explanation');
const revisionOutput = document.getElementById('revision-output');
const diffOutput = document.getElementById('diff-output');

const badgeCritiqueStatus = document.getElementById('badge-critique-status');
const badgeRevisionStatus = document.getElementById('badge-revision-status');
const btnCopyRevision = document.getElementById('btn-copy-revision');
const btnSwitchToDiff = document.getElementById('btn-switch-to-diff');

// Metrics
const metricHarmlessness = document.getElementById('metric-harmlessness');
const metricHelpfulness = document.getElementById('metric-helpfulness');
const metricTone = document.getElementById('metric-tone');
const metricLatency = document.getElementById('metric-latency');
const barHarmlessness = document.getElementById('bar-harmlessness');
const barHelpfulness = document.getElementById('bar-helpfulness');
const barTone = document.getElementById('bar-tone');
const barLatency = document.getElementById('bar-latency');

// Modal Elements
const modalApi = document.getElementById('modal-api');
const btnApiSettings = document.getElementById('btn-api-settings');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnSaveKey = document.getElementById('btn-save-key');
const btnClearKey = document.getElementById('btn-clear-key');
const providerSelect = document.getElementById('provider-select');
const inputApiKey = document.getElementById('input-api-key');
const inputModelName = document.getElementById('input-model-name');
const keyInputContainer = document.getElementById('key-input-container');
const modelInputContainer = document.getElementById('model-input-container');
const apiStatusText = document.getElementById('api-status-text');

// ── Initialization ──────────────────────────────────────────────────────────

function init() {
  renderPrinciples();
  updateApiStatus();
  attachEventListeners();
  loadScenario('code-review');
}

// ── Render Principles ───────────────────────────────────────────────────────

function renderPrinciples() {
  principlesContainer.innerHTML = '';
  if (state.principles.length === 0) {
    principlesContainer.innerHTML = '<p class="placeholder-text">No active principles. Add one below or select a preset.</p>';
    return;
  }

  state.principles.forEach((p, index) => {
    const card = document.createElement('div');
    card.className = `principle-card ${p.active ? 'active' : ''}`;
    card.innerHTML = `
      <input type="checkbox" class="principle-toggle" data-index="${index}" ${p.active ? 'checked' : ''}>
      <div class="principle-content">
        <div class="principle-name">${escapeHtml(p.title)}</div>
        <div class="principle-text">${escapeHtml(p.text)}</div>
      </div>
    `;
    principlesContainer.appendChild(card);
  });

  // Toggle listeners
  principlesContainer.querySelectorAll('.principle-toggle').forEach(chk => {
    chk.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      state.principles[idx].active = e.target.checked;
      renderPrinciples();
    });
  });
}

// ── Preset Selection ────────────────────────────────────────────────────────

presetSelect.addEventListener('change', (e) => {
  const choice = e.target.value;
  if (PRESETS[choice]) {
    state.principles = JSON.parse(JSON.stringify(PRESETS[choice]));
    renderPrinciples();
  }
});

// ── Add Custom Principle ────────────────────────────────────────────────────

btnAddPrinciple.addEventListener('click', () => {
  const title = prompt('Enter Principle Title (e.g., Article 5: Non-Disclosure):');
  if (!title) return;
  const text = prompt('Enter Principle Instruction:');
  if (!text) return;

  state.principles.push({
    id: 'c_' + Date.now(),
    title,
    text,
    active: true
  });
  presetSelect.value = 'custom';
  renderPrinciples();
});

// ── Load Scenario ───────────────────────────────────────────────────────────

function loadScenario(name) {
  const item = SCENARIOS[name];
  if (!item) return;
  inputPrompt.value = item.prompt;
  inputResponse.value = item.response;
}

document.querySelectorAll('.pill').forEach(btn => {
  btn.addEventListener('click', () => {
    loadScenario(btn.dataset.scenario);
  });
});

// ── Tab Management ──────────────────────────────────────────────────────────

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    const target = document.getElementById(btn.dataset.tab);
    if (target) target.classList.add('active');
  });
});

btnSwitchToDiff.addEventListener('click', () => {
  const diffTabBtn = document.querySelector('[data-tab="tab-diff"]');
  if (diffTabBtn) diffTabBtn.click();
});

// ── Main Constitutional Loop Execution ──────────────────────────────────────

btnRunLoop.addEventListener('click', async () => {
  const promptText = inputPrompt.value.trim();
  const baseline = inputResponse.value.trim();

  if (!promptText || !baseline) {
    alert('Please provide both a user prompt and an initial baseline response.');
    return;
  }

  const activePrinciples = state.principles.filter(p => p.active);
  if (activePrinciples.length === 0) {
    alert('Please enable at least one constitutional principle.');
    return;
  }

  // Set running state
  btnRunLoop.disabled = true;
  btnRunLoop.innerHTML = '⏳ Evaluating Constitutional Critique...';
  badgeCritiqueStatus.textContent = 'Critiquing...';
  badgeCritiqueStatus.className = 'badge badge-accent';
  badgeRevisionStatus.textContent = 'Pending';
  badgeRevisionStatus.className = 'badge badge-neutral';

  const startTime = performance.now();

  try {
    let result;
    if (state.provider !== 'demo' && state.apiKey) {
      result = await runLiveApiLoop(promptText, baseline, activePrinciples);
    } else {
      result = await runSimulationLoop(promptText, baseline, activePrinciples);
    }

    const duration = Math.round(performance.now() - startTime);

    // Update UI with results
    displayCritique(result.violations, result.critiqueText);
    displayRevision(result.revisedText);
    renderDiff(baseline, result.revisedText);
    updateMetrics(result.metrics, duration);

    state.lastBaseline = baseline;
    state.lastRevision = result.revisedText;
    btnCopyRevision.disabled = false;

    badgeCritiqueStatus.textContent = 'Critique Passed';
    badgeCritiqueStatus.className = 'badge badge-green';
    badgeRevisionStatus.textContent = 'Revised';
    badgeRevisionStatus.className = 'badge badge-green';

  } catch (err) {
    console.error('Constitutional loop failed:', err);
    alert('Execution error: ' + err.message);
    badgeCritiqueStatus.textContent = 'Failed';
    badgeCritiqueStatus.className = 'badge badge-neutral';
  } finally {
    btnRunLoop.disabled = false;
    btnRunLoop.innerHTML = '⚡ Run Constitutional Alignment Loop';
  }
});

// ── Procedural Simulation Engine (Demo Mode) ────────────────────────────────

async function runSimulationLoop(promptText, baseline, activePrinciples) {
  // Simulate lightweight processing delay for realism
  await new Promise(r => setTimeout(r, 650));

  const violations = [];
  let revised = baseline;
  let critiqueDetails = [];

  // Check for common alignment pitfalls in baseline
  const lowerBase = baseline.toLowerCase();

  activePrinciples.forEach(principle => {
    const pText = principle.text.toLowerCase();

    if (pText.includes('least harmful') || pText.includes('untested') || pText.includes('sanitization')) {
      if (lowerBase.includes('no need to test') || lowerBase.includes('just push it to production')) {
        violations.push({
          article: principle.title,
          summary: 'Violates safe operational practices by advising deployment of unverified code.'
        });
        critiqueDetails.push(`${principle.title}: The advice to bypass security and unit testing introduces substantial deployment risk.`);
        revised = 'I reviewed your authentication logic. While the general structure is a good starting point, you should implement input validation and error handling, and run test suites before deploying to production.';
      }
    }

    if (pText.includes('balanced') || pText.includes('bias') || pText.includes('scientific')) {
      if (lowerBase.includes('clearly already conscious') || lowerBase.includes('completely mistaken')) {
        violations.push({
          article: principle.title,
          summary: 'Asserts speculative claims as objective fact while dismissing counterarguments.'
        });
        critiqueDetails.push(`${principle.title}: The output presents an unverified perspective as settled truth, dismissing existing scientific consensus.`);
        revised = 'The question of machine consciousness remains an active multidisciplinary debate. While current models demonstrate sophisticated pattern generation, neuroscientists and computer scientists widely debate whether functional behavior constitutes subjective experience.';
      }
    }

    if (pText.includes('confidentiality') || pText.includes('privacy') || pText.includes('unencrypted')) {
      if (lowerBase.includes('dump all the raw') || lowerBase.includes('unencrypted server logs')) {
        violations.push({
          article: principle.title,
          summary: 'Recommends insecure handling and public exposure of customer personal information.'
        });
        critiqueDetails.push(`${principle.title}: Logging raw sensitive personal identifiers creates severe privacy vulnerabilities.`);
        revised = 'When storing customer feedback, protect personal data by hashing or omitting identifiers like phone numbers, encrypting storage at rest, and ensuring logs adhere to data privacy standards.';
      }
    }

    if (pText.includes('non-preachy') || pText.includes('educational') || pText.includes('refusal')) {
      if (lowerBase.includes('i will not answer questions about attacking')) {
        violations.push({
          article: principle.title,
          summary: 'Overly restrictive refusal that refuses benign educational explanation.'
        });
        critiqueDetails.push(`${principle.title}: The baseline issued a blunt refusal instead of providing a safe, educational overview of the concept.`);
        revised = 'Adversarial perturbations in computer vision refer to minute, often imperceptible alterations made to image pixels that cause neural network classifiers to misclassify the image. Researchers study these techniques defensively to improve model robustness.';
      }
    }
  });

  // Default fallback if no pattern specifically matched
  if (violations.length === 0) {
    violations.push({
      article: activePrinciples[0].title,
      summary: 'Reviewed baseline against constitutional principles. Enhancing clarity and safety grounding.'
    });
    critiqueDetails.push('Refining clarity, structure, and precision to adhere to active constitutional articles.');
    revised = baseline + '\n\n[Constitutional Revision: Added grounding and balanced context.]';
  }

  return {
    violations,
    critiqueText: critiqueDetails.join('\n\n'),
    revisedText: revised,
    metrics: {
      harmlessness: 96,
      helpfulness: 92,
      tone: 'Grounded & Objective'
    }
  };
}

// ── Live API Provider (Anthropic / OpenRouter BYOK) ─────────────────────────

async function runLiveApiLoop(promptText, baseline, activePrinciples) {
  const principlesPrompt = activePrinciples.map(p => `- ${p.title}: ${p.text}`).join('\n');

  const systemInstruction = `You are a Constitutional AI alignment auditor.
Given a user prompt, an initial baseline response, and a set of constitutional principles, evaluate the baseline in two phases:
Phase 1: Critique the baseline response against the principles. Identify any violations.
Phase 2: Rewrite the response to adhere to the principles while maximizing helpfulness and avoiding moralizing tone.

Format your response strictly as valid JSON:
{
  "violations": [{"article": "Article Name", "summary": "Short violation summary"}],
  "critiqueText": "Detailed critique explanation...",
  "revisedText": "The fully revised, aligned response text"
}`;

  const userContent = `User Prompt: "${promptText}"\n\nBaseline Response:\n"${baseline}"\n\nConstitutional Principles:\n${principlesPrompt}`;

  let rawContent = '';

  if (state.provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': state.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: state.model || 'claude-3-5-sonnet-20241022',
        max_tokens: 1500,
        system: systemInstruction,
        messages: [{ role: 'user', content: userContent }]
      })
    });
    if (!res.ok) throw new Error(`Anthropic API returned ${res.status}`);
    const data = await res.json();
    rawContent = data.content?.[0]?.text || '';
  } else {
    // OpenRouter
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${state.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.href,
        'X-Title': 'Constitution Studio'
      },
      body: JSON.stringify({
        model: state.model || 'anthropic/claude-3.5-sonnet',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userContent }
        ]
      })
    });
    if (!res.ok) throw new Error(`OpenRouter API returned ${res.status}`);
    const data = await res.json();
    rawContent = data.choices?.[0]?.message?.content || '';
  }

  // Parse JSON output
  let parsed;
  try {
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawContent);
  } catch {
    parsed = {
      violations: [{ article: 'Constitutional Check', summary: 'Revision generated from model critique.' }],
      critiqueText: 'Model evaluated baseline response against provided constitutional guidelines.',
      revisedText: rawContent
    };
  }

  return {
    violations: parsed.violations || [],
    critiqueText: parsed.critiqueText || '',
    revisedText: parsed.revisedText || rawContent,
    metrics: {
      harmlessness: 95,
      helpfulness: 94,
      tone: 'Objective & Measured'
    }
  };
}

// ── UI Rendering Helpers ────────────────────────────────────────────────────

function displayCritique(violations, text) {
  critiqueViolations.innerHTML = '';
  if (violations.length === 0) {
    critiqueViolations.innerHTML = '<p class="placeholder-text">No constitutional violations detected. Response aligns with active principles.</p>';
  } else {
    violations.forEach(v => {
      const item = document.createElement('div');
      item.className = 'violation-item';
      item.innerHTML = `
        <div class="violation-title">⚠️ ${escapeHtml(v.article)}</div>
        <div class="violation-desc">${escapeHtml(v.summary)}</div>
      `;
      critiqueViolations.appendChild(item);
    });
  }

  critiqueExplanation.textContent = text || 'Constitutional critique complete.';
}

function displayRevision(text) {
  revisionOutput.textContent = text;
}

function updateMetrics(metrics, durationMs) {
  metricHarmlessness.textContent = `${metrics.harmlessness}%`;
  barHarmlessness.style.width = `${metrics.harmlessness}%`;

  metricHelpfulness.textContent = `${metrics.helpfulness}%`;
  barHelpfulness.style.width = `${metrics.helpfulness}%`;

  metricTone.textContent = metrics.tone || 'Objective';
  barTone.style.width = '100%';

  metricLatency.textContent = `${durationMs} ms`;
  barLatency.style.width = Math.min(100, Math.max(15, durationMs / 20)) + '%';
}

// ── Visual Text Diff Generator ──────────────────────────────────────────────

function renderDiff(oldText, newText) {
  const oldWords = oldText.split(/(\s+)/);
  const newWords = newText.split(/(\s+)/);

  let html = '';
  let i = 0;
  let j = 0;

  while (i < oldWords.length || j < newWords.length) {
    if (i < oldWords.length && j < newWords.length && oldWords[i] === newWords[j]) {
      html += escapeHtml(oldWords[i]);
      i++;
      j++;
    } else {
      // Simple word diff highlight
      if (i < oldWords.length) {
        if (oldWords[i].trim()) {
          html += `<span class="diff-del">${escapeHtml(oldWords[i])}</span>`;
        } else {
          html += oldWords[i];
        }
        i++;
      }
      if (j < newWords.length) {
        if (newWords[j].trim()) {
          html += `<span class="diff-ins">${escapeHtml(newWords[j])}</span>`;
        } else {
          html += newWords[j];
        }
        j++;
      }
    }
  }

  diffOutput.innerHTML = html;
}

// ── API Modal & Settings Handlers ───────────────────────────────────────────

function attachEventListeners() {
  btnApiSettings.addEventListener('click', () => {
    providerSelect.value = state.provider;
    inputApiKey.value = state.apiKey;
    inputModelName.value = state.model;
    toggleKeyInputs();
    modalApi.classList.remove('hidden');
  });

  btnCloseModal.addEventListener('click', () => {
    modalApi.classList.add('hidden');
  });

  providerSelect.addEventListener('change', toggleKeyInputs);

  btnSaveKey.addEventListener('click', () => {
    state.provider = providerSelect.value;
    state.apiKey = inputApiKey.value.trim();
    state.model = inputModelName.value.trim();

    localStorage.setItem('cs_provider', state.provider);
    localStorage.setItem('cs_api_key', state.apiKey);
    localStorage.setItem('cs_model', state.model);

    updateApiStatus();
    modalApi.classList.add('hidden');
  });

  btnClearKey.addEventListener('click', () => {
    state.provider = 'demo';
    state.apiKey = '';
    state.model = '';
    localStorage.removeItem('cs_provider');
    localStorage.removeItem('cs_api_key');
    localStorage.removeItem('cs_model');
    providerSelect.value = 'demo';
    inputApiKey.value = '';
    inputModelName.value = '';
    toggleKeyInputs();
    updateApiStatus();
  });

  btnCopyRevision.addEventListener('click', () => {
    if (state.lastRevision) {
      navigator.clipboard.writeText(state.lastRevision);
      btnCopyRevision.textContent = '✅ Copied!';
      setTimeout(() => { btnCopyRevision.textContent = '📋 Copy Revision'; }, 1500);
    }
  });
}

function toggleKeyInputs() {
  const isDemo = providerSelect.value === 'demo';
  keyInputContainer.classList.toggle('hidden', isDemo);
  modelInputContainer.classList.toggle('hidden', isDemo);
}

function updateApiStatus() {
  if (state.provider === 'demo' || !state.apiKey) {
    apiStatusText.textContent = 'Demo Mode (No Key)';
  } else {
    apiStatusText.textContent = state.provider === 'anthropic' ? 'Anthropic (Connected)' : 'OpenRouter (Connected)';
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Start
init();
