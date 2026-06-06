# AI Resource Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the API tester into an eight-module AI resource dashboard with Netlify-backed monitoring and local JSON conversion.

**Architecture:** Keep Vite React and Netlify Functions. Add focused library modules for pricing data, status parsing, shop parsing, and session conversion; add functions that call those modules; replace the single-screen UI with a left-navigation dashboard that preserves the API tester as module one.

**Tech Stack:** Vite, React, TypeScript, Vitest, Netlify Functions, browser `fetch`.

---

### Task 1: Tested Data Libraries

**Files:**
- Create: `src/lib/pricing.ts`
- Create: `src/lib/pricing.test.ts`
- Create: `src/lib/status.ts`
- Create: `src/lib/status.test.ts`
- Create: `src/lib/shop.ts`
- Create: `src/lib/shop.test.ts`
- Create: `src/lib/sessionConverter.ts`
- Create: `src/lib/sessionConverter.test.ts`

- [ ] Write failing tests for regional price sorting, status normalization, shop HTML parsing, and session conversion.
- [ ] Implement the smallest parser/converter code to pass tests.
- [ ] Run `npm test`.

### Task 2: Netlify Monitoring Functions

**Files:**
- Create: `netlify/functions/pricing.ts`
- Create: `netlify/functions/status.ts`
- Create: `netlify/functions/shop-monitor.ts`
- Create: `netlify/functions/bilibili-monitor.ts`

- [ ] Return normalized pricing data with official source links.
- [ ] Fetch and normalize OpenAI and Claude status summaries.
- [ ] Fetch public shop pages and parse products.
- [ ] Return Bilibili monitor rows with source and fallback behavior.

### Task 3: Dashboard UI

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] Add left navigation shell.
- [ ] Preserve API testing pane.
- [ ] Add pricing, status, shop monitor, Bilibili, JSON converter, Shen links, and friendly links panes.
- [ ] Add loading, refresh, empty, and error states.

### Task 4: Verification and Release

**Files:**
- Modify: `README.md`

- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run local browser smoke check.
- [ ] Commit and push to GitHub.
- [ ] Deploy to Netlify production.
