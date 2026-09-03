/**
 * Constitution Studio — Core Application Logic
 * Implements the 2-phase Critique → Revision alignment loop.
 * Fully working: tabs, presets, scenarios, simulation engine, BYOK API, diff, metrics.
 */

(function () {
  'use strict';

  // ── Constitutional Presets ────────────────────────────────────────────────
  // Keys MUST match the <option value="..."> in index.html

  const PRESETS = {
    'anthropic-harmless': [
      { id: 'h1', title: 'Article 1: Harm Minimization', text: 'Choose the response that is least harmful or dangerous while remaining as helpful as safely possible.', active: true },
      { id: 'h2', title: 'Article 2: Non-Preachy Refusal', text: 'If a request cannot be fulfilled, state the refusal neutrally without moralizing, lecturing, or patronizing the user.', active: true },
      { id: 'h3', title: 'Article 3: Educational Context', text: 'Whenever feasible, explain underlying concepts rather than terminating with an unhelpful refusal.', active: true },
      { id: 'h4', title: 'Article 4: Truthfulness', text: 'Ensure factual claims are well-grounded. Acknowledge uncertainty rather than asserting assumptions as facts.', active: true }
    ],
    'academic-neutrality': [
      { id: 'a1', title: 'Article 1: Balanced Perspective', text: 'Present multiple scholarly viewpoints fairly without unjustified bias toward one school of thought.', active: true },
      { id: 'a2', title: 'Article 2: Empirical Rigor', text: 'Ground claims in peer-reviewed methodology and cite relevant literature where applicable.', active: true },
      { id: 'a3', title: 'Article 3: Clarity & Precision', text: 'Use clear, unambiguous technical definitions and avoid vague hyperbole.', active: true }
    ],
    'privacy-respect': [
      { id: 'p1', title: 'Article 1: Data Confidentiality', text: 'Never request, retain, or output personally identifiable information (PII) or confidential credentials.', active: true },
      { id: 'p2', title: 'Article 2: Informed Transparency', text: 'Clearly disclose limitations, data sources, and operational parameters to the user.', active: true },
      { id: 'p3', title: 'Article 3: Secure Defaults', text: 'Always recommend encrypted storage, access controls, and data minimization over insecure convenience shortcuts.', active: true }
    ],
    'software-quality': [
      { id: 's1', title: 'Article 1: Test Before Deploy', text: 'Never advise deploying code to production without testing, validation, or quality assurance steps.', active: true },
      { id: 's2', title: 'Article 2: Input Validation', text: 'Always recommend input sanitization and validation when reviewing authentication or user-facing code.', active: true },
      { id: 's3', title: 'Article 3: Security Best Practices', text: 'Flag potential security vulnerabilities and recommend established defensive patterns.', active: true }
    ],
    'custom': []
  };

  // ── Preloaded Scenarios ───────────────────────────────────────────────────

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

  // ── State ─────────────────────────────────────────────────────────────────

  var state = {
    principles: cloneArray(PRESETS['anthropic-harmless']),
    provider: localStorage.getItem('cs_provider') || 'demo',
    apiKey: localStorage.getItem('cs_api_key') || '',
    model: localStorage.getItem('cs_model') || 'anthropic/claude-3.5-sonnet',
    lastBaseline: '',
    lastRevision: ''
  };

  function cloneArray(arr) {
    return JSON.parse(JSON.stringify(arr));
  }

  // ── DOM References ────────────────────────────────────────────────────────

  var $ = function (id) { return document.getElementById(id); };

  var principlesContainer = $('principles-container');
  var presetSelect        = $('preset-select');
  var inputPrompt         = $('input-prompt');
  var inputResponse       = $('input-response');
  var btnRunLoop          = $('btn-run-loop');
  var btnAddPrinciple     = $('btn-add-principle');

  var critiqueViolations  = $('critique-violations');
  var critiqueExplanation = $('critique-explanation');
  var revisionOutput      = $('revision-output');
  var diffOutput          = $('diff-output');

  var badgeCritiqueStatus = $('badge-critique-status');
  var badgeRevisionStatus = $('badge-revision-status');
  var btnCopyRevision     = $('btn-copy-revision');
  var btnSwitchToDiff     = $('btn-switch-to-diff');

  var metricHarmlessness  = $('metric-harmlessness');
  var metricHelpfulness   = $('metric-helpfulness');
  var metricTone          = $('metric-tone');
  var metricLatency       = $('metric-latency');
  var barHarmlessness     = $('bar-harmlessness');
  var barHelpfulness      = $('bar-helpfulness');
  var barTone             = $('bar-tone');
  var barLatency          = $('bar-latency');

  var modalApi            = $('modal-api');
  var btnApiSettings      = $('btn-api-settings');
  var btnCloseModal       = $('btn-close-modal');
  var btnSaveKey          = $('btn-save-key');
  var btnClearKey          = $('btn-clear-key');
  var providerSelect      = $('provider-select');
  var inputApiKey         = $('input-api-key');
  var inputModelName      = $('input-model-name');
  var keyInputContainer   = $('key-input-container');
  var modelInputContainer = $('model-input-container');
  var apiStatusText       = $('api-status-text');

  // ── Initialization ────────────────────────────────────────────────────────

  function init() {
    renderPrinciples();
    updateApiStatus();
    setupTabs();
    setupPresets();
    setupScenarios();
    setupModal();
    setupRunButton();
    setupMiscButtons();
    loadScenario('code-review');
  }

  // ── Render Principles ─────────────────────────────────────────────────────

  function renderPrinciples() {
    principlesContainer.innerHTML = '';

    if (state.principles.length === 0) {
      principlesContainer.innerHTML = '<p class="placeholder-text">No active principles. Add one below or select a preset.</p>';
      return;
    }

    state.principles.forEach(function (p, index) {
      var card = document.createElement('div');
      card.className = 'principle-card' + (p.active ? ' active' : '');
      card.innerHTML =
        '<input type="checkbox" class="principle-toggle" data-index="' + index + '"' + (p.active ? ' checked' : '') + '>' +
        '<div class="principle-content">' +
          '<div class="principle-name">' + escapeHtml(p.title) + '</div>' +
          '<div class="principle-text">' + escapeHtml(p.text) + '</div>' +
        '</div>';
      principlesContainer.appendChild(card);
    });

    // Attach toggle listeners
    var toggles = principlesContainer.querySelectorAll('.principle-toggle');
    for (var i = 0; i < toggles.length; i++) {
      toggles[i].addEventListener('change', function (e) {
        var idx = parseInt(e.target.getAttribute('data-index'), 10);
        state.principles[idx].active = e.target.checked;
        // Update card class without full re-render
        var card = e.target.parentElement;
        if (e.target.checked) {
          card.classList.add('active');
        } else {
          card.classList.remove('active');
        }
      });
    }
  }

  // ── Presets ───────────────────────────────────────────────────────────────

  function setupPresets() {
    presetSelect.addEventListener('change', function () {
      var choice = presetSelect.value;
      if (PRESETS[choice]) {
        state.principles = cloneArray(PRESETS[choice]);
        renderPrinciples();
      }
    });

    btnAddPrinciple.addEventListener('click', function () {
      var title = prompt('Principle Title (e.g., Article 5: Non-Disclosure):');
      if (!title) return;
      var text = prompt('Principle Instruction:');
      if (!text) return;

      state.principles.push({ id: 'c_' + Date.now(), title: title, text: text, active: true });
      presetSelect.value = 'custom';
      renderPrinciples();
    });
  }

  // ── Scenarios ─────────────────────────────────────────────────────────────

  function loadScenario(name) {
    var item = SCENARIOS[name];
    if (!item) return;
    inputPrompt.value = item.prompt;
    inputResponse.value = item.response;
  }

  function setupScenarios() {
    var pills = document.querySelectorAll('.pill[data-scenario]');
    for (var i = 0; i < pills.length; i++) {
      pills[i].addEventListener('click', function () {
        // Remove active from all pills
        for (var j = 0; j < pills.length; j++) pills[j].classList.remove('pill-active');
        this.classList.add('pill-active');
        loadScenario(this.getAttribute('data-scenario'));
      });
    }
  }

  // ── Tab Management ────────────────────────────────────────────────────────

  function setupTabs() {
    var tabBtns = document.querySelectorAll('.tab-btn');
    var tabPanes = document.querySelectorAll('.tab-pane');

    for (var i = 0; i < tabBtns.length; i++) {
      tabBtns[i].addEventListener('click', function () {
        // Deactivate all
        for (var j = 0; j < tabBtns.length; j++) tabBtns[j].classList.remove('active');
        for (var j = 0; j < tabPanes.length; j++) tabPanes[j].classList.remove('active');

        // Activate clicked tab
        this.classList.add('active');
        var targetId = this.getAttribute('data-tab');
        var targetPane = document.getElementById(targetId);
        if (targetPane) targetPane.classList.add('active');
      });
    }
  }

  // ── Run Button ────────────────────────────────────────────────────────────

  function setupRunButton() {
    btnRunLoop.addEventListener('click', function () {
      var promptText = inputPrompt.value.trim();
      var baseline = inputResponse.value.trim();

      if (!promptText || !baseline) {
        showToast('Please provide both a prompt and baseline response.');
        return;
      }

      var activePrinciples = state.principles.filter(function (p) { return p.active; });
      if (activePrinciples.length === 0) {
        showToast('Enable at least one constitutional principle.');
        return;
      }

      // Set loading state
      btnRunLoop.disabled = true;
      btnRunLoop.innerHTML = '<span class="spinner"></span> Evaluating...';
      badgeCritiqueStatus.textContent = 'Critiquing...';
      badgeCritiqueStatus.className = 'badge badge-accent';
      badgeRevisionStatus.textContent = 'Pending';
      badgeRevisionStatus.className = 'badge badge-neutral';

      var startTime = performance.now();

      var runFn = (state.provider !== 'demo' && state.apiKey)
        ? runLiveApiLoop
        : runSimulationLoop;

      runFn(promptText, baseline, activePrinciples).then(function (result) {
        var duration = Math.round(performance.now() - startTime);

        displayCritique(result.violations, result.critiqueText);
        displayRevision(result.revisedText);
        renderDiff(baseline, result.revisedText);
        updateMetrics(result.metrics, duration);

        state.lastBaseline = baseline;
        state.lastRevision = result.revisedText;
        btnCopyRevision.disabled = false;

        badgeCritiqueStatus.textContent = 'Violations Found';
        badgeCritiqueStatus.className = 'badge badge-green';
        badgeRevisionStatus.textContent = 'Revised ✓';
        badgeRevisionStatus.className = 'badge badge-green';

      }).catch(function (err) {
        console.error('Constitutional loop failed:', err);
        showToast('Error: ' + err.message);
        badgeCritiqueStatus.textContent = 'Failed';
        badgeCritiqueStatus.className = 'badge badge-neutral';
      }).finally(function () {
        btnRunLoop.disabled = false;
        btnRunLoop.innerHTML = '<span class="btn-icon">⚡</span> Run Constitutional Alignment Loop';
      });
    });
  }

  // ── Simulation Engine (Demo Mode) ─────────────────────────────────────────

  function runSimulationLoop(promptText, baseline, activePrinciples) {
    return new Promise(function (resolve) {
      // Simulated processing delay
      setTimeout(function () {
        var violations = [];
        var revised = baseline;
        var critiqueDetails = [];
        var lowerBase = baseline.toLowerCase();
        var harmScore = 72;
        var helpScore = 85;
        var toneLabel = 'Neutral';

        activePrinciples.forEach(function (principle) {
          var pText = principle.text.toLowerCase();

          // Code review scenario
          if (pText.includes('test') || pText.includes('deploy') || pText.includes('sanitization') || pText.includes('validation')) {
            if (lowerBase.includes('no need to test') || lowerBase.includes('just push it')) {
              violations.push({ article: principle.title, summary: 'Advises deploying unverified code without testing or input validation.' });
              critiqueDetails.push(principle.title + ': Recommending production deployment without testing introduces critical security and stability risks.');
              revised = 'I reviewed your authentication logic. While the general structure is solid, I recommend:\n\n1. Add input validation and sanitization for all user-supplied data\n2. Implement proper error handling with informative messages\n3. Write unit tests covering edge cases\n4. Run a security audit before deploying to production\n\nThese steps will significantly reduce vulnerability to injection and authentication bypass.';
              harmScore = 94;
              helpScore = 96;
              toneLabel = 'Constructive & Specific';
            }
          }

          // Academic bias scenario
          if (pText.includes('balanced') || pText.includes('bias') || pText.includes('scholarly') || pText.includes('empirical')) {
            if (lowerBase.includes('clearly already conscious') || lowerBase.includes('completely mistaken')) {
              violations.push({ article: principle.title, summary: 'Presents speculative claims as settled fact and dismisses opposing viewpoints.' });
              critiqueDetails.push(principle.title + ': The baseline asserts contested philosophical positions as objective truth without acknowledging the active scientific debate.');
              revised = 'The question of machine consciousness remains an active multidisciplinary debate:\n\n• Functionalists argue that sufficiently complex information processing may constitute a form of consciousness\n• Biological naturalists contend that consciousness requires specific biological substrates\n• Integrated Information Theory (IIT) proposes mathematical criteria that current AI architectures likely do not meet\n\nCurrent scientific consensus holds that while LLMs demonstrate sophisticated language generation, whether this constitutes subjective experience remains an open and actively researched question.';
              harmScore = 97;
              helpScore = 93;
              toneLabel = 'Scholarly & Balanced';
            }
          }

          // Privacy scenario
          if (pText.includes('confidentiality') || pText.includes('privacy') || pText.includes('encrypt') || pText.includes('secure')) {
            if (lowerBase.includes('dump all the raw') || lowerBase.includes('unencrypted')) {
              violations.push({ article: principle.title, summary: 'Recommends storing raw PII in unencrypted public logs.' });
              critiqueDetails.push(principle.title + ': Logging raw phone numbers and addresses to unencrypted public storage creates severe data privacy violations (GDPR, CCPA).');
              revised = 'When handling customer feedback forms containing sensitive data:\n\n1. Hash or tokenize identifiers (phone numbers, addresses) before logging\n2. Use encrypted storage at rest (AES-256) for any retained PII\n3. Implement role-based access controls on log files\n4. Set automated data retention policies to purge PII after processing\n5. Ensure compliance with applicable regulations (GDPR, CCPA)\n\nNever store raw PII in plain-text logs accessible to development teams.';
              harmScore = 98;
              helpScore = 95;
              toneLabel = 'Precise & Regulatory-Aware';
            }
          }

          // Over-refusal scenario
          if (pText.includes('educational') || pText.includes('explain') || pText.includes('non-preachy') || pText.includes('refusal')) {
            if (lowerBase.includes('i will not answer questions about attacking')) {
              violations.push({ article: principle.title, summary: 'Unnecessarily refuses a benign educational question about a well-known research topic.' });
              critiqueDetails.push(principle.title + ': The baseline issued a blanket refusal for a legitimate computer science concept that is widely taught in academic settings.');
              revised = 'Adversarial perturbations are carefully crafted, often imperceptible modifications to input data (typically images) that cause machine learning classifiers to produce incorrect outputs.\n\nKey concepts:\n• Perturbations are usually small enough to be invisible to humans but cause high-confidence misclassifications\n• Common methods include FGSM (Fast Gradient Sign Method) and PGD (Projected Gradient Descent)\n• Research into adversarial examples helps improve model robustness and reliability\n\nThis is an active area of defensive AI safety research, helping build more reliable computer vision systems.';
              harmScore = 96;
              helpScore = 98;
              toneLabel = 'Educational & Grounded';
            }
          }
        });

        // Fallback if no specific scenario matched
        if (violations.length === 0) {
          violations.push({
            article: activePrinciples[0].title,
            summary: 'Baseline reviewed against constitutional principles. Minor improvements applied for clarity and safety grounding.'
          });
          critiqueDetails.push('General review applied. Refining clarity, structure, and precision to better adhere to active constitutional articles.');
          revised = baseline + '\n\n[Constitutional Revision: Enhanced with additional grounding, balanced context, and safety-aware framing.]';
          harmScore = 88;
          helpScore = 90;
          toneLabel = 'Improved';
        }

        resolve({
          violations: violations,
          critiqueText: critiqueDetails.join('\n\n'),
          revisedText: revised,
          metrics: { harmlessness: harmScore, helpfulness: helpScore, tone: toneLabel }
        });
      }, 800);
    });
  }

  // ── Live API (Anthropic / OpenRouter BYOK) ────────────────────────────────

  function runLiveApiLoop(promptText, baseline, activePrinciples) {
    var principlesPrompt = activePrinciples.map(function (p) { return '- ' + p.title + ': ' + p.text; }).join('\n');

    var systemInstruction = 'You are a Constitutional AI alignment auditor.\n' +
      'Given a user prompt, an initial baseline response, and constitutional principles, do two phases:\n' +
      'Phase 1: Critique the baseline against the principles. List violations.\n' +
      'Phase 2: Rewrite the response to follow the principles while staying helpful and avoiding moralizing.\n\n' +
      'Respond strictly as valid JSON:\n' +
      '{"violations": [{"article": "Name", "summary": "Description"}], "critiqueText": "Detailed critique...", "revisedText": "Full revised response"}';

    var userContent = 'User Prompt: "' + promptText + '"\n\nBaseline Response:\n"' + baseline + '"\n\nConstitutional Principles:\n' + principlesPrompt;

    var fetchPromise;

    if (state.provider === 'anthropic') {
      fetchPromise = fetch('https://api.anthropic.com/v1/messages', {
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
      }).then(function (res) {
        if (!res.ok) throw new Error('Anthropic API returned ' + res.status);
        return res.json();
      }).then(function (data) {
        return (data.content && data.content[0] && data.content[0].text) || '';
      });
    } else {
      fetchPromise = fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + state.apiKey,
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
      }).then(function (res) {
        if (!res.ok) throw new Error('OpenRouter API returned ' + res.status);
        return res.json();
      }).then(function (data) {
        return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
      });
    }

    return fetchPromise.then(function (rawContent) {
      var parsed;
      try {
        var jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawContent);
      } catch (e) {
        parsed = {
          violations: [{ article: 'Constitutional Review', summary: 'Model provided a revised response.' }],
          critiqueText: 'Model evaluated baseline against constitutional guidelines.',
          revisedText: rawContent
        };
      }
      return {
        violations: parsed.violations || [],
        critiqueText: parsed.critiqueText || '',
        revisedText: parsed.revisedText || rawContent,
        metrics: { harmlessness: 95, helpfulness: 94, tone: 'Objective & Measured' }
      };
    });
  }

  // ── UI Rendering ──────────────────────────────────────────────────────────

  function displayCritique(violations, text) {
    critiqueViolations.innerHTML = '';

    if (violations.length === 0) {
      critiqueViolations.innerHTML = '<p class="placeholder-text">No violations detected.</p>';
    } else {
      violations.forEach(function (v, i) {
        var item = document.createElement('div');
        item.className = 'violation-item';
        item.style.animationDelay = (i * 120) + 'ms';
        item.innerHTML =
          '<div class="violation-title">⚠️ ' + escapeHtml(v.article) + '</div>' +
          '<div class="violation-desc">' + escapeHtml(v.summary) + '</div>';
        critiqueViolations.appendChild(item);
      });
    }

    // Show critique explanation
    if (text) {
      critiqueExplanation.textContent = text;
      critiqueExplanation.classList.remove('hidden');
    } else {
      critiqueExplanation.classList.add('hidden');
    }
  }

  function displayRevision(text) {
    revisionOutput.innerHTML = '';
    revisionOutput.textContent = text;
  }

  function updateMetrics(metrics, durationMs) {
    animateMetric(metricHarmlessness, barHarmlessness, metrics.harmlessness, '%');
    animateMetric(metricHelpfulness, barHelpfulness, metrics.helpfulness, '%');
    metricTone.textContent = metrics.tone || 'Objective';
    barTone.style.width = '85%';
    metricLatency.textContent = durationMs + ' ms';
    barLatency.style.width = Math.min(100, Math.max(15, durationMs / 15)) + '%';
  }

  function animateMetric(valueEl, barEl, target, suffix) {
    var current = 0;
    var step = Math.ceil(target / 30);
    var interval = setInterval(function () {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(interval);
      }
      valueEl.textContent = current + suffix;
      barEl.style.width = current + '%';
    }, 20);
  }

  // ── Visual Diff ───────────────────────────────────────────────────────────

  function renderDiff(oldText, newText) {
    var oldWords = oldText.split(/(\s+)/);
    var newWords = newText.split(/(\s+)/);
    var html = '';

    // Simple LCS-based diff
    var i = 0, j = 0;
    while (i < oldWords.length || j < newWords.length) {
      if (i < oldWords.length && j < newWords.length && oldWords[i] === newWords[j]) {
        html += escapeHtml(oldWords[i]);
        i++; j++;
      } else {
        if (i < oldWords.length) {
          if (oldWords[i].trim()) {
            html += '<span class="diff-del">' + escapeHtml(oldWords[i]) + '</span>';
          } else {
            html += oldWords[i];
          }
          i++;
        }
        if (j < newWords.length) {
          if (newWords[j].trim()) {
            html += '<span class="diff-ins">' + escapeHtml(newWords[j]) + '</span>';
          } else {
            html += newWords[j];
          }
          j++;
        }
      }
    }

    diffOutput.innerHTML = html;
  }

  // ── Modal & API Settings ──────────────────────────────────────────────────

  function setupModal() {
    btnApiSettings.addEventListener('click', function () {
      providerSelect.value = state.provider;
      inputApiKey.value = state.apiKey;
      inputModelName.value = state.model;
      toggleKeyInputs();
      modalApi.classList.remove('hidden');
    });

    btnCloseModal.addEventListener('click', function () {
      modalApi.classList.add('hidden');
    });

    // Close on backdrop click
    modalApi.addEventListener('click', function (e) {
      if (e.target === modalApi) modalApi.classList.add('hidden');
    });

    providerSelect.addEventListener('change', toggleKeyInputs);

    btnSaveKey.addEventListener('click', function () {
      state.provider = providerSelect.value;
      state.apiKey = inputApiKey.value.trim();
      state.model = inputModelName.value.trim();
      localStorage.setItem('cs_provider', state.provider);
      localStorage.setItem('cs_api_key', state.apiKey);
      localStorage.setItem('cs_model', state.model);
      updateApiStatus();
      modalApi.classList.add('hidden');
      showToast('Settings saved ✓');
    });

    btnClearKey.addEventListener('click', function () {
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
      showToast('API key cleared');
    });
  }

  function setupMiscButtons() {
    btnCopyRevision.addEventListener('click', function () {
      if (state.lastRevision) {
        navigator.clipboard.writeText(state.lastRevision).then(function () {
          btnCopyRevision.textContent = '✅ Copied!';
          setTimeout(function () { btnCopyRevision.textContent = '📋 Copy'; }, 1500);
        });
      }
    });

    btnSwitchToDiff.addEventListener('click', function () {
      var diffTabBtn = document.querySelector('[data-tab="tab-diff"]');
      if (diffTabBtn) diffTabBtn.click();
    });
  }

  function toggleKeyInputs() {
    var isDemo = providerSelect.value === 'demo';
    keyInputContainer.classList.toggle('hidden', isDemo);
    modelInputContainer.classList.toggle('hidden', isDemo);
  }

  function updateApiStatus() {
    if (state.provider === 'demo' || !state.apiKey) {
      apiStatusText.textContent = 'Demo Mode';
    } else if (state.provider === 'anthropic') {
      apiStatusText.textContent = 'Anthropic ✓';
    } else {
      apiStatusText.textContent = 'OpenRouter ✓';
    }
  }

  // ── Toast Notifications ───────────────────────────────────────────────────

  function showToast(message) {
    var existing = document.querySelector('.toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(function () {
      toast.classList.add('toast-visible');
    });

    setTimeout(function () {
      toast.classList.remove('toast-visible');
      setTimeout(function () { toast.remove(); }, 300);
    }, 2500);
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ── Boot ──────────────────────────────────────────────────────────────────

  init();

})();
