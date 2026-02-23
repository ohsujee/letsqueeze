"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { auth, db, ref, set, get, signInAnonymously, onAuthStateChanged } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { useUserProfile } from "@/lib/hooks/useUserProfile";
import { User, Pencil, Check, X, AlertCircle, PlayCircle, SearchX } from "lucide-react";
import { ROOM_TYPES } from "@/lib/config/rooms";
import { isPro } from "@/lib/subscription";
import ATTPromptHandler from "@/components/game/ATTPromptHandler";
import { LobbyEntryTransition } from "@/components/transitions";
import { GAME_COLOR_MAP } from "@/lib/config/colors";
import { validatePseudo, updateUserPseudo } from "@/lib/userProfile";
import "./join.css";

export default function JoinClient({ initialCode = "" }) {
  const router = useRouter();
  const [code, setCode] = useState(() => {
    // Server may pass initialCode, but in Capacitor deep links it may be empty
    // Fallback: read from URL query params client-side
    if (initialCode) return initialCode.toUpperCase();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlCode = params.get("code");
      if (urlCode) return urlCode.toUpperCase();
    }
    return "";
  });
  const [user, setUser] = useState(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const { user: currentUser, profile, subscription, loading: profileLoading, refresh: refreshProfile, cachedPseudo } = useUserProfile();

  // Pseudo editing state
  const [isEditingPseudo, setIsEditingPseudo] = useState(false);
  const [editedPseudo, setEditedPseudo] = useState("");
  const [pseudoError, setPseudoError] = useState("");
  const [savingPseudo, setSavingPseudo] = useState(false);

  // Entry transition state
  const [showEntryTransition, setShowEntryTransition] = useState(false);
  const [transitionConfig, setTransitionConfig] = useState(null);

  // Check if user is Pro
  const userIsPro = currentUser && subscription ? isPro({ ...currentUser, subscription }) : false;

  // Get pseudo from hook (profile.pseudo > cachedPseudo > displayName > 'Joueur')
  const pseudo = profile?.pseudo || cachedPseudo || currentUser?.displayName?.split(' ')[0] || 'Joueur';
  const hasValidPseudo = pseudo && pseudo !== 'Joueur';

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
      } else {
        signInAnonymously(auth).catch(() => {});
      }
    });
    return () => unsub();
  }, []);

  // Auto-open edit mode if pseudo is "Joueur" (force user to set a real name)
  useEffect(() => {
    if (!profileLoading && !hasValidPseudo && !isEditingPseudo) {
      setEditedPseudo('');
      setIsEditingPseudo(true);
    }
  }, [profileLoading, hasValidPseudo, isEditingPseudo]);

  // Start editing pseudo
  const startEditPseudo = useCallback(() => {
    setEditedPseudo(pseudo);
    setPseudoError("");
    setIsEditingPseudo(true);
  }, [pseudo]);

  // Cancel editing
  const cancelEditPseudo = useCallback(() => {
    setEditedPseudo("");
    setPseudoError("");
    setIsEditingPseudo(false);
  }, []);

  // Save pseudo
  const savePseudo = useCallback(async () => {
    const trimmed = editedPseudo.trim();

    // Validate
    const validation = validatePseudo(trimmed);
    if (!validation.valid) {
      setPseudoError(validation.error);
      return;
    }

    // Don't save if unchanged
    if (trimmed === pseudo) {
      cancelEditPseudo();
      return;
    }

    if (!currentUser?.uid) {
      setPseudoError("Non connecté");
      return;
    }

    try {
      setSavingPseudo(true);
      await updateUserPseudo(currentUser.uid, trimmed);
      await refreshProfile?.();
      setIsEditingPseudo(false);
      setPseudoError("");
    } catch (err) {
      console.error("[Join] Save pseudo error:", err);
      setPseudoError("Erreur de sauvegarde");
    } finally {
      setSavingPseudo(false);
    }
  }, [editedPseudo, pseudo, currentUser?.uid, refreshProfile, cancelEditPseudo]);

  // Handle pseudo input change with live validation
  const handlePseudoChange = useCallback((value) => {
    setEditedPseudo(value);
    // Clear error when typing
    if (pseudoError) setPseudoError("");
  }, [pseudoError]);

  async function join() {
    if (!code || !pseudo || !auth.currentUser || joining) return;

    setJoining(true);
    setError("");
    const uid = auth.currentUser.uid;
    const roomCode = code.trim().toUpperCase();

    try {
      // Check all room types to find the matching one
      let foundRoomType = null;
      let roomState = null;

      for (const roomType of ROOM_TYPES) {
        const metaSnapshot = await get(ref(db, `${roomType.prefix}/${roomCode}/meta`));

        if (metaSnapshot.exists()) {
          foundRoomType = roomType;
          // Also get the state to check phase
          const stateSnapshot = await get(ref(db, `${roomType.prefix}/${roomCode}/state`));
          roomState = stateSnapshot.val();
          break;
        }
      }

      if (!foundRoomType) {
        setError("Code invalide ! Aucune partie trouvée avec ce code.");
        setJoining(false);
        return;
      }

      // Check if room is still in lobby phase
      if (roomState?.phase && roomState.phase !== 'lobby') {
        setError("La partie a déjà commencé !");
        setJoining(false);
        return;
      }

      // Add player to Firebase
      const playerData = foundRoomType.playerSchema(uid, pseudo);
      await set(ref(db, `${foundRoomType.prefix}/${roomCode}/players/${uid}`), playerData);

      // Show entry transition (ad will be shown when transition completes)
      setTransitionConfig({
        gameId: foundRoomType.id,
        path: `${foundRoomType.path}/${roomCode}`,
        color: GAME_COLOR_MAP[foundRoomType.id] || '#8b5cf6'
      });
      setShowEntryTransition(true);
    } catch (error) {
      console.error("Join error:", error);
      setError("Erreur lors de la connexion à la partie.");
      setJoining(false);
      setShowEntryTransition(false);
      setTransitionConfig(null);
    }
  }

  // Handle transition complete - navigate to room
  const handleTransitionComplete = () => {
    if (!transitionConfig) return;
    router.push(transitionConfig.path);
  };

  // Show entry transition (door opening animation)
  if (showEntryTransition && transitionConfig) {
    return (
      <LobbyEntryTransition
        gameColor={transitionConfig.color}
        playerName={pseudo}
        onComplete={handleTransitionComplete}
        duration={2500}
      />
    );
  }

  return (
    <div className="join-container">
      {/* ATT Prompt for players (GDPR + ATT) */}
      <ATTPromptHandler enabled={true} context="join" delay={0} />

      <main className="join-content">
        <div className="join-header">
          <h1 className="page-title">Rejoindre</h1>
          <p className="join-help-text">
            Entrez le code à 6 caractères fourni par l'hôte qui a créé la partie
          </p>
        </div>

        <div className="join-card">
          <div className="input-group">
            <label className="input-label">Code de la room</label>
            <div className="code-input-wrapper" onClick={() => document.getElementById('code-input').focus()}>
              <input
                id="code-input"
                className="code-input-hidden"
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                maxLength={6}
                autoComplete="off"
                inputMode="text"
              />
              <div className="code-boxes">
                {[0, 1, 2, 3, 4, 5].map(i => (
                  <div key={i} className={`code-box ${code[i] ? 'filled' : ''} ${code.length === i ? 'active' : ''}`}>
                    {code[i] || '•'}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pseudo section with edit capability */}
          <div className="pseudo-section">
            <AnimatePresence mode="wait">
              {isEditingPseudo ? (
                <motion.div
                  key="editing"
                  className="pseudo-edit-row"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                >
                  <User size={16} className="pseudo-icon" />
                  <span className="pseudo-label">Tu joues en tant que</span>
                  <input
                    type="text"
                    className={`pseudo-input ${pseudoError ? 'has-error' : ''}`}
                    value={editedPseudo}
                    onChange={e => handlePseudoChange(e.target.value)}
                    maxLength={16}
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') savePseudo();
                      if (e.key === 'Escape') cancelEditPseudo();
                    }}
                  />
                  <button
                    className="pseudo-action-btn save"
                    onClick={savePseudo}
                    disabled={savingPseudo}
                    title="Confirmer"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    className="pseudo-action-btn cancel"
                    onClick={cancelEditPseudo}
                    disabled={savingPseudo}
                    title="Annuler"
                  >
                    <X size={16} />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="display"
                  className="pseudo-preview"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                >
                  <div className="pseudo-preview-label">
                    <User size={14} className="pseudo-icon" />
                    <span className="pseudo-label">Tu joues en tant que</span>
                  </div>
                  <div className="pseudo-preview-name">
                    <span className="pseudo-name">{pseudo}</span>
                    <button
                      className="pseudo-edit-btn"
                      onClick={startEditPseudo}
                      title="Modifier le pseudo"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pseudo error message */}
            <AnimatePresence>
              {pseudoError && (
                <motion.div
                  className="pseudo-error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {pseudoError}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            className="btn-join"
            onClick={join}
            disabled={!code || !user || profileLoading || joining || isEditingPseudo || !hasValidPseudo}
          >
            {!user || profileLoading ? "Connexion..." : joining ? "Connexion..." : !hasValidPseudo ? "Entre ton pseudo" : "Rejoindre la partie"}
          </button>

          {/* Error message (below button) */}
          <AnimatePresence>
            {error && (
              error.includes("déjà commencé") ? (
                <motion.div
                  className="join-error-card warning"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                >
                  <div className="join-error-card-icon warning">
                    <PlayCircle size={22} />
                  </div>
                  <div className="join-error-card-content">
                    <span className="join-error-card-title warning">Partie en cours</span>
                    <span className="join-error-card-text">
                      Cette partie a déjà commencé, tu ne peux plus la rejoindre.
                    </span>
                  </div>
                </motion.div>
              ) : error.includes("Code invalide") ? (
                <motion.div
                  className="join-error-card danger"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                >
                  <div className="join-error-card-icon danger">
                    <SearchX size={22} />
                  </div>
                  <div className="join-error-card-content">
                    <span className="join-error-card-title danger">Code introuvable</span>
                    <span className="join-error-card-text">
                      Aucune partie ne correspond à ce code. Vérifie et réessaye.
                    </span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  className="join-error"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                >
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </motion.div>
              )
            )}
          </AnimatePresence>
        </div>

        {initialCode && (
          <div className="join-detected-code">
            <div className="label">Code détecté automatiquement</div>
            <div className="code">{initialCode}</div>
          </div>
        )}
      </main>
    </div>
  );
}
