# Write Trainer

A polished GRE Analytical Writing practice workspace built with Next.js 15, React, TypeScript, and Tailwind CSS.

## Features

- Sticky prompt header with Write Trainer branding, ChatGPT-generated prompts, Issue/Argument prompt selection, 30-minute countdown, timer controls, review action, and theme toggle.
- Distraction-free essay editor with local auto-save, word count, paragraph count, reading-time estimate, writing progress, and focus mode.
- Three-provider AI review panel with ChatGPT, Claude, and Gemini tabs, GRE-style 0-6 scoring, score breakdown cards, feedback, suggestions, strengths, weaknesses, and ETS-style band language.
- Settings modal for choosing enabled review models and saving local provider keys/model names in encrypted IndexedDB storage.
- Left chat-style history rail with locally saved essays, model responses, and parsable 10-point provider scores.
- Automatic scoring when the timer expires, plus manual scoring with the Review Essay button or Ctrl/Cmd + Enter.
- LocalStorage persistence for essay draft, timer state, provider review results, generated prompts, writing history, selected prompt, and theme.
- Responsive layout with a fixed 300px desktop review sidebar and a mobile bottom review drawer.
- Accessible controls, ARIA labels, keyboard navigation support, and dark mode styling.

## Tech Stack

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- lucide-react icons

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000` to use the app.

## AI Provider Configuration

Put shared API keys and preferred model names in `.env.local`. A safe template is available in `.env.example`.

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
OPENAI_REASONING_EFFORT=medium

ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-3-5-sonnet-latest

GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash

AI_REVIEW_TIMEOUT_MS=20000
```

Use `OPENAI_REASONING_EFFORT` to set ChatGPT reasoning effort for OpenAI review and prompt-generation calls. Supported values are `minimal`, `low`, `medium`, and `high`.

Restart `npm run dev` after changing `.env.local`. These keys are read only by server-side API routes and are not exposed to the browser.

For per-browser credentials, open the settings button in the app header. Local keys and model names are encrypted at rest in IndexedDB with Web Crypto and sent to `/api/review` only when you request a review. Leave a local key or model name blank to use the matching `.env.local` value. The ChatGPT reasoning level is also configurable there and defaults to Medium. Browser-local encrypted storage protects against casual local inspection, but the keys are still usable by this app origin on the current device.

If a review key is missing or a provider request fails, that provider tab shows a local heuristic fallback review.

## Quality Checks

```bash
npm run lint
npm run build
```

## Project Structure

- `src/app`: App Router entry, metadata, viewport, API routes, and global styles.
- `src/components`: Header, timer, editor, review sidebar, score cards, and workspace orchestration.
- `src/data`: Example GRE prompt data.
- `src/lib`: Local heuristic scoring engine and server-side provider review orchestration.
- `src/types`: Shared TypeScript review and prompt types.
