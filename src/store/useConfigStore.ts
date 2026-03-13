import { create } from 'zustand';

export interface GameConfig {
  rounds: number;
  turnsPerRound: number;
  translationEnabled: boolean;
  models: {
    playerA: string;
    playerB: string;
    playerC: string;
    judge: string;
    translator: string;
  };
}

interface ConfigStore extends GameConfig {
  setConfig: (config: Partial<GameConfig>) => void;
  setModel: (role: keyof GameConfig['models'], modelName: string) => void;
}

export const useConfigStore = create<ConfigStore>((set) => ({
  rounds: 3,
  turnsPerRound: 5,
  translationEnabled: false,
  models: {
    playerA: '',
    playerB: '',
    playerC: '',
    judge: '',
    translator: '',
  },
  setConfig: (config) => set((state) => ({ ...state, ...config })),
  setModel: (role, modelName) =>
    set((state) => ({
      models: {
        ...state.models,
        [role]: modelName,
      },
    })),
}));
