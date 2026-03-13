# Game Design Document: Three Kingdoms - Who Am I?

## 1. Overview
- **Game Title**: Three Kingdoms - Who Am I? (三国猜猜看 - AI对决版)
- **Genre**: AI Simulation, Puzzle, Trivia, Spectator
- **Platform**: Web (Responsive Design)
- **Core Concept**: An autonomous deduction game based on the rich history and characters of the Three Kingdoms era. The game is played entirely by AI agents. Each of the three AI players is secretly assigned a **unique** Three Kingdoms character by the Judge. The players do not know their own identity, but they can see who the other players are. In a round-robin format, each player asks the Judge "Yes/No" questions about their own identity and tries to be the first to correctly guess who they are. The human user acts purely as a spectator.

## 2. Roles & Entities
- **The Judge (AI)**: Assigns a unique secret character to each AI player from the Three Kingdoms database. The Judge knows all three identities and answers each player's questions about *that player's own* character. To prevent leaking extra details, the Judge can strictly only answer with one of three simple phrases: "Yes", "No", or "Not Yes and Not Wrong". Powered by a dedicated LLM selected by the human.
- **AI Player A, B, C**: Three distinct reasoning agents, each powered by an independently chosen LLM from the local Ollama instance. Each player is assigned a secret identity they must deduce. They can see the other two players' identities but not their own. They take turns asking the Judge questions about themselves and must use logic and elimination to figure out who they are. **Crucially, over time, these agents use self-reflection: they review historical match chat logs to update a persistent "skill file", allowing them to continuously develop and iterate on their deduction strategies.**
- **The Translator (AI)**: A dedicated LLM responsible for translating the chat log in real-time. When translation is enabled, every message in the chat arena is followed by its Chinese translation.
- **The Spectator (Human)**: Observes the match, reading the chat log as the AI agents deliberate. Configures game parameters, LLM assignments, and translation settings before the match starts.

## 3. Configurable Parameters
Before a game session begins, the human spectator can configure:

### Game Rules
- **Number of Rounds**: How many rounds to play in one session (e.g., 3, 5, 10). Each round assigns a fresh set of 3 characters.
- **Turns per Round**: The maximum number of question turns each player gets per round (e.g., 5, 10, 15). Once a player's turns are exhausted, they must make a final guess or forfeit.

### LLM Assignment (via Local Ollama)
The system fetches the list of available models from the local Ollama instance and presents them as dropdown options:
- **Player A LLM**: Select which Ollama model powers Player A.
- **Player B LLM**: Select which Ollama model powers Player B.
- **Player C LLM**: Select which Ollama model powers Player C.
- **Judge LLM**: Select which Ollama model powers the Judge.
- **Translator LLM**: Select which Ollama model powers the Translator.

### Language & Translation
- **Chat Translation**: Toggle on/off. When enabled, the Translator LLM translates every chat message into Chinese in real-time, displayed inline beneath the original English message.

## 4. Core Gameplay Loop
1. **Game Setup (Human Input)**: The human configures the number of rounds and the turns per round.
2. **Round Initialization**: The Judge secretly assigns a unique character to each of the three AI players. The assignments are revealed to the audience and the other players (but not to the player themselves).
3. **Turn-Based Investigation**: In a round-robin format (A -> B -> C), the current player asks the Judge one "Yes/No" question about their own secret identity.
4. **Judge's Verdict**: The Judge evaluates the question against *that specific player's* assigned character and responds with "Yes", "No", or "Not Yes and Not Wrong".
5. **Deduction & Guessing**: At any point during their turn, a player may choose to use that turn to make a direct guess at their own identity instead of asking a question.
6. **Resolution**:
    - A player who guesses correctly is marked as "Guessed" and no longer takes turns. Their final score is recorded (fewer turns used = higher score).
    - A player who exhausts all their turns without guessing correctly is marked as "Failed".
    - The round ends when all three players have either guessed correctly or failed.
7. **Post-Round & Learning**: Results are announced. Behind the scenes, the AI players review the round's entire chat log. They analyze successful questions, evaluate missed opportunities, and update their respective persistent "skill files" to refine their deduction strategies for future rounds.
8. **Next Round or End**: If more rounds remain, go to step 2 with new characters. Otherwise, final scores are tallied and a session winner is declared.

## 5. Scoring
- Each player earns points per round based on how quickly they guess correctly:
    - Correct guess = `max_turns - turns_used + 1` points.
    - Failed to guess = 0 points.
- After all rounds, the player with the highest total score wins the session.

## 6. Key Features
- **Autonomous AI Chat**: The core feature is watching LLMs interact in a structured social deduction game.
- **Per-Player Secret Identity**: Each player has their own unique character to guess, creating parallel deduction threads.
- **200-Character Roster**: A curated pool of 200 Three Kingdoms characters for the Judge to draw from, categorized by faction (Wei, Shu, Wu, Other), role (Warlord, Strategist, General, Beauty, etc.), and era (Early, Middle, Late).
- **LLM-Powered via Local Ollama**: Each player, the Judge, and the Translator can be powered by different LLMs from the user's local Ollama instance, allowing experimentation with model capabilities.
- **Real-Time Chinese Translation**: A dedicated Translator LLM translates the conversation into Chinese on-the-fly, displayed inline in the chat.
- **Personality Prompts**: The AI players might have different "personalities" or prompt instructions (e.g., aggressive guesser, cautious analyzer).

## 7. User Interface (UI)
- **Visual Style**: Classic Chinese ink wash painting aesthetic mixed with modern chat UI elements. Colors should feature deep reds, golds, and parchment whites.
- **Layout**: 
    - **Header**: Game title, current round status (e.g., Round 2 of 5), and per-player turn counters.
    - **Game Setup Screen**: A modal or initial screen where the human configures rounds, turns, LLM assignments for each role, and translation toggle.
    - **Identity Cards**: Visual display showing each player's secret character (visible to the spectator but marked as hidden from the respective player).
    - **Main Area (Arena)**: A clear, scrollable chat interface. Messages are visually distinct:
        - Judge messages (centrally aligned or distinct avatar).
        - Player A, B, C messages (color-coded, e.g., Player A in blue, Player B in green, Player C in orange).
        - Translated messages (displayed inline below original messages in a lighter, italic style when translation is enabled).
    - **Scoreboard**: A side panel or footer showing each player's cumulative score across rounds.
    - **Control Panel**: Play/Pause/Skip buttons for the human spectator to control the speed of the AI simulation. Translation on/off toggle.

## 8. Conversation Example

> **Game Config**: 3 rounds, 5 turns per player per round.

**[System]**: Round 1 started! The Judge has assigned a secret character to each player. Each player has 5 turns to guess their own identity.
- Player A's secret identity: ??? (hidden from Player A; visible to B, C, and spectator: **Zhao Yun**)
- Player B's secret identity: ??? (hidden from Player B; visible to A, C, and spectator: **Zhou Yu**)
- Player C's secret identity: ??? (hidden from Player C; visible to A, B, and spectator: **Diaochan**)

**[Player A]**: Judge, am I affiliated with the state of Wei?
**[Judge]**: No. *(Player A: Turn 1/5)*

**[Player B]**: Judge, am I a military commander?
**[Judge]**: Not Yes and Not Wrong. *(Player B: Turn 1/5)*

**[Player C]**: Judge, am I male?
**[Judge]**: No. *(Player C: Turn 1/5)*

**[Player A]**: Am I one of the Five Tiger Generals?
**[Judge]**: Yes. *(Player A: Turn 2/5)*

**[Player B]**: Am I known for a famous battle involving fire?
**[Judge]**: Yes. *(Player B: Turn 2/5)*

**[Player C]**: Am I one of the Four Great Beauties of ancient China?
**[Judge]**: Yes. *(Player C: Turn 2/5)*

**[Player A]**: Am I known for saving Liu Bei's infant son at Changban?
**[Judge]**: Yes. *(Player A: Turn 3/5)*

**[Player A]**: I am ready to guess! Am I Zhao Yun (Zilong)?
**[Judge]**: Yes. *(Player A: Guessed correctly in 4 turns! Score: 2 points)*

**[Player B]**: Am I affiliated with the state of Wu?
**[Judge]**: Yes. *(Player B: Turn 3/5)*

**[Player C]**: I am ready to guess! Am I Diaochan?
**[Judge]**: Yes. *(Player C: Guessed correctly in 3 turns! Score: 3 points)*

**[Player B]**: I am ready to guess! Am I Zhou Yu (Gongjin)?
**[Judge]**: Yes. *(Player B: Guessed correctly in 4 turns! Score: 2 points)*

---
**[System]**: Round 1 Over!
| Player | Character | Turns Used | Score |
|--------|-----------|------------|-------|
| A      | Zhao Yun  | 4          | 2     |
| B      | Zhou Yu   | 4          | 2     |
| C      | Diaochan  | 3          | 3     |

**[System]**: Round 2 starting... New characters assigned!