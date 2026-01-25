"use client";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  auth, db, ref, onValue, update, runTransaction, serverTimestamp
} from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import ExitButton from "@/lib/components/ExitButton";
import Leaderboard from "@/components/game/Leaderboard";
import PlayerManager from "@/components/game/PlayerManager";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { useHostDisconnect } from "@/lib/hooks/useHostDisconnect";
import { useServerTime } from "@/lib/hooks/useServerTime";
import { useSound } from "@/lib/hooks/useSound";
import { useWakeLock } from "@/lib/hooks/useWakeLock";
import GameStatusBanners from "@/components/game/GameStatusBanners";
import { hueScenariosService } from "@/lib/hue-module";
import { FitText } from "@/lib/hooks/useFitText";
import { GameEndTransition } from "@/components/transitions";

export default function HostGame(){
  const { code } = useParams();
  const router = useRouter();

  // Fonction pour quitter et terminer la partie pour tout le monde
  async function exitAndEndGame() {
    if (code) {
      // Fermer la room proprement - les joueurs seront redirigés via useRoomGuard
      await update(ref(db, `rooms/${code}/meta`), { closed: true });
    }
    router.push('/home');
  }

  const [meta,setMeta]=useState(null);
  const [state,setState]=useState(null);
  const [quiz,setQuiz]=useState(null);
  const [conf,setConf]=useState(null);
  const [showEndTransition, setShowEndTransition] = useState(false);
  const endTransitionTriggeredRef = useRef(false);

  // Centralized players hook
  const { players } = usePlayers({ roomCode: code, roomPrefix: 'rooms' });

  // Server time sync (300ms tick for score updates)
  const { serverNow } = useServerTime(300);

  // Load scoring config
  useEffect(()=>{
    fetch(`/config/scoring.json?t=${Date.now()}`)
      .then(r=>r.json())
      .then(setConf)
      .catch(err => console.error('Erreur chargement config:', err));
  },[]);

  // DB listeners
  useEffect(()=>{
    const u1 = onValue(ref(db,`rooms/${code}/meta`), s=>setMeta(s.val()));
    const u2 = onValue(ref(db,`rooms/${code}/state`), s=>setState(s.val()));
    const u3 = onValue(ref(db,`rooms/${code}/quiz`), s=>setQuiz(s.val()));
    return ()=>{u1();u2();u3();};
  },[code]);

  // Redirige host quand phase=ended ou phase=lobby
  useEffect(()=>{
    if(state?.phase === "ended" && !endTransitionTriggeredRef.current) {
      // Afficher la transition de fin avant de redirect
      endTransitionTriggeredRef.current = true;
      setShowEndTransition(true);
    }
    if(state?.phase === "lobby") router.replace(`/room/${code}`);
  }, [state?.phase, router, code]);

  // Ambiance Hue au chargement de la page host
  useEffect(() => {
    hueScenariosService.trigger('gigglz', 'ambiance');
  }, []);

  const isHost = meta?.hostUid === auth.currentUser?.uid;
  const myUid = auth.currentUser?.uid;

  // Room guard - détecte fermeture room (host is always host here)
  useRoomGuard({
    roomCode: code,
    roomPrefix: 'rooms',
    playerUid: myUid,
    isHost: true
  });

  // Host disconnect - ferme la room si l'hôte perd sa connexion
  useHostDisconnect({
    roomCode: code,
    roomPrefix: 'rooms',
    isHost: true
  });

  // Keep screen awake during game
  useWakeLock({ enabled: true });
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

    // Ratio de temps restant (1 = début, 0 = fin des 20s)
    const ratio = Math.max(0, 1 - (elapsedEffective / c.durationMs));

    // Points = floor + (start - floor) × ratio
    // Ainsi les points descendent de start à floor sur toute la durée
    const pts = Math.round(c.floor + (c.start - c.floor) * ratio);

    return { pointsEnJeu: pts, ratioRemain: ratio, cfg: c };
  },[conf, q, elapsedEffective]);

  // Sons
  const playReveal = useSound("/sounds/reveal.mp3");
  const playBuzz   = useSound("/sounds/quiz-buzzer.wav");
  const prevRevealAt = useRef(0);
  const prevLock = useRef(null);
  const timeUpTriggered = useRef(false);

  // *** SYSTÈME DE BUZZ ROBUSTE ***
  // Fenêtre de tolérance pour capturer tous les buzzes (compense les latences réseau)
  const BUZZ_WINDOW_MS = 150;
  const buzzWindowTimeout = useRef(null);
  const buzzCache = useRef({}); // Cache local - JAMAIS ignoré
  const isResolving = useRef(false);

  useEffect(()=>{
    if(state?.revealed && state?.lastRevealAt && state.lastRevealAt !== prevRevealAt.current){
      playReveal(); prevRevealAt.current = state.lastRevealAt;
      timeUpTriggered.current = false; // Reset timeUp flag pour nouvelle question
      // Reset le système de buzz pour la nouvelle question
      buzzCache.current = {};
      isResolving.current = false;
      if (buzzWindowTimeout.current) {
        clearTimeout(buzzWindowTimeout.current);
        buzzWindowTimeout.current = null;
      }
    }
  },[state?.revealed, state?.lastRevealAt, playReveal]);

  // Trigger Hue timeUp quand le temps est écoulé
  useEffect(() => {
    if (state?.revealed && ratioRemain <= 0 && !timeUpTriggered.current && !state?.lockUid) {
      timeUpTriggered.current = true;
      hueScenariosService.trigger('gigglz', 'timeUp');
    }
  }, [state?.revealed, ratioRemain, state?.lockUid]);

  // *** SYSTÈME DE BUZZ ROBUSTE: LISTENER + CACHE LOCAL ***
  useEffect(() => {
    if (!isHost || !code) return;

    const pendingBuzzesRef = ref(db, `rooms/${code}/state/pendingBuzzes`);

    // Fonction de résolution - utilise le cache local
    const resolveBuzzes = async () => {
      // Marquer comme en cours de résolution
      isResolving.current = true;
      buzzWindowTimeout.current = null;

      try {
        // Copier le cache actuel (snapshot des buzzes reçus)
        const buzzesToResolve = { ...buzzCache.current };
        const buzzCount = Object.keys(buzzesToResolve).length;

        if (buzzCount === 0) {
          console.log('[Buzz] Aucun buzz à résoudre');
          return;
        }

        console.log(`[Buzz] Résolution de ${buzzCount} buzz(es)...`);

        // Vérifier que lockUid n'est pas déjà défini
        const { get: fbGet } = await import('firebase/database');
        const lockSnap = await fbGet(ref(db, `rooms/${code}/state/lockUid`));
        if (lockSnap.val()) {
          console.log('[Buzz] lockUid déjà défini, abandon');
          return;
        }

        // Trouver le gagnant (plus petit adjustedTime = premier à avoir buzzé)
        const buzzArray = Object.values(buzzesToResolve);
        buzzArray.sort((a, b) => a.adjustedTime - b.adjustedTime);
        const winner = buzzArray[0];

        console.log(`[Buzz] Gagnant: ${winner.name} (adjustedTime: ${winner.adjustedTime})`);

        // Utiliser une transaction pour garantir l'atomicité
        const { runTransaction: fbTransaction } = await import('firebase/database');
        const lockResult = await fbTransaction(ref(db, `rooms/${code}/state/lockUid`), (currentLock) => {
          // Si déjà défini par quelqu'un d'autre, on abandonne
          if (currentLock) return currentLock;
          // Sinon on écrit le gagnant
          return winner.uid;
        });

        // Vérifier si on a gagné la transaction
        if (lockResult.snapshot.val() !== winner.uid) {
          console.log('[Buzz] Transaction perdue, quelqu\'un d\'autre a écrit lockUid');
          return;
        }

        // Transaction réussie - mettre à jour les autres champs
        await update(ref(db, `rooms/${code}/state`), {
          buzz: { uid: winner.uid, at: winner.localTime },
          buzzBanner: `🔔 ${winner.name} a buzzé !`,
          pausedAt: serverTimestamp(),
          lockedAt: serverTimestamp()
        });

        // Supprimer les pendingBuzzes
        const { remove: fbRemove } = await import('firebase/database');
        await fbRemove(pendingBuzzesRef).catch(() => {});

        // Son et effets
        playBuzz();
        hueScenariosService.trigger('gigglz', 'buzz');

        console.log('[Buzz] ✅ Résolution terminée');

      } catch (error) {
        console.error('[Buzz] ❌ Erreur résolution:', error);
      } finally {
        isResolving.current = false;
        // Vider le cache après résolution
        buzzCache.current = {};
      }
    };

    // Listener qui met TOUJOURS à jour le cache (jamais ignoré)
    const unsubscribe = onValue(pendingBuzzesRef, (snapshot) => {
      const pendingBuzzes = snapshot.val() || {};
      const buzzCount = Object.keys(pendingBuzzes).length;

      // Toujours mettre à jour le cache
      buzzCache.current = pendingBuzzes;

      // Si pas de buzzes, rien à faire
      if (buzzCount === 0) return;

      // Si un timeout est déjà programmé, les nouveaux buzzes seront
      // capturés via le cache quand la résolution s'exécutera
      if (buzzWindowTimeout.current) {
        console.log(`[Buzz] +1 buzz ajouté au cache (total: ${buzzCount})`);
        return;
      }

      // Si résolution en cours, le cache sera traité au prochain cycle si nécessaire
      if (isResolving.current) {
        console.log('[Buzz] Résolution en cours, buzz ajouté au cache');
        return;
      }

      // Premier buzz détecté - démarrer la fenêtre de 150ms
      console.log(`[Buzz] Premier buzz détecté, démarrage fenêtre ${BUZZ_WINDOW_MS}ms`);
      buzzWindowTimeout.current = setTimeout(resolveBuzzes, BUZZ_WINDOW_MS);
    });

    return () => {
      unsubscribe();
      if (buzzWindowTimeout.current) {
        clearTimeout(buzzWindowTimeout.current);
        buzzWindowTimeout.current = null;
      }
      buzzCache.current = {};
      isResolving.current = false;
    };
  }, [isHost, code, playBuzz]);

  // *** HOST RÉAGIT AU NOUVEAU LOCK → Pour jouer le son et Hue (backup si pas déjà fait) ***
  useEffect(()=>{
    if (!isHost) return;
    const cur = state?.lockUid || null;
    if (cur && cur !== prevLock.current) {
      // Le son et Hue sont maintenant joués dans la résolution ci-dessus
      // Ce useEffect sert de backup et pour tracking
      prevLock.current = cur;
    }
    prevLock.current = cur;
  },[isHost, state?.lockUid, code, players]);

  function computeResumeFields(){
    const already = (state?.elapsedAcc || 0)
      + Math.max(0, (state?.pausedAt || state?.lockedAt || 0) - (state?.lastRevealAt || 0));
    return { elapsedAcc: already, lastRevealAt: serverTimestamp(), pausedAt: null, lockedAt: null };
  }

  // actions
  async function revealToggle(){
    if(!isHost || !q) return;

    if (!state?.revealed) {
      // Trigger Hue pour nouvelle question
      hueScenariosService.trigger('gigglz', 'roundStart');

      // IMPORTANT: Ne JAMAIS toucher aux champs du buzz ici !
      // On utilise update() pour modifier UNIQUEMENT les champs de révélation
      // Cela évite toute race condition avec un buzz concurrent
      await update(ref(db, `rooms/${code}/state`), {
        revealed: true,
        lastRevealAt: serverTimestamp(),
        elapsedAcc: 0
        // On ne touche PAS à : lockUid, buzz, buzzBanner, pausedAt, lockedAt
        // Ces champs sont gérés par : resetBuzzers(), validate(), wrong(), skip()
      });
    } else {
      await update(ref(db,`rooms/${code}/state`), { revealed: false });
    }
  }
  async function resetBuzzers(){
    if(!isHost) return;
    // Reset le flag de résolution
    isResolving.current = false;
    if (buzzWindowTimeout.current) {
      clearTimeout(buzzWindowTimeout.current);
      buzzWindowTimeout.current = null;
    }
    const resume = computeResumeFields();
    await update(ref(db,`rooms/${code}/state`), {
      lockUid: null,
      buzzBanner: "",
      buzz: null,
      ...resume
    });
    // Supprimer les buzzes en attente séparément
    await import('firebase/database').then(m =>
      m.remove(m.ref(db, `rooms/${code}/state/pendingBuzzes`))
    ).catch(() => {});
  }
  async function validate(){
    if(!isHost || !q || !state?.lockUid || !conf) return;

    // Trigger Hue bonne réponse
    hueScenariosService.trigger('gigglz', 'goodAnswer');

    const uid = state.lockUid;
    const pts = pointsEnJeu;

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
      // La transition de fin sera gérée par le useEffect qui détecte phase="ended"
      await update(ref(db,`rooms/${code}/state`), { phase:"ended" });
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

    // Reset le flag de résolution
    isResolving.current = false;

    await update(ref(db), updates);
    // Supprimer les buzzes en attente séparément
    await import('firebase/database').then(m =>
      m.remove(m.ref(db, `rooms/${code}/state/pendingBuzzes`))
    ).catch(() => {});
  }
  async function wrong(){
    if(!isHost || !state?.lockUid || !conf) return;

    // Trigger Hue mauvaise réponse
    hueScenariosService.trigger('gigglz', 'badAnswer');

    const ms = conf.lockoutMs || 8000;
    const uid = state.lockUid;
    const wrongPenalty = conf.wrongAnswerPenalty || 25;

    // Retirer des points pour mauvaise réponse
    await runTransaction(ref(db, `rooms/${code}/players/${uid}/score`), (cur) => Math.max(0, (cur || 0) - wrongPenalty));

    // En mode équipes, retirer aussi des points à l'équipe
    if (meta?.mode === "équipes") {
      const player = players.find(p => p.uid === uid);
      const teamId = player?.teamId;
      if (teamId) {
        await runTransaction(ref(db, `rooms/${code}/meta/teams/${teamId}/score`), (cur) => Math.max(0, (cur || 0) - wrongPenalty));
      }
    }

    const updates = {};
    const until = serverNow + ms;

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

    // Reset le flag de résolution
    isResolving.current = false;

    await update(ref(db), updates);
    // Supprimer les buzzes en attente séparément
    await import('firebase/database').then(m =>
      m.remove(m.ref(db, `rooms/${code}/state/pendingBuzzes`))
    ).catch(() => {});
  }
  async function skip(){
    if(!isHost || total===0) return;
    const next = (state?.currentIndex||0)+1;
    if (next >= total) {
      // La transition de fin sera gérée par le useEffect qui détecte phase="ended"
      await update(ref(db,`rooms/${code}/state`), { phase:"ended" });
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

    // Reset le flag de résolution
    isResolving.current = false;

    await update(ref(db), updates);
    // Supprimer les buzzes en attente séparément
    await import('firebase/database').then(m =>
      m.remove(m.ref(db, `rooms/${code}/state/pendingBuzzes`))
    ).catch(() => {});
  }
  async function end(){
    if(isHost){
      // La transition de fin sera gérée par le useEffect qui détecte phase="ended"
      await update(ref(db,`rooms/${code}/state`), { phase:"ended" });
    }
  }

  const lockedName = state?.lockUid ? (players.find(p=>p.uid===state.lockUid)?.name || state.lockUid) : "—";
  const teamsArray = useMemo(()=>{
    const t = meta?.teams || {}; return Object.keys(t).map(k=>({ id:k, ...t[k]}));
  }, [meta?.teams]);

  return (
    <div className="host-game-page game-page">
      {/* Transition de fin de partie */}
      <AnimatePresence>
        {showEndTransition && (
          <GameEndTransition
            variant="quiz"
            onComplete={() => router.replace(`/end/${code}`)}
          />
        )}
      </AnimatePresence>

      {/* Header fixe */}
      <header className="game-header">
        <div className="game-header-content">
          {/* Progress + Titre */}
          <div className="game-header-left">
            <div className="game-header-progress">{progressLabel}</div>
            <div className="game-header-title">{title}</div>
          </div>

          {/* Player Manager + Exit */}
          <div className="game-header-right">
            <PlayerManager
              players={players}
              roomCode={code}
              roomPrefix="rooms"
              hostUid={meta?.hostUid}
              variant="quiz"
              phase="playing"
            />
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
            <motion.div
              className="buzz-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <div className="buzz-modal-container">
              <motion.div
                className="buzz-card"
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                {/* Icône cloche qui dépasse en haut */}
                <div className="buzz-icon-wrapper">
                  <div className="buzz-icon-circle">
                    <svg viewBox="0 0 24 24" fill="none" className="buzz-bell-icon">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>

                {/* Badge points qui dépasse en haut à droite */}
                <div className="buzz-points-badge">
                  <span className="buzz-points-value">{pointsEnJeu}</span>
                  <span className="buzz-points-label">pts</span>
                </div>

                {/* Nom du joueur centré */}
                <div className="buzz-player-section">
                  <span className="buzz-player-name">{lockedName}</span>
                  <span className="buzz-player-action">a buzzé</span>
                </div>

                {/* Réponse sur 2 lignes */}
                {q && (
                  <div className="buzz-answer-section">
                    <span className="buzz-answer-label">Réponse attendue</span>
                    <span className="buzz-answer-value">{q.answer}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="buzz-actions">
                  <button className="buzz-btn buzz-btn-wrong" onClick={wrong}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                    Faux
                  </button>
                  <button className="buzz-btn buzz-btn-correct" onClick={validate}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Correct
                  </button>
                </div>

                {/* Annuler - plus visible */}
                <button className="buzz-cancel" onClick={resetBuzzers}>
                  Annuler
                </button>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content - Flex layout sans scroll */}
      <main className="game-content">
        {/* Question Card */}
        {q ? (
          <motion.div
            className="question-card"
            key={qIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Points en jeu */}
            <div className="points-badge">
              <span className="points-value">{pointsEnJeu}</span>
              <span className="points-label">points</span>
            </div>

            {/* Question */}
            <div className="question-container">
              <FitText minFontSize={14} maxFontSize={20} className="question-text">
                {q.question}
              </FitText>
            </div>

            {/* Réponse pour l'animateur */}
            <div className="answer-box">
              <span className="answer-label">Réponse</span>
              <span className="answer-value">{q.answer}</span>
            </div>
          </motion.div>
        ) : (
          <div className="question-card question-empty">
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div>Plus de questions</div>
          </div>
        )}

        {/* Classement */}
        <Leaderboard players={players} mode={meta?.mode} teams={meta?.teams} />
      </main>

      {/* Footer avec actions */}
      <footer className="game-footer">
        <div className="host-actions">
          <button className="action-btn action-reveal" onClick={revealToggle}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {state?.revealed ? (
                <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
              ) : (
                <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
              )}
            </svg>
            <span>{state?.revealed ? "Masquer" : "Révéler"}</span>
          </button>
          <button className="action-btn action-reset" onClick={resetBuzzers}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 4v6h6M23 20v-6h-6"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
            <span>Reset</span>
          </button>
          <button className="action-btn action-skip" onClick={skip}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 4 15 12 5 20 5 4"/>
              <line x1="19" y1="5" x2="19" y2="19"/>
            </svg>
            <span>Passer</span>
          </button>
          <button className="action-btn action-end" onClick={end}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
            <span>Fin</span>
          </button>
        </div>
      </footer>

      {/* Game Status Banners - for connection lost indicator */}
      <GameStatusBanners
        isHost={true}
        isHostTemporarilyDisconnected={false}
        hostDisconnectedAt={null}
      />

      <style jsx>{`
        /* ===== LAYOUT PRINCIPAL - Style Guide Compliant ===== */
        .host-game-page {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          background: var(--bg-primary, #0a0a0f);
          position: relative;
        }

        /* Background animé */
        .host-game-page::before {
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

        /* ===== HEADER ===== */
        .game-header {
          flex-shrink: 0;
          position: relative;
          z-index: 10;
          background: rgba(10, 10, 15, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
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
          gap: 16px;
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
          font-size: 1.1rem;
          color: var(--quiz-glow, #a78bfa);
          text-shadow: 0 0 15px rgba(139, 92, 246, 0.6);
          flex-shrink: 0;
        }

        .game-header-title {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.85rem;
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

        /* ===== CONTENT (Flex: 1, remplit l'espace entre header et footer) ===== */
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

        /* Leaderboard - 50% de l'espace disponible */
        .game-content > :global(.leaderboard-card) {
          flex: 1;
          min-height: 0;
          width: 100%;
          max-width: 500px;
          margin: 0 auto;
        }

        /* ===== QUESTION CARD - 50% de l'espace disponible ===== */
        :global(.question-card) {
          width: 100%;
          max-width: 500px;
          flex: 1;
          min-height: 0;
          display: grid;
          grid-template-rows: auto 1fr auto;
          gap: 8px;
          background: rgba(20, 20, 30, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 12px 16px;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        :global(.question-empty) {
          text-align: center;
          color: var(--text-muted, rgba(255, 255, 255, 0.5));
        }

        /* Points badge - pas de margin, le grid gap gère l'espacement */
        .points-badge {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 6px;
        }

        .points-value {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.3rem;
          color: var(--quiz-glow, #a78bfa);
          text-shadow: 0 0 12px rgba(139, 92, 246, 0.5);
        }

        .points-label {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.7rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
        }

        /* Question container - scroll si texte trop long */
        .question-container {
          width: 100%;
          flex: 1;
          min-height: 0;
          overflow: auto;
        }


        /* Cacher la scrollbar webkit pour FitText scroll */
        .question-container ::-webkit-scrollbar {
          display: none;
        }

        /* Question text */
        .question-text {
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-weight: 500;
          color: var(--text-primary, #ffffff);
        }

        /* Answer box */
        .answer-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          background: rgba(34, 197, 94, 0.15);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 12px;
          padding: 12px 16px;
        }

        .answer-label {
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--text-muted, rgba(255, 255, 255, 0.5));
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .answer-value {
          font-weight: 700;
          font-size: 1rem;
          color: var(--success, #22c55e);
          text-shadow: 0 0 10px rgba(34, 197, 94, 0.4);
          text-align: right;
        }

        /* Loading dots */
        .loading-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 16px;
        }

        .loading-dots span {
          width: 10px;
          height: 10px;
          background: var(--quiz-primary, #8b5cf6);
          border-radius: 50%;
          animation: dot-bounce 1.4s ease-in-out infinite;
        }

        .loading-dots span:nth-child(1) { animation-delay: 0s; }
        .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
        .loading-dots span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes dot-bounce {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
          40% { transform: scale(1.2); opacity: 1; }
        }

        /* ===== FOOTER ===== */
        .game-footer {
          flex-shrink: 0;
          position: relative;
          z-index: 10;
          padding: 12px 16px;
          background: rgba(10, 10, 15, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-width: 600px;
          margin: 0 auto;
          width: 100%;
        }

        /* Host actions */
        .host-actions {
          display: flex;
          gap: 10px;
          justify-content: center;
        }

        .action-btn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 14px;
          color: var(--text-primary, #ffffff);
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .action-btn svg {
          width: 20px;
          height: 20px;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .action-btn span {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.65rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          opacity: 0.8;
        }

        .action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .action-btn:active {
          transform: translateY(0);
        }

        /* Reset button - bleu */
        .action-reset {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.08));
          border-color: rgba(59, 130, 246, 0.3);
          color: #60a5fa;
        }

        .action-reset:hover {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(59, 130, 246, 0.12));
          border-color: rgba(59, 130, 246, 0.5);
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.2);
        }

        /* Skip button - orange */
        .action-skip {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.08));
          border-color: rgba(245, 158, 11, 0.3);
          color: #fbbf24;
        }

        .action-skip:hover {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(245, 158, 11, 0.12));
          border-color: rgba(245, 158, 11, 0.5);
          box-shadow: 0 4px 15px rgba(245, 158, 11, 0.2);
        }

        /* End button - rouge */
        .action-end {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.08));
          border-color: rgba(239, 68, 68, 0.3);
          color: #f87171;
        }

        .action-end:hover {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(239, 68, 68, 0.12));
          border-color: rgba(239, 68, 68, 0.5);
          box-shadow: 0 4px 15px rgba(239, 68, 68, 0.2);
        }

        /* Reveal button - violet */
        .action-reveal {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(139, 92, 246, 0.1));
          border-color: rgba(139, 92, 246, 0.4);
          color: #a78bfa;
        }

        .action-reveal:hover {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(139, 92, 246, 0.15));
          border-color: rgba(139, 92, 246, 0.6);
          box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
        }

        /* ===== BUZZ MODAL - Design revisité ===== */

        :global(.buzz-overlay) {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.92);
          z-index: 9998;
        }

        .buzz-modal-container {
          position: fixed;
          inset: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          padding: 20px;
        }

        /* Card avec espace pour l'icône qui dépasse */
        :global(.buzz-card) {
          position: relative;
          width: 100%;
          max-width: 340px;
          background: linear-gradient(180deg, rgb(22, 18, 35) 0%, rgb(14, 12, 22) 100%);
          border: 1px solid rgba(139, 92, 246, 0.4);
          border-radius: 24px;
          padding: 50px 24px 24px 24px;
          margin-top: 30px;
          box-shadow:
            0 12px 40px rgba(0, 0, 0, 0.7),
            0 0 80px rgba(139, 92, 246, 0.15),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        /* Icône cloche qui dépasse en haut - centré */
        .buzz-icon-wrapper {
          position: absolute;
          top: -30px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
        }

        .buzz-icon-circle {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
          border: 3px solid rgba(139, 92, 246, 0.6);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow:
            0 4px 20px rgba(139, 92, 246, 0.5),
            0 0 30px rgba(139, 92, 246, 0.3);
          animation: bell-entrance 0.5s ease-out;
        }

        :global(.buzz-bell-icon) {
          width: 28px;
          height: 28px;
          color: white;
          filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.5));
        }

        @keyframes bell-entrance {
          0% { transform: scale(0.5) rotate(-15deg); opacity: 0; }
          50% { transform: scale(1.1) rotate(10deg); }
          70% { transform: scale(0.95) rotate(-5deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }

        /* Badge points - dépasse en haut à droite comme un post-it */
        .buzz-points-badge {
          position: absolute;
          top: -15px;
          right: -8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-width: 55px;
          padding: 8px 12px;
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 12px;
          box-shadow:
            0 4px 15px rgba(34, 197, 94, 0.5),
            0 0 20px rgba(34, 197, 94, 0.3);
          transform: rotate(8deg);
          z-index: 10;
        }

        .buzz-points-value {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.3rem;
          color: white;
          line-height: 1;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .buzz-points-label {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.6rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.85);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* Section joueur - centré */
        .buzz-player-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .buzz-player-name {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.6rem;
          color: #ffffff;
          text-shadow: 0 0 20px rgba(139, 92, 246, 0.6);
          text-align: center;
          word-break: break-word;
        }

        .buzz-player-action {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.9rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.5);
        }

        /* Section réponse - 2 lignes empilées */
        .buzz-answer-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          background: rgba(34, 197, 94, 0.12);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 14px;
          padding: 14px 18px;
          margin-bottom: 20px;
        }

        .buzz-answer-section .buzz-answer-label {
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--text-muted, rgba(255, 255, 255, 0.5));
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .buzz-answer-section .buzz-answer-value {
          font-weight: 700;
          font-size: 1.1rem;
          color: var(--success, #22c55e);
          text-shadow: 0 0 12px rgba(34, 197, 94, 0.5);
          text-align: center;
          line-height: 1.3;
        }

        /* Boutons - même style, même taille */
        .buzz-actions {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
        }

        .buzz-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px 16px;
          border-radius: 14px;
          border: 1px solid;
          cursor: pointer;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.9rem;
          font-weight: 700;
          transition: all 0.2s ease;
        }

        .buzz-btn svg {
          width: 22px;
          height: 22px;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .buzz-btn-wrong {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.1));
          border-color: rgba(239, 68, 68, 0.4);
          color: #f87171;
        }

        .buzz-btn-wrong:hover {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.35), rgba(239, 68, 68, 0.2));
          border-color: rgba(239, 68, 68, 0.6);
          box-shadow: 0 4px 20px rgba(239, 68, 68, 0.3);
          transform: translateY(-2px);
        }

        .buzz-btn-wrong:active {
          transform: translateY(0);
        }

        .buzz-btn-correct {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.1));
          border-color: rgba(34, 197, 94, 0.4);
          color: #4ade80;
        }

        .buzz-btn-correct:hover {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.35), rgba(34, 197, 94, 0.2));
          border-color: rgba(34, 197, 94, 0.6);
          box-shadow: 0 4px 20px rgba(34, 197, 94, 0.3);
          transform: translateY(-2px);
        }

        .buzz-btn-correct:active {
          transform: translateY(0);
        }

        /* Bouton annuler - un peu plus visible */
        .buzz-cancel {
          width: 100%;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.85rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.45);
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 10px 16px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .buzz-cancel:hover {
          color: rgba(255, 255, 255, 0.8);
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
