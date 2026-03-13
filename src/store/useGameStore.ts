import { create } from 'zustand';

export interface PlayerState {
  id: 'A' | 'B' | 'C';
  assignedCharacterId: string;
  turnsUsed: number;
  hasGuessed: boolean;
  score: number;
  skillFileStr: string;
}

export interface ChatMessage {
  id: string;
  sender: 'System' | 'Judge' | 'PlayerA' | 'PlayerB' | 'PlayerC';
  textEN: string;
  textCN?: string;
  timestamp: string; // ISO string 
}

export type GameStatus = 'IDLE' | 'SETUP' | 'PLAYING' | 'ROUND_OVER' | 'MATCH_OVER';

interface GameStore {
  status: GameStatus;
  currentRound: number;
  activePlayerId: 'A' | 'B' | 'C' | null;
  players: Record<string, PlayerState>;
  chatLog: ChatMessage[];
  
  setStatus: (status: GameStatus) => void;
  setCurrentRound: (round: number) => void;
  setActivePlayerId: (id: 'A' | 'B' | 'C' | null) => void;
  setPlayers: (players: Record<string, PlayerState>) => void;
  updatePlayer: (id: string, updates: Partial<PlayerState>) => void;
  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  updateChatMessage: (id: string, updates: Partial<ChatMessage>) => void;
  clearChat: () => void;
  resetGame: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export const useGameStore = create<GameStore>((set) => ({
  status: 'IDLE',
  currentRound: 0,
  activePlayerId: null,
  players: {},
  chatLog: [],

  setStatus: (status) => set({ status }),
  setCurrentRound: (currentRound) => set({ currentRound }),
  setActivePlayerId: (activePlayerId) => set({ activePlayerId }),
  setPlayers: (players) => set({ players }),
  updatePlayer: (id, updates) =>
    set((state) => ({
      players: {
        ...state.players,
        [id]: { ...state.players[id], ...updates },
      },
    })),
  addChatMessage: (msg) =>
    set((state) => ({
      chatLog: [
        ...state.chatLog,
        { ...msg, id: generateId(), timestamp: new Date().toISOString() },
      ],
    })),
  updateChatMessage: (id, updates) =>
    set((state) => ({
      chatLog: state.chatLog.map((msg) =>
        msg.id === id ? { ...msg, ...updates } : msg
      ),
    })),
  clearChat: () => set({ chatLog: [] }),
  resetGame: () =>
    set({
      status: 'IDLE',
      currentRound: 0,
      activePlayerId: null,
      players: {},
      chatLog: [],
    }),
}));
