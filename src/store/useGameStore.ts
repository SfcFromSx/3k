import { create } from 'zustand';

export interface PlayerState {
  id: 'A' | 'B' | 'C';
  assignedCharacterId: string;
  avatarVariant: number;
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
  thinkingEN?: string;
  round: number;
  timestamp: string; // ISO string 
}

export type GameStatus = 'IDLE' | 'SETUP' | 'PLAYING' | 'ROUND_OVER' | 'MATCH_OVER';

interface GameStore {
  status: GameStatus;
  currentRound: number;
  activePlayerId: 'A' | 'B' | 'C' | null;
  players: Record<string, PlayerState>;
  chatLog: ChatMessage[];
  isProcessing: boolean;
  
  setStatus: (status: GameStatus) => void;
  setCurrentRound: (round: number) => void;
  setActivePlayerId: (id: 'A' | 'B' | 'C' | null) => void;
  setPlayers: (players: Record<string, PlayerState>) => void;
  updatePlayer: (id: string, updates: Partial<PlayerState>) => void;
  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp' | 'round'>) => string;
  updateChatMessage: (id: string, updates: Partial<ChatMessage>) => void;
  setIsProcessing: (loading: boolean) => void;
  clearChat: () => void;
  resetGame: () => void;
}

const generateId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const useGameStore = create<GameStore>((set, get) => ({
  status: 'IDLE',
  currentRound: 0,
  activePlayerId: null,
  players: {},
  chatLog: [],
  isProcessing: false,

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
  addChatMessage: (msg) => {
    const nextMessage = {
      ...msg,
      id: generateId(),
      round: get().currentRound,
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      chatLog: [...state.chatLog, nextMessage],
    }));

    return nextMessage.id;
  },
  updateChatMessage: (id, updates) =>
    set((state) => ({
      chatLog: state.chatLog.map((msg) =>
        msg.id === id ? { ...msg, ...updates } : msg
      ),
    })),
  setIsProcessing: (isProcessing) => set({ isProcessing }),
  clearChat: () => set({ chatLog: [] }),
  resetGame: () =>
    set({
      status: 'IDLE',
      currentRound: 0,
      activePlayerId: null,
      players: {},
      chatLog: [],
      isProcessing: false,
    }),
}));
