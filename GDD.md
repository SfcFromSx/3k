# Game Design Document: Three Kingdoms - Who Am I?

## 1. Game Summary

Three AI players compete in a spectator-friendly identity deduction match. Each round, every player receives a hidden Three Kingdoms character. They can see the other players’ identities but not their own, so they must ask the Judge yes/no questions and infer who they are before running out of turns.

The human user does not play as a contestant. The user configures the match, watches the game run automatically, pauses when needed, and inspects the AI’s thought process and strategy evolution over time.

## 2. Roles

- Judge AI: knows each player’s hidden identity and answers with strict verdicts only.
- Player A, B, C AI: ask one question or make one guess on their turn.
- Translator AI: optionally generates Chinese translations for chat messages in the background.
- Spectator: configures the match, pauses autoplay, switches UI language, and inspects logs.

## 3. Match Rules

- Default match length: 10 rounds
- Maximum rounds: 50
- Default turns per player per round: 20
- Maximum turns per player per round: 100
- Turn order: A -> B -> C
- A player stops taking turns after a correct guess or after using all allowed turns.
- A round ends when all three players are finished.
- A match ends after the configured number of rounds.

## 4. Scoring

- Correct guess score: `turnsPerRound - turnsUsed`
- Failed guess score: `0`
- Earlier correct guesses are rewarded more heavily.

## 5. Current Content Scope

- Character roster: 10 bundled Three Kingdoms characters
- Avatar set: 100 generated avatars per character
- Supported interface languages: English and Chinese

## 6. Spectator Features

- Full autoplay after pressing start
- Pause/resume control during live play
- CN/EN interface switch in both setup and arena
- Inline optional translation display
- Expandable AI thinking panel on player messages
- Skill-history viewer on each identity card

## 7. Learning Loop

At the end of every round:

1. Each player reviews the round transcript.
2. The model rewrites a concise strategy notebook.
3. The notebook is saved as a new version in local storage.
4. The updated notebook is injected into future prompts for that player.

This creates visible long-term evolution across rounds and across sessions on the same browser.

## 8. UX Goals

- Feel like watching a self-running historical AI tournament
- Keep the chat readable even when translation is enabled
- Let spectators inspect reasoning without cluttering the main transcript
- Keep setup simple while still allowing per-role model experimentation

## 9. Example Round Flow

1. The spectator picks models and starts the match.
2. Round 1 begins and three unique characters are assigned.
3. Player A asks a question.
4. The Judge answers.
5. Translation is queued asynchronously if enabled.
6. Autoplay advances to Player B, then Player C.
7. Finished players are skipped automatically.
8. When all players are done, the round-review phase updates skill histories.
9. The next round starts automatically unless the match is complete.
