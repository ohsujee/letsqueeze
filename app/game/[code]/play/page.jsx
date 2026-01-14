"use client";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  auth, db, ref, onValue, signInAnonymously, onAuthStateChanged
} from "@/lib/firebase";
import Buzzer from "@/components/game/Buzzer";
import Leaderboard from "@/components/game/Leaderboard";
import { motion, AnimatePresence } from "framer-motion";
import { triggerConfetti } from "@/components/shared/Confetti";
import ExitButton from "@/lib/components/ExitButton";
import DisconnectAlert from "@/components/game/DisconnectAlert";
import { usePlayerCleanup } from "@/lib/hooks/usePlayerCleanup";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { useInactivityDetection } from "@/lib/hooks/useInactivityDetection";
import { storage } from "@/lib/utils/storage";
import { FitText } from "@/lib/hooks/useFitText";

function useSound(url){
  const aRef = useRef(null);
  useEffect(()=>{
    aRef.current = typeof Audio !== "undefined" ? new Audio(url) : null;
    if(aRef.current){
      aRef.current.preload="auto";
      aRef.current.volume = 0.6; // Volume par défaut
    }
  },[url]);
  return useCallback(()=>{
    if(aRef.current){
      aRef.current.currentTime=0;
      // Play avec gestion silencieuse des erreurs d'autoplay
      const playPromise = aRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          // Autoplay bloqué par le navigateur - pas grave, on ignore silencieusement
          console.debug('Audio autoplay prevented (normal behavior):', error.message);
        });
      }
    }
  },[]);
}

export default function PlayerGame(){
  const { code } = useParams();
  const router = useRouter();

  const [state,setState]=useState(null);
  const [meta,setMeta]=useState(null);
  const [quiz,setQuiz]=useState(null);
  const [conf,setConf]=useState(null);
  const [myUid, setMyUid] = useState(null);

  // Centralized players hook
  const { players, me } = usePlayers({ roomCode: code, roomPrefix: 'rooms' });

  // Tick + offset serveur
  const [localNow, setLocalNow] = useState(Date.now());
  const [offset, setOffset] = useState(0);
  // Polling pour mise à jour des points (200ms = bon compromis fluidité/CPU)
  useEffect(()=>{ const id = setInterval(()=>setLocalNow(Date.now()), 200); return ()=>clearInterval(id); },[]);
  useEffect(()=>{ const u = onValue(ref(db, ".info/serverTimeOffset"), s=> setOffset(Number(s.val())||0)); return ()=>u(); },[]);
  const serverNow = localNow + offset;

  // Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setMyUid(user.uid);
        // Store last game info for rejoin
        storage.set('lq_last_game', JSON.stringify({
          roomCode: code,
          roomPrefix: 'rooms',
          joinedAt: Date.now()
        }));
      } else {
        signInAnonymously(auth).catch(() => {});
      }
    });
    return () => unsub();
  }, [code]);

  // Player cleanup hook - preserves score on disconnect
  const { leaveRoom, markActive } = usePlayerCleanup({
    roomCode: code,
    roomPrefix: 'rooms',
    playerUid: myUid,
    phase: 'playing'
  });

  // Inactivity detection
  useInactivityDetection({
    roomCode: code,
    roomPrefix: 'rooms',
    playerUid: myUid,
    inactivityTimeout: 30000
  });

  // Mark player as active on reconnection
  useEffect(() => {
    if (myUid && code) {
      markActive();
    }
  }, [myUid, code, markActive]);

  // Room guard - détecte kick et fermeture room
  const { markVoluntaryLeave } = useRoomGuard({
    roomCode: code,
    roomPrefix: 'rooms',
    playerUid: myUid,
    isHost: false
  });

  // Config scoring
  useEffect(()=>{
    fetch(`/config/scoring.json?t=${Date.now()}`)
      .then(r=>r.json())
      .then(setConf)
      .catch(err => console.error('Erreur chargement config:', err));
  },[]);

  // DB listeners
  useEffect(()=>{
    const u1 = onValue(ref(db,`rooms/${code}/state`), s=>{
      const v=s.val(); setState(v);
      if(v?.phase==="ended") router.replace("/end/"+code);
      if(v?.phase==="lobby") router.replace("/room/"+code);
    });
    const u2 = onValue(ref(db,`rooms/${code}/meta`), s=>{
      const m = s.val(); setMeta(m);
    });
    const u3 = onValue(ref(db,`rooms/${code}/quiz`), s=>setQuiz(s.val()));
    return ()=>{u1();u2();u3();};
  },[code, router]);

  const revealed = !!state?.revealed;
  const locked = !!state?.lockUid;
  const paused = !!state?.pausedAt || !!state?.lockedAt;

  const total = quiz?.items?.length || 0;
  const qIndex = state?.currentIndex || 0;
  const q = quiz?.items?.[qIndex];
  const progressLabel = total ? `Q${Math.min(qIndex+1,total)} / ${total}` : "";
  const title = (quiz?.title || (meta?.quizId ? meta.quizId.replace(/-/g, " ") : "Partie"));

  // Pénalité serveur
  const blockedMs = Math.max(0, (me?.blockedUntil || 0) - serverNow);
  const blocked = blockedMs > 0;

  // Points synchro (stop sur pausedAt ou lockedAt)
  const elapsedEffective = useMemo(()=>{
    if (!revealed || !state?.lastRevealAt) return 0;
    const acc = state?.elapsedAcc || 0;
    const hardStop = state?.pausedAt ?? state?.lockedAt ?? null;
    const end = hardStop ?? serverNow;
    return acc + Math.max(0, end - state.lastRevealAt);
  }, [revealed, state?.lastRevealAt, state?.elapsedAcc, state?.pausedAt, state?.lockedAt, serverNow]);

  const { pointsEnJeu, ratioRemain, cfg } = useMemo(()=>{
    if(!conf || !q) return { pointsEnJeu: 0, ratioRemain: 1, cfg: null };
    const diff = q.difficulty === "difficile" ? "difficile" : "normal";
    const c = conf[diff];

    // Ratio de temps restant (1 = début, 0 = fin des 20s)
    const ratio = Math.max(0, 1 - (elapsedEffective / c.durationMs));

    // Points = floor + (start - floor) × ratio
    // Ainsi les points descendent de start à floor sur toute la durée
    const pts = Math.round(c.floor + (c.start - c.floor) * ratio);

    return { pointsEnJeu: pts, ratioRemain: ratio, cfg: c };
  }, [conf, q, elapsedEffective]);

  // Sons: reveal & buzz (déclenchés par changements d'état)
  const playReveal = useSound("/sounds/reveal.mp3");
  const playBuzz   = useSound("/sounds/buzz.mp3");
  const prevRevealAt = useRef(0);
  const prevLock = useRef(null);
  useEffect(()=>{
    if(state?.revealed && state?.lastRevealAt && state.lastRevealAt !== prevRevealAt.current){
      playReveal(); prevRevealAt.current = state.lastRevealAt;
    }
  },[state?.revealed, state?.lastRevealAt, playReveal]);
  useEffect(()=>{
    const cur = state?.lockUid || null;
    if(cur && cur !== prevLock.current) playBuzz();
    prevLock.current = cur;
  },[state?.lockUid, playBuzz]);

  // Confettis pour bonne réponse (quand la question change et que j'étais locké)
  const prevQuestionIndex = useRef(-1);
  const wasLockedByMe = useRef(false);
  useEffect(() => {
    const currentIndex = state?.currentIndex || 0;
    const isLockedByMe = state?.lockUid === auth.currentUser?.uid;

    // Si la question change et que j'étais locké = bonne réponse validée !
    if (currentIndex !== prevQuestionIndex.current && prevQuestionIndex.current >= 0 && wasLockedByMe.current) {
      // Déclencher les confettis multicolores
      triggerConfetti('reward');
      // Double rafale pour plus d'effet
      setTimeout(() => triggerConfetti('reward'), 100);
    }

    // Mettre à jour les refs
    prevQuestionIndex.current = currentIndex;
    wasLockedByMe.current = isLockedByMe;
  }, [state?.currentIndex, state?.lockUid]);

  const myTeam = (meta?.mode === "équipes" && me?.teamId) ? meta?.teams?.[me.teamId] : null;

  const teamsSorted = useMemo(()=>{
    if (meta?.mode !== "équipes") return [];
    const t = meta?.teams || {};
    return Object.keys(t).map(k=>({ id:k, ...t[k]}))
      .sort((a,b)=> (b.score||0)-(a.score||0));
  }, [meta?.teams, meta?.mode]);

  const isMyTurn = state?.lockUid === me?.uid;

  return (
    <div className={`player-game-page game-page ${isMyTurn ? 'my-turn' : ''}`}>
      {/* Glow vert quand c'est mon tour */}
      <AnimatePresence>
        {isMyTurn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 50,
              pointerEvents: 'none',
              boxShadow: 'inset 0 0 60px 5px rgba(34, 197, 94, 0.25)'
            }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="game-header">
        <div className="game-header-content">
          <div className="game-header-left">
            <div className="game-header-progress">{progressLabel}</div>
            <div className="game-header-title">{title}</div>
          </div>
          <div className="game-header-right">
            {/* Mon score dans le header */}
            <div className="my-score-badge">
              <span className="my-score-value">{me?.score || 0}</span>
              <span className="my-score-label">pts</span>
            </div>
            <ExitButton
              variant="header"
              confirmMessage="Voulez-vous vraiment quitter ? Votre score sera conservé."
              onExit={async () => {
                await leaveRoom();
                router.push('/home');
              }}
            />
          </div>
        </div>
      </header>

      {/* Notification buzz */}
      <AnimatePresence>
        {state?.buzzBanner && state?.lockUid !== me?.uid && (
          <div className="buzz-notification-wrapper">
            <motion.div
              className="buzz-notification"
              initial={{ opacity: 0, scale: 0.9, y: -30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <div className="buzz-notification-icon">🔔</div>
              <div className="buzz-notification-content">
                <span className="buzz-notification-label">Quelqu'un a buzzé !</span>
                <span className="buzz-notification-name">
                  {players.find(p => p.uid === state.lockUid)?.name || 'Joueur'}
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content - Sans scroll */}
      <main className="game-content">
        {/* Question Card */}
        <div className="question-card">
          {/* Points en jeu */}
          <div className="points-badge">
            <span className="points-value">{pointsEnJeu}</span>
            <span className="points-label">points</span>
          </div>

          {/* Zone de question - hauteur fixe */}
          <div className="question-content">
            {q ? (
              <AnimatePresence mode="wait">
                {revealed ? (
                  <motion.div
                    key="revealed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      width: '100%',
                      height: '100%'
                    }}
                  >
                    <FitText minFontSize={12} maxFontSize={24} className="question-text">
                      {q.question}
                    </FitText>
                  </motion.div>
                ) : (
                  <motion.div
                    key="waiting"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <div className="waiting-dots">
                      <span></span><span></span><span></span>
                    </div>
                    <div className="waiting-label">En attente...</div>
                  </motion.div>
                )}
              </AnimatePresence>
            ) : (
              <div className="waiting-label">Chargement...</div>
            )}
          </div>
        </div>

        {/* Classement */}
        <Leaderboard players={players} currentPlayerUid={me?.uid} />
      </main>

      {/* Buzzer en footer */}
      <footer className="buzzer-footer">
        <Buzzer
          roomCode={code}
          playerUid={auth.currentUser?.uid}
          playerName={me?.name}
          blockedUntil={me?.blockedUntil || 0}
          serverNow={serverNow}
          serverOffset={offset}
        />
      </footer>

      {/* Disconnect Alert */}
      <DisconnectAlert
        roomCode={code}
        roomPrefix="rooms"
        playerUid={myUid}
        onReconnect={markActive}
      />

      <style jsx>{`
        /* ===== LAYOUT PRINCIPAL - Sans scroll, comme l'host ===== */
        .player-game-page {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          background: var(--bg-primary, #0a0a0f);
        }

        .player-game-page::before {
          content: '';
          position: fixed;
          inset: 0;
          z-index: 0;
          background:
            radial-gradient(ellipse at 20% 80%, rgba(139, 92, 246, 0.12) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(239, 68, 68, 0.08) 0%, transparent 50%),
            var(--bg-primary, #0a0a0f);
          pointer-events: none;
        }

        /* ===== GLOW VERT - C'est mon tour ===== */
        .my-turn-glow {
          position: fixed;
          inset: 0;
          z-index: 50;
          pointer-events: none;
          box-shadow: inset 0 0 80px 20px rgba(34, 197, 94, 0.4);
          border: 3px solid rgba(34, 197, 94, 0.6);
          border-radius: 0;
        }

        /* ===== HEADER ===== */
        .game-header {
          flex-shrink: 0;
          position: relative;
          z-index: 10;
          background: rgba(10, 10, 15, 0.95);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(139, 92, 246, 0.2);
          padding: 12px 16px;
          padding-top: 12px;
        }

        .game-header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 600px;
          margin: 0 auto;
          gap: 12px;
        }

        .game-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 0;
        }

        .game-header-progress {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1rem;
          color: var(--quiz-glow, #a78bfa);
          text-shadow: 0 0 15px rgba(139, 92, 246, 0.6);
          flex-shrink: 0;
        }

        .game-header-title {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary, rgba(255, 255, 255, 0.7));
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .game-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .my-score-badge {
          display: flex;
          align-items: baseline;
          gap: 4px;
          background: rgba(139, 92, 246, 0.15);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 20px;
          padding: 6px 12px;
        }

        .my-score-value {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1rem;
          color: var(--quiz-glow, #a78bfa);
        }

        .my-score-label {
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.5);
        }

        /* ===== BUZZ NOTIFICATION ===== */
        .buzz-notification-wrapper {
          position: fixed;
          top: calc(10px + env(safe-area-inset-top));
          left: 16px;
          right: 16px;
          z-index: 100;
          display: flex;
          justify-content: center;
          pointer-events: none;
        }

        .buzz-notification {
          pointer-events: auto;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 20px;
          background: rgba(20, 20, 30, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 2px solid var(--danger, #ef4444);
          border-radius: 16px;
          box-shadow:
            0 0 30px rgba(239, 68, 68, 0.4),
            0 8px 32px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .buzz-notification-icon {
          font-size: 1.5rem;
          filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.6));
          animation: buzz-icon-pulse 1s ease-in-out infinite;
        }

        @keyframes buzz-icon-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }

        .buzz-notification-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .buzz-notification-label {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--danger-glow, #f87171);
        }

        .buzz-notification-name {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.1rem;
          color: var(--text-primary, #ffffff);
          text-shadow: 0 0 15px rgba(239, 68, 68, 0.5);
        }

        /* ===== MAIN CONTENT ===== */
        .game-content {
          flex: 1;
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px;
          gap: 12px;
          overflow: hidden;
          min-height: 0;
        }

        /* ===== QUESTION CARD ===== */
        .question-card {
          width: 100%;
          max-width: 500px;
          min-height: 160px;
          max-height: 45vh;
          flex: 0 1 auto;
          background: rgba(20, 20, 30, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 14px 18px;
          text-align: center;
          display: flex;
          flex-direction: column;
        }

        /* Responsive: plus de place pour la question sur grands écrans */
        @media (min-height: 700px) {
          .question-card {
            min-height: 180px;
            max-height: 35vh;
          }
        }

        @media (max-height: 600px) {
          .question-card {
            min-height: 120px;
            max-height: 40vh;
            padding: 10px 14px;
          }
        }

        .points-badge {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 5px;
          margin-bottom: 6px;
          flex-shrink: 0;
        }

        .points-value {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.3rem;
          color: var(--quiz-glow, #a78bfa);
          text-shadow: 0 0 20px rgba(139, 92, 246, 0.5);
        }

        .points-label {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.7rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
        }

        .question-content {
          flex: 1;
          min-height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        /* Cacher la scrollbar webkit pour FitText scroll */
        .question-content ::-webkit-scrollbar {
          display: none;
        }

        .question-text {
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-weight: 500;
          color: var(--text-primary, #ffffff);
        }

        .waiting-label {
          color: var(--text-muted, rgba(255, 255, 255, 0.5));
          font-size: 0.85rem;
        }

        .waiting-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .waiting-dots span {
          width: 10px;
          height: 10px;
          background: var(--quiz-primary, #8b5cf6);
          border-radius: 50%;
          animation: dot-bounce 1.4s ease-in-out infinite;
        }

        .waiting-dots span:nth-child(1) { animation-delay: 0s; }
        .waiting-dots span:nth-child(2) { animation-delay: 0.2s; }
        .waiting-dots span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes dot-bounce {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
          40% { transform: scale(1.2); opacity: 1; }
        }

        /* ===== BUZZER FOOTER ===== */
        .buzzer-footer {
          flex-shrink: 0;
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 500px;
          margin: 0 auto;
          padding: 0 16px;
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
    </div>
  );
}
