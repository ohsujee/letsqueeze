'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  const router = useRouter();

  return (
    <div className="legal-page">
      <div className="legal-bg" />

      <header className="legal-header">
        <button className="back-btn" onClick={() => router.back()}>
          <ArrowLeft size={22} />
        </button>
        <h1 className="header-title">CGU</h1>
      </header>

      <main className="legal-content">
        <p className="legal-intro">
          En utilisant l'application Gigglz, vous acceptez les presentes
          Conditions Generales d'Utilisation. Veuillez les lire attentivement.
        </p>

        <section className="legal-section">
          <h2>1. Presentation du service</h2>
          <p>
            Gigglz est une application de jeux de societe multijoueur editee
            par Agence UMAIN. L'application propose plusieurs modes de jeu
            incluant des quiz, le jeu Alibi, le Blind Test musical et le jeu Mime.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Conditions d'acces</h2>
          <h3>Age minimum</h3>
          <p>
            L'application est destinee aux personnes agees de <strong>13 ans et plus</strong>.
            En creant un compte ou en utilisant l'application, vous confirmez avoir
            au moins 13 ans.
          </p>

          <h3>Inscription</h3>
          <p>
            L'acces a certaines fonctionnalites necessite la creation d'un compte
            via Google ou Apple. Vous etes responsable de la confidentialite de
            vos identifiants de connexion.
          </p>

          <h3>Mode invite</h3>
          <p>
            Vous pouvez utiliser l'application en mode invite (sans compte).
            Certaines fonctionnalites seront limitees dans ce mode.
          </p>
        </section>

        <section className="legal-section">
          <h2>3. Offre gratuite et Pro</h2>
          <h3>Version gratuite</h3>
          <p>La version gratuite inclut :</p>
          <ul>
            <li>Acces a un nombre limite de packs de quiz et scenarios</li>
            <li>3 parties par jour par mode de jeu</li>
            <li>Affichage de publicites</li>
          </ul>

          <h3>Abonnement Pro</h3>
          <p>L'abonnement Gigglz Pro offre :</p>
          <ul>
            <li>Acces illimite a tous les contenus</li>
            <li>Parties illimitees</li>
            <li>Suppression des publicites</li>
            <li>Statistiques avancees</li>
            <li>Cosmetiques exclusifs</li>
          </ul>

          <h3>Tarifs et facturation</h3>
          <ul>
            <li>Abonnement mensuel : 3,99 EUR/mois</li>
            <li>Abonnement annuel : 29,99 EUR/an</li>
          </ul>
          <p>
            Les paiements sont geres par l'App Store (Apple) ou le Play Store (Google)
            selon votre appareil. Les prix peuvent varier selon votre pays.
          </p>

          <h3>Renouvellement et resiliation</h3>
          <p>
            Les abonnements se renouvellent automatiquement sauf resiliation
            au moins 24 heures avant la fin de la periode en cours.
            Vous pouvez gerer votre abonnement dans les parametres de votre
            compte App Store ou Play Store.
          </p>
        </section>

        <section className="legal-section">
          <h2>4. Regles d'utilisation</h2>
          <p>En utilisant Gigglz, vous vous engagez a :</p>
          <ul>
            <li>Utiliser l'application de maniere loyale et respectueuse</li>
            <li>Ne pas tricher ou utiliser de logiciels tiers pour obtenir un avantage</li>
            <li>Ne pas usurper l'identite d'autrui</li>
            <li>Ne pas diffuser de contenu illegal, offensant ou inapproprie</li>
            <li>Ne pas tenter de pirater ou perturber le fonctionnement du service</li>
            <li>Respecter les autres joueurs</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>5. Integration Spotify</h2>
          <p>
            Le mode Blind Test utilise l'API Spotify. Pour utiliser cette
            fonctionnalite :
          </p>
          <ul>
            <li>Vous devez disposer d'un compte Spotify</li>
            <li>Un abonnement Spotify Premium est requis pour la lecture musicale</li>
            <li>Vous autorisez l'application a acceder a votre lecteur Spotify</li>
          </ul>
          <p>
            L'utilisation de Spotify est soumise aux conditions d'utilisation
            de Spotify AB.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. Propriete intellectuelle</h2>
          <p>
            Tous les elements de l'application (design, code, textes, images,
            sons, logos) sont la propriete d'Agence UMAIN ou de ses partenaires
            et sont proteges par le droit de la propriete intellectuelle.
          </p>
          <p>
            Vous beneficiez d'une licence limitee, non exclusive et revocable
            pour utiliser l'application a des fins personnelles et non commerciales.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Contenu utilisateur</h2>
          <p>
            Si vous creez du contenu dans l'application (pseudonyme, avatar),
            vous garantissez que ce contenu ne viole pas les droits de tiers
            et n'est pas contraire a la loi ou aux bonnes moeurs.
          </p>
          <p>
            Nous nous reservons le droit de supprimer tout contenu inapproprie
            sans preavis.
          </p>
        </section>

        <section className="legal-section">
          <h2>8. Disponibilite du service</h2>
          <p>
            Nous nous efforcons d'assurer la disponibilite de l'application
            24h/24 et 7j/7. Cependant, nous ne pouvons garantir une disponibilite
            ininterrompue. Le service peut etre suspendu pour maintenance
            ou mise a jour.
          </p>
        </section>

        <section className="legal-section">
          <h2>9. Limitation de responsabilite</h2>
          <p>
            L'application est fournie "en l'etat". Agence UMAIN ne saurait
            etre tenue responsable :
          </p>
          <ul>
            <li>Des interruptions temporaires du service</li>
            <li>De la perte de donnees due a des circonstances exceptionnelles</li>
            <li>Des dommages indirects lies a l'utilisation de l'application</li>
            <li>Du contenu des services tiers (Spotify, etc.)</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>10. Suspension et resiliation</h2>
          <p>
            Nous nous reservons le droit de suspendre ou supprimer votre compte
            en cas de violation des presentes CGU, sans preavis ni indemnite.
          </p>
          <p>
            Vous pouvez a tout moment supprimer votre compte en nous contactant
            a contact@weareumain.com.
          </p>
        </section>

        <section className="legal-section">
          <h2>11. Modifications des CGU</h2>
          <p>
            Nous pouvons modifier ces CGU a tout moment. Les modifications
            entrent en vigueur des leur publication dans l'application.
            En continuant a utiliser l'application apres une modification,
            vous acceptez les nouvelles conditions.
          </p>
        </section>

        <section className="legal-section">
          <h2>12. Droit applicable et litiges</h2>
          <p>
            Les presentes CGU sont regies par le droit francais.
            En cas de litige, une solution amiable sera recherchee avant
            toute action judiciaire. A defaut, les tribunaux francais
            seront competents.
          </p>
        </section>

        <section className="legal-section">
          <h2>13. Contact</h2>
          <p>
            Pour toute question concernant ces CGU :<br />
            <a href="mailto:contact@weareumain.com">contact@weareumain.com</a>
          </p>
        </section>

        <p className="legal-update">Derniere mise a jour : Janvier 2025</p>
      </main>

      <style jsx>{`
        .legal-page {
          min-height: 100dvh;
          background: #0a0a0f;
          position: relative;
        }

        .legal-bg {
          position: fixed;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(ellipse at 30% 20%, rgba(139, 92, 246, 0.1) 0%, transparent 50%);
          z-index: 0;
        }

        .legal-header {
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

        .legal-content {
          position: relative;
          z-index: 1;
          max-width: 600px;
          margin: 0 auto;
          padding: 24px 20px 60px;
        }

        .legal-intro {
          font-family: 'Inter', sans-serif;
          font-size: 1rem;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.7);
          margin: 0 0 32px 0;
          padding: 16px;
          background: rgba(139, 92, 246, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 12px;
        }

        .legal-section {
          margin-bottom: 32px;
        }

        .legal-section h2 {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1.125rem;
          font-weight: 700;
          color: #a78bfa;
          margin: 0 0 12px 0;
        }

        .legal-section h3 {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.9375rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          margin: 16px 0 8px 0;
        }

        .legal-section p {
          font-family: 'Inter', sans-serif;
          font-size: 0.9375rem;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.8);
          margin: 0 0 12px 0;
        }

        .legal-section ul {
          font-family: 'Inter', sans-serif;
          font-size: 0.9375rem;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.8);
          margin: 0 0 12px 0;
          padding-left: 20px;
        }

        .legal-section li {
          margin-bottom: 8px;
        }

        .legal-section a {
          color: #a78bfa;
          text-decoration: none;
        }

        .legal-section a:hover {
          text-decoration: underline;
        }

        .legal-update {
          font-family: 'Inter', sans-serif;
          font-size: 0.8125rem;
          color: rgba(255, 255, 255, 0.4);
          text-align: center;
          margin-top: 40px;
        }
      `}</style>
    </div>
  );
}
