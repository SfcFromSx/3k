# System Design Document: Three Kingdoms - Who Am I?

## 1. Overview

This project is a client-side React application that simulates a Three Kingdoms identity-guessing match between AI agents. The browser owns the UI, round orchestration, local persistence, and model requests. No custom backend is required for gameplay.

## 2. Runtime Architecture

The app is split into three layers:

1. View layer: React components render the setup screen, live arena, chat transcript, identity cards, and spectator controls.
2. State layer: Zustand stores keep setup configuration and the current match state.
3. Service layer: TypeScript services orchestrate the game loop, model calls, translation queue, and skill-history persistence.

## 3. Technology Stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS 4
- Zustand for state management
- Native `fetch` for Ollama and Ark requests
- Vitest + Testing Library for unit/component coverage

## 4. State Model

### 4.1 `useConfigStore.ts`

Persistent setup-time configuration for the current session:

```ts
interface GameConfig {
  rounds: number;          // default 10, max 50
  turnsPerRound: number;   // default 20, max 100
  uiLanguage: 'EN' | 'CN';
  translationEnabled: boolean;
  models: {
    playerA: string;
    playerB: string;
    playerC: string;
    judge: string;
    translator: string;
  };
}
```

### 4.2 `useGameStore.ts`

Live match state, including players, chat, and runtime status:

```ts
interface PlayerState {
  id: 'A' | 'B' | 'C';
  assignedCharacterId: string;
  avatarVariant: number;
  turnsUsed: number;
  hasGuessed: boolean;
  score: number;
  skillFileStr: string;
}

interface ChatMessage {
  id: string;
  sender: 'System' | 'Judge' | 'PlayerA' | 'PlayerB' | 'PlayerC';
  textEN: string;
  textCN?: string;
  thinkingEN?: string;
  round: number;
  timestamp: string;
}
```

The store also tracks:

- `status`: `IDLE | SETUP | PLAYING | ROUND_OVER | MATCH_OVER`
- `currentRound`
- `activePlayerId`
- `isProcessing`

## 5. UI Composition

### 5.1 `App.tsx`

Switches between setup and arena based on the live game status.

### 5.2 `SetupScreen`

Responsibilities:

- Fetch available model names from Ollama
- Let the spectator set rounds, turns, translator toggle, and role-to-model mapping
- Provide the CN/EN UI toggle before the game starts
- Start the first round

### 5.3 `GameArena`

Responsibilities:

- Show the match header, localized status, and language toggle
- Autoplay turns while the match is in `PLAYING`
- Pause/resume autoplay
- Render chat messages, optional translation, and expandable thinking panels
- Render the scoreboard and identity cards
- Render skill-history snapshots per player

## 6. Service Layer

### 6.1 `ollamaService.ts`

Provides:

- `fetchModels()`
- `generateChatResult()`
- `generateChatResponse()`

Behavior:

- Reads local Ollama models from `http://localhost:11434`
- Optionally injects the Ark model into the selectable list when configured
- Normalizes `<think>...</think>` blocks and provider-native reasoning into a separate `thinking` field

### 6.2 `gameEngine.ts`

Core responsibilities:

1. Start a round by selecting 3 unique characters and fresh avatar variants.
2. Ask the active player model for one question or guess.
3. Record the visible message plus hidden thinking text.
4. Ask the judge to answer with one of:
   - `Yes.`
   - `No.`
   - `Not Yes and Not Wrong.`
5. Update turns, scores, guessed state, and active player.
6. Queue translations asynchronously so chat flow is not blocked.
7. Run a round-review step that updates each player’s saved strategy notebook.
8. Advance to the next round or end the match.

### 6.3 `skillHistory.ts`

Stores versioned strategy notebook entries in browser storage and mirrors them into project files during local dev:

- `skill_A`, `skill_B`, `skill_C`: latest snapshot in `localStorage`
- `skill_history_A`, `skill_history_B`, `skill_history_C`: full version history in `localStorage`
- `data/skill-history/player-a|b|c/history.json`: exported manifest per player
- `data/skill-history/player-a|b|c/current.md`: latest notebook text
- `data/skill-history/player-a|b|c/v###-round-###-<source>.md`: one file per saved version

Each saved version includes `version`, `round`, `updatedAt`, `source`, `summary`, and `content`.

## 7. Character and Avatar Data

- `src/assets/characters.json` currently bundles 30 curated characters.
- `public/avatars/<characterId>/avatar-001.svg ... avatar-100.svg` stores 100 generated avatar variants per character.
- `src/assets/avatarCatalog.ts` computes the public path for a given character + variant pair.

## 8. Async Behavior

Important non-blocking flows:

- Autoplay uses a delayed effect in the arena and triggers `executePlayerTurn`.
- Translation work is queued and processed later during idle windows.
- Model discovery in setup is fetched on mount and safely cancelled on unmount.

## 9. Validation Strategy

Automated checks cover:

- setup screen behavior
- arena rendering, autoplay, pause, and language switching
- judge/player turn orchestration
- skill-history persistence
- Ollama/Ark service normalization

Standard validation commands:

```bash
npm run lint
npm run test:run
npm run build
```
