import { useGameStore } from './store/useGameStore';
import SetupScreen from './components/SetupScreen/SetupScreen';
import GameArena from './components/GameArena/GameArena';

function App() {
  const status = useGameStore((state) => state.status);

  return (
    <div className="min-h-screen">
      {status === 'IDLE' || status === 'SETUP' ? (
        <SetupScreen />
      ) : (
        <GameArena />
      )}
    </div>
  );
}

export default App;
