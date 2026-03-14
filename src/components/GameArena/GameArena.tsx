import { useEffect, useRef, useState } from 'react';
import { Languages } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import type { ChatMessage } from '../../store/useGameStore';
import { useConfigStore } from '../../store/useConfigStore';
import { getAvatarUrl } from '../../assets/avatarCatalog';
import charactersData from '../../assets/characters.json';
import { executePlayerTurn } from '../../services/gameEngine';
import { getSkillHistory } from '../../services/skillHistory';
import { UI_TEXT, formatUiText } from '../../i18n/uiText';
import bgScrollImg from '../../assets/images/bg_scroll.png';

const STATUS_TEXT_KEY = {
  IDLE: 'statusIDLE',
  SETUP: 'statusSETUP',
  PLAYING: 'statusPLAYING',
  ROUND_OVER: 'statusROUND_OVER',
  MATCH_OVER: 'statusMATCH_OVER',
} as const;

const SKILL_SOURCE_TEXT_KEY = {
  seed: 'sourceSeed',
  round_review: 'sourceRoundReview',
} as const;

const FACTION_LABELS = {
  EN: {
    Wei: 'Wei',
    Shu: 'Shu',
    Wu: 'Wu',
    Other: 'Other',
  },
  CN: {
    Wei: '魏',
    Shu: '蜀',
    Wu: '吴',
    Other: '群雄',
  },
} as const;

const MessageBubble = ({
    msg,
    uiLanguage,
}: {
    msg: ChatMessage;
    uiLanguage: 'EN' | 'CN';
}) => {
    const [showThinking, setShowThinking] = useState(false);
    const isSystem = msg.sender === 'System';
    const isJudge = msg.sender === 'Judge';
    const isPlayer = msg.sender === 'PlayerA' || msg.sender === 'PlayerB' || msg.sender === 'PlayerC';
    const hasThinking = isPlayer && Boolean(msg.thinkingEN);
    const text = UI_TEXT[uiLanguage];
    
    let colorClass = 'text-ink';
    if (msg.sender === 'PlayerA') colorClass = 'text-blue-800 font-medium';
    if (msg.sender === 'PlayerB') colorClass = 'text-green-800 font-medium';
    if (msg.sender === 'PlayerC') colorClass = 'text-orange-800 font-medium';
    if (isJudge) colorClass = 'text-stamp font-bold';
    if (isSystem) colorClass = 'text-ink/60 italic text-center w-full block border-y border-gold/30 py-2 my-4';

    const primaryText = uiLanguage === 'CN' && msg.textCN ? msg.textCN : msg.textEN;
    const secondaryText = uiLanguage === 'CN'
      ? msg.textCN ? msg.textEN : undefined
      : msg.textCN;

    return (
        <div className={`mb-4 ${isSystem ? '' : 'p-3 rounded-lg bg-white/40 border border-gold/20 shadow-sm'}`}>
            <div className="flex items-start justify-between gap-3">
                <div className={`${colorClass} flex-1`}>
                    {!isSystem && <span className="mr-2 uppercase tracking-wide">[{msg.sender}]</span>}
                    {primaryText}
                </div>
                {hasThinking && (
                    <button
                        type="button"
                        aria-label={formatUiText(text.showThinkingFor, { sender: msg.sender })}
                        aria-expanded={showThinking}
                        onClick={() => setShowThinking((current) => !current)}
                        className="mt-0.5 h-7 w-7 shrink-0 rounded-full border border-gold/40 bg-white/70 text-xs font-bold text-stamp shadow-sm transition-colors hover:bg-gold/15"
                    >
                        i
                    </button>
                )}
            </div>
            {secondaryText && (
                <div className="mt-1 text-ink/70 italic text-sm ml-4 pl-4 border-l-2 border-gold/30">
                    {secondaryText}
                </div>
            )}
            {hasThinking && showThinking && (
                <div className="mt-3 rounded-lg border border-gold/25 bg-white/55 p-3 text-sm text-ink/80 shadow-inner">
                    <div className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-stamp/80">{text.thinking}</div>
                    <div className="whitespace-pre-wrap leading-relaxed">{msg.thinkingEN}</div>
                </div>
            )}
        </div>
    );
}

const IdentityCard = ({
    playerId,
    uiLanguage,
}: {
    playerId: 'A' | 'B' | 'C';
    uiLanguage: 'EN' | 'CN';
}) => {
    const player = useGameStore(state => state.players[playerId]);
    const configModel = useConfigStore(state => state.models[`player${playerId}` as keyof typeof state.models]);
    const turnsPerRound = useConfigStore((state) => state.turnsPerRound);
    const char = charactersData.find(c => c.id === player?.assignedCharacterId);
    const [showSkillHistory, setShowSkillHistory] = useState(false);
    const text = UI_TEXT[uiLanguage];
    const skillHistory = getSkillHistory(playerId);

    if (!player || !char) return null;

    const avatarUrl = getAvatarUrl(char.id, player.avatarVariant);
    const primaryName = uiLanguage === 'CN' ? char.nameCN : char.nameEN;
    const secondaryName = uiLanguage === 'CN' ? char.nameEN : char.nameCN;
    const factionLabel = FACTION_LABELS[uiLanguage][char.faction as keyof typeof FACTION_LABELS.EN] ?? char.faction;
    const secondaryFactionLabel = FACTION_LABELS[uiLanguage === 'CN' ? 'EN' : 'CN'][char.faction as keyof typeof FACTION_LABELS.EN] ?? char.faction;

    return (
        <div className="bg-white/90 p-4 border border-gold rounded shadow relative overflow-hidden text-center m-2 w-48">
             <div className="absolute top-0 right-0 p-1 bg-stamp text-white text-xs rounded-bl">{playerId}</div>
             <img src={avatarUrl} alt={`${char.nameEN} avatar`} className="w-16 h-16 rounded-full mx-auto border-2 border-gold mb-2 object-cover object-top shadow-sm" />
             <div className="text-xl font-bold mb-1">{primaryName}</div>
             <div className="text-xs text-ink/55 mb-1">{secondaryName}</div>
             <div className="text-sm text-ink/60 mb-2">({factionLabel})</div>
             <div className="text-xs text-ink/45 mb-2">{secondaryFactionLabel}</div>
             <div className="text-xs font-mono text-ink/40 truncate" title={configModel as string}>{configModel}</div>
             
             <div className="mt-3 pt-3 border-t border-gold/30">
                 {player.hasGuessed ? (
                     <span className="text-green-700 font-bold">{text.guessed} ({player.score} {text.points})</span>
                 ) : (
                     <span className="text-ink/70">{text.turns}: {player.turnsUsed} / {turnsPerRound}</span>
                 )}
             </div>

             <button
                type="button"
                onClick={() => setShowSkillHistory((current) => !current)}
                className="mt-3 w-full rounded-md border border-gold/40 bg-white/70 px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-stamp transition-colors hover:bg-gold/10"
             >
                {showSkillHistory ? text.hideSkillHistory : `${text.skillHistory} (${skillHistory.length})`}
             </button>

             {showSkillHistory && (
                <div className="mt-3 max-h-56 overflow-y-auto rounded-lg border border-gold/20 bg-white/70 p-2 text-left text-xs text-ink/80">
                    {skillHistory.length === 0 ? (
                        <div>{text.noSkillVersions}</div>
                    ) : (
                        skillHistory
                          .slice()
                          .reverse()
                          .map((entry) => (
                            <div key={`${playerId}-${entry.version}`} className="mb-2 rounded border border-gold/10 bg-white/70 p-2 last:mb-0">
                                <div className="font-semibold text-stamp">v{entry.version} · {text.round} {entry.round} · {text[SKILL_SOURCE_TEXT_KEY[entry.source]]}</div>
                                <div className="mt-1 text-ink/70">{entry.summary}</div>
                                <details className="mt-1">
                                    <summary className="cursor-pointer text-stamp/80">{text.fullText}</summary>
                                    <div className="mt-1 whitespace-pre-wrap leading-relaxed">{entry.content}</div>
                                </details>
                            </div>
                          ))
                    )}
                </div>
             )}
        </div>
    )
}

const GameArena = () => {
  const chatLog = useGameStore((state) => state.chatLog);
  const currentRound = useGameStore((state) => state.currentRound);
  const activePlayerId = useGameStore((state) => state.activePlayerId);
  const status = useGameStore((state) => state.status);
  const isProcessing = useGameStore((state) => state.isProcessing);
  const players = useGameStore((state) => state.players);
  const rounds = useConfigStore((state) => state.rounds);
  const uiLanguage = useConfigStore((state) => state.uiLanguage);
  const setConfig = useConfigStore((state) => state.setConfig);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const text = UI_TEXT[uiLanguage];
  const statusLabel = text[STATUS_TEXT_KEY[status]];

  useEffect(() => {
     chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  useEffect(() => {
     if (
       isPaused ||
       status !== 'PLAYING' ||
       isProcessing ||
       !activePlayerId
     ) {
       return;
     }

     const timerId = window.setTimeout(() => {
       void executePlayerTurn(activePlayerId);
     }, 900);

     return () => window.clearTimeout(timerId);
  }, [activePlayerId, isProcessing, status, isPaused]);

  const togglePause = () => {
    setIsPaused((current) => !current);
  };

  const toggleLanguage = () => {
    setConfig({ uiLanguage: uiLanguage === 'EN' ? 'CN' : 'EN' });
  };

  return (
    <div className="flex flex-col h-screen bg-[#f5f0e1] font-serif text-ink overflow-hidden">
      
      {/* Header */}
         <div className="flex justify-between items-center bg-[#8b1a1a] border-b-4 border-[#b45309] p-4 shadow-2xl z-20">
         <div className="flex items-center space-x-4">
             <div className="text-3xl font-bold tracking-[0.2em] text-white drop-shadow-lg font-['Noto_Serif_SC']">{text.appTitle}</div>
             <div className="text-sm text-gold/80 italic mt-1 tracking-wider opacity-80">{text.subtitle}</div>
         </div>
         <div className="flex items-center gap-3">
             <button
               type="button"
               onClick={toggleLanguage}
               aria-label={text.languageToggleLabel}
               className="rounded-full border border-gold/40 bg-white/15 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-white/25"
             >
               <span className="flex items-center gap-2">
                 <Languages className="h-4 w-4" aria-hidden="true" />
                 <span>{text.languageToggle}</span>
               </span>
             </button>
             <div className="text-lg bg-black/40 px-6 py-2 rounded-full border border-gold/40 text-white font-bold shadow-inner">
                 {text.round} {currentRound} {text.of} {rounds} | <span className="text-yellow-400">{statusLabel}</span>
             </div>
         </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
          
          {/* Left Panel: Controls & Scores */}
          <div className="w-80 p-6 border-r-2 border-gold/30 flex flex-col items-center bg-white/40 backdrop-blur-md z-10 shadow-lg">
              <h3 className="font-bold text-xl mb-6 text-stamp border-b-2 border-gold/40 w-full text-center pb-3 uppercase tracking-widest">{text.controls}</h3>
              
              <button 
                onClick={togglePause}
                disabled={status !== 'PLAYING' && !isPaused}
                className={`w-full font-bold py-4 px-6 rounded-lg mb-6 shadow-xl transform active:scale-95 transition-all duration-300 ${
                  status !== 'PLAYING' && !isPaused
                    ? 'bg-gray-400 cursor-not-allowed text-white opacity-50'
                    : isPaused
                      ? 'bg-gradient-to-br from-emerald-700 to-emerald-900 hover:from-emerald-600 hover:to-emerald-800 text-white border border-emerald-200/30'
                      : 'bg-gradient-to-br from-gold to-yellow-800 hover:from-yellow-700 hover:to-gold text-white border border-yellow-300/30'
                }`}
              >
                 <div className="flex items-center justify-center space-x-2">
                    {isProcessing && !isPaused && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                    <span>{isPaused ? text.resumeAutoplay : text.pauseAutoplay}</span>
                 </div>
              </button>

              <div className="w-full mb-6 rounded-lg border border-gold/20 bg-white/30 px-4 py-3 text-sm text-ink/80 text-center">
                 {isPaused ? text.autoplayPaused : text.autoplayRunning}
              </div>
              
              <div className="w-full mt-auto bg-white/20 p-4 rounded-lg border border-gold/10">
                 <h3 className="font-bold text-lg mb-4 text-stamp border-gold/30 w-full text-center pb-2 uppercase tracking-wide">{text.scoreboard}</h3>
                 <div className="space-y-3">
                    {['A', 'B', 'C'].map(p => (
                        <div key={p} className="flex justify-between items-center py-2 px-3 bg-white/40 rounded border border-gold/5">
                           <span className="font-medium text-ink/80">{uiLanguage === 'CN' ? `玩家 ${p}` : `Player ${p}`}</span>
                           <span className="font-bold text-stamp text-lg">{players[p]?.score || 0} <span className="text-xs font-normal opacity-60">{text.points}</span></span>
                        </div>
                    ))}
                 </div>
              </div>
          </div>

          {/* Middle Panel: Scrollable Chat Arena */}
          <div className="flex-1 relative bg-[#e5e1d3] overflow-hidden">
               {/* Fixed Scroll Image Layer - Ensures full height coverage */}
               <div 
                 className="absolute inset-0 z-0"
                 style={{ 
                   backgroundImage: `url(${bgScrollImg})`, 
                   backgroundSize: '100% 100%', 
                   backgroundPosition: 'center',
                   backgroundRepeat: 'no-repeat',
                   opacity: 0.35,
                   filter: 'sepia(0.2)'
                 }}
               ></div>
               
               {/* Atmospheric Overlay */}
               <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent z-1 pointer-events-none"></div>

               {/* Scrollable Content */}
               <div className="relative z-10 h-full overflow-y-auto p-10 scroll-smooth custom-scrollbar">
                   <div className="w-full max-w-4xl mx-auto flex flex-col min-h-full pb-20">
                       {chatLog.length === 0 ? (
                           <div className="flex flex-col items-center justify-center flex-1 opacity-20 py-20">
                               <div className="text-6xl mb-4 text-ink">📜</div>
                               <div className="text-xl italic">{text.chroniclesBegin}</div>
                           </div>
                       ) : (
                           chatLog.map(msg => (
                               <MessageBubble key={msg.id} msg={msg} uiLanguage={uiLanguage} />
                           ))
                       )}
                       
                       {status === 'PLAYING' && (
                           <div className="flex justify-center my-8">
                               <div className="animate-pulse bg-gold/10 px-8 py-2 rounded-full text-gold-900 border border-gold/30 text-base italic flex items-center space-x-3 shadow-sm scale-110">
                                   <div className="w-2 h-2 bg-gold rounded-full"></div>
                                   <span>
                                     {isPaused
                                       ? text.autoplayPausedShort
                                       : formatUiText(text.waitingForPlayer, { player: activePlayerId ?? 'A' })}
                                   </span>
                                   <div className="w-2 h-2 bg-gold rounded-full"></div>
                               </div>
                           </div>
                       )}
                       <div ref={chatEndRef} />
                   </div>
               </div>
          </div>

          {/* Right Panel: Identity Cards */}
          <div className="w-80 p-6 border-l-2 border-gold/30 flex flex-col items-center bg-white/40 backdrop-blur-md z-10 space-y-6 shadow-lg overflow-y-auto custom-scrollbar">
              <h3 className="font-bold text-xl text-stamp border-b-2 border-gold/40 w-full text-center pb-3 uppercase tracking-widest">{text.identities}</h3>
              <div className="space-y-2 w-full flex flex-col items-center">
                <IdentityCard playerId={'A'} uiLanguage={uiLanguage} />
                <IdentityCard playerId={'B'} uiLanguage={uiLanguage} />
                <IdentityCard playerId={'C'} uiLanguage={uiLanguage} />
              </div>
          </div>
      </div>
    </div>

  );
};

export default GameArena;
