# AI Resource Dashboard Design

## Goal

Turn the API key tester into a left-navigation AI resource dashboard with eight modules: API testing, official pricing, low-cost channel monitoring, Bilibili monitoring, official status, local JSON conversion, Shen AI links, and friendly relay links.

## Layout

The app uses a persistent left navigation rail. Each module is a focused workspace pane. API testing remains the first module and keeps the existing chat tester behavior.

## Data Sources

- Official status uses Statuspage `summary.json` endpoints for OpenAI and Claude.
- Official pricing uses first-party OpenAI and Claude pricing links as source references, plus a regional ChatGPT subscription table modeled after the referenced price-rank page. The table is sorted from low to high by local monthly price.
- Low-cost channels fetch the public Shen shop pages on Chain Store and Yunmao Consignment, parse product names, prices, and stock labels, then keyword-filter AI account and recharge products.
- Bilibili monitoring is implemented as a monitored feed pane with a backend endpoint shape and curated fallback guidance. It filters for recent low-price AI/GPT topics, keeps videos within five days, and only shows entries above 10,000 views when live data is available.
- JSON conversion runs fully in the browser. Input tokens are never sent to Netlify Functions.
- Link modules are static jump buttons.

## Backend

Netlify Functions provide:

- `status.ts`: fetches OpenAI and Claude status summaries.
- `shop-monitor.ts`: fetches and parses public shop pages.
- `pricing.ts`: returns region price data and source links, designed so live scraping can replace static fallback later.
- `bilibili-monitor.ts`: returns live or fallback monitoring rows.

Each function returns `ok`, `updatedAt`, `source`, `items`, and `error` where applicable.

## Frontend

The frontend is split into a dashboard shell and module renderers. Data-fetching modules have refresh buttons, loading states, source links, and failure states. JSON conversion has local-only textareas, format tabs, copy/download actions, parsed account count, and skipped-item count.

## Security

No API key, shop token, ChatGPT session token, access token, or refresh token is stored in source code, local storage, or server logs. The Yunmao long token link is treated as a private operational URL and should be configured later as a server-side environment variable if fully automated private monitoring is needed.

## Verification

Unit tests cover regional price sorting, shop HTML parsing, status summary normalization, and JSON conversion output. Manual browser checks verify left navigation, API tester preservation, and module rendering.
