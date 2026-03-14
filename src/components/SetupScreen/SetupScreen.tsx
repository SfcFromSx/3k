import { useEffect, useState } from 'react';
import { Languages } from 'lucide-react';
import { useConfigStore } from '../../store/useConfigStore';
import { useGameStore } from '../../store/useGameStore';
import { fetchModels } from '../../services/ollamaService';
import { startGameRound } from '../../services/gameEngine';
import { UI_TEXT } from '../../i18n/uiText';

const MODEL_ROLES = ['judge', 'playerA', 'playerB', 'playerC', 'translator'] as const;
const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const SetupScreen = () => {
  const rounds = useConfigStore((state) => state.rounds);
  const turnsPerRound = useConfigStore((state) => state.turnsPerRound);
  const uiLanguage = useConfigStore((state) => state.uiLanguage);
  const translationEnabled = useConfigStore((state) => state.translationEnabled);
  const modelsByRole = useConfigStore((state) => state.models);
  const setConfig = useConfigStore((state) => state.setConfig);
  const setModel = useConfigStore((state) => state.setModel);
  const setStatus = useGameStore((state) => state.setStatus);
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const text = UI_TEXT[uiLanguage];

  useEffect(() => {
    let cancelled = false;

    const loadModels = async () => {
      const availableModels = await fetchModels();
      if (cancelled) return;

      setModels(availableModels);
      if (availableModels.length > 0) {
        const { models: currentModels, setModel: setStoredModel } = useConfigStore.getState();
        // Pre-select the first available if not set
        MODEL_ROLES.forEach(role => {
          if (!currentModels[role]) {
            setStoredModel(role, availableModels[0]);
          }
        });
      }
      setLoading(false);
    };

    void loadModels();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleStart = async () => {
    if (models.length === 0) return;

    const { models: currentModels } = useConfigStore.getState();
    const fallbackModel = models[0];

    MODEL_ROLES.forEach((role) => {
      if (!currentModels[role]) {
        setModel(role, fallbackModel);
      }
    });

    setStatus('SETUP');
    await startGameRound();
  };

  const toggleLanguage = () => {
    setConfig({ uiLanguage: uiLanguage === 'EN' ? 'CN' : 'EN' });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-opacity-90 bg-paper font-serif text-ink">
      <div className="max-w-3xl w-full bg-white/80 p-8 rounded-lg shadow-2xl border-4 border-double border-gold relative overflow-hidden backdrop-blur-sm">
        { /* Decorative classic borders could be added here via CSS classes */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-stamp to-transparent" />
        <button
          type="button"
          onClick={toggleLanguage}
          aria-label={text.languageToggleLabel}
          className="absolute right-6 top-6 rounded-full border border-gold/40 bg-white/75 px-4 py-2 text-sm font-semibold text-stamp shadow-sm transition-colors hover:bg-gold/10"
        >
          <span className="flex items-center gap-2">
            <Languages className="h-4 w-4" aria-hidden="true" />
            <span>{text.languageToggle}</span>
          </span>
        </button>

        <h1 className="text-4xl font-bold text-center mb-8 text-stamp tracking-wider">
          {text.appTitle}
          <span className="block text-2xl mt-2 text-ink/80 font-normal">{text.subtitle}</span>
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <h2 className="text-2xl border-b-2 border-gold pb-2 font-bold inline-block">{text.gameRules}</h2>

            <div>
              <label htmlFor="rounds-input" className="block text-lg mb-2">{text.numberOfRounds}</label>
              <input
                id="rounds-input"
                type="number"
                min="1" max="50"
                className="w-full p-2 border border-gold/50 rounded bg-white text-ink text-lg focus:outline-none focus:border-stamp"
                value={rounds}
                onChange={(e) => setConfig({ rounds: clampNumber(parseInt(e.target.value) || 1, 1, 50) })}
              />
            </div>

            <div>
              <label htmlFor="turns-input" className="block text-lg mb-2">{text.turnsPerRound}</label>
              <input
                id="turns-input"
                type="number"
                min="1" max="100"
                className="w-full p-2 border border-gold/50 rounded bg-white text-ink text-lg focus:outline-none focus:border-stamp"
                value={turnsPerRound}
                onChange={(e) => setConfig({ turnsPerRound: clampNumber(parseInt(e.target.value) || 1, 1, 100) })}
              />
            </div>

            <div className="flex items-center space-x-3 pt-4">
              <input
                type="checkbox"
                id="translation"
                className="w-6 h-6 border-gold text-stamp focus:ring-stamp rounded"
                checked={translationEnabled}
                onChange={(e) => setConfig({ translationEnabled: e.target.checked })}
              />
              <label htmlFor="translation" className="text-lg cursor-pointer select-none">{text.enableChineseTranslation}</label>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl border-b-2 border-gold pb-2 font-bold inline-block">{text.llmAssignment}</h2>
            {loading ? (
              <p className="animate-pulse">{text.detectingModels}</p>
            ) : models.length === 0 ? (
              <div className="p-4 bg-red-100/80 text-stamp border border-red-300 rounded">
                {text.noModels}
              </div>
            ) : (
              <div className="space-y-4">
                {[text.judge, text.playerA, text.playerB, text.playerC, text.translator].map((label, idx) => {
                  const roleKey = MODEL_ROLES[idx];
                  const id = `model-select-${roleKey}`;
                  return (
                    <div key={roleKey} className="flex justify-between items-center">
                      <label htmlFor={id} className="text-lg w-1/3 text-right pr-4">{label}</label>
                      <select
                        id={id}
                        className="w-2/3 p-2 border border-gold/50 rounded bg-white text-ink focus:outline-none focus:border-stamp"
                        value={modelsByRole[roleKey]}
                        onChange={(e) => setModel(roleKey, e.target.value)}
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
            {text.startSimulation}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetupScreen;
