"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { auth, db, ref, set, get, signInAnonymously, onAuthStateChanged } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { useUserProfile } from "@/lib/hooks/useUserProfile";
import { User, Pencil, Check, X, AlertCircle, PlayCircle, SearchX } from "lucide-react";
import { ROOM_TYPES } from "@/lib/config/rooms";
import { showInterstitialAd, initAdMob } from "@/lib/admob";
import { isPro } from "@/lib/subscription";
import { shouldShowInterstitial, markAdShownDuringJoin } from "@/lib/hooks/useInterstitialAd";
import JoinLoadingScreen from "@/components/ui/JoinLoadingScreen";
import { validatePseudo, updateUserPseudo } from "@/lib/userProfile";

export default function JoinClient({ initialCode = "" }) {
  const router = useRouter();
  const [code, setCode] = useState((initialCode || "").toUpperCase());
  const [user, setUser] = useState(null);
  const [joining, setJoining] = useState(false);
  const [joiningGameId, setJoiningGameId] = useState(null);
  const [error, setError] = useState("");
  const { user: currentUser, profile, subscription, loading: profileLoading, refresh: refreshProfile } = useUserProfile();

  // Pseudo editing state
  const [isEditingPseudo, setIsEditingPseudo] = useState(false);
  const [editedPseudo, setEditedPseudo] = useState("");
  const [pseudoError, setPseudoError] = useState("");
  const [savingPseudo, setSavingPseudo] = useState(false);

  // Check if user is Pro
  const userIsPro = currentUser && subscription ? isPro({ ...currentUser, subscription }) : false;

  // Get pseudo from profile or fallback to displayName
  const pseudo = profile?.pseudo || user?.displayName?.split(' ')[0] || 'Joueur';

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

      // Show loading screen with Game Card
      setJoiningGameId(foundRoomType.id);

      // Add player to Firebase
      const playerData = foundRoomType.playerSchema(uid, pseudo);
      await set(ref(db, `${foundRoomType.prefix}/${roomCode}/players/${uid}`), playerData);

      // Check if should show ad (unified logic)
      if (shouldShowInterstitial(userIsPro)) {
        try {
          // Mark that ad was shown during join (so room page doesn't show it again)
          markAdShownDuringJoin();

          // Init and show interstitial ad
          await initAdMob();
          await showInterstitialAd();
        } catch (err) {
          console.log('[Join] Interstitial ad error:', err);
        }
      }

      // Navigate to room (ad is dismissed or failed)
      router.push(`${foundRoomType.path}/${roomCode}`);
    } catch (error) {
      console.error("Join error:", error);
      setError("Erreur lors de la connexion à la partie.");
      setJoining(false);
      setJoiningGameId(null);
    }
  }

  // Show loading screen while joining (with Game Card)
  if (joiningGameId) {
    return <JoinLoadingScreen gameId={joiningGameId} />;
  }

  return (
    <div className="join-container">
      <motion.main
        className="join-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="join-header">
          <h1 className="page-title">Rejoindre</h1>
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
                  style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User size={14} className="pseudo-icon" />
                    <span className="pseudo-label">Tu joues en tant que</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '22px' }}>
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
            disabled={!code || !user || profileLoading || joining || isEditingPseudo}
          >
            {!user || profileLoading ? "Connexion..." : joining ? "Connexion..." : "Rejoindre la partie"}
          </button>

          {/* Error message (below button) */}
          <AnimatePresence>
            {error && (
              error.includes("déjà commencé") ? (
                <motion.div
                  className="error-card warning"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                >
                  <div className="error-card-icon warning">
                    <PlayCircle size={22} />
                  </div>
                  <div className="error-card-content">
                    <span className="error-card-title warning">Partie en cours</span>
                    <span className="error-card-text">
                      Cette partie a déjà commencé, tu ne peux plus la rejoindre.
                    </span>
                  </div>
                </motion.div>
              ) : error.includes("Code invalide") ? (
                <motion.div
                  className="error-card danger"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                >
                  <div className="error-card-icon danger">
                    <SearchX size={22} />
                  </div>
                  <div className="error-card-content">
                    <span className="error-card-title danger">Code introuvable</span>
                    <span className="error-card-text">
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
      </motion.main>

      <style jsx>{`
        .code-input-wrapper {
          position: relative;
          cursor: text;
        }

        .code-input-hidden {
          position: absolute;
          opacity: 0;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          z-index: 1;
        }

        .code-boxes {
          display: flex;
          gap: 8px;
          justify-content: center;
        }

        .code-box {
          width: 44px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(139, 92, 246, 0.3);
          border-radius: 12px;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1.4rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.3);
          transition: all 0.2s ease;
        }

        .code-box.filled {
          color: var(--quiz-primary, #8b5cf6);
          border-color: var(--quiz-primary, #8b5cf6);
          background: rgba(139, 92, 246, 0.15);
        }

        .code-box.active {
          border-color: var(--quiz-primary, #8b5cf6);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2);
          animation: pulse-box 1.5s ease-in-out infinite;
        }

        @keyframes pulse-box {
          0%, 100% { box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2); }
          50% { box-shadow: 0 0 0 5px rgba(139, 92, 246, 0.1); }
        }

        .pseudo-section {
          margin-bottom: 12px;
        }

        .pseudo-preview {
          padding: 14px 16px;
          background: rgba(139, 92, 246, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 12px;
        }

        .pseudo-edit-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: rgba(139, 92, 246, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 12px;
          flex-wrap: wrap;
        }

        .pseudo-preview :global(.pseudo-icon),
        .pseudo-edit-row :global(.pseudo-icon) {
          color: var(--quiz-primary, #8b5cf6);
          flex-shrink: 0;
        }

        .pseudo-label {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .pseudo-name {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 1.2rem;
          color: var(--quiz-primary, #8b5cf6);
        }

        .pseudo-edit-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          transition: all 0.2s;
        }

        .pseudo-edit-btn:hover {
          background: rgba(139, 92, 246, 0.3);
          color: white;
        }

        .pseudo-input {
          flex: 1;
          min-width: 80px;
          padding: 6px 10px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.4);
          border-radius: 8px;
          color: white;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.95rem;
          font-weight: 600;
          outline: none;
          transition: border-color 0.2s;
        }

        .pseudo-input:focus {
          border-color: var(--quiz-primary, #8b5cf6);
        }

        .pseudo-input.has-error {
          border-color: #ef4444;
        }

        .pseudo-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pseudo-action-btn.save {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }

        .pseudo-action-btn.save:hover {
          background: rgba(34, 197, 94, 0.4);
        }

        .pseudo-action-btn.cancel {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .pseudo-action-btn.cancel:hover {
          background: rgba(239, 68, 68, 0.4);
        }

        .pseudo-action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pseudo-error {
          font-size: 0.8rem;
          color: #ef4444;
          padding: 6px 12px;
          margin-top: 6px;
        }

        .join-error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 12px;
          color: #f87171;
          font-size: 0.9rem;
          margin-top: 16px;
        }

        :global(.error-card) {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 10px;
          padding: 20px 16px;
          border-radius: 14px;
          margin-top: 12px;
        }

        :global(.error-card.warning) {
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.12) 0%, rgba(245, 158, 11, 0.08) 100%);
          border: 2px solid rgba(251, 191, 36, 0.35);
        }

        :global(.error-card.danger) {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(220, 38, 38, 0.08) 100%);
          border: 2px solid rgba(239, 68, 68, 0.35);
        }

        :global(.error-card-icon) {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          margin: 0 auto;
        }

        :global(.error-card-icon.warning) {
          background: rgba(251, 191, 36, 0.2);
          color: #fbbf24;
        }

        :global(.error-card-icon.danger) {
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
        }

        :global(.error-card-content) {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }

        :global(.error-card-title) {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1rem;
        }

        :global(.error-card-title.warning) {
          color: #fbbf24;
        }

        :global(.error-card-title.danger) {
          color: #f87171;
        }

        :global(.error-card-text) {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.6);
          line-height: 1.4;
          max-width: 240px;
        }
      `}</style>
    </div>
  );
}
