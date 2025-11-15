"use client";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  auth, db, ref, onValue, update, runTransaction, serverTimestamp
} from "@/lib/firebase";
import PointsRing from "@/components/PointsRing";
import { motion, AnimatePresence, useSpring } from "framer-motion";
import { triggerConfetti } from "@/components/Confetti";
import AnimatedLeaderboard, { TeamLeaderboard } from "@/components/AnimatedLeaderboard";
import { RippleButton, ShineButton } from "@/components/InteractiveButton";
import ExitButton from "@/lib/components/ExitButton";
import { MoreVertical } from "lucide-react";

function useQuiz(quizId){
  const [quiz,setQuiz]=useState(null);
  useEffect(()=>{ if(quizId) fetch(`/data/${quizId}.json`).then(r=>r.json()).then(setQuiz); },[quizId]);
  return quiz;
}
function useSound(url){
  const aRef = useRef(null);
  useEffect(()=>{
    aRef.current = typeof Audio !== "undefined" ? new Audio(url) : null;
    if(aRef.current){
      aRef.current.preload="auto";
      aRef.current.volume = 0.5; // Volume par défaut
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

export default function HostGame(){
  const { code } = useParams();
  const router = useRouter();

  // Fonction pour quitter et terminer la partie pour tout le monde
  async function exitAndEndGame() {
    if (code) {
      // Mettre la partie en phase "ended" pour rediriger tous les joueurs
      await update(ref(db, `rooms/${code}/state`), { phase: "ended" });
    }
    router.push('/home');
  }

  const [meta,setMeta]=useState(null);
  const [state,setState]=useState(null);
  const [players,setPlayers]=useState([]);
  const [conf,setConf]=useState(null);

  // Tick + offset serveur
  const [localNow, setLocalNow] = useState(Date.now());
  const [offset, setOffset] = useState(0);
  useEffect(()=>{
    fetch(`/config/scoring.json?t=${Date.now()}`)
      .then(r=>r.json())
      .then(setConf)
      .catch(err => console.error('Erreur chargement config:', err));
  },[]);
  useEffect(()=>{
    const off = onValue(ref(db, ".info/serverTimeOffset"), s=> setOffset(Number(s.val())||0));
    const id=setInterval(()=>setLocalNow(Date.now()), 100);
    return ()=>{ clearInterval(id); off(); };
  },[]);
  const serverNow = localNow + offset;

  // DB listeners
  useEffect(()=>{
    const u1 = onValue(ref(db,`rooms/${code}/meta`), s=>setMeta(s.val()));
    const u2 = onValue(ref(db,`rooms/${code}/state`), s=>setState(s.val()));
    const u3 = onValue(ref(db,`rooms/${code}/players`), s=>{
      const v = s.val()||{}; setPlayers(Object.values(v));
    });
    return ()=>{u1();u2();u3();};
  },[code]);

  // Redirige host quand phase=ended ou phase=lobby
  useEffect(()=>{
    if(state?.phase === "ended") router.replace(`/end/${code}`);
    if(state?.phase === "lobby") router.replace(`/room/${code}`);
  }, [state?.phase, router, code]);

  const isHost = meta?.hostUid === auth.currentUser?.uid;
  const quiz  = useQuiz(meta?.quizId || "general");
  const total = quiz?.items?.length || 0;
  const qIndex = state?.currentIndex || 0;
  const q = quiz?.items?.[qIndex];
  const progressLabel = total ? `Q${Math.min(qIndex+1,total)} / ${total}` : "";
  const title = (quiz?.title || (meta?.quizId ? meta.quizId.replace(/-/g, " ") : "Partie"));

  // compteur points (synchro serveur + pause)
  const elapsedEffective = useMemo(()=>{
    if (!state?.revealed || !state?.lastRevealAt) return 0;
    const acc = state?.elapsedAcc || 0;
    const hardStop = state?.pausedAt ?? state?.lockedAt ?? null;
    const end = hardStop ?? serverNow;
    return acc + Math.max(0, end - state.lastRevealAt);
  },[state?.revealed, state?.lastRevealAt, state?.elapsedAcc, state?.pausedAt, state?.lockedAt, serverNow]);

  const { pointsEnJeu, ratioRemain, cfg } = useMemo(()=>{
    if(!conf || !q) return { pointsEnJeu: 0, ratioRemain: 1, cfg: null };
    const diff = q.difficulty === "difficile" ? "difficile" : "normal";
    const c = conf[diff];
    // Le ratio doit être basé sur le TEMPS, pas sur les points !
    const ratio = Math.max(0, 1 - (elapsedEffective / c.durationMs));
    const pts = Math.max(c.floor, Math.round(c.start * ratio));

    // La barre doit suivre le temps écoulé, pas la différence de points
    const remain = ratio;

    return { pointsEnJeu: pts, ratioRemain: remain, cfg: c };
  },[conf, q, elapsedEffective]);

  // Sons
  const playReveal = useSound("/sounds/reveal.mp3");
  const playBuzz   = useSound("/sounds/buzz.mp3");
  const prevRevealAt = useRef(0);
  const prevLock = useRef(null);
  useEffect(()=>{
    if(state?.revealed && state?.lastRevealAt && state.lastRevealAt !== prevRevealAt.current){
      playReveal(); prevRevealAt.current = state.lastRevealAt;
    }
  },[state?.revealed, state?.lastRevealAt, playReveal]);

  // *** HOST RÉAGIT AU NOUVEAU LOCK → FIGE TIMER AUTOMATIQUEMENT ***
  useEffect(()=>{
    if (!isHost) return;
    const cur = state?.lockUid || null;
    if (cur && cur !== prevLock.current) {
      const name = players.find(p=>p.uid===cur)?.name || "Un joueur";
      const isAnticipated = state?.buzz?.anticipated === true;
      
      // Figer automatiquement le timer et mettre à jour la bannière
      update(ref(db,`rooms/${code}/state`), {
        pausedAt: serverTimestamp(),
        lockedAt: serverTimestamp(),
        buzzBanner: `🔔 ${name} a buzzé !${isAnticipated ? ' (ANTICIPÉ)' : ''}`
      }).catch(()=>{});
      
      playBuzz();
    }
    prevLock.current = cur;
  },[isHost, state?.lockUid, state?.buzz?.anticipated, code, players, playBuzz]);

  function computeResumeFields(){
    const already = (state?.elapsedAcc || 0)
      + Math.max(0, (state?.pausedAt || state?.lockedAt || 0) - (state?.lastRevealAt || 0));
    return { elapsedAcc: already, lastRevealAt: serverTimestamp(), pausedAt: null, lockedAt: null };
  }

  // actions
  async function revealToggle(){
    if(!isHost || !q) return;

    if (!state?.revealed) {
      // Utiliser serverNow pour éviter les décalages de temps
      const revealTime = serverNow;

      // Utiliser une transaction pour préserver un buzz concurrent
      const stateRef = ref(db, `rooms/${code}/state`);

      await runTransaction(stateRef, (currentState) => {
        if (!currentState) return currentState;

        // Si quelqu'un a buzzé entre-temps, on préserve son buzz
        if (currentState.lockUid) {
          // Révéler la question mais garder le lock existant
          return {
            ...currentState,
            revealed: true,
            lastRevealAt: revealTime,
            elapsedAcc: 0,
            pausedAt: currentState.pausedAt || null,
            lockedAt: currentState.lockedAt || null
            // lockUid, buzz, buzzBanner sont préservés
          };
        }

        // Sinon, révélation normale sans buzz
        return {
          ...currentState,
          revealed: true,
          lastRevealAt: revealTime,
          elapsedAcc: 0,
          pausedAt: null,
          lockedAt: null,
          lockUid: null,
          buzzBanner: "",
          buzz: null
        };
      });
    } else {
      await update(ref(db,`rooms/${code}/state`), { revealed: false });
    }
  }
  async function resetBuzzers(){
    console.log('🔄 resetBuzzers called, isHost:', isHost);
    if(!isHost) return;
    const resume = computeResumeFields();
    console.log('📊 Resume fields:', resume);
    await update(ref(db,`rooms/${code}/state`), { lockUid: null, buzzBanner: "", buzz: null, ...resume });
    console.log('✅ Buzzers reset!');
  }
  async function validate(){
    if(!isHost || !q || !state?.lockUid || !conf) return;
    const uid = state.lockUid;
    const wasAnticipated = state?.buzz?.anticipated === true;
    
    // Calcul des points
    let pts;
    if (wasAnticipated) {
      // Buzz anticipé correct = points maximum
      const diff = q.difficulty === "difficile" ? "difficile" : "normal";
      pts = conf[diff].start;
    } else {
      // Buzz normal = points dégressifs selon le temps
      pts = pointsEnJeu;
    }

    await runTransaction(ref(db,`rooms/${code}/players/${uid}/score`),(cur)=> (cur||0)+pts);

    if (meta?.mode === "équipes") {
      const player = players.find(p=>p.uid===uid);
      const teamId = player?.teamId;
      if (teamId) {
        await runTransaction(ref(db,`rooms/${code}/meta/teams/${teamId}/score`),(cur)=> (cur||0)+pts);
      }
    }

    const next = (state.currentIndex||0)+1;
    if (next >= total) {
      await update(ref(db,`rooms/${code}/state`), { phase:"ended" });
      router.replace(`/end/${code}`);
      return;
    }

    // Réinitialiser les pénalités de tous les joueurs
    const updates = {};
    players.forEach(p => {
      updates[`rooms/${code}/players/${p.uid}/blockedUntil`] = 0;
    });
    updates[`rooms/${code}/state/currentIndex`] = next;
    updates[`rooms/${code}/state/revealed`] = false;
    updates[`rooms/${code}/state/lockUid`] = null;
    updates[`rooms/${code}/state/pausedAt`] = null;
    updates[`rooms/${code}/state/lockedAt`] = null;
    updates[`rooms/${code}/state/elapsedAcc`] = 0;
    updates[`rooms/${code}/state/lastRevealAt`] = 0;
    updates[`rooms/${code}/state/buzzBanner`] = "";
    updates[`rooms/${code}/state/buzz`] = null;

    await update(ref(db), updates);
  }
  async function wrong(){
    if(!isHost || !state?.lockUid || !conf) return;
    const ms = conf.lockoutMs || 8000;
    const uid = state.lockUid;

    const updates = {};
    const until = serverNow + ms;
    
    // Gestion buzz anticipé : malus selon config
    const wasAnticipated = state?.buzz?.anticipated === true;
    const penalty = wasAnticipated ? (conf.anticipatedBuzzPenalty || 100) : 0;
    
    if (penalty > 0) {
      await runTransaction(ref(db,`rooms/${code}/players/${uid}/score`),(cur)=> (cur||0)-penalty);
      
      if (meta?.mode === "équipes") {
        const player = players.find(p=>p.uid===uid);
        const teamId = player?.teamId;
        if (teamId) {
          await runTransaction(ref(db,`rooms/${code}/meta/teams/${teamId}/score`),(cur)=> (cur||0)-penalty);
        }
      }
    }
    
    // Appliquer la pénalité de temps
    if (meta?.mode === "équipes") {
      // Mode équipes : bloquer toute l'équipe
      const player = players.find(p=>p.uid===uid);
      const teamId = player?.teamId;
      if (teamId) {
        players.filter(p=>p.teamId===teamId).forEach(p=>{
          updates[`rooms/${code}/players/${p.uid}/blockedUntil`] = until;
        });
      } else {
        // Fallback si pas d'équipe trouvée
        updates[`rooms/${code}/players/${uid}/blockedUntil`] = until;
      }
    } else {
      // Mode individuel : bloquer seulement le joueur
      updates[`rooms/${code}/players/${uid}/blockedUntil`] = until;
    }

    // Reprendre le timer avec le temps déjà écoulé
    const resume = computeResumeFields();
    updates[`rooms/${code}/state/lockUid`] = null;
    updates[`rooms/${code}/state/buzzBanner`] = "";
    updates[`rooms/${code}/state/buzz`] = null;
    updates[`rooms/${code}/state/elapsedAcc`] = resume.elapsedAcc;
    updates[`rooms/${code}/state/lastRevealAt`] = resume.lastRevealAt;
    updates[`rooms/${code}/state/pausedAt`] = resume.pausedAt;
    updates[`rooms/${code}/state/lockedAt`] = resume.lockedAt;

    await update(ref(db), updates);
  }
  async function skip(){
    console.log('⏭ skip called, isHost:', isHost, 'total:', total);
    if(!isHost || total===0) return;
    const next = (state?.currentIndex||0)+1;
    console.log('📍 Next question index:', next, 'Total:', total);
    if (next >= total) {
      console.log('🏁 Last question, ending game');
      await update(ref(db,`rooms/${code}/state`), { phase:"ended" });
      router.replace(`/end/${code}`);
      return;
    }

    // Réinitialiser les pénalités de tous les joueurs
    const updates = {};
    players.forEach(p => {
      updates[`rooms/${code}/players/${p.uid}/blockedUntil`] = 0;
    });
    updates[`rooms/${code}/state/currentIndex`] = next;
    updates[`rooms/${code}/state/revealed`] = false;
    updates[`rooms/${code}/state/lockUid`] = null;
    updates[`rooms/${code}/state/pausedAt`] = null;
    updates[`rooms/${code}/state/lockedAt`] = null;
    updates[`rooms/${code}/state/elapsedAcc`] = 0;
    updates[`rooms/${code}/state/lastRevealAt`] = 0;
    updates[`rooms/${code}/state/buzzBanner`] = "";
    updates[`rooms/${code}/state/buzz`] = null;

    console.log('📤 Sending updates:', updates);
    await update(ref(db), updates);
    console.log('✅ Question skipped!');
  }
  async function end(){
    console.log('🏁 end called, isHost:', isHost);
    if(isHost){
      await update(ref(db,`rooms/${code}/state`), { phase:"ended" });
      console.log('✅ Game ended, redirecting...');
      router.replace(`/end/${code}`);
    }
  }

  const lockedName = state?.lockUid ? (players.find(p=>p.uid===state.lockUid)?.name || state.lockUid) : "—";
  const wasAnticipated = state?.buzz?.anticipated === true;
  const teamsArray = useMemo(()=>{
    const t = meta?.teams || {}; return Object.keys(t).map(k=>({ id:k, ...t[k]}));
  }, [meta?.teams]);

  const playersSorted = useMemo(()=> players.slice().sort((a,b)=> (b.score||0)-(a.score||0)), [players]);

  // Points à gagner selon le type de buzz
  const pointsAGagner = useMemo(() => {
    if (!conf || !q) return 0;
    const diff = q.difficulty === "difficile" ? "difficile" : "normal";
    if (wasAnticipated) {
      return conf[diff].start; // Points maximum pour buzz anticipé
    }
    return pointsEnJeu; // Points dégressifs pour buzz normal
  }, [conf, q, wasAnticipated, pointsEnJeu]);

  return (
    <div className="host-game-page">
      {/* Background orbs */}
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>
      <div className="bg-orb orb-3"></div>

      {/* Header fixe avec le même style que la page joueur */}
      <header className="player-game-header">
        <div className="player-game-header-content">
          {/* Titre à gauche */}
          <div className="player-game-title">{title}</div>

          {/* Progress au centre */}
          <div className="player-progress-center">{progressLabel}</div>

          {/* Bouton exit à droite */}
          <div className="player-header-exit">
            <ExitButton
              variant="header"
              confirmMessage="Voulez-vous vraiment quitter ? La partie sera abandonnée pour tous les joueurs."
              onExit={exitAndEndGame}
            />
          </div>
        </div>
      </header>

      {/* Pop-up de validation qui apparaît quand quelqu'un buzz */}
      <AnimatePresence>
        {state?.lockUid && (
          <>
            {/* Overlay sombre */}
            <motion.div
              className="buzz-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={resetBuzzers}
            />

            {/* Modal centrée */}
            <div className="buzz-modal">
              <motion.div
                className="buzz-modal-content"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <div className="buzz-modal-icon">🔔</div>

                <div className="buzz-modal-player">
                  {lockedName}
                </div>

                <div className="buzz-modal-subtitle">a buzzé !</div>

                {wasAnticipated && (
                  <div className="buzz-modal-alert">
                    <div className="buzz-modal-alert-title">⚡ BUZZ ANTICIPÉ</div>
                    <div className="buzz-modal-alert-info">
                      Si correct: <b>+{conf?.[q?.difficulty === "difficile" ? "difficile" : "normal"]?.start || 0} pts</b><br/>
                      Si faux: <b>-{conf?.anticipatedBuzzPenalty || 100} pts</b>
                    </div>
                  </div>
                )}

                <div className="buzz-modal-points">
                  {wasAnticipated
                    ? `${conf?.[q?.difficulty === "difficile" ? "difficile" : "normal"]?.start || 0} points MAX`
                    : `${pointsEnJeu} points`
                  }
                </div>

                <div className="buzz-modal-actions">
                  <RippleButton
                    className="buzz-modal-btn buzz-modal-btn-wrong"
                    onClick={wrong}
                  >
                    <span>✘</span>
                    <span>Mauvaise</span>
                    <span>
                      {wasAnticipated ? `-${conf?.anticipatedBuzzPenalty || 100} pts` : '0 pts'}
                    </span>
                  </RippleButton>

                  <ShineButton
                    className="buzz-modal-btn buzz-modal-btn-correct"
                    onClick={validate}
                  >
                    <span>✔</span>
                    <span>Correcte</span>
                    <span>
                      +{wasAnticipated
                        ? conf?.[q?.difficulty === "difficile" ? "difficile" : "normal"]?.start || 0
                        : pointsEnJeu
                      } pts
                    </span>
                  </ShineButton>
                </div>

                <button
                  className="buzz-modal-reset"
                  onClick={resetBuzzers}
                >
                  Reset
                </button>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <main className="player-game-content" style={{maxWidth: '800px', paddingBottom: '150px'}}>

      {/* Actions simplifiées - Seulement les actions secondaires */}
      <div className="host-actions-card">
        <div className="flex gap-2 flex-wrap">
          <button
            className="btn h-12 flex-1"
            onClick={resetBuzzers}
            style={{ minWidth: '120px' }}
          >
            🔄 Reset
          </button>
          <button
            className="btn h-12 flex-1"
            onClick={skip}
            style={{ minWidth: '120px' }}
          >
            ⏭ Passer
          </button>
          <button
            className="btn h-12 flex-1"
            onClick={end}
            style={{
              minWidth: '120px',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.5)'
            }}
          >
            🏁 Terminer
          </button>
        </div>
      </div>

      {q ? (
        <motion.div
          className="question-main-card"
          key={qIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Barre de progression des points - Même style que page joueur */}
          <div className="points-progress-bar-container">
            <div className="points-progress-info">
              <span className="points-progress-label">
                Points en jeu {wasAnticipated && "- BUZZ ANTICIPÉ"}
              </span>
              <span className="points-progress-value">{pointsAGagner}</span>
            </div>
            <div className="points-progress-bar-track">
              <motion.div
                className="points-progress-bar-fill"
                initial={{ scaleX: 1 }}
                animate={{ scaleX: ratioRemain }}
                transition={{ duration: 0.5, ease: "linear" }}
              />
            </div>
            <div className="text-xs opacity-60 mt-1">
              {cfg ? (
                <>
                  De <b>{cfg.start}</b> à <b>{cfg.floor}</b> pts en <b>{cfg.durationMs/1000}s</b>
                </>
              ) : "Chargement…"}
            </div>
          </div>

          {/* Question */}
          <div className="question-text-display">
            {q.question}
          </div>

          {/* Réponse pour l'animateur */}
          <motion.div
            className="host-answer-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <div className="text-sm opacity-70 mb-1">Réponse (privée animateur)</div>
            <div className="font-bold text-lg text-green-400">{q.answer}</div>
          </motion.div>
        </motion.div>
      ) : (
        <div className="question-main-card">
          <div className="question-waiting">
            <div className="question-waiting-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div>Plus de questions. Terminez la partie.</div>
          </div>
        </div>
      )}

      {meta?.mode === "équipes" && teamsArray.length > 0 && (
        <TeamLeaderboard teams={teamsArray} />
      )}

      {/* Scores joueurs complets */}
      <AnimatedLeaderboard players={playersSorted} serverNow={serverNow} />

      <div className="sticky-bar">
        <ShineButton className="btn btn-primary w-full h-14 text-xl" onClick={revealToggle}>
          {state?.revealed ? "Masquer la question" : "Révéler la question"}
        </ShineButton>
      </div>
      </main>

      <style jsx>{`
        .host-game-page {
          position: relative;
          min-height: 100vh;
          background: #000000;
          overflow-x: hidden;
        }

        /* Background orbs */
        .bg-orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.12;
          pointer-events: none;
          z-index: 0;
        }

        .orb-1 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, #4299E1 0%, transparent 70%);
          top: -200px;
          right: -100px;
        }

        .orb-2 {
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, #48BB78 0%, transparent 70%);
          bottom: -100px;
          left: -150px;
        }

        .orb-3 {
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, #9F7AEA 0%, transparent 70%);
          top: 300px;
          left: 50%;
          transform: translateX(-50%);
        }

      `}</style>
    </div>
  );
}
