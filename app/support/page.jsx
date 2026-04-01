'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail, MessageCircle, FileText, Shield, HelpCircle, ChevronDown, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { version } from '../../package.json';
import './support.css';

export default function SupportPage() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState(null);

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

        {/* Delete Account */}
        <section className="delete-section">
          <button onClick={() => router.push('/delete-account')} className="delete-btn">
            <Trash2 size={16} />
            <span>Supprimer mon compte</span>
          </button>
        </section>

        {/* App Info */}
        <div className="app-info">
          <p>Gigglz version {version}</p>
        </div>
      </main>


    </div>
  );
}
