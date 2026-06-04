# API Key Tester Design

## Goal

Build a Netlify-deployable web app that tests whether a large-model API key works by sending chat messages to a configured provider and showing latency, status, response text, and raw errors.

## Architecture

The app is a Vite React single-page interface with a Netlify Function proxy. The browser owns the form state and conversation UI. The Netlify Function receives Base URL, API key, model, endpoint type, and messages, then forwards a normalized request to either an OpenAI-compatible chat completions endpoint or Anthropic Messages endpoint.

## Providers

Built-in presets include DeepSeek, SiliconFlow, OpenRouter, OpenAI, Claude, and Custom. Presets fill Base URL, model, and endpoint type, while all fields remain editable.

## Data Flow

The user sends a message from the composer. The UI appends it locally, posts configuration and message history to `/.netlify/functions/chat`, and renders the returned assistant text. The function records end-to-end upstream latency and returns status, parsed text, raw payload, or error payload.

## Error Handling

Missing Base URL, API key, model, or messages produce a validation error. Upstream non-2xx responses are returned to the UI with original status and parsed error content. Network failures show a local error message and measured browser-side latency.

## Testing

Unit tests cover provider presets, Base URL normalization, and request construction for OpenAI-compatible and Anthropic APIs. Final verification covers tests, TypeScript build, production bundle, and browser rendering.
