# Constitution Studio — Project Guidelines for Claude Code

## Overview
An interactive visual studio for **Constitutional AI (CAI)** — Anthropic's signature alignment methodology. Allows users to test, visualize, and audit the 2-phase **Critique → Revision** loop in real time with visual text diffs, customizable constitutional principles, and safety/helpfulness metrics.

## Architecture
- **Zero-backend client-side static web app**: Runs natively in browser or can be deployed in 1 click to GitHub Pages / Vercel.
- **BYOK (Bring Your Own Key)**: Directly queries Anthropic / OpenRouter APIs via client fetch with keys stored only in `localStorage`.
- **Interactive Simulation Mode**: Includes pre-built benchmark scenarios so reviewers can test critique-revision loops without needing an API key.
- **Styling**: Pure modern Vanilla CSS with custom design tokens, dark glassmorphism, and responsive layouts.

## Conventions
- Clean modular JavaScript (ES Modules).
- Zero external build tool lock-in (runs directly with standard HTTP server or `npx serve`).
- High-contrast accessible color palette with Anthropic copper/amber accents (`#D97706`).
