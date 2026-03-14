import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SetupScreen from './SetupScreen';
import { useConfigStore } from '../../store/useConfigStore';
import { useGameStore } from '../../store/useGameStore';
import * as ollamaService from '../../services/ollamaService';

// Mock the services
vi.mock('../../services/ollamaService', () => ({
  fetchModels: vi.fn(),
  generateChatResponse: vi.fn(),
}));

describe('SetupScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    useConfigStore.getState().setConfig({
      rounds: 1,
      turnsPerRound: 5,
      uiLanguage: 'EN',
      translationEnabled: false,
    });
    useGameStore.getState().setStatus('IDLE');
  });

  it('renders correctly and starts detection', async () => {
    vi.mocked(ollamaService.fetchModels).mockResolvedValue(['llama3', 'mistral']);
    
    render(<SetupScreen />);
    
    expect(screen.getAllByText(/Three Kingdoms - Who Am I\?/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Detecting local Ollama models/i)).toBeInTheDocument();
  });

  it('shows model selectors when models are loaded', async () => {
    vi.mocked(ollamaService.fetchModels).mockResolvedValue(['llama3', 'mistral']);
    
    render(<SetupScreen />);
    
    await waitFor(() => {
      expect(screen.queryByText(/Detecting local Ollama models/i)).not.toBeInTheDocument();
    });

    expect(screen.getByLabelText(/Judge/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Player A/i)).toBeInTheDocument();
  });

  it('updates configuration on user input', async () => {
    render(<SetupScreen />);
    
    const roundsInput = screen.getByLabelText(/Number of Rounds/i) as HTMLInputElement;
    fireEvent.change(roundsInput, { target: { value: '3' } });
    
    expect(useConfigStore.getState().rounds).toBe(3);
  });

  it('clamps configuration to the new maximums', async () => {
    render(<SetupScreen />);

    const roundsInput = screen.getByLabelText(/Number of Rounds/i) as HTMLInputElement;
    const turnsInput = screen.getByLabelText(/Turns Per Round/i) as HTMLInputElement;

    fireEvent.change(roundsInput, { target: { value: '99' } });
    fireEvent.change(turnsInput, { target: { value: '999' } });

    expect(useConfigStore.getState().rounds).toBe(50);
    expect(useConfigStore.getState().turnsPerRound).toBe(100);
  });

  it('toggles the setup language to Chinese', async () => {
    vi.mocked(ollamaService.fetchModels).mockResolvedValue(['llama3']);

    render(<SetupScreen />);

    fireEvent.click(screen.getByRole('button', { name: /switch interface language to chinese/i }));

    expect(screen.getByText('三国猜猜看')).toBeInTheDocument();
    expect(screen.getByText('游戏规则')).toBeInTheDocument();
    expect(screen.getByText('开始模拟')).toBeInTheDocument();
    expect(useConfigStore.getState().uiLanguage).toBe('CN');
  });

  it('starts the game when "Start Simulation" is clicked', async () => {
    vi.mocked(ollamaService.fetchModels).mockResolvedValue(['llama3']);
    
    render(<SetupScreen />);
    
    await waitFor(() => {
      expect(screen.getByText(/Start Simulation/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Start Simulation/i));
    
    expect(useGameStore.getState().status).toBe('PLAYING');
  });
});
