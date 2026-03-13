import { useGameStore } from '../store/useGameStore';
import type { PlayerState } from '../store/useGameStore';
import { useConfigStore } from '../store/useConfigStore';
import { generateChatResponse } from './ollamaService';
import charactersData from '../assets/characters.json';

// Core Engine Logic
export const startGameRound = async () => {
  const config = useConfigStore.getState();
  const gameStore = useGameStore.getState();
  
  // Pick 3 random unique characters
  const shuffled = [...charactersData].sort(() => 0.5 - Math.random());
  const selectedChars = shuffled.slice(0, 3);
  
  const initialPlayers: Record<string, PlayerState> = {
    A: {
      id: 'A',
      assignedCharacterId: selectedChars[0].id,
      turnsUsed: 0,
      hasGuessed: false,
      score: gameStore.players['A']?.score || 0,
      skillFileStr: localStorage.getItem('skill_A') || '',
    },
    B: {
      id: 'B',
      assignedCharacterId: selectedChars[1].id,
      turnsUsed: 0,
      hasGuessed: false,
      score: gameStore.players['B']?.score || 0,
      skillFileStr: localStorage.getItem('skill_B') || '',
    },
    C: {
      id: 'C',
      assignedCharacterId: selectedChars[2].id,
      turnsUsed: 0,
      hasGuessed: false,
      score: gameStore.players['C']?.score || 0,
      skillFileStr: localStorage.getItem('skill_C') || '',
    },
  };

  gameStore.setPlayers(initialPlayers);
  gameStore.setCurrentRound((gameStore.currentRound === 0 ? 1 : gameStore.currentRound + 1));
  gameStore.setStatus('PLAYING');
  gameStore.setActivePlayerId('A');

  gameStore.addChatMessage({
    sender: 'System',
    textEN: `Round ${gameStore.currentRound === 0 ? 1 : gameStore.currentRound + 1} started! The Judge has assigned a secret character to each player. Each player has ${config.turnsPerRound} turns to guess their own identity.`,
  });

  // Proceed to automatically trigger first turn logic if needed
  // UI usually handles manual/auto progression, or we can trigger it here:
  // setTimeout(() => executePlayerTurn('A'), 1000); // Handled by ControlPanel polling
};

export const executePlayerTurn = async (playerId: 'A' | 'B' | 'C') => {
  const config = useConfigStore.getState();
  const gameStore = useGameStore.getState();
  const player = gameStore.players[playerId];
  
  if (player.hasGuessed || player.turnsUsed >= config.turnsPerRound) {
    // Skip this player
    const nextPlayer = playerId === 'A' ? 'B' : playerId === 'B' ? 'C' : 'A';
    gameStore.setActivePlayerId(nextPlayer);
    return;
  }

  const modelName = config.models[`player${playerId}` as keyof typeof config.models];
  if (!modelName) {
    gameStore.addChatMessage({ sender: `Player${playerId}` as any, textEN: "(No model assigned. Skipping turn.)" });
    passTurn(playerId);
    return;
  }

  // Construct context
  const knownIdentities = [];
  if (playerId !== 'A') knownIdentities.push(`Player A is ${charactersData.find(c => c.id === gameStore.players['A'].assignedCharacterId)?.nameEN}`);
  if (playerId !== 'B') knownIdentities.push(`Player B is ${charactersData.find(c => c.id === gameStore.players['B'].assignedCharacterId)?.nameEN}`);
  if (playerId !== 'C') knownIdentities.push(`Player C is ${charactersData.find(c => c.id === gameStore.players['C'].assignedCharacterId)?.nameEN}`);

  const prompt = `
You are Player ${playerId} in a "Who Am I?" deduction game based on the Three Kingdoms era.
You are playing against two other players.
You DO NOT know your own identity. You must figure out who you are.
You know the following identities:
${knownIdentities.join('\n')}

Rules:
1. Ask the Judge exactly ONE "Yes/No" question about your own identity right now.
2. OR, if you are very confident, guess your name using the format "Am I [Name]?"
3. Be brief, ask only the question. No chatter.

Your Skill File from past games:
"""
${player.skillFileStr || "No past experience. You are learning."}
"""

Ask your question now:
`;

  const question = await generateChatResponse(modelName as string, [{ role: 'user', content: prompt }]);
  
  if (question.startsWith("(System: Error")) {
    gameStore.addChatMessage({
      sender: 'System',
      textEN: `Player ${playerId} encountered a connection error. Skipping turn.`,
    });
    passTurn(playerId);
    return;
  }

  gameStore.addChatMessage({
    sender: `Player${playerId}` as any,
    textEN: question,
  });

  // Call the judge
  await executeJudgeTurn(playerId, question);
};

export const executeJudgeTurn = async (playerId: 'A' | 'B' | 'C', question: string) => {
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

Determine if the question accurately describes ${character.nameEN} and provide your answer.
`;
    // For judge we want minimal tokens and low temp
    const rawAnswer = await generateChatResponse(modelName, [{ role: 'user', content: prompt }], { temperature: 0.1 });
    
    // Attempt parse
    if (rawAnswer.toLowerCase().includes('yes')) judgeAnswer = 'Yes.';
    else if (rawAnswer.toLowerCase().includes('not yes')) judgeAnswer = 'Not Yes and Not Wrong.';
    else judgeAnswer = 'No.';
  }

  gameStore.addChatMessage({
    sender: 'Judge',
    textEN: `${judgeAnswer} (Player ${playerId} Turn ${player.turnsUsed + 1}/${config.turnsPerRound})`,
  });

  gameStore.updatePlayer(playerId, { turnsUsed: player.turnsUsed + 1 });

  // Handle translation if enabled (simplified inline async patch)
  if (config.translationEnabled && config.models.translator) {
      triggerTranslation(gameStore.chatLog[gameStore.chatLog.length - 2].id, question);
      triggerTranslation(gameStore.chatLog[gameStore.chatLog.length - 1].id, judgeAnswer);
  }

  // Check if it was a guess
  if (question.toLowerCase().includes('am i') && judgeAnswer === 'Yes.') {
    // Simplified guess detection: if judge says Yes. and the string contained "am i"
    // Heuristic could be better, but suffices for simulation
    gameStore.updatePlayer(playerId, {
      hasGuessed: true,
      score: player.score + (config.turnsPerRound - player.turnsUsed)
    });
    gameStore.addChatMessage({
      sender: 'System',
      textEN: `Player ${playerId} guessed correctly! They earned ${config.turnsPerRound - player.turnsUsed} points.`,
    });
  }

  checkRoundEnd();
};

const triggerTranslation = async (msgId: string, text: string) => {
    const config = useConfigStore.getState();
    const gameStore = useGameStore.getState();
    if (!config.models.translator) return;

    const cnText = await generateChatResponse(config.models.translator, [{ 
        role: 'user', 
        content: `Translate to simplified Chinese: ${text}`
    }]);

    gameStore.updateChatMessage(msgId, { textCN: cnText });
}

const passTurn = (currentPlayerId: 'A' | 'B' | 'C') => {
  const nextPlayer = currentPlayerId === 'A' ? 'B' : currentPlayerId === 'B' ? 'C' : 'A';
  useGameStore.getState().setActivePlayerId(nextPlayer);
};

const checkRoundEnd = () => {
    const config = useConfigStore.getState();
    const gameStore = useGameStore.getState();
    const players = Object.values(gameStore.players);

    const allFinished = players.every(p => p.hasGuessed || p.turnsUsed >= config.turnsPerRound);

    if (allFinished) {
        gameStore.setStatus('ROUND_OVER');
        gameStore.addChatMessage({
            sender: 'System',
            textEN: `Round ${gameStore.currentRound} Over! Learning phase initiated...`
        });
        // We could run runRoundReview() here
    } else {
        // Pass to next active player
        let nextPlayer = gameStore.activePlayerId === 'A' ? 'B' : gameStore.activePlayerId === 'B' ? 'C' : 'A';
        // Skip those who finished
        for(let i=0; i<3; i++) {
            const p = gameStore.players[nextPlayer];
            if (p.hasGuessed || p.turnsUsed >= config.turnsPerRound) {
                nextPlayer = nextPlayer === 'A' ? 'B' : nextPlayer === 'B' ? 'C' : 'A';
            } else {
                break;
            }
        }
        gameStore.setActivePlayerId(nextPlayer as 'A' | 'B' | 'C');
    }
}
