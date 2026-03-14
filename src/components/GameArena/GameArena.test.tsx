import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as gameEngine from '../../services/gameEngine';
import { getAvatarUrl } from '../../assets/avatarCatalog';
import GameArena from './GameArena';
import { useGameStore } from '../../store/useGameStore';
import { useConfigStore } from '../../store/useConfigStore';

vi.mock('../../services/gameEngine', () => ({
  executePlayerTurn: vi.fn(),
}));

describe('GameArena', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    useConfigStore.getState().setConfig({
      rounds: 1,
      turnsPerRound: 5,
      uiLanguage: 'EN',
      translationEnabled: false,
    });
    
    // Set up a playing state
    useGameStore.getState().resetGame();
    useGameStore.getState().setStatus('PLAYING');
    useGameStore.getState().setPlayers({
      A: { id: 'A', assignedCharacterId: 'c_001', avatarVariant: 11, turnsUsed: 0, hasGuessed: false, score: 0, skillFileStr: '' },
      B: { id: 'B', assignedCharacterId: 'c_002', avatarVariant: 22, turnsUsed: 0, hasGuessed: false, score: 0, skillFileStr: '' },
      C: { id: 'C', assignedCharacterId: 'c_003', avatarVariant: 33, turnsUsed: 0, hasGuessed: false, score: 0, skillFileStr: '' },
    });
    useGameStore.getState().setActivePlayerId('A');
  });

  it('renders the game arena with player cards and scoreboard', () => {
    render(<GameArena />);
    
    // Scoreboard labels (might also match turn indicator)
    expect(screen.getAllByText(/Player A/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Player B/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Player C/i).length).toBeGreaterThanOrEqual(1);

    // Identity Card context (Character Names)
    expect(screen.getByText(/Zhao Yun/i)).toBeInTheDocument();
    expect(screen.getByText(/Zhou Yu/i)).toBeInTheDocument();
    expect(screen.getByText(/Diaochan/i)).toBeInTheDocument();

    expect(screen.getByAltText(/Zhao Yun avatar/i)).toHaveAttribute('src', getAvatarUrl('c_001', 11));
    expect(screen.getByAltText(/Zhou Yu avatar/i)).toHaveAttribute('src', getAvatarUrl('c_002', 22));
  });

  it('indicates the active player', () => {
    render(<GameArena />);
    
    // Check for the "Waiting for Player A..." indicator
    expect(screen.getByText(/Waiting for Player A/i)).toBeInTheDocument();
  });

  it('renders chat messages', async () => {
    // Ensure store is clean then add
    useGameStore.getState().resetGame();
    useGameStore.getState().setCurrentRound(1);
    useGameStore.getState().addChatMessage({ 
        sender: 'System', 
        textEN: 'Test System Message' 
    });
    
    render(<GameArena />);
    
    // System messages might render with some delay or specific structure,
    // but they should be in the DOM.
    expect(await screen.findByText(/Test System Message/i)).toBeInTheDocument();
  });

  it('shows a thinking toggle for player messages and reveals the details on click', async () => {
    useGameStore.getState().resetGame();
    useGameStore.getState().setCurrentRound(1);
    useGameStore.getState().addChatMessage({
      sender: 'PlayerA',
      textEN: 'Am I Zhao Yun?',
      thinkingEN: 'The prior answers point toward Shu.',
    });

    render(<GameArena />);

    expect(screen.queryByText(/The prior answers point toward Shu/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /show thinking for playera/i }));

    expect(await screen.findByText(/The prior answers point toward Shu/i)).toBeInTheDocument();
  });

  it('auto-advances turns while autoplay is running', () => {
    vi.useFakeTimers();

    render(<GameArena />);

    act(() => {
      vi.advanceTimersByTime(900);
    });

    expect(gameEngine.executePlayerTurn).toHaveBeenCalledWith('A');
  });

  it('stops auto-advancing when paused', () => {
    vi.useFakeTimers();

    render(<GameArena />);
    fireEvent.click(screen.getByRole('button', { name: /pause autoplay/i }));

    act(() => {
      vi.advanceTimersByTime(900);
    });

    expect(gameEngine.executePlayerTurn).not.toHaveBeenCalled();
    expect(screen.getAllByText(/Autoplay paused/i).length).toBeGreaterThan(0);
  });

  it('switches the arena language and prioritizes translated chat text', async () => {
    useGameStore.getState().resetGame();
    useGameStore.getState().setCurrentRound(1);
    useGameStore.getState().setStatus('PLAYING');
    useGameStore.getState().setPlayers({
      A: { id: 'A', assignedCharacterId: 'c_001', avatarVariant: 11, turnsUsed: 0, hasGuessed: false, score: 0, skillFileStr: '' },
      B: { id: 'B', assignedCharacterId: 'c_002', avatarVariant: 22, turnsUsed: 0, hasGuessed: false, score: 0, skillFileStr: '' },
      C: { id: 'C', assignedCharacterId: 'c_003', avatarVariant: 33, turnsUsed: 0, hasGuessed: false, score: 0, skillFileStr: '' },
    });
    useGameStore.getState().setActivePlayerId('A');
    useGameStore.getState().addChatMessage({
      sender: 'Judge',
      textEN: 'Yes.',
      textCN: '是。',
    });

    render(<GameArena />);

    fireEvent.click(screen.getByRole('button', { name: /switch interface language to chinese/i }));

    expect(await screen.findByText('是。')).toBeInTheDocument();
    expect(screen.getByText('三国猜猜看')).toBeInTheDocument();
    expect(screen.getByText('身份卡')).toBeInTheDocument();
    expect(screen.getByText('赵云')).toBeInTheDocument();
    expect(screen.getByText('(蜀)')).toBeInTheDocument();
    expect(useConfigStore.getState().uiLanguage).toBe('CN');
  });
});
