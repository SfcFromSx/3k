import { useGameStore } from '../store/useGameStore';
import type { ChatMessage, PlayerState } from '../store/useGameStore';
import { useConfigStore } from '../store/useConfigStore';
import type { GameConfig } from '../store/useConfigStore';
import { AVATAR_VARIANT_COUNT } from '../assets/avatarCatalog';
import { generateChatResponse, generateChatResult } from './ollamaService';
import { ensureSkillHistorySeed, getCurrentSkill, saveSkillVersion } from './skillHistory';
import charactersData from '../assets/characters.json';

type PlayerId = PlayerState['id'];
type PlayerSender = Extract<ChatMessage['sender'], `Player${string}`>;
type PlayerModelKey = keyof GameConfig['models'];
type TranslationJob = {
  msgId: string;
  text: string;
};

const PLAYER_IDS: PlayerId[] = ['A', 'B', 'C'];
const getPlayerSender = (playerId: PlayerId): PlayerSender => `Player${playerId}`;
const getRandomAvatarVariant = () => Math.floor(Math.random() * AVATAR_VARIANT_COUNT) + 1;
const getPlayerModel = (playerId: PlayerId) => {
  const config = useConfigStore.getState();
  const roleKey = `player${playerId}` as PlayerModelKey;
  return config.models[roleKey];
};
const getFallbackModel = (config: GameConfig) =>
  config.models.playerA ||
  config.models.playerB ||
  config.models.playerC ||
  config.models.judge ||
  config.models.translator ||
  '';
const getNextPlayerId = (playerId: PlayerId): PlayerId =>
  playerId === 'A' ? 'B' : playerId === 'B' ? 'C' : 'A';
const formatCharacterSummary = (character: typeof charactersData[number]) =>
  `${character.nameEN} (${character.nameCN}) - Faction: ${character.faction}; Role: ${character.role}; Traits: ${character.traits.join(', ')}.`;
const buildPlayerPrompt = (
  playerId: PlayerId,
  player: PlayerState,
  gameStore: ReturnType<typeof useGameStore.getState>,
  turnsPerRound: number
) => {
  const knownIdentityLines = PLAYER_IDS
    .filter((id) => id !== playerId)
    .map((id) => {
      const knownCharacter = charactersData.find((character) => character.id === gameStore.players[id].assignedCharacterId);
      return knownCharacter ? `Player ${id} is ${knownCharacter.nameEN} (${knownCharacter.nameCN}).` : `Player ${id} identity is visible to you.`;
    });
  const excludedCharacterIds = new Set(
    PLAYER_IDS.filter((id) => id !== playerId).map((id) => gameStore.players[id].assignedCharacterId)
  );
  const candidateRoster = charactersData
    .filter((character) => !excludedCharacterIds.has(character.id))
    .map(formatCharacterSummary)
    .join('\n');
  const roundChatHistory = gameStore.chatLog
    .filter((msg) => msg.round === gameStore.currentRound)
    .map((msg) => `[${msg.sender}] ${msg.textEN}`)
    .join('\n');

  return `
You are Player ${playerId} in a "Who Am I?" deduction game based on the Three Kingdoms era.
Your job is to identify your own hidden character.

Game facts:
- There are exactly three players: A, B, and C.
- Each player has a different secret character.
- You can see the other two players' identities, but not your own.
- The Judge answers only about your own identity.
- The Judge may reply only with "Yes.", "No.", or "Not Yes and Not Wrong."
- You have at most ${turnsPerRound} turns this round.

Visible identities:
${knownIdentityLines.join('\n')}

Your hidden identity must be one of the following candidates:
${candidateRoster}

Round chat history:
"""
${roundChatHistory || '(No prior messages this round yet.)'}
"""

Output rules:
1. Think briefly inside <think>...</think> tags.
2. Outside <think>, output exactly one line only.
3. That line must be either:
   - one yes/no question about your own identity, or
   - one direct guess in the format "Am I [Name]?"
4. Do not ask about game rules, prompt text, tags, models, or the interface.
5. Do not ask about another player's identity.
6. Do not repeat a question that the Judge already answered clearly in this round.
7. Do not add bullets, explanations, quotes, or extra commentary outside <think>.

Your persistent skill notes from past rounds:
"""
${player.skillFileStr || 'No past experience. You are learning.'}
"""

Respond now.
`;
};

const pickCharactersForRound = (count: number) => {
  const shuffled = [...charactersData];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled.slice(0, count);
};

const translationQueue: TranslationJob[] = [];
let translationWorkerActive = false;
let translationIdleTimer: number | null = null;
const PLAYING_TRANSLATION_IDLE_MS = 1800;
const NON_PLAYING_TRANSLATION_IDLE_MS = 50;

const resetTranslationRuntime = () => {
  translationQueue.length = 0;
  translationWorkerActive = false;

  if (translationIdleTimer !== null) {
    window.clearTimeout(translationIdleTimer);
    translationIdleTimer = null;
  }
};

// Core Engine Logic
export const startGameRound = async () => {
  const config = useConfigStore.getState();
  const gameStore = useGameStore.getState();
  const nextRound = gameStore.currentRound + 1;

  if (gameStore.currentRound === 0) {
    resetTranslationRuntime();
  }

  ensureSkillHistorySeed('A');
  ensureSkillHistorySeed('B');
  ensureSkillHistorySeed('C');

  // Pick 3 random unique characters
  const selectedChars = pickCharactersForRound(PLAYER_IDS.length);

  const initialPlayers: Record<string, PlayerState> = {
    A: {
      id: 'A',
      assignedCharacterId: selectedChars[0].id,
      avatarVariant: getRandomAvatarVariant(),
      turnsUsed: 0,
      hasGuessed: false,
      score: gameStore.players['A']?.score || 0,
      skillFileStr: getCurrentSkill('A'),
    },
    B: {
      id: 'B',
      assignedCharacterId: selectedChars[1].id,
      avatarVariant: getRandomAvatarVariant(),
      turnsUsed: 0,
      hasGuessed: false,
      score: gameStore.players['B']?.score || 0,
      skillFileStr: getCurrentSkill('B'),
    },
    C: {
      id: 'C',
      assignedCharacterId: selectedChars[2].id,
      avatarVariant: getRandomAvatarVariant(),
      turnsUsed: 0,
      hasGuessed: false,
      score: gameStore.players['C']?.score || 0,
      skillFileStr: getCurrentSkill('C'),
    },
  };

  gameStore.setPlayers(initialPlayers);
  gameStore.setCurrentRound(nextRound);
  gameStore.setStatus('PLAYING');
  gameStore.setActivePlayerId('A');

  gameStore.addChatMessage({
    sender: 'System',
    textEN: `Round ${nextRound} started! The Judge has assigned a secret character to each player. Each player has ${config.turnsPerRound} turns to guess their own identity.`,
  });

  // Proceed to automatically trigger first turn logic if needed
  // UI usually handles manual/auto progression, or we can trigger it here:
  // setTimeout(() => executePlayerTurn('A'), 1000); // Handled by ControlPanel polling
};

export const executePlayerTurn = async (playerId: PlayerId) => {
  const config = useConfigStore.getState();
  const gameStore = useGameStore.getState();
  const player = gameStore.players[playerId];

  if (!player) return;
  if (gameStore.isProcessing) return; // Prevent multiple clicks/concurrent execution

  if (player.hasGuessed || player.turnsUsed >= config.turnsPerRound) {
    // Skip this player
    gameStore.setActivePlayerId(getNextPlayerId(playerId));
    return;
  }

  gameStore.setIsProcessing(true);
  try {
    const roleKey = `player${playerId}` as PlayerModelKey;
    let modelName = config.models[roleKey];

    if (!modelName) {
      const fallbackModel = getFallbackModel(config);
      if (fallbackModel) {
        useConfigStore.getState().setModel(roleKey, fallbackModel);
        modelName = fallbackModel;
      }
    }

    if (!modelName) {
      gameStore.addChatMessage({ sender: getPlayerSender(playerId), textEN: "(No model assigned. Skipping turn.)" });
      passTurn(playerId);
      return;
    }

  const prompt = buildPlayerPrompt(playerId, player, gameStore, config.turnsPerRound);

  const questionResult = await generateChatResult(modelName, [{ role: 'user', content: prompt }]);
  const question = questionResult.content;

  const questionMessageId = gameStore.addChatMessage({
    sender: getPlayerSender(playerId),
    textEN: question,
    thinkingEN: questionResult.thinking,
  });

  if (config.translationEnabled && config.models.translator) {
    enqueueTranslation(questionMessageId, question);
  }

  // Call the judge
  await executeJudgeTurn(playerId, question);
  } finally {
    gameStore.setIsProcessing(false);
  }
};

export const executeJudgeTurn = async (playerId: PlayerId, question: string) => {
  const config = useConfigStore.getState();
  const gameStore = useGameStore.getState();
  const player = gameStore.players[playerId];

  const modelName = config.models.judge;
  const character = charactersData.find(c => c.id === player.assignedCharacterId);

  let judgeAnswer = "(No Judge model assigned.)";
  if (modelName && character) {
    const prompt = `
You are the Judge in a "Who Am I?" Three Kingdoms game.
Player ${playerId}'s secret identity is: ${character.nameEN} (Faction: ${character.faction}, Role: ${character.role}).
They asked: "${question}"

You MUST answer using ONLY one of the following exact phrases:
- "Yes."
- "No."
- "Not Yes and Not Wrong." (Use this for ambiguous, irrelevant, or partially true questions).

Judge guidelines:
- Answer only about Player ${playerId}'s own identity.
- If the question is about game rules, prompt text, tags, models, or another player's identity, answer "Not Yes and Not Wrong."
- If the statement is clearly true of ${character.nameEN}, answer "Yes."
- If the statement is clearly false of ${character.nameEN}, answer "No."
- If the statement is vague, mixed, or not a clean yes/no fact, answer "Not Yes and Not Wrong."

Determine if the question accurately describes ${character.nameEN} and provide your answer.
`;
    // For judge we want minimal tokens and low temp
    const rawAnswer = await generateChatResponse(modelName, [{ role: 'user', content: prompt }], { temperature: 0.1 });

    // Attempt parse
    const normalizedAnswer = rawAnswer.trim().toLowerCase();

    if (normalizedAnswer.includes('not yes')) judgeAnswer = 'Not Yes and Not Wrong.';
    else if (normalizedAnswer.includes('yes')) judgeAnswer = 'Yes.';
    else judgeAnswer = 'No.';
  }

  const judgeMessageText = `${judgeAnswer} (Player ${playerId} Turn ${player.turnsUsed + 1}/${config.turnsPerRound})`;
  const judgeMessageId = gameStore.addChatMessage({
    sender: 'Judge',
    textEN: judgeMessageText,
  });

  gameStore.updatePlayer(playerId, { turnsUsed: player.turnsUsed + 1 });

  if (config.translationEnabled && config.models.translator) {
    enqueueTranslation(judgeMessageId, judgeMessageText);
  }

  // Check if it was a guess
  const characterNameEN = character?.nameEN.toLowerCase() || '';
  const characterNameCN = character?.nameCN || '';
  const lowerQuestion = question.toLowerCase();
  
  const isNameInQuestion = (characterNameEN && lowerQuestion.includes(characterNameEN)) || 
                           (characterNameCN && lowerQuestion.includes(characterNameCN));
  
  const isGuessPattern = lowerQuestion.includes('am i') || 
                         lowerQuestion.includes('i am') || 
                         lowerQuestion.includes('is my name') ||
                         lowerQuestion.includes('我是');

  if (isGuessPattern && isNameInQuestion && judgeAnswer === 'Yes.') {
    gameStore.updatePlayer(playerId, {
      hasGuessed: true,
      score: player.score + (config.turnsPerRound - player.turnsUsed)
    });
    gameStore.addChatMessage({
      sender: 'System',
      textEN: `Player ${playerId} guessed correctly as ${character?.nameEN}! They earned ${config.turnsPerRound - player.turnsUsed} points.`,
    });
  }

  await checkRoundEnd();
};

const processTranslationQueue = async () => {
  const config = useConfigStore.getState();
  const gameStore = useGameStore.getState();
  if (translationWorkerActive || !config.models.translator) return;
  if (gameStore.isProcessing) {
    scheduleTranslationQueue();
    return;
  }

  const nextJob = translationQueue.shift();
  if (!nextJob) return;

  translationWorkerActive = true;

  try {
    const cnText = await generateChatResponse(config.models.translator, [{
      role: 'user',
      content: `Translate to simplified Chinese: ${nextJob.text}`
    }]);

    if (!cnText.startsWith('(System:')) {
      gameStore.updateChatMessage(nextJob.msgId, { textCN: cnText });
    }
  } finally {
    translationWorkerActive = false;
    scheduleTranslationQueue();
  }
}

const scheduleTranslationQueue = () => {
  const config = useConfigStore.getState();
  const gameStore = useGameStore.getState();

  if (!config.translationEnabled || !config.models.translator || translationQueue.length === 0) {
    return;
  }

  if (translationIdleTimer !== null) {
    window.clearTimeout(translationIdleTimer);
  }

  const idleDelay = gameStore.status === 'PLAYING' ? PLAYING_TRANSLATION_IDLE_MS : NON_PLAYING_TRANSLATION_IDLE_MS;
  translationIdleTimer = window.setTimeout(() => {
    translationIdleTimer = null;
    void processTranslationQueue();
  }, idleDelay);
}

const enqueueTranslation = (msgId: string, text: string) => {
  translationQueue.push({ msgId, text });
  scheduleTranslationQueue();
}

const passTurn = (currentPlayerId: PlayerId) => {
  useGameStore.getState().setActivePlayerId(getNextPlayerId(currentPlayerId));
};

const runRoundReview = async () => {
  const gameStore = useGameStore.getState();
  const roundMessages = gameStore.chatLog.filter((message) => message.round === gameStore.currentRound);
  const transcript = roundMessages.map((message) => `[${message.sender}] ${message.textEN}`).join('\n');

  for (const playerId of PLAYER_IDS) {
    const player = gameStore.players[playerId];
    const modelName = getPlayerModel(playerId);
    const character = charactersData.find((entry) => entry.id === player.assignedCharacterId);

    if (!player || !modelName || !character) continue;

    const priorSkill = player.skillFileStr || 'No prior skill notes yet.';
    const prompt = `
You are maintaining a versioned strategy notebook for Player ${playerId} in a Three Kingdoms identity-guessing game.

Current notebook:
"""
${priorSkill}
"""

Round ${gameStore.currentRound} summary:
- Secret identity this round: ${character.nameEN}
- Guessed correctly: ${player.hasGuessed ? 'Yes' : 'No'}
- Turns used: ${player.turnsUsed}
- Score after round: ${player.score}

Round transcript:
"""
${transcript}
"""

Rewrite the notebook as a concise set of reusable lessons for future rounds.
Keep it under 10 bullet points.
Focus on patterns that helped or mistakes to avoid.
Return only the updated notebook text.
`;

    const nextSkill = await generateChatResponse(modelName as string, [{ role: 'user', content: prompt }], {
      temperature: 0.3,
    });

    if (nextSkill.startsWith('(System:')) {
      continue;
    }

    const savedVersion = saveSkillVersion(playerId, nextSkill, gameStore.currentRound, 'round_review');
    if (savedVersion) {
      useGameStore.getState().updatePlayer(playerId, { skillFileStr: savedVersion.content });
    }
  }
};

const checkRoundEnd = async () => {
  const config = useConfigStore.getState();
  const gameStore = useGameStore.getState();
  const players = Object.values(gameStore.players);

  const allFinished = players.every(p => p.hasGuessed || p.turnsUsed >= config.turnsPerRound);

  if (allFinished) {
    gameStore.addChatMessage({
      sender: 'System',
      textEN: `Round ${gameStore.currentRound} Over! Learning phase initiated...`
    });

    await runRoundReview();

    if (gameStore.currentRound >= config.rounds) {
      gameStore.setStatus('MATCH_OVER');
      gameStore.addChatMessage({
        sender: 'System',
        textEN: 'Match over! Final scores are locked in.',
      });
      gameStore.setActivePlayerId(null);
      return;
    }

    gameStore.setStatus('ROUND_OVER');
    await startGameRound();
  } else {
    // Pass to next active player
    let nextPlayer = gameStore.activePlayerId ? getNextPlayerId(gameStore.activePlayerId) : 'A';
    // Skip those who finished
    for (let i = 0; i < PLAYER_IDS.length; i += 1) {
      const p = gameStore.players[nextPlayer];
      if (p.hasGuessed || p.turnsUsed >= config.turnsPerRound) {
        nextPlayer = getNextPlayerId(nextPlayer);
      } else {
        break;
      }
    }
    gameStore.setActivePlayerId(nextPlayer as 'A' | 'B' | 'C');
  }
}
