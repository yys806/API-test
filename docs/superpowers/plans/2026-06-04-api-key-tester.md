# API Key Tester Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a web app that tests large-model API keys through configurable chat requests.

**Architecture:** Use a Vite React frontend for configuration and chat, plus a Netlify Function for CORS-safe provider requests. Provider presets live in a focused library module, and request construction lives in a separate tested module shared with the function.

**Tech Stack:** Vite, React, TypeScript, Vitest, Netlify Functions.

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `netlify.toml`
- Create: `index.html`

- [x] Add Vite React scripts and dependencies.
- [x] Configure TypeScript and Vitest.
- [x] Configure Netlify build command and publish directory.

### Task 2: Tested Provider Logic

**Files:**
- Create: `src/lib/providers.test.ts`
- Create: `src/lib/providers.ts`
- Create: `src/lib/apiRequest.test.ts`
- Create: `src/lib/apiRequest.ts`

- [x] Write failing provider preset and request construction tests.
- [x] Implement provider presets and Base URL normalization.
- [x] Implement OpenAI-compatible and Anthropic request construction.
- [x] Run tests and confirm they pass.

### Task 3: API Proxy Function

**Files:**
- Create: `netlify/functions/chat.ts`

- [x] Validate request method and payload.
- [x] Forward requests to provider endpoints.
- [x] Return latency, status, extracted text, raw payload, and upstream errors.

### Task 4: Frontend Interface

**Files:**
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`

- [x] Build provider presets, editable configuration, and API key visibility control.
- [x] Build chat log and composer.
- [x] Show latency, HTTP status, error details, and raw response expansion.
- [x] Add responsive desktop and mobile layout.

### Task 5: Verification and Release

**Files:**
- Create: `README.md`

- [x] Run `npm test`.
- [x] Run `npm run build`.
- [x] Verify local browser render.
- [ ] Initialize git and push to GitHub.
- [ ] Deploy production site to Netlify.
