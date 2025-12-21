"use client";
import { useEffect, useState } from "react";
import { auth, db, ref, set, signInAnonymously, onAuthStateChanged } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { genCode } from "@/lib/utils";
import { motion } from "framer-motion";

export default function AlibiHostPage(){
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if(u){
        setUser(u);
      } else {
        signInAnonymously(auth).then(() => {});
      }
    });
    return () => unsub();
  }, []);

  async function createRoom(){
    const c = genCode();
    const now = Date.now();

    // Créer la room Alibi dans Firebase
    await set(ref(db, "rooms_alibi/" + c + "/meta"), {
      code: c,
      createdAt: now,
      hostUid: auth.currentUser.uid,
      expiresAt: now + 12 * 60 * 60 * 1000,
      alibiId: null,
      gameType: "alibi"
    });

    await set(ref(db, "rooms_alibi/" + c + "/teams"), {
      inspectors: [],
      suspects: []
    });

    await set(ref(db, "rooms_alibi/" + c + "/state"), {
      phase: "lobby",
      currentQuestion: 0,
      prepTimeLeft: 90,
      questionTimeLeft: 30,
      allAnswered: false
    });

    await set(ref(db, "rooms_alibi/" + c + "/score"), {
      correct: 0,
      total: 10
    });

    // Rediriger automatiquement vers le lobby Alibi
    router.push("/alibi/room/" + c);
  }

  return (
    <div className="game-container">
      <motion.main
        className="game-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="text-center space-y-4">
          <h1 className="game-page-title">ALIBI</h1>
          <h2 className="game-section-title">Creer une partie</h2>
          <p className="game-description">Interrogatoire d'accuses : trouvez les incoherences dans leur alibi !</p>
        </div>

        {!user && <p className="loading-text">Connexion anonyme...</p>}
        {user && (
          <motion.button
            className="btn btn-alibi w-full"
            onClick={createRoom}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            Creer une partie ALIBI
          </motion.button>
        )}

        <div className="card space-y-4">
          <h3 className="card-title">Comment jouer ?</h3>
          <ul className="rules-list">
            <li>2 equipes : Inspecteurs vs Interroges (suspects)</li>
            <li>Phase preparation : 1m30 pour lire l'alibi</li>
            <li>Phase interrogatoire : 10 questions avec 30s par reponse</li>
            <li>Les inspecteurs valident ou refusent chaque reponse</li>
            <li>Score final : nombre de reponses validees / 10</li>
          </ul>
        </div>

        <div className="text-center">
          <button
            className="btn btn-secondary"
            onClick={() => router.push("/home")}
          >
            Retour a l'accueil
          </button>
        </div>
      </motion.main>

      <style jsx>{`
        .game-container {
          position: relative;
          min-height: 100dvh;
          background: var(--bg-primary, #0a0a0f);
          overflow: hidden;
        }

        /* Animated Background - Alibi colors (amber/gold) */
        .game-container::before {
          content: '';
          position: fixed;
          inset: 0;
          z-index: 0;
          background:
            radial-gradient(ellipse at 20% 80%, rgba(245, 158, 11, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(251, 191, 36, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(245, 158, 11, 0.05) 0%, transparent 70%),
            var(--bg-primary, #0a0a0f);
          pointer-events: none;
        }

        .game-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 1.5rem;
          min-height: 100dvh;
          padding: 1.5rem;
          max-width: 28rem;
          margin: 0 auto;
        }

        /* Page Title - Guide Compliant with Alibi glow */
        .game-content :global(.game-page-title) {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: clamp(2.5rem, 10vw, 4rem);
          color: var(--text-primary, #ffffff);
          text-shadow:
            0 0 10px rgba(245, 158, 11, 0.6),
            0 0 30px rgba(245, 158, 11, 0.4),
            0 0 60px rgba(245, 158, 11, 0.2);
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin: 0;
        }

        .game-content :global(.game-section-title) {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 1.25rem;
          color: var(--alibi-glow, #fbbf24);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin: 0;
        }

        .game-content :global(.game-description) {
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 1rem;
          color: var(--text-secondary, rgba(255, 255, 255, 0.7));
          line-height: 1.5;
          margin: 0;
        }

        .game-content :global(.loading-text) {
          font-family: var(--font-body, 'Inter'), sans-serif;
          color: var(--text-muted, rgba(255, 255, 255, 0.5));
          text-align: center;
        }

        /* Card - Glassmorphism */
        .game-content :global(.card) {
          background: rgba(20, 20, 30, 0.7);
          border-radius: 20px;
          padding: 1.5rem;
          border: 1px solid rgba(245, 158, 11, 0.2);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.4),
            0 0 20px rgba(245, 158, 11, 0.05),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .game-content :global(.card-title) {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--alibi-glow, #fbbf24);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0;
        }

        .game-content :global(.rules-list) {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .game-content :global(.rules-list li) {
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 0.9rem;
          color: var(--text-secondary, rgba(255, 255, 255, 0.8));
          padding-left: 1.5rem;
          position: relative;
          line-height: 1.4;
        }

        .game-content :global(.rules-list li::before) {
          content: '';
          position: absolute;
          left: 0;
          top: 0.5em;
          width: 8px;
          height: 8px;
          background: var(--alibi-primary, #f59e0b);
          border-radius: 50%;
          box-shadow: 0 0 8px rgba(245, 158, 11, 0.5);
        }

        /* Alibi Primary Button - Amber gradient */
        .game-content :global(.btn-alibi) {
          background: linear-gradient(135deg, var(--alibi-primary, #f59e0b), #d97706);
          border: none;
          border-radius: 12px;
          padding: 18px 32px;
          color: #000000;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-weight: 700;
          font-size: 1.125rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow:
            0 4px 15px rgba(245, 158, 11, 0.4),
            0 0 30px rgba(245, 158, 11, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }

        .game-content :global(.btn-alibi:hover) {
          box-shadow:
            0 6px 20px rgba(245, 158, 11, 0.5),
            0 0 40px rgba(245, 158, 11, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.4);
        }

        .game-content :global(.btn-alibi:active) {
          transform: translateY(1px) scale(0.98);
        }

        /* Secondary Button */
        .game-content :global(.btn-secondary) {
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 12px 24px;
          color: var(--text-secondary, rgba(255, 255, 255, 0.7));
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .game-content :global(.btn-secondary:hover) {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(245, 158, 11, 0.3);
          color: var(--text-primary, #ffffff);
        }

        /* Utility classes */
        .game-content :global(.text-center) {
          text-align: center;
        }

        .game-content :global(.space-y-4) {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .game-content :global(.w-full) {
          width: 100%;
        }
      `}</style>
    </div>
  );
}
