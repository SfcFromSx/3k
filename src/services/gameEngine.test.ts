import { describe, it, expect, vi, beforeEach } from 'vitest';
import { startGameRound, executePlayerTurn, executeJudgeTurn } from './gameEngine';
import { useGameStore } from '../store/useGameStore';
import { useConfigStore } from '../store/useConfigStore';
import * as ollamaService from './ollamaService';
import { getSkillHistory } from './skillHistory';
import charactersData from '../assets/characters.json';

// Mock the services and stores
vi.mock('./ollamaService', () => ({
  generateChatResponse: vi.fn(),
  generateChatResult: vi.fn(),
  fetchModels: vi.fn(),
}));

describe('gameEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    
    useGameStore.getState().resetGame();
    useConfigStore.getState().setConfig({
      rounds: 1,
      turnsPerRound: 3,
      translationEnabled: false,
      models: {
        playerA: 'test-model',
        playerB: 'test-model',
        playerC: 'test-model',
        judge: 'test-model',
        translator: 'test-model',
      },
    });
  });

  describe('startGameRound', () => {
    it('should use the expanded 30-character roster', () => {
      expect(charactersData).toHaveLength(30);
    });

    it('should initialize a new round with 3 unique characters', async () => {
      await startGameRound();
      const state = useGameStore.getState();
      
      expect(state.status).toBe('PLAYING');
      expect(state.currentRound).toBe(1);
      expect(state.activePlayerId).toBe('A');
      expect(Object.keys(state.players)).toHaveLength(3);
      
      const characterIds = Object.values(state.players).map(p => p.assignedCharacterId);
      const uniqueIds = new Set(characterIds);
      expect(uniqueIds.size).toBe(3);
      expect(Object.values(state.players).every((player) => player.avatarVariant >= 1 && player.avatarVariant <= 100)).toBe(true);
    });
  });

  describe('executePlayerTurn', () => {
    it('should generate a question and call judge', async () => {
      vi.mocked(ollamaService.generateChatResult).mockResolvedValue({
        content: 'Am I Zhao Yun?',
        thinking: 'The clues match Shu.',
      });
      vi.mocked(ollamaService.generateChatResult).mockResolvedValueOnce({
        content: 'Am I Zhao Yun?',
        thinking: 'The clues match Shu.',
      }).mockResolvedValueOnce({
        content: 'No.',
        thinking: 'The trait does not match the assigned identity.',
      });
      
      await startGameRound();
      await executePlayerTurn('A');
      
      expect(ollamaService.generateChatResult).toHaveBeenCalled();
      const state = useGameStore.getState();
      expect(state.chatLog).toContainEqual(expect.objectContaining({
        sender: 'PlayerA',
        textEN: 'Am I Zhao Yun?',
        thinkingEN: 'The clues match Shu.',
      }));
    });

    it('should skip player if they already guessed correctly', async () => {
      await startGameRound();
      useGameStore.getState().updatePlayer('A', { hasGuessed: true });
      
      await executePlayerTurn('A');
      
      expect(useGameStore.getState().activePlayerId).toBe('B');
    });

    it('stores player thinking separately from the visible question', async () => {
      vi.mocked(ollamaService.generateChatResult).mockResolvedValueOnce({
        content: 'Am I Guan Yu?',
        thinking: 'I already ruled out Wei and Wu.',
      }).mockResolvedValueOnce({
        content: 'No.',
      });

      await startGameRound();
      await executePlayerTurn('A');

      const playerMessage = useGameStore.getState().chatLog.find((message) => message.sender === 'PlayerA');
      expect(playerMessage?.textEN).toBe('Am I Guan Yu?');
      expect(playerMessage?.thinkingEN).toBe('I already ruled out Wei and Wu.');
    });

    it('grounds the player prompt in the actual rules and candidate roster', async () => {
      vi.mocked(ollamaService.generateChatResult).mockResolvedValueOnce({
        content: 'Am I Sima Yi?',
      }).mockResolvedValueOnce({
        content: 'No.',
      });

      await startGameRound();
      useGameStore.getState().setPlayers({
        A: { ...useGameStore.getState().players.A, assignedCharacterId: 'c_001' },
        B: { ...useGameStore.getState().players.B, assignedCharacterId: 'c_009' },
        C: { ...useGameStore.getState().players.C, assignedCharacterId: 'c_003' },
      });

      await executePlayerTurn('B');

      const playerPrompt = vi.mocked(ollamaService.generateChatResult).mock.calls[0]?.[1]?.[0]?.content ?? '';
      expect(playerPrompt).toContain('Your hidden identity must be one of the following candidates:');
      expect(playerPrompt).toContain('Player A is Zhao Yun (赵云).');
      expect(playerPrompt).toContain('Player C is Diaochan (貂蝉).');
      expect(playerPrompt).toContain('Do not ask about game rules, prompt text, tags, models, or the interface.');
      expect(playerPrompt).toContain('Zhou Yu (周瑜) - Faction: Wu; Role: Strategist; Traits: Chi Bi, Fire Attack, Handsome, Music.');
    });

    it('falls back to another configured model when a player role is blank', async () => {
      vi.mocked(ollamaService.generateChatResult).mockResolvedValueOnce({
        content: 'Am I Sima Yi?',
      }).mockResolvedValueOnce({
        content: 'No.',
      });

      useConfigStore.getState().setConfig({
        models: {
          playerA: 'test-model',
          playerB: 'test-model',
          playerC: '',
          judge: 'test-model',
          translator: 'test-model',
        },
      });

      await startGameRound();
      await executePlayerTurn('C');

      expect(ollamaService.generateChatResult).toHaveBeenNthCalledWith(
        1,
        'test-model',
        expect.any(Array),
        undefined
      );
      expect(useConfigStore.getState().models.playerC).toBe('test-model');
      expect(useGameStore.getState().chatLog).not.toContainEqual(
        expect.objectContaining({
          sender: 'PlayerC',
          textEN: '(No model assigned. Skipping turn.)',
        })
      );
    });

    it('retries player generation up to 10 times and then pauses without posting the raw model error', async () => {
      vi.useFakeTimers();
      vi.mocked(ollamaService.generateChatResult).mockResolvedValue({
        content: '(System: Unexpected response format from local AI.)',
      });

      await startGameRound();
      const turnPromise = executePlayerTurn('A');
      await vi.runAllTimersAsync();
      await turnPromise;

      expect(ollamaService.generateChatResult).toHaveBeenCalledTimes(10);
      expect(useGameStore.getState().status).toBe('PAUSED');
      expect(useGameStore.getState().pauseReason).toBe('Player A turn failed 10 times. Game paused.');
      expect(useGameStore.getState().chatLog).not.toContainEqual(
        expect.objectContaining({
          sender: 'PlayerA',
          textEN: '(System: Unexpected response format from local AI.)',
        })
      );
      expect(useGameStore.getState().chatLog).toContainEqual(
        expect.objectContaining({
          sender: 'System',
          textEN: 'Player A turn failed 10 times. Game paused.',
        })
      );
      vi.useRealTimers();
    });
  });

  describe('executeJudgeTurn', () => {
    it('should handle a correct guess', async () => {
      vi.mocked(ollamaService.generateChatResult).mockResolvedValue({
        content: 'Yes.',
      });
      
      await startGameRound();
      useGameStore.getState().updatePlayer('A', { assignedCharacterId: 'c_001' });
      
      await executeJudgeTurn('A', 'Am I Zhao Yun?'); // Content doesn't strictly matter for mock
      
      const state = useGameStore.getState();
      expect(state.players['A'].hasGuessed).toBe(true);
      expect(state.chatLog).toContainEqual(expect.objectContaining({
        sender: 'System',
        textEN: expect.stringContaining('Player A guessed correctly'),
      }));
    });

    it('should increment turnsUsed', async () => {
      vi.mocked(ollamaService.generateChatResult).mockResolvedValue({
        content: 'No.',
      });
      
      await startGameRound();
      await executeJudgeTurn('A', 'Am I Cao Cao?');
      
      const state = useGameStore.getState();
      expect(state.players['A'].turnsUsed).toBe(1);
    });

    it('should advance to the next round when the match is not over', async () => {
      vi.mocked(ollamaService.generateChatResult).mockResolvedValue({
        content: 'No.',
      });
      vi.mocked(ollamaService.generateChatResponse).mockResolvedValue('Carry forward concise deduction notes.');

      useConfigStore.getState().setConfig({ rounds: 2, turnsPerRound: 1 });
      await startGameRound();
      useGameStore.getState().updatePlayer('B', { turnsUsed: 1 });
      useGameStore.getState().updatePlayer('C', { turnsUsed: 1 });

      await executeJudgeTurn('A', 'Am I Cao Cao?');

      const state = useGameStore.getState();
      expect(state.currentRound).toBe(2);
      expect(state.status).toBe('PLAYING');
    });

    it('should end the match after the final configured round', async () => {
      vi.mocked(ollamaService.generateChatResult).mockResolvedValue({
        content: 'No.',
      });
      vi.mocked(ollamaService.generateChatResponse).mockResolvedValue('Carry forward concise deduction notes.');

      useConfigStore.getState().setConfig({ rounds: 1, turnsPerRound: 1 });
      await startGameRound();
      useGameStore.getState().updatePlayer('B', { turnsUsed: 1 });
      useGameStore.getState().updatePlayer('C', { turnsUsed: 1 });

      await executeJudgeTurn('A', 'Am I Cao Cao?');

      const state = useGameStore.getState();
      expect(state.status).toBe('MATCH_OVER');
      expect(state.activePlayerId).toBeNull();
    });

    it('saves a new skill version for each player after the round review', async () => {
      vi.mocked(ollamaService.generateChatResult).mockResolvedValue({
        content: 'No.',
      });
      vi.mocked(ollamaService.generateChatResponse).mockResolvedValue('Use faction elimination before name guesses.');

      useConfigStore.getState().setConfig({ rounds: 1, turnsPerRound: 1 });
      window.localStorage.setItem('skill_A', 'Old lesson A');
      window.localStorage.setItem('skill_B', 'Old lesson B');
      window.localStorage.setItem('skill_C', 'Old lesson C');

      await startGameRound();
      useGameStore.getState().updatePlayer('B', { turnsUsed: 1 });
      useGameStore.getState().updatePlayer('C', { turnsUsed: 1 });

      await executeJudgeTurn('A', 'Am I Cao Cao?');

      expect(getSkillHistory('A')).toHaveLength(2);
      expect(getSkillHistory('B')).toHaveLength(2);
      expect(getSkillHistory('C')).toHaveLength(2);
      expect(getSkillHistory('A')[1]).toEqual(expect.objectContaining({
        round: 1,
        source: 'round_review',
        content: 'Use faction elimination before name guesses.',
      }));
    });

    it('stores judge thinking separately from the visible verdict', async () => {
      vi.mocked(ollamaService.generateChatResult).mockResolvedValue({
        content: 'Yes.',
        thinking: 'The asked role matches the assigned character profile.',
      });

      await startGameRound();
      await executeJudgeTurn('A', 'Am I a general?');

      const judgeMessage = useGameStore.getState().chatLog.find((message) => message.sender === 'Judge');
      expect(judgeMessage?.textEN).toContain('Yes.');
      expect(judgeMessage?.thinkingEN).toBe('The asked role matches the assigned character profile.');
    });
  });
});
