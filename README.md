# Three Kingdoms - Who Am I?

`3k` is a React + TypeScript spectator game where three AI players try to deduce their hidden Three Kingdoms identities. A judge model answers each question with strict verdicts, an optional translator fills in Chinese text asynchronously, and the whole match can run on autoplay while you watch.

## Current Feature Set

- Three AI players (`A`, `B`, `C`) plus dedicated Judge and optional Translator model assignments.
- Multi-round matches with defaults of `10` rounds and `20` turns per round.
- Limits of `50` rounds and `100` turns per round in the setup screen.
- Full autoplay after game start, with a single pause/resume control for spectators.
- CN/EN interface toggle available from both setup and arena views.
- Optional asynchronous Chinese translation for chat messages.
- Expandable per-message thinking panels for AI player turns.
- Persistent per-player skill history saved in both `localStorage` and project files under `data/skill-history`.
- 100 generated SVG avatars for each of the 30 bundled characters.

## Tech Stack

- React 19
- TypeScript
- Vite 8
- Tailwind CSS 4
- Zustand
- Vitest + Testing Library

## Getting Started

```bash
npm install
npm run dev
```

The app expects a local Ollama server at `http://localhost:11434`.

## Optional Ark Cloud Model

Cloud access is opt-in and proxied through Vite so the API key is not hard-coded in the client source.

```bash
cp .env.example .env.local
```

Available variables:

- `VITE_ARK_API_KEY`: enables the Ark cloud model.
- `VITE_ARK_MODEL`: optional model override. Defaults to `openai/ark-code-latest`.

The Vite dev server proxies `/api/ark/*` to Volcengine Ark.

## Scripts

- `npm run dev`: start the Vite dev server
- `npm run build`: type-check and build the production bundle
- `npm run lint`: run ESLint
- `npm run test:run`: run the test suite once
- `npm run test:coverage`: run tests with coverage
- `npm run generate:avatars`: regenerate the avatar SVG set

## Project Structure

- `src/components/SetupScreen`: match setup UI and model selection
- `src/components/GameArena`: autoplay arena, chat feed, scoreboard, identity cards
- `src/services/gameEngine.ts`: round orchestration, judge/player turns, round review, translation queue
- `src/services/ollamaService.ts`: Ollama + Ark chat/model APIs
- `src/services/skillHistory.ts`: browser persistence plus project-file mirroring for skill notebooks
- `src/store`: Zustand stores for config and live game state
- `public/avatars`: generated avatar library
- `data/skill-history`: exported per-player skill version files and manifests created while running the local dev server

## Validation

Current expected checks:

```bash
npm run lint
npm run test:run
npm run build
```
