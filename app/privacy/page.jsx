'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div className="legal-page">
      <div className="legal-bg" />

      <header className="legal-header">
        <button className="back-btn" onClick={() => router.back()}>
          <ArrowLeft size={22} />
        </button>
        <h1 className="header-title">Confidentialite</h1>
      </header>

      <main className="legal-content">
        <p className="legal-intro">
          Agence UMAIN s'engage a proteger votre vie privee. Cette politique
          explique comment nous collectons, utilisons et protegeons vos donnees
          personnelles conformement au RGPD.
        </p>

        <section className="legal-section">
          <h2>1. Responsable du traitement</h2>
          <p>
            <strong>Agence UMAIN</strong><br />
            SIRET : 989 982 913 00018<br />
            Email : contact@weareumain.com
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Donnees collectees</h2>

          <h3>Donnees d'authentification</h3>
          <p>Lorsque vous creez un compte via Google ou Apple :</p>
          <ul>
            <li>Adresse email</li>
            <li>Nom d'affichage</li>
            <li>Photo de profil (si disponible)</li>
            <li>Identifiant unique (UID)</li>
          </ul>

          <h3>Donnees de jeu</h3>
          <ul>
            <li>Scores et statistiques de parties</li>
            <li>Historique des parties jouees</li>
            <li>Preferences de jeu</li>
          </ul>

          <h3>Donnees techniques</h3>
          <ul>
            <li>Adresse IP (pour la securite)</li>
            <li>Type d'appareil et navigateur</li>
            <li>Donnees de performance de l'application</li>
          </ul>

          <h3>Integration Spotify (optionnelle)</h3>
          <p>
            Si vous connectez Spotify pour le Blind Test, nous stockons
            temporairement vos tokens d'acces dans des cookies securises.
            Nous n'avons <strong>pas acces</strong> a vos playlists, historique
            d'ecoute ou autres donnees Spotify de facon permanente.
          </p>
        </section>

        <section className="legal-section">
          <h2>3. Finalites du traitement</h2>
          <p>Vos donnees sont utilisees pour :</p>
          <ul>
            <li>Creer et gerer votre compte utilisateur</li>
            <li>Fournir les fonctionnalites de jeu</li>
            <li>Sauvegarder vos scores et progressions</li>
            <li>Gerer les abonnements Pro</li>
            <li>Ameliorer l'application</li>
            <li>Assurer la securite et prevenir les abus</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>4. Base legale du traitement</h2>
          <ul>
            <li><strong>Execution du contrat</strong> : pour fournir les services de jeu</li>
            <li><strong>Interet legitime</strong> : pour ameliorer et securiser l'application</li>
            <li><strong>Consentement</strong> : pour l'integration Spotify et les cookies</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>5. Partage des donnees</h2>
          <p>Vos donnees peuvent etre partagees avec :</p>
          <ul>
            <li><strong>Firebase (Google)</strong> - Authentification et base de donnees</li>
            <li><strong>Vercel</strong> - Hebergement de l'application</li>
            <li><strong>RevenueCat</strong> - Gestion des abonnements</li>
            <li><strong>Spotify</strong> - Si vous utilisez le Blind Test</li>
          </ul>
          <p>
            Nous ne vendons jamais vos donnees personnelles a des tiers.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. Cookies</h2>
          <p>Nous utilisons des cookies pour :</p>
          <ul>
            <li><strong>Cookies essentiels</strong> : authentification, session utilisateur</li>
            <li><strong>Cookies Spotify</strong> : tokens d'acces securises (httpOnly)</li>
          </ul>
          <p>
            Vous pouvez gerer vos preferences de cookies dans les parametres
            de votre navigateur.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Duree de conservation</h2>
          <ul>
            <li><strong>Donnees de compte</strong> : tant que votre compte est actif</li>
            <li><strong>Donnees de jeu</strong> : tant que votre compte est actif</li>
            <li><strong>Tokens Spotify</strong> : 1 an maximum (renouveles automatiquement)</li>
            <li><strong>Logs de securite</strong> : 12 mois</li>
          </ul>
          <p>
            Apres suppression de votre compte, vos donnees sont effacees sous 30 jours.
          </p>
        </section>

        <section className="legal-section">
          <h2>8. Vos droits (RGPD)</h2>
          <p>Conformement au RGPD, vous disposez des droits suivants :</p>
          <ul>
            <li><strong>Acces</strong> : obtenir une copie de vos donnees</li>
            <li><strong>Rectification</strong> : corriger vos donnees inexactes</li>
            <li><strong>Effacement</strong> : demander la suppression de vos donnees</li>
            <li><strong>Limitation</strong> : limiter le traitement de vos donnees</li>
            <li><strong>Portabilite</strong> : recevoir vos donnees dans un format structure</li>
            <li><strong>Opposition</strong> : vous opposer au traitement</li>
          </ul>
          <p>
            Pour exercer ces droits, contactez-nous a : <a href="mailto:contact@weareumain.com">contact@weareumain.com</a>
          </p>
        </section>

        <section className="legal-section">
          <h2>9. Securite des donnees</h2>
          <p>Nous mettons en oeuvre des mesures de securite appropriees :</p>
          <ul>
            <li>Chiffrement des donnees en transit (HTTPS/TLS)</li>
            <li>Tokens stockes dans des cookies httpOnly securises</li>
            <li>Authentification via fournisseurs securises (Google, Apple)</li>
            <li>Limitation du taux de requetes (rate limiting)</li>
            <li>Regles de securite Firebase</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>10. Transferts internationaux</h2>
          <p>
            Certaines donnees peuvent etre transferees vers les Etats-Unis
            (Firebase, Vercel). Ces transferts sont encadres par les
            clauses contractuelles types de la Commission europeenne.
          </p>
        </section>

        <section className="legal-section">
          <h2>11. Mineurs</h2>
          <p>
            L'application est destinee aux personnes de 13 ans et plus.
            En utilisant l'application, vous confirmez avoir au moins 13 ans.
            Si vous etes un parent et pensez que votre enfant de moins de 13 ans
            nous a fourni des donnees personnelles, contactez-nous pour les supprimer.
          </p>
        </section>

        <section className="legal-section">
          <h2>12. Modifications</h2>
          <p>
            Nous pouvons mettre a jour cette politique de confidentialite.
            En cas de modification importante, nous vous en informerons
            via l'application ou par email.
          </p>
        </section>

        <section className="legal-section">
          <h2>13. Contact et reclamations</h2>
          <p>
            Pour toute question sur cette politique ou pour exercer vos droits :<br />
            <a href="mailto:contact@weareumain.com">contact@weareumain.com</a>
          </p>
          <p>
            Si vous estimez que vos droits ne sont pas respectes, vous pouvez
            deposer une reclamation aupres de la CNIL :<br />
            <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>
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
