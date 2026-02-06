'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail, Trash2, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

export default function DeleteAccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');

  const handleDeleteRequest = () => {
    if (!email.trim()) {
      alert("Merci d'entrer ton adresse email de connexion.");
      return;
    }
    const subject = encodeURIComponent("Demande de suppression de compte Gigglz");
    const body = encodeURIComponent(`Bonjour,

Je souhaite supprimer définitivement mon compte Gigglz et toutes les données associées.

Email du compte : ${email}

Je comprends que :
- Mon compte sera supprimé définitivement
- Toutes mes données (profil, historique de parties, scores) seront effacées
- Mon abonnement Pro sera annulé (si applicable)
- Cette action est irréversible

Merci de procéder à la suppression de mon compte.

Cordialement`);
    window.location.href = `mailto:contact@weareumain.com?subject=${subject}&body=${body}`;
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

        <p className="delay-text">
          Ta demande sera traitée sous 30 jours maximum.
        </p>

        <div className="form-section">
          <label htmlFor="email">Email de ton compte</label>
          <input
            id="email"
            type="email"
            placeholder="ton@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="submit-btn" onClick={handleDeleteRequest}>
            <Mail size={18} />
            <span>Envoyer la demande</span>
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
          margin: 0 0 16px 0;
          padding-left: 24px;
          text-align: left;
        }

        .delete-list li {
          margin-bottom: 8px;
        }

        .delay-text {
          font-family: 'Inter', sans-serif;
          font-size: 0.8125rem;
          color: rgba(255, 255, 255, 0.5);
          margin: 0 0 32px 0;
          font-style: italic;
        }

        .form-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
          text-align: left;
        }

        label {
          font-family: 'Inter', sans-serif;
          font-size: 0.875rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.8);
        }

        input {
          width: 100%;
          padding: 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: white;
          font-family: 'Inter', sans-serif;
          font-size: 1rem;
          outline: none;
          transition: all 0.2s;
        }

        input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        input:focus {
          border-color: rgba(239, 68, 68, 0.5);
          background: rgba(255, 255, 255, 0.08);
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
          margin-top: 8px;
        }

        .submit-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(239, 68, 68, 0.4);
        }

        .submit-btn:active {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}
