import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useConfigStore } from '../../store/useConfigStore';
import charactersData from '../../assets/characters.json';
import { executePlayerTurn } from '../../services/gameEngine';
import placeholderImg from '../../assets/images/placeholder.png';
import bgScrollImg from '../../assets/images/bg_scroll.png';

const MessageBubble = ({ msg }: { msg: any }) => {
    const isSystem = msg.sender === 'System';
    const isJudge = msg.sender === 'Judge';
    
    let colorClass = 'text-ink';
    if (msg.sender === 'PlayerA') colorClass = 'text-blue-800 font-medium';
    if (msg.sender === 'PlayerB') colorClass = 'text-green-800 font-medium';
    if (msg.sender === 'PlayerC') colorClass = 'text-orange-800 font-medium';
    if (isJudge) colorClass = 'text-stamp font-bold';
    if (isSystem) colorClass = 'text-ink/60 italic text-center w-full block border-y border-gold/30 py-2 my-4';

    return (
        <div className={`mb-4 ${isSystem ? '' : 'p-3 rounded-lg bg-white/40 border border-gold/20 shadow-sm'}`}>
            <div className={colorClass}>
                {!isSystem && <span className="mr-2 uppercase tracking-wide">[{msg.sender}]</span>}
                {msg.textEN}
            </div>
            {msg.textCN && (
                <div className="mt-1 text-ink/70 italic text-sm ml-4 pl-4 border-l-2 border-gold/30">
                    {msg.textCN}
                </div>
            )}
        </div>
    );
}

const IdentityCard = ({ playerId }: { playerId: 'A' | 'B' | 'C' }) => {
    const player = useGameStore(state => state.players[playerId]);
    const configModel = useConfigStore(state => state.models[`player${playerId}` as keyof typeof state.models]);
    const char = charactersData.find(c => c.id === player?.assignedCharacterId);

    if (!player || !char) return null;

    return (
        <div className="bg-white/90 p-4 border border-gold rounded shadow relative overflow-hidden text-center m-2 w-48">
             <div className="absolute top-0 right-0 p-1 bg-stamp text-white text-xs rounded-bl">{playerId}</div>
             <img src={placeholderImg} alt="Avatar" className="w-16 h-16 rounded-full mx-auto border-2 border-gold mb-2 object-cover object-top shadow-sm" />
             <div className="text-xl font-bold mb-1">{char.nameEN}</div>
             <div className="text-sm text-ink/60 mb-2">({char.faction})</div>
             <div className="text-xs font-mono text-ink/40 truncate" title={configModel as string}>{configModel}</div>
             
             <div className="mt-3 pt-3 border-t border-gold/30">
                 {player.hasGuessed ? (
                     <span className="text-green-700 font-bold">Guessed! ({player.score} pts)</span>
                 ) : (
                     <span className="text-ink/70">Turns: {player.turnsUsed} / {useConfigStore.getState().turnsPerRound}</span>
                 )}
             </div>
        </div>
    )
}

const GameArena = () => {
  const gameStore = useGameStore();
  const config = useConfigStore();
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
     chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameStore.chatLog]);

  // Provide a manual step button for testing, or an auto-play interval
  const handleNextTurn = () => {
     if (gameStore.status === 'PLAYING' && gameStore.activePlayerId) {
         executePlayerTurn(gameStore.activePlayerId);
     }
  };

  return (
    <div className="flex flex-col h-screen bg-paper font-serif text-ink p-4">
      
      {/* Header */}
      <div className="flex justify-between items-center bg-red-900 border-b-4 border-gold p-4 mt-2 mx-2 rounded-t-xl text-white shadow-xl">
         <div className="text-2xl font-bold tracking-widest text-white drop-shadow">三国猜猜看</div>
         <div className="text-lg bg-black/20 px-4 py-1 rounded-full border border-gold/30">
             ROUND {gameStore.currentRound} of {config.rounds} | STATUS: {gameStore.status}
         </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
          
          {/* Left Panel: Controls & Scores */}
          <div className="w-64 p-4 border-r-2 border-gold/50 flex flex-col items-center bg-white/30 backdrop-blur">
              <h3 className="font-bold text-lg mb-4 text-stamp border-b border-gold w-full text-center pb-2">CONTROLS</h3>
              <button onClick={handleNextTurn} className="w-full bg-gold hover:bg-yellow-700 text-white font-bold py-3 px-4 rounded mb-4 shadow hover:shadow-lg transition">
                 Execute Next Turn
              </button>
              
              <div className="w-full mt-auto">
                 <h3 className="font-bold text-lg mb-2 text-stamp border-b border-gold w-full text-center pb-1">SCOREBOARD</h3>
                 {['A', 'B', 'C'].map(p => (
                     <div key={p} className="flex justify-between py-1 border-b border-gold/20 last:border-0">
                        <span>Player {p}</span>
                        <span className="font-bold">{gameStore.players[p]?.score || 0} pts</span>
                     </div>
                 ))}
              </div>
          </div>

          {/* Middle Panel: Scrollable Chat Arena */}
          <div className="flex-1 p-6 overflow-y-auto relative scroll-smooth bg-white/50" style={{ backgroundImage: `url(${bgScrollImg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
               <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-0"></div>
               <div className="relative z-10 w-full max-w-3xl mx-auto flex flex-col min-h-full">
                   {gameStore.chatLog.map(msg => (
                       <MessageBubble key={msg.id} msg={msg} />
                   ))}
                   {gameStore.status === 'PLAYING' && (
                       <div className="flex justify-center my-4">
                           <span className="animate-pulse bg-gold/20 px-4 py-1 rounded-full text-gold-800 border border-gold/40 text-sm italic">
                               Waiting for Player {gameStore.activePlayerId}...
                           </span>
                       </div>
                   )}
                   <div ref={chatEndRef} />
               </div>
          </div>

          {/* Right Panel: Identity Cards */}
          <div className="w-64 p-4 border-l-2 border-gold/50 flex flex-col items-center bg-white/30 backdrop-blur space-y-4">
              <h3 className="font-bold text-lg text-stamp border-b border-gold w-full text-center pb-2">SECRET IDENTITIES</h3>
              <IdentityCard playerId={'A'} />
              <IdentityCard playerId={'B'} />
              <IdentityCard playerId={'C'} />
          </div>
      </div>
    </div>
  );
};

export default GameArena;
