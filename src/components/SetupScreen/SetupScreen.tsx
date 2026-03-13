import { useEffect, useState } from 'react';
import { useConfigStore } from '../../store/useConfigStore';
import { useGameStore } from '../../store/useGameStore';
import { fetchModels } from '../../services/ollamaService';
import { startGameRound } from '../../services/gameEngine';

const SetupScreen = () => {
  const config = useConfigStore();
  const setStatus = useGameStore((state) => state.setStatus);
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadModels = async () => {
      const availableModels = await fetchModels();
      setModels(availableModels);
      if (availableModels.length > 0) {
        // Pre-select the first available if not set
        ['playerA', 'playerB', 'playerC', 'judge', 'translator'].forEach(role => {
          if (!config.models[role as keyof typeof config.models]) {
            config.setModel(role as keyof typeof config.models, availableModels[0]);
          }
        });
      }
      setLoading(false);
    };
    loadModels();
  }, []);

  const handleStart = async () => {
    setStatus('SETUP');
    await startGameRound();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-opacity-90 bg-paper font-serif text-ink">
      <div className="max-w-3xl w-full bg-white/80 p-8 rounded-lg shadow-2xl border-4 border-double border-gold relative overflow-hidden backdrop-blur-sm">
        { /* Decorative classic borders could be added here via CSS classes */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-stamp to-transparent" />

        <h1 className="text-4xl font-bold text-center mb-8 text-stamp tracking-wider">
          三国猜猜看
          <span className="block text-2xl mt-2 text-ink/80 font-normal">Three Kingdoms - Who Am I?</span>
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <h2 className="text-2xl border-b-2 border-gold pb-2 font-bold inline-block">Game Rules</h2>

            <div>
              <label className="block text-lg mb-2">Number of Rounds</label>
              <input
                type="number"
                min="1" max="10"
                className="w-full p-2 border border-gold/50 rounded bg-white text-ink text-lg focus:outline-none focus:border-stamp"
                value={config.rounds}
                onChange={(e) => config.setConfig({ rounds: parseInt(e.target.value) || 1 })}
              />
            </div>

            <div>
              <label className="block text-lg mb-2">Turns Per Round</label>
              <input
                type="number"
                min="1" max="20"
                className="w-full p-2 border border-gold/50 rounded bg-white text-ink text-lg focus:outline-none focus:border-stamp"
                value={config.turnsPerRound}
                onChange={(e) => config.setConfig({ turnsPerRound: parseInt(e.target.value) || 1 })}
              />
            </div>

            <div className="flex items-center space-x-3 pt-4">
              <input
                type="checkbox"
                id="translation"
                className="w-6 h-6 border-gold text-stamp focus:ring-stamp rounded"
                checked={config.translationEnabled}
                onChange={(e) => config.setConfig({ translationEnabled: e.target.checked })}
              />
              <label htmlFor="translation" className="text-lg cursor-pointer select-none">Enable Chinese Translation</label>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl border-b-2 border-gold pb-2 font-bold inline-block">LLM Assignment</h2>
            {loading ? (
              <p className="animate-pulse">Detecting local Ollama models...</p>
            ) : models.length === 0 ? (
              <div className="p-4 bg-red-100/80 text-stamp border border-red-300 rounded">
                Ensure Ollama is running locally `http://localhost:11434` with at least one model pulled.
              </div>
            ) : (
              <div className="space-y-4">
                {['Judge', 'Player A', 'Player B', 'Player C', 'Translator'].map((label, idx) => {
                  const roleKey = ['judge', 'playerA', 'playerB', 'playerC', 'translator'][idx] as keyof typeof config.models;
                  return (
                    <div key={roleKey} className="flex justify-between items-center">
                      <label className="text-lg w-1/3 text-right pr-4">{label}</label>
                      <select
                        className="w-2/3 p-2 border border-gold/50 rounded bg-white text-ink focus:outline-none focus:border-stamp"
                        value={config.models[roleKey]}
                        onChange={(e) => config.setModel(roleKey, e.target.value)}
                      >
                        {models.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 text-center">
          <button
            onClick={handleStart}
            disabled={models.length === 0}
            className="px-12 py-4 bg-stamp text-white text-2xl font-bold rounded-lg shadow-lg hover:bg-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-2 border-transparent hover:border-gold"
          >
            Start Simulation
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetupScreen;
