'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail, MessageCircle, FileText, Shield, HelpCircle, ChevronDown, Trash2, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { version } from '../../package.json';

export default function SupportPage() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState(null);
  const [deleteEmail, setDeleteEmail] = useState('');

  const faqs = [
    {
      question: "Comment créer une partie ?",
      answer: "Depuis l'écran d'accueil, clique sur l'image d'un jeu. Une partie sera automatiquement créée et un code sera généré que tu pourras partager avec tes amis pour qu'ils rejoignent."
    },
    {
      question: "Comment rejoindre une partie ?",
      answer: "Clique sur 'Rejoindre' depuis l'écran d'accueil, puis entre le code à 6 lettres que l'hôte t'a partagé."
    },
    {
      question: "Qu'est-ce que Gigglz Pro ?",
      answer: "Gigglz Pro est notre abonnement premium qui te donne accès à des parties illimitées, tous les packs de questions, et une expérience sans publicité."
    },
    {
      question: "Comment annuler mon abonnement Pro ?",
      answer: "Tu peux gérer ton abonnement depuis ton profil > 'Gérer l'abonnement'. Cela t'amènera vers les paramètres de ton App Store (iOS) ou Google Play (Android)."
    },
    {
      question: "Mes données sont-elles en sécurité ?",
      answer: "Oui, nous utilisons Firebase (Google) pour l'authentification et le stockage des données. Toutes les communications sont chiffrées. Consulte notre politique de confidentialité pour plus de détails."
    },
    {
      question: "L'application ne fonctionne pas correctement",
      answer: "Essaie de fermer et rouvrir l'application. Si le problème persiste, vérifie ta connexion internet. Tu peux aussi nous contacter par email pour signaler un bug."
    },
    {
      question: "Comment supprimer mon compte ?",
      answer: "Utilise le formulaire 'Supprimer mon compte' ci-dessous. Entre ton email de connexion et clique sur le bouton pour nous envoyer ta demande. Nous supprimerons ton compte et toutes tes données sous 30 jours."
    }
  ];

  const handleEmailContact = () => {
    const subject = encodeURIComponent("Support Gigglz");
    const body = encodeURIComponent(`

---
Version: ${version}
Plateforme: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}
`);
    window.location.href = `mailto:contact@weareumain.com?subject=${subject}&body=${body}`;
  };

  const handleDeleteAccount = () => {
    if (!deleteEmail.trim()) {
      alert("Merci d'entrer ton adresse email de connexion.");
      return;
    }
    const subject = encodeURIComponent("Demande de suppression de compte Gigglz");
    const body = encodeURIComponent(`Bonjour,

Je souhaite supprimer définitivement mon compte Gigglz et toutes les données associées.

Email du compte : ${deleteEmail}

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
    <div className="support-page">
      <div className="support-bg" />

      <header className="support-header">
        <button className="back-btn" onClick={() => router.back()}>
          <ArrowLeft size={22} />
        </button>
        <h1 className="header-title">Aide & Support</h1>
      </header>

      <main className="support-content">
        {/* Contact Card */}
        <section className="contact-card">
          <div className="contact-icon">
            <MessageCircle size={28} />
          </div>
          <h2>Besoin d'aide ?</h2>
          <p>Notre équipe est là pour t'aider. N'hésite pas à nous contacter pour toute question ou problème.</p>
          <button className="contact-btn" onClick={handleEmailContact}>
            <Mail size={18} />
            <span>Envoyer un email</span>
          </button>
          <p className="contact-email">contact@weareumain.com</p>
        </section>

        {/* FAQ Section */}
        <section className="faq-section">
          <h2 className="faq-title">
            <HelpCircle size={20} />
            Questions fréquentes
          </h2>
          <div className="faq-list">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className={`faq-item ${openFaq === index ? 'open' : ''}`}
              >
                <button
                  className="faq-question"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  <span>{faq.question}</span>
                  <ChevronDown size={18} className="faq-chevron" />
                </button>
                <div className="faq-answer">
                  <p>{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Delete Account Section */}
        <section className="delete-section">
          <h2 className="delete-title">
            <Trash2 size={20} />
            Supprimer mon compte
          </h2>
          <div className="delete-card">
            <div className="delete-warning">
              <AlertTriangle size={18} />
              <span>Cette action est irréversible</span>
            </div>
            <p className="delete-info">
              La suppression de ton compte entraînera l'effacement définitif de :
            </p>
            <ul className="delete-list">
              <li>Ton profil et tes informations personnelles</li>
              <li>Ton historique de parties et tes scores</li>
              <li>Ton abonnement Pro (si applicable)</li>
            </ul>
            <p className="delete-delay">
              Ta demande sera traitée sous 30 jours maximum.
            </p>
            <div className="delete-form">
              <label htmlFor="delete-email">Email de ton compte</label>
              <input
                id="delete-email"
                type="email"
                placeholder="ton@email.com"
                value={deleteEmail}
                onChange={(e) => setDeleteEmail(e.target.value)}
                className="delete-input"
              />
              <button className="delete-btn" onClick={handleDeleteAccount}>
                <Mail size={18} />
                <span>Demander la suppression</span>
              </button>
            </div>
          </div>
        </section>

        {/* Legal Links */}
        <section className="legal-links">
          <h2 className="legal-title">
            <FileText size={20} />
            Informations légales
          </h2>
          <div className="legal-buttons">
            <button onClick={() => router.push('/terms')} className="legal-btn">
              <FileText size={16} />
              <span>Conditions d'utilisation</span>
            </button>
            <button onClick={() => router.push('/privacy')} className="legal-btn">
              <Shield size={16} />
              <span>Politique de confidentialité</span>
            </button>
            <button onClick={() => router.push('/legal')} className="legal-btn">
              <FileText size={16} />
              <span>Mentions légales</span>
            </button>
          </div>
        </section>

        {/* App Info */}
        <div className="app-info">
          <p>Gigglz version {version}</p>
          <p>Développé par Agence UMAIN</p>
        </div>
      </main>

      <style jsx>{`
        .support-page {
          flex: 1; min-height: 0;
          background: #0a0a0f;
          position: relative;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        .support-bg {
          position: fixed;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(ellipse at 30% 20%, rgba(139, 92, 246, 0.1) 0%, transparent 50%);
          z-index: 0;
        }

        .support-header {
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
          border-bottom: 1px solid rgba(139, 92, 246, 0.2);
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
          background: rgba(139, 92, 246, 0.15);
          border-color: rgba(139, 92, 246, 0.3);
        }

        .header-title {
          font-family: 'Bungee', cursive;
          font-size: 1.25rem;
          font-weight: 400;
          color: white;
          margin: 0;
        }

        .support-content {
          position: relative;
          z-index: 1;
          max-width: 600px;
          margin: 0 auto;
          padding: 24px 20px 60px;
        }

        /* Contact Card */
        .contact-card {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 20px;
          padding: 28px 24px;
          text-align: center;
          margin-bottom: 32px;
        }

        .contact-icon {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          background: rgba(139, 92, 246, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          color: #a78bfa;
        }

        .contact-card h2 {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1.25rem;
          font-weight: 700;
          color: white;
          margin: 0 0 8px 0;
        }

        .contact-card > p {
          font-family: 'Inter', sans-serif;
          font-size: 0.9375rem;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.7);
          margin: 0 0 20px 0;
        }

        .contact-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 14px 28px;
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          border: none;
          border-radius: 12px;
          color: white;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .contact-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(139, 92, 246, 0.4);
        }

        .contact-btn:active {
          transform: translateY(0);
        }

        .contact-email {
          font-family: 'Inter', sans-serif;
          font-size: 0.8125rem;
          color: rgba(255, 255, 255, 0.5);
          margin: 16px 0 0 0;
        }

        /* FAQ Section */
        .faq-section {
          margin-bottom: 32px;
        }

        .faq-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1.125rem;
          font-weight: 700;
          color: white;
          margin: 0 0 16px 0;
        }

        .faq-title svg {
          color: #a78bfa;
        }

        .faq-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .faq-item {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.2s;
        }

        .faq-item:hover {
          border-color: rgba(139, 92, 246, 0.3);
        }

        .faq-item.open {
          border-color: rgba(139, 92, 246, 0.4);
          background: rgba(139, 92, 246, 0.05);
        }

        .faq-question {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 16px;
          background: none;
          border: none;
          color: white;
          font-family: 'Inter', sans-serif;
          font-size: 0.9375rem;
          font-weight: 500;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s;
        }

        .faq-chevron {
          flex-shrink: 0;
          color: rgba(255, 255, 255, 0.5);
          transition: transform 0.2s;
        }

        .faq-item.open .faq-chevron {
          transform: rotate(180deg);
          color: #a78bfa;
        }

        .faq-answer {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease;
        }

        .faq-item.open .faq-answer {
          max-height: 200px;
        }

        .faq-answer p {
          font-family: 'Inter', sans-serif;
          font-size: 0.875rem;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
          padding: 0 16px 16px;
        }

        /* Legal Links */
        .legal-links {
          margin-bottom: 32px;
        }

        .legal-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1.125rem;
          font-weight: 700;
          color: white;
          margin: 0 0 16px 0;
        }

        .legal-title svg {
          color: #a78bfa;
        }

        .legal-buttons {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .legal-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          color: rgba(255, 255, 255, 0.8);
          font-family: 'Inter', sans-serif;
          font-size: 0.9375rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .legal-btn:hover {
          background: rgba(139, 92, 246, 0.1);
          border-color: rgba(139, 92, 246, 0.3);
          color: white;
        }

        .legal-btn svg {
          color: rgba(255, 255, 255, 0.5);
        }

        /* Delete Account Section */
        .delete-section {
          margin-bottom: 32px;
        }

        .delete-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1.125rem;
          font-weight: 700;
          color: white;
          margin: 0 0 16px 0;
        }

        .delete-title svg {
          color: #ef4444;
        }

        .delete-card {
          background: rgba(239, 68, 68, 0.05);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 16px;
          padding: 20px;
        }

        .delete-warning {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(239, 68, 68, 0.15);
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 16px;
          color: #fca5a5;
          font-family: 'Inter', sans-serif;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .delete-warning svg {
          flex-shrink: 0;
        }

        .delete-info {
          font-family: 'Inter', sans-serif;
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.7);
          margin: 0 0 12px 0;
        }

        .delete-list {
          font-family: 'Inter', sans-serif;
          font-size: 0.8125rem;
          color: rgba(255, 255, 255, 0.6);
          margin: 0 0 12px 0;
          padding-left: 20px;
        }

        .delete-list li {
          margin-bottom: 4px;
        }

        .delete-delay {
          font-family: 'Inter', sans-serif;
          font-size: 0.8125rem;
          color: rgba(255, 255, 255, 0.5);
          margin: 0 0 20px 0;
          font-style: italic;
        }

        .delete-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .delete-form label {
          font-family: 'Inter', sans-serif;
          font-size: 0.875rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.8);
        }

        .delete-input {
          width: 100%;
          padding: 14px 16px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          color: white;
          font-family: 'Inter', sans-serif;
          font-size: 1rem;
          outline: none;
          transition: all 0.2s;
        }

        .delete-input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        .delete-input:focus {
          border-color: rgba(239, 68, 68, 0.5);
          background: rgba(0, 0, 0, 0.4);
        }

        .delete-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 14px 24px;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 10px;
          color: #fca5a5;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 4px;
        }

        .delete-btn:hover {
          background: rgba(239, 68, 68, 0.25);
          border-color: rgba(239, 68, 68, 0.5);
          color: #fecaca;
        }

        /* App Info */
        .app-info {
          text-align: center;
          padding-top: 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .app-info p {
          font-family: 'Inter', sans-serif;
          font-size: 0.8125rem;
          color: rgba(255, 255, 255, 0.4);
          margin: 0 0 4px 0;
        }
      `}</style>
    </div>
  );
}
