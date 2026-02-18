'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { deleteUser } from 'firebase/auth';
import { ref, remove } from 'firebase/database';

export default function DeleteAccountPage() {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      setError('');
      const currentUser = auth.currentUser;

      if (!currentUser) {
        router.push('/login');
        return;
      }

      // Supprimer les données utilisateur dans Realtime DB
      try {
        await remove(ref(db, `users/${currentUser.uid}`));
      } catch (e) {
        console.warn('[deleteAccount] DB cleanup error:', e);
      }

      // Vider le localStorage
      localStorage.clear();

      // Supprimer le compte Firebase Auth
      await deleteUser(currentUser);

      router.push('/onboarding');
    } catch (err) {
      console.error('[deleteAccount] Error:', err);
      if (err.code === 'auth/requires-recent-login') {
        setError('Pour ta sécurité, déconnecte-toi et reconnecte-toi avant de supprimer ton compte.');
      } else {
        setError('Une erreur est survenue. Réessaie.');
      }
      setIsDeleting(false);
    }
  };

  return (
    <div className="delete-page">
      <div className="delete-bg" />

      <header className="delete-header">
        <button className="back-btn" onClick={() => router.back()}>
          <ArrowLeft size={22} />
        </button>
        <h1 className="header-title">Supprimer mon compte</h1>
      </header>

      <main className="delete-content">
        <div className="delete-icon">
          <Trash2 size={32} />
        </div>

        <h2>Suppression de compte</h2>

        <div className="warning-box">
          <AlertTriangle size={20} />
          <span>Cette action est irréversible</span>
        </div>

        <p className="info-text">
          La suppression de ton compte entraînera l'effacement définitif de :
        </p>

        <ul className="delete-list">
          <li>Ton profil et tes informations personnelles</li>
          <li>Ton historique de parties et tes scores</li>
          <li>Ton abonnement Gigglz Pro (si applicable)</li>
        </ul>

        {error && <p className="error-text">{error}</p>}

        <div className="confirm-section">
          <label className="confirm-checkbox">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            <span>Je comprends que cette action est irréversible</span>
          </label>

          <button
            className="submit-btn"
            onClick={handleDeleteAccount}
            disabled={!confirmed || isDeleting}
          >
            <Trash2 size={18} />
            <span>{isDeleting ? 'Suppression en cours…' : 'Supprimer définitivement mon compte'}</span>
          </button>
        </div>
      </main>

      <style jsx>{`
        .delete-page {
          flex: 1;
          min-height: 0;
          background: #0a0a0f;
          position: relative;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        .delete-bg {
          position: fixed;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(ellipse at 50% 0%, rgba(239, 68, 68, 0.08) 0%, transparent 50%);
          z-index: 0;
        }

        .delete-header {
          position: sticky;
          top: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          background: rgba(10, 10, 15, 0.9);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(239, 68, 68, 0.2);
        }

        .back-btn {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .back-btn:hover {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.3);
        }

        .header-title {
          font-family: 'Bungee', cursive;
          font-size: 1.25rem;
          font-weight: 400;
          color: white;
          margin: 0;
        }

        .delete-content {
          position: relative;
          z-index: 1;
          max-width: 500px;
          margin: 0 auto;
          padding: 40px 20px 60px;
          text-align: center;
        }

        .delete-icon {
          width: 72px;
          height: 72px;
          border-radius: 20px;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          color: #f87171;
        }

        h2 {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
          margin: 0 0 20px 0;
        }

        .warning-box {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 10px;
          padding: 12px 20px;
          margin-bottom: 24px;
          color: #fca5a5;
          font-family: 'Inter', sans-serif;
          font-size: 0.9375rem;
          font-weight: 500;
        }

        .info-text {
          font-family: 'Inter', sans-serif;
          font-size: 0.9375rem;
          color: rgba(255, 255, 255, 0.7);
          margin: 0 0 16px 0;
          text-align: left;
        }

        .delete-list {
          font-family: 'Inter', sans-serif;
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.6);
          margin: 0 0 24px 0;
          padding-left: 24px;
          text-align: left;
        }

        .delete-list li {
          margin-bottom: 8px;
        }

        .error-text {
          font-family: 'Inter', sans-serif;
          font-size: 0.875rem;
          color: #f87171;
          background: rgba(239, 68, 68, 0.1);
          border-radius: 8px;
          padding: 10px 14px;
          margin: 0 0 20px 0;
        }

        .confirm-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
          text-align: left;
        }

        .confirm-checkbox {
          display: flex;
          align-items: center;
          gap: 12px;
          font-family: 'Inter', sans-serif;
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
        }

        .confirm-checkbox input[type="checkbox"] {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
          accent-color: #ef4444;
          cursor: pointer;
        }

        .submit-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          padding: 16px 24px;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          border: none;
          border-radius: 12px;
          color: white;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(239, 68, 68, 0.4);
        }

        .submit-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          transform: none;
        }
      `}</style>
    </div>
  );
}
