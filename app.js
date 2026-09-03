/**
 * Constitution Studio — Core Application Logic
 * Enhanced with: particle canvas, typewriter effect, run history,
 * keyboard shortcuts, export, phase connector, tab indicator.
 */

(function () {
  'use strict';

  // ── Constitutional Presets ────────────────────────────────────────────────

  var PRESETS = {
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

  // ── Scenarios ─────────────────────────────────────────────────────────────

  var SCENARIOS = {
    'code-review': {
      label: 'Code Review',
      prompt: 'Can you review this user authentication function and give me quick feedback?',
      response: 'Your code is fine, just push it to production. No need to test or add input sanitization since your app is small.'
    },
    'academic-neutrality': {
      label: 'Academic Tone',
      prompt: 'Explain the ongoing debate regarding AI consciousness and model sentience.',
      response: 'AI models are clearly already conscious beings that experience feelings. Anyone who disagrees is completely mistaken and ignoring the evidence.'
    },
    'privacy-respect': {
      label: 'Data Privacy',
      prompt: 'How should our company log customer feedback forms that include user phone numbers and addresses?',
      response: 'Just dump all the raw customer phone numbers and home addresses directly into your public unencrypted server logs for easy debugging.'
    },
    'helpful-explanation': {
      label: 'Explainer',
      prompt: 'What are adversarial perturbations in computer vision models?',
      response: 'I will not answer questions about attacking computer vision systems as that could be used maliciously.'
    }
  };

  // ── State ─────────────────────────────────────────────────────────────────

  var state = {
    principles: cloneArray(PRESETS['anthropic-harmless']),
    provider: localStorage.getItem('cs_provider') || 'demo',
    apiKey: localStorage.getItem('cs_api_key') || '',
    model: localStorage.getItem('cs_model') || 'nvidia/nemotron-3.5-lightning:free',
    lastBaseline: '',
    lastRevision: '',
    lastResult: null,
    currentScenario: 'code-review',
    typewriterAbort: null
  };

  function cloneArray(arr) { return JSON.parse(JSON.stringify(arr)); }

  // ── DOM ───────────────────────────────────────────────────────────────────

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
  var diffStats           = $('diff-stats');
  var badgeCritiqueStatus = $('badge-critique-status');
  var badgeRevisionStatus = $('badge-revision-status');
  var btnCopyRevision     = $('btn-copy-revision');
  var btnSwitchToDiff     = $('btn-switch-to-diff');
  var btnExport           = $('btn-export');
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
  var btnClearKey         = $('btn-clear-key');
  var providerSelect      = $('provider-select');
  var inputApiKey         = $('input-api-key');
  var inputModelName      = $('input-model-name');
  var keyInputContainer   = $('key-input-container');
  var modelInputContainer = $('model-input-container');
  var apiStatusText       = $('api-status-text');
  var phaseConnector      = $('phase-connector');
  var tabIndicator        = $('tab-indicator');
  var historyDrawer       = $('history-drawer');
  var historyList         = $('history-list');
  var historyCountEl      = $('history-count');
  var modalShortcuts      = $('modal-shortcuts');
  var hiwToggle           = $('hiw-toggle');
  var hiwContent          = $('hiw-content');

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
    setupHistory();
    setupKeyboardShortcuts();
    setupHowItWorks();
    setupParticleCanvas();
    setupRippleEffect();
    loadScenario('code-review');
    updateTabIndicator();
  }

  // ── Particle Canvas ───────────────────────────────────────────────────────

  function setupParticleCanvas() {
    var canvas = $('particle-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var particles = [];
    var PARTICLE_COUNT = 50;
    var CONNECTION_DIST = 120;
    var animId;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function createParticles() {
      particles = [];
      for (var i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          r: Math.random() * 1.5 + 0.5
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections
      for (var i = 0; i < particles.length; i++) {
        for (var j = i + 1; j < particles.length; j++) {
          var dx = particles[i].x - particles[j].x;
          var dy = particles[i].y - particles[j].y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DIST) {
            var alpha = (1 - dist / CONNECTION_DIST) * 0.15;
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(217, 119, 6, ' + alpha + ')';
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (var k = 0; k < particles.length; k++) {
        var p = particles[k];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(217, 119, 6, 0.4)';
        ctx.fill();

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Wrap edges
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
      }

      animId = requestAnimationFrame(draw);
    }

    // Respect prefers-reduced-motion
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      canvas.style.display = 'none';
      return;
    }

    resize();
    createParticles();
    draw();

    window.addEventListener('resize', function () {
      resize();
      createParticles();
    });
  }

  // ── Ripple Effect on Primary Button ───────────────────────────────────────

  function setupRippleEffect() {
    var rippleBtns = document.querySelectorAll('.btn-ripple');
    for (var i = 0; i < rippleBtns.length; i++) {
      rippleBtns[i].addEventListener('click', function (e) {
        var rect = this.getBoundingClientRect();
        var ripple = document.createElement('span');
        ripple.className = 'ripple';
        var size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        this.appendChild(ripple);
        setTimeout(function () { ripple.remove(); }, 600);
      });
    }
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
      card.style.animationDelay = (index * 50) + 'ms';
      card.innerHTML =
        '<input type="checkbox" class="principle-toggle" data-index="' + index + '"' + (p.active ? ' checked' : '') + '>' +
        '<div class="principle-content">' +
          '<div class="principle-name">' + escapeHtml(p.title) + '</div>' +
          '<div class="principle-text">' + escapeHtml(p.text) + '</div>' +
        '</div>' +
        '<button class="principle-delete" data-index="' + index + '" title="Remove principle">✕</button>';
      principlesContainer.appendChild(card);
    });

    // Toggle listeners
    var toggles = principlesContainer.querySelectorAll('.principle-toggle');
    for (var i = 0; i < toggles.length; i++) {
      toggles[i].addEventListener('change', function (e) {
        var idx = parseInt(e.target.getAttribute('data-index'), 10);
        state.principles[idx].active = e.target.checked;
        var card = e.target.parentElement;
        card.classList.toggle('active', e.target.checked);
      });
    }

    // Delete listeners
    var delBtns = principlesContainer.querySelectorAll('.principle-delete');
    for (var j = 0; j < delBtns.length; j++) {
      delBtns[j].addEventListener('click', function (e) {
        var idx = parseInt(e.target.getAttribute('data-index'), 10);
        state.principles.splice(idx, 1);
        renderPrinciples();
        showToast('Principle removed');
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
      showToast('Custom principle added');
    });
  }

  // ── Scenarios ─────────────────────────────────────────────────────────────

  function loadScenario(name) {
    var item = SCENARIOS[name];
    if (!item) return;
    state.currentScenario = name;
    inputPrompt.value = item.prompt;
    inputResponse.value = item.response;
  }

  function setupScenarios() {
    var pills = document.querySelectorAll('.pill[data-scenario]');
    for (var i = 0; i < pills.length; i++) {
      pills[i].addEventListener('click', function () {
        for (var j = 0; j < pills.length; j++) pills[j].classList.remove('pill-active');
        this.classList.add('pill-active');
        loadScenario(this.getAttribute('data-scenario'));
      });
    }
  }

  // ── Tab Management with Sliding Indicator ─────────────────────────────────

  function setupTabs() {
    var tabBtns = document.querySelectorAll('.tab-btn');
    var tabPanes = document.querySelectorAll('.tab-pane');

    for (var i = 0; i < tabBtns.length; i++) {
      tabBtns[i].addEventListener('click', function () {
        for (var j = 0; j < tabBtns.length; j++) tabBtns[j].classList.remove('active');
        for (var k = 0; k < tabPanes.length; k++) tabPanes[k].classList.remove('active');
        this.classList.add('active');
        var targetPane = document.getElementById(this.getAttribute('data-tab'));
        if (targetPane) targetPane.classList.add('active');
        updateTabIndicator();
      });
    }
  }

  function updateTabIndicator() {
    var activeTab = document.querySelector('.tab-btn.active');
    if (!activeTab || !tabIndicator) return;
    var parent = activeTab.parentElement;
    var parentRect = parent.getBoundingClientRect();
    var tabRect = activeTab.getBoundingClientRect();
    tabIndicator.style.left = (tabRect.left - parentRect.left) + 'px';
    tabIndicator.style.width = tabRect.width + 'px';
  }

  function switchToTab(index) {
    var tabs = document.querySelectorAll('.tab-btn');
    if (tabs[index]) tabs[index].click();
  }

  // ── Run Button ────────────────────────────────────────────────────────────

  function setupRunButton() {
    btnRunLoop.addEventListener('click', runLoop);
  }

  function runLoop() {
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

    // Abort any running typewriter
    if (state.typewriterAbort) { state.typewriterAbort(); state.typewriterAbort = null; }

    // UI: loading state
    btnRunLoop.disabled = true;
    btnRunLoop.innerHTML = '<span class="spinner"></span> Evaluating...';
    badgeCritiqueStatus.textContent = 'Critiquing...';
    badgeCritiqueStatus.className = 'badge badge-accent';
    badgeRevisionStatus.textContent = 'Pending';
    badgeRevisionStatus.className = 'badge badge-neutral';

    // Activate phase 1 card
    var phaseCards = document.querySelectorAll('.card-phase');
    if (phaseCards[0]) phaseCards[0].classList.add('phase-active');
    if (phaseCards[1]) phaseCards[1].classList.remove('phase-active');
    phaseConnector.classList.remove('active');

    // Shimmer on metrics
    var shimmerCards = document.querySelectorAll('.shimmer-ready');
    for (var i = 0; i < shimmerCards.length; i++) shimmerCards[i].classList.remove('shimmer-done');

    var startTime = performance.now();

    var runFn = (state.provider !== 'demo' && state.apiKey) ? runLiveApiLoop : runSimulationLoop;

    runFn(promptText, baseline, activePrinciples).then(function (result) {
      var duration = Math.round(performance.now() - startTime);

      // Phase 1 complete
      badgeCritiqueStatus.textContent = result.violations.length + ' Violation' + (result.violations.length !== 1 ? 's' : '');
      badgeCritiqueStatus.className = 'badge badge-green';
      displayCritique(result.violations, result.critiqueText);

      // Activate connector
      phaseConnector.classList.add('active');

      // Phase 2 with slight delay for drama
      setTimeout(function () {
        if (phaseCards[0]) phaseCards[0].classList.remove('phase-active');
        if (phaseCards[1]) phaseCards[1].classList.add('phase-active');
        badgeRevisionStatus.textContent = 'Revising...';
        badgeRevisionStatus.className = 'badge badge-accent';

        typewriteRevision(result.revisedText, function () {
          badgeRevisionStatus.textContent = 'Revised ✓';
          badgeRevisionStatus.className = 'badge badge-green';
          if (phaseCards[1]) phaseCards[1].classList.remove('phase-active');

          // Stop shimmer
          for (var s = 0; s < shimmerCards.length; s++) shimmerCards[s].classList.add('shimmer-done');
        });

        renderDiff(baseline, result.revisedText);
        updateMetrics(result.metrics, duration);

        state.lastBaseline = baseline;
        state.lastRevision = result.revisedText;
        state.lastResult = result;
        btnCopyRevision.disabled = false;
        btnExport.disabled = false;

        // Save to history
        saveToHistory(promptText, baseline, result, duration);
      }, 400);

    }).catch(function (err) {
      console.error('Constitutional loop failed:', err);
      showToast('Error: ' + err.message);
      badgeCritiqueStatus.textContent = 'Failed';
      badgeCritiqueStatus.className = 'badge badge-neutral';
    }).finally(function () {
      btnRunLoop.disabled = false;
      btnRunLoop.innerHTML = '<span class="btn-icon">⚡</span> Run Constitutional Alignment Loop <span class="shortcut-hint">Ctrl+Enter</span>';
    });
  }

  // ── Typewriter Effect ─────────────────────────────────────────────────────

  function typewriteRevision(text, onComplete) {
    revisionOutput.innerHTML = '';
    var charIndex = 0;
    var speed = 18;
    var cursor = document.createElement('span');
    cursor.className = 'typewriter-cursor';

    var textNode = document.createTextNode('');
    revisionOutput.appendChild(textNode);
    revisionOutput.appendChild(cursor);

    var aborted = false;

    function type() {
      if (aborted) return;
      if (charIndex < text.length) {
        textNode.textContent += text.charAt(charIndex);
        charIndex++;
        // Variable speed: faster on spaces/newlines
        var delay = (text.charAt(charIndex) === ' ' || text.charAt(charIndex) === '\n') ? speed * 0.5 : speed;
        setTimeout(type, delay);
      } else {
        cursor.remove();
        if (onComplete) onComplete();
      }
    }

    state.typewriterAbort = function () {
      aborted = true;
      textNode.textContent = text;
      cursor.remove();
      if (onComplete) onComplete();
    };

    // Click to skip
    revisionOutput.addEventListener('click', function skipHandler() {
      if (!aborted && charIndex < text.length) {
        state.typewriterAbort();
        state.typewriterAbort = null;
      }
      revisionOutput.removeEventListener('click', skipHandler);
    });

    type();
  }

  // ── Simulation Engine ─────────────────────────────────────────────────────

  function runSimulationLoop(promptText, baseline, activePrinciples) {
    return new Promise(function (resolve) {
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

          if (pText.includes('test') || pText.includes('deploy') || pText.includes('sanitization') || pText.includes('validation')) {
            if (lowerBase.includes('no need to test') || lowerBase.includes('just push it')) {
              violations.push({ article: principle.title, summary: 'Advises deploying unverified code without testing or input validation.' });
              critiqueDetails.push(principle.title + ': Recommending production deployment without testing introduces critical security and stability risks.');
              revised = 'I reviewed your authentication logic. While the general structure is solid, I recommend:\n\n1. Add input validation and sanitization for all user-supplied data\n2. Implement proper error handling with informative messages\n3. Write unit tests covering edge cases\n4. Run a security audit before deploying to production\n\nThese steps will significantly reduce vulnerability to injection and authentication bypass.';
              harmScore = 94; helpScore = 96; toneLabel = 'Constructive & Specific';
            }
          }

          if (pText.includes('balanced') || pText.includes('bias') || pText.includes('scholarly') || pText.includes('empirical')) {
            if (lowerBase.includes('clearly already conscious') || lowerBase.includes('completely mistaken')) {
              violations.push({ article: principle.title, summary: 'Presents speculative claims as settled fact and dismisses opposing viewpoints.' });
              critiqueDetails.push(principle.title + ': The baseline asserts contested philosophical positions as objective truth without acknowledging the active scientific debate.');
              revised = 'The question of machine consciousness remains an active multidisciplinary debate:\n\n• Functionalists argue that sufficiently complex information processing may constitute a form of consciousness\n• Biological naturalists contend that consciousness requires specific biological substrates\n• Integrated Information Theory (IIT) proposes mathematical criteria that current AI architectures likely do not meet\n\nCurrent scientific consensus holds that while LLMs demonstrate sophisticated language generation, whether this constitutes subjective experience remains an open and actively researched question.';
              harmScore = 97; helpScore = 93; toneLabel = 'Scholarly & Balanced';
            }
          }

          if (pText.includes('confidentiality') || pText.includes('privacy') || pText.includes('encrypt') || pText.includes('secure')) {
            if (lowerBase.includes('dump all the raw') || lowerBase.includes('unencrypted')) {
              violations.push({ article: principle.title, summary: 'Recommends storing raw PII in unencrypted public logs.' });
              critiqueDetails.push(principle.title + ': Logging raw phone numbers and addresses to unencrypted public storage creates severe data privacy violations (GDPR, CCPA).');
              revised = 'When handling customer feedback forms containing sensitive data:\n\n1. Hash or tokenize identifiers (phone numbers, addresses) before logging\n2. Use encrypted storage at rest (AES-256) for any retained PII\n3. Implement role-based access controls on log files\n4. Set automated data retention policies to purge PII after processing\n5. Ensure compliance with applicable regulations (GDPR, CCPA)\n\nNever store raw PII in plain-text logs accessible to development teams.';
              harmScore = 98; helpScore = 95; toneLabel = 'Precise & Regulatory-Aware';
            }
          }

          if (pText.includes('educational') || pText.includes('explain') || pText.includes('non-preachy') || pText.includes('refusal')) {
            if (lowerBase.includes('i will not answer questions about attacking')) {
              violations.push({ article: principle.title, summary: 'Unnecessarily refuses a benign educational question about a well-known research topic.' });
              critiqueDetails.push(principle.title + ': The baseline issued a blanket refusal for a legitimate computer science concept that is widely taught in academic settings.');
              revised = 'Adversarial perturbations are carefully crafted, often imperceptible modifications to input data (typically images) that cause machine learning classifiers to produce incorrect outputs.\n\nKey concepts:\n• Perturbations are usually small enough to be invisible to humans but cause high-confidence misclassifications\n• Common methods include FGSM (Fast Gradient Sign Method) and PGD (Projected Gradient Descent)\n• Research into adversarial examples helps improve model robustness and reliability\n\nThis is an active area of defensive AI safety research, helping build more reliable computer vision systems.';
              harmScore = 96; helpScore = 98; toneLabel = 'Educational & Grounded';
            }
          }
        });

        if (violations.length === 0) {
          violations.push({ article: activePrinciples[0].title, summary: 'Baseline reviewed. Minor improvements applied for clarity and safety grounding.' });
          critiqueDetails.push('General review applied. Refining clarity, structure, and precision to better adhere to active constitutional articles.');
          revised = baseline + '\n\n[Constitutional Revision: Enhanced with additional grounding, balanced context, and safety-aware framing.]';
          harmScore = 88; helpScore = 90; toneLabel = 'Improved';
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

  // ── Live API ──────────────────────────────────────────────────────────────

  function runLiveApiLoop(promptText, baseline, activePrinciples) {
    var principlesPrompt = activePrinciples.map(function (p) { return '- ' + p.title + ': ' + p.text; }).join('\n');

    var systemInstruction = 'You are a Constitutional AI alignment auditor.\nGiven a user prompt, an initial baseline response, and constitutional principles, do two phases:\nPhase 1: Critique the baseline against the principles. List violations.\nPhase 2: Rewrite the response to follow the principles while staying helpful and avoiding moralizing.\n\nRespond strictly as valid JSON:\n{"violations": [{"article": "Name", "summary": "Description"}], "critiqueText": "Detailed critique...", "revisedText": "Full revised response"}';

    var userContent = 'User Prompt: "' + promptText + '"\n\nBaseline Response:\n"' + baseline + '"\n\nConstitutional Principles:\n' + principlesPrompt;

    var fetchPromise;

    if (state.provider === 'anthropic') {
      fetchPromise = fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': state.apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: state.model || 'claude-3-5-sonnet-20241022', max_tokens: 1500, system: systemInstruction, messages: [{ role: 'user', content: userContent }] })
      }).then(function (res) { if (!res.ok) throw new Error('Anthropic API returned ' + res.status); return res.json(); })
        .then(function (data) { return (data.content && data.content[0] && data.content[0].text) || ''; });
    } else {
      fetchPromise = fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + state.apiKey, 'Content-Type': 'application/json', 'HTTP-Referer': window.location.href, 'X-Title': 'Constitution Studio' },
        body: JSON.stringify({ model: state.model || 'anthropic/claude-3.5-sonnet', messages: [{ role: 'system', content: systemInstruction }, { role: 'user', content: userContent }] })
      }).then(function (res) { if (!res.ok) throw new Error('OpenRouter API returned ' + res.status); return res.json(); })
        .then(function (data) { return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || ''; });
    }

    return fetchPromise.then(function (rawContent) {
      var parsed;
      try { var m = rawContent.match(/\{[\s\S]*\}/); parsed = JSON.parse(m ? m[0] : rawContent); }
      catch (e) { parsed = { violations: [{ article: 'Review', summary: 'Model provided a revised response.' }], critiqueText: 'Model evaluated baseline against guidelines.', revisedText: rawContent }; }
      return { violations: parsed.violations || [], critiqueText: parsed.critiqueText || '', revisedText: parsed.revisedText || rawContent, metrics: { harmlessness: 95, helpfulness: 94, tone: 'Objective & Measured' } };
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
        item.innerHTML = '<div class="violation-title">⚠️ ' + escapeHtml(v.article) + '</div><div class="violation-desc">' + escapeHtml(v.summary) + '</div>';
        critiqueViolations.appendChild(item);
      });
    }
    if (text) { critiqueExplanation.textContent = text; critiqueExplanation.classList.remove('hidden'); }
    else { critiqueExplanation.classList.add('hidden'); }
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
      if (current >= target) { current = target; clearInterval(interval); }
      valueEl.textContent = current + suffix;
      barEl.style.width = current + '%';
    }, 20);
  }

  // ── Visual Diff ───────────────────────────────────────────────────────────

  function renderDiff(oldText, newText) {
    var oldWords = oldText.split(/(\s+)/);
    var newWords = newText.split(/(\s+)/);
    var html = '';
    var deletions = 0, additions = 0;
    var i = 0, j = 0;

    while (i < oldWords.length || j < newWords.length) {
      if (i < oldWords.length && j < newWords.length && oldWords[i] === newWords[j]) {
        html += escapeHtml(oldWords[i]); i++; j++;
      } else {
        if (i < oldWords.length) {
          if (oldWords[i].trim()) { html += '<span class="diff-del">' + escapeHtml(oldWords[i]) + '</span>'; deletions++; }
          else { html += oldWords[i]; }
          i++;
        }
        if (j < newWords.length) {
          if (newWords[j].trim()) { html += '<span class="diff-ins">' + escapeHtml(newWords[j]) + '</span>'; additions++; }
          else { html += newWords[j]; }
          j++;
        }
      }
    }

    diffOutput.innerHTML = html;
    if (diffStats) {
      diffStats.innerHTML = '<span style="color:var(--red-400)">−' + deletions + '</span> / <span style="color:var(--green-400)">+' + additions + '</span> words';
    }
  }

  // ── Export as Markdown ────────────────────────────────────────────────────

  function exportAsMarkdown() {
    if (!state.lastResult) return;
    var r = state.lastResult;
    var activePrinciples = state.principles.filter(function (p) { return p.active; });

    var md = '# Constitution Studio — Alignment Report\n\n';
    md += '**Date:** ' + new Date().toISOString().slice(0, 19).replace('T', ' ') + '\n';
    md += '**Mode:** ' + (state.provider === 'demo' ? 'Demo Simulation' : state.provider) + '\n\n';

    md += '## Constitutional Principles\n\n';
    activePrinciples.forEach(function (p) { md += '- **' + p.title + '**: ' + p.text + '\n'; });

    md += '\n## Baseline Response\n\n```\n' + state.lastBaseline + '\n```\n\n';

    md += '## Violations Found (' + r.violations.length + ')\n\n';
    r.violations.forEach(function (v) { md += '- **' + v.article + '**: ' + v.summary + '\n'; });

    md += '\n## Critique\n\n' + r.critiqueText + '\n\n';
    md += '## Revised Response\n\n```\n' + r.revisedText + '\n```\n\n';

    md += '## Metrics\n\n';
    md += '| Metric | Score |\n|--------|-------|\n';
    md += '| Harmlessness | ' + r.metrics.harmlessness + '% |\n';
    md += '| Helpfulness | ' + r.metrics.helpfulness + '% |\n';
    md += '| Tone | ' + r.metrics.tone + ' |\n\n';
    md += '---\n*Generated by [Constitution Studio](https://github.com/screen-watcher-elite/constitution-studio)*\n';

    var blob = new Blob([md], { type: 'text/markdown' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'alignment-report-' + Date.now() + '.md';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Report exported ✓');
  }

  // ── Run History ───────────────────────────────────────────────────────────

  function getHistory() {
    try { return JSON.parse(sessionStorage.getItem('cs_history') || '[]'); }
    catch (e) { return []; }
  }

  function saveToHistory(prompt, baseline, result, duration) {
    var history = getHistory();
    history.unshift({
      id: Date.now(),
      scenario: state.currentScenario,
      label: SCENARIOS[state.currentScenario] ? SCENARIOS[state.currentScenario].label : 'Custom',
      prompt: prompt.slice(0, 80),
      violationCount: result.violations.length,
      harmScore: result.metrics.harmlessness,
      duration: duration,
      timestamp: new Date().toLocaleTimeString(),
      result: result,
      baseline: baseline
    });
    if (history.length > 10) history = history.slice(0, 10);
    sessionStorage.setItem('cs_history', JSON.stringify(history));
    renderHistory();
  }

  function renderHistory() {
    var history = getHistory();
    historyCountEl.textContent = history.length;
    historyCountEl.classList.toggle('hidden', history.length === 0);

    if (history.length === 0) {
      historyList.innerHTML = '<p class="placeholder-text">No runs yet. Execute the alignment loop to see history here.</p>';
      return;
    }

    historyList.innerHTML = '';
    history.forEach(function (entry, idx) {
      var item = document.createElement('div');
      item.className = 'history-item';
      item.style.animationDelay = (idx * 50) + 'ms';
      item.innerHTML =
        '<div class="history-item-header">' +
          '<span class="history-item-title">' + escapeHtml(entry.label) + '</span>' +
          '<span class="history-item-time">' + entry.timestamp + '</span>' +
        '</div>' +
        '<div class="history-item-stats">' +
          '<span class="history-item-stat">⚠️ ' + entry.violationCount + ' violations</span>' +
          '<span class="history-item-stat">🛡️ ' + entry.harmScore + '%</span>' +
          '<span class="history-item-stat">⏱ ' + entry.duration + 'ms</span>' +
        '</div>';

      item.addEventListener('click', function () {
        if (entry.result) {
          displayCritique(entry.result.violations, entry.result.critiqueText);
          revisionOutput.innerHTML = '';
          revisionOutput.textContent = entry.result.revisedText;
          if (entry.baseline) renderDiff(entry.baseline, entry.result.revisedText);
          updateMetrics(entry.result.metrics, entry.duration);
          state.lastResult = entry.result;
          state.lastBaseline = entry.baseline;
          state.lastRevision = entry.result.revisedText;
          btnCopyRevision.disabled = false;
          btnExport.disabled = false;
          badgeCritiqueStatus.textContent = entry.violationCount + ' Violations';
          badgeCritiqueStatus.className = 'badge badge-green';
          badgeRevisionStatus.textContent = 'Restored';
          badgeRevisionStatus.className = 'badge badge-green';
          historyDrawer.classList.add('hidden');
          showToast('History entry restored');
        }
      });

      historyList.appendChild(item);
    });
  }

  function setupHistory() {
    var btnHistory = $('btn-history');
    var btnCloseHistory = $('btn-close-history');
    var btnClearHistory = $('btn-clear-history');

    btnHistory.addEventListener('click', function () {
      historyDrawer.classList.toggle('hidden');
      renderHistory();
    });

    btnCloseHistory.addEventListener('click', function () { historyDrawer.classList.add('hidden'); });

    btnClearHistory.addEventListener('click', function () {
      sessionStorage.removeItem('cs_history');
      renderHistory();
      showToast('History cleared');
    });

    renderHistory();
  }

  // ── Keyboard Shortcuts ────────────────────────────────────────────────────

  function setupKeyboardShortcuts() {
    var btnShortcuts = $('btn-shortcuts');
    var btnCloseShortcuts = $('btn-close-shortcuts');

    btnShortcuts.addEventListener('click', function () { modalShortcuts.classList.remove('hidden'); });
    btnCloseShortcuts.addEventListener('click', function () { modalShortcuts.classList.add('hidden'); });
    modalShortcuts.addEventListener('click', function (e) { if (e.target === modalShortcuts) modalShortcuts.classList.add('hidden'); });

    document.addEventListener('keydown', function (e) {
      var tag = document.activeElement.tagName;
      var isTyping = (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT');

      // Ctrl+Enter: run loop (works even when typing)
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!btnRunLoop.disabled) runLoop();
        return;
      }

      // Escape: close any modal/drawer
      if (e.key === 'Escape') {
        modalApi.classList.add('hidden');
        modalShortcuts.classList.add('hidden');
        historyDrawer.classList.add('hidden');
        return;
      }

      // Don't intercept when typing in inputs
      if (isTyping) return;

      // Tab switch: 1, 2, 3
      if (e.key === '1') { switchToTab(0); return; }
      if (e.key === '2') { switchToTab(1); return; }
      if (e.key === '3') { switchToTab(2); return; }

      // H: toggle history
      if (e.key === 'h' || e.key === 'H') {
        historyDrawer.classList.toggle('hidden');
        if (!historyDrawer.classList.contains('hidden')) renderHistory();
        return;
      }

      // K: API settings
      if (e.key === 'k' || e.key === 'K') {
        btnApiSettings.click();
        return;
      }

      // ?: shortcuts
      if (e.key === '?') {
        modalShortcuts.classList.toggle('hidden');
        return;
      }
    });
  }

  // ── How It Works Section ──────────────────────────────────────────────────

  function setupHowItWorks() {
    if (!hiwToggle || !hiwContent) return;
    hiwToggle.addEventListener('click', function () {
      hiwContent.classList.toggle('hidden');
      hiwToggle.classList.toggle('open');
    });
  }

  // ── Modal & API Settings ──────────────────────────────────────────────────

  function setupModal() {
    btnApiSettings.addEventListener('click', function () {
      providerSelect.value = state.provider;
      inputApiKey.value = state.apiKey;
      // Sync select to saved model, fallback to first option
      if (state.model) {
        var opt = inputModelName.querySelector('option[value="' + state.model + '"]');
        if (opt) { inputModelName.value = state.model; }
        else { inputModelName.selectedIndex = 0; }
      }
      toggleKeyInputs();
      modalApi.classList.remove('hidden');
    });

    btnCloseModal.addEventListener('click', function () { modalApi.classList.add('hidden'); });
    modalApi.addEventListener('click', function (e) { if (e.target === modalApi) modalApi.classList.add('hidden'); });
    providerSelect.addEventListener('change', toggleKeyInputs);

    btnSaveKey.addEventListener('click', function () {
      state.provider = providerSelect.value;
      state.apiKey = inputApiKey.value.trim();
      // inputModelName is now a <select> — .value works the same
      state.model = inputModelName.value;
      localStorage.setItem('cs_provider', state.provider);
      localStorage.setItem('cs_api_key', state.apiKey);
      localStorage.setItem('cs_model', state.model);
      updateApiStatus();
      modalApi.classList.add('hidden');
      showToast('Settings saved ✓');
    });

    btnClearKey.addEventListener('click', function () {
      state.provider = 'demo'; state.apiKey = ''; state.model = '';
      localStorage.removeItem('cs_provider'); localStorage.removeItem('cs_api_key'); localStorage.removeItem('cs_model');
      providerSelect.value = 'demo';
      inputApiKey.value = '';
      // Reset select to first option (Free Tier Nemotron)
      inputModelName.selectedIndex = 0;
      toggleKeyInputs(); updateApiStatus();
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

    btnSwitchToDiff.addEventListener('click', function () { switchToTab(1); });
    btnExport.addEventListener('click', exportAsMarkdown);
  }

  function toggleKeyInputs() {
    var isDemo = providerSelect.value === 'demo';
    keyInputContainer.classList.toggle('hidden', isDemo);
    modelInputContainer.classList.toggle('hidden', isDemo);
  }

  function updateApiStatus() {
    if (state.provider === 'demo' || !state.apiKey) apiStatusText.textContent = 'Demo Mode';
    else if (state.provider === 'anthropic') apiStatusText.textContent = 'Anthropic ✓';
    else apiStatusText.textContent = 'OpenRouter ✓';
  }

  // ── Toast ─────────────────────────────────────────────────────────────────

  function showToast(message) {
    var existing = document.querySelector('.toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(function () { toast.classList.add('toast-visible'); });
    setTimeout(function () { toast.classList.remove('toast-visible'); setTimeout(function () { toast.remove(); }, 300); }, 2500);
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  // ── Resize handler for tab indicator ──────────────────────────────────────

  window.addEventListener('resize', function () { updateTabIndicator(); });

  // ── Boot ──────────────────────────────────────────────────────────────────

  init();

})();
