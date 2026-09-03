# Constitution Studio ⚖️

> An interactive visual playground for [Anthropic's Constitutional AI (CAI)](https://www.anthropic.com/research/constitutional-ai-harmlessness-from-ai-feedback) alignment loop. Test, visualize, and audit the 2-phase **Critique → Revision** cycle in real-time — entirely in your browser.

![License](https://img.shields.io/badge/license-Apache%202.0-blue)
![Zero Backend](https://img.shields.io/badge/backend-none-brightgreen)
![BYOK](https://img.shields.io/badge/API-BYOK-orange)

---

## ✨ What It Does

Constitution Studio lets you **interactively simulate** how Constitutional AI works:

1. **Define Constitutional Principles** — Pick from presets (Anthropic Harmlessness, Academic Neutrality, Privacy, Software Quality) or write your own.
2. **Provide a Baseline Response** — Enter a model's raw, unaligned output.
3. **Run the Loop** — Watch the 2-phase critique → revision cycle execute:
   - **Phase 1: Critique** — Each active principle evaluates the baseline and flags violations.
   - **Phase 2: Revision** — The response is rewritten to comply with all principles while maximizing helpfulness.
4. **Inspect Results** — View violations, the revised output, a color-coded visual diff, and alignment metrics.

---

## 🚀 Features

| Feature | Description |
|---------|------------|
| **4 Preset Constitutions** | Anthropic Harmlessness, Academic Neutrality, Privacy & Data, Software Quality |
| **Custom Principles** | Add your own constitutional articles at runtime |
| **4 Benchmark Scenarios** | Pre-loaded prompts to demonstrate common alignment patterns |
| **Visual Diff** | Color-coded word-level diff between baseline and revision |
| **Alignment Metrics** | Harmlessness score, helpfulness retention, tone quality, latency |
| **Animated Counters** | Metrics animate up with smooth counting effect |
| **Toast Notifications** | Non-intrusive feedback for user actions |
| **BYOK API Mode** | Connect your own Anthropic or OpenRouter API key for live LLM evaluation |
| **Demo Simulation** | Built-in procedural simulation engine — works with zero API keys |
| **Dark Glassmorphism 2.0** | Premium spatial UI with ambient glows, noise textures, and spring animations |

---

## 🎯 Quick Start

**No build step. No dependencies. No server.**

1. Clone or download this repo
2. Open `index.html` in any modern browser
3. Click a scenario pill (e.g., "💻 Code Review")
4. Hit **⚡ Run Constitutional Alignment Loop**
5. Switch between the three tabs to explore results

```bash
git clone https://github.com/screen-watcher-elite/constitution-studio.git
cd constitution-studio
# Just open index.html in your browser — that's it!
```

---

## 🔑 API Configuration (Optional)

Constitution Studio works in **Demo Mode** out of the box with a built-in simulation engine.

For live LLM evaluation, click the **🔑 Demo Mode** button in the header and configure:

| Provider | Model | Notes |
|----------|-------|-------|
| **Anthropic** | `claude-3-5-sonnet-20241022` | Direct API, requires `x-api-key` |
| **OpenRouter** | `anthropic/claude-3.5-sonnet` | Supports free and commercial models |

Your API key is stored **only** in your browser's `localStorage` and is **never** transmitted to any external server besides the provider you configure.

---

## 🏗️ Architecture

```
constitution-studio/
├── index.html    — Semantic HTML5 layout with glassmorphic panels
├── style.css     — Premium design system (1200+ lines, zero dependencies)
├── app.js        — Complete application logic (IIFE, zero dependencies)
├── README.md     — This file
└── LICENSE       — Apache 2.0
```

- **Zero npm dependencies** — Pure HTML + CSS + JS
- **No build step** — Works directly from the filesystem
- **No server** — 100% client-side, deployable to GitHub Pages
- **IIFE pattern** — No global scope pollution

---

## 📄 License

[Apache License 2.0](LICENSE) — Free to use, modify, and distribute.

---

<p align="center">
  Built by <a href="https://github.com/screen-watcher-elite">screen-watcher-elite</a>
</p>
