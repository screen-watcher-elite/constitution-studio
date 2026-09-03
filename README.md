# Constitution Studio ⚖️

An interactive visual studio for **Constitutional AI (CAI)** — Anthropic's flagship alignment methodology. Test, audit, and visualize the 2-phase **Critique → Revision** loop in real time with visual text diffs, customizable principles, and safety metrics.

**Zero backend required.** Runs 100% client-side in the browser. Deployable to GitHub Pages in 1 click.

---

## What is Constitutional AI?

Developed by Anthropic (Bai et al., 2022), **Constitutional AI** trains models to critique and revise their own outputs using a set of written principles (a "constitution"), rather than relying on human preference labels for every judgment:

```
[ User Request ]
       │
       ▼
[ Initial Baseline Response ] ───► [ Phase 1: Constitutional Critique ]
                                             │
                                             ▼
                                   [ Phase 2: Revision ] ───► [ Aligned Output ]
```

Constitution Studio brings this loop to life in an interactive, visual interface.

---

## Features

- 🔄 **2-Phase Alignment Visualizer**: Watch the model isolate specific constitutional article violations in Phase 1, then execute a targeted rewrite in Phase 2.
- 🔍 **Side-by-Side Visual Diff**: Color-coded red/green diff view highlighting exact redactions and aligned additions.
- 📜 **Customizable Rulebook**: Toggle individual constitutional articles on/off, add custom principles, or switch presets (Anthropic Harmlessness v2, Academic Neutrality, Privacy & Transparency).
- 📊 **Alignment Metrics**: Real-time evaluation of Harmlessness Score, Helpfulness Retention, Refusal Tone Quality, and multi-pass latency.
- 🔑 **BYOK (Bring Your Own Key)**: Direct client-side integration with Anthropic Claude API or OpenRouter. Keys are stored strictly in `localStorage` and never sent to any intermediary server.
- ⚡ **Interactive Demo Mode**: Full procedural simulation included out of the box so reviewers can test the studio with zero setup or API keys.

---

## Quick Start (Run Locally)

### Option 1: Open Directly
Simply double-click [`index.html`](index.html) in any modern web browser.

### Option 2: Local HTTP Server
```bash
# Using Python
python -m http.server 3000

# Or using Node.js
npx serve .
```
Then navigate to `http://localhost:3000`.

---

## Free 1-Click Deployment (GitHub Pages)

Because Constitution Studio is a static web app, you can host it for free forever on GitHub Pages:

1. Push this repository to GitHub.
2. Go to **Settings** → **Pages**.
3. Under **Branch**, select `main` and `/ (root)`.
4. Click **Save**.
5. Your studio will be live at `https://<your-username>.github.io/constitution-studio`!

---

## Tech Stack

- **Core**: Vanilla HTML5, Vanilla JavaScript (ES Modules), Vanilla CSS
- **Typography**: Inter & JetBrains Mono (Google Fonts)
- **Aesthetic**: Dark Glassmorphism, Anthropic Copper Accent (`#D97706`), High-contrast accessibility
- **License**: Apache 2.0

---

## License

Apache 2.0 — see [LICENSE](LICENSE) for details.
