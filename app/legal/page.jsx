'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function LegalPage() {
  const router = useRouter();

  return (
    <div className="legal-page">
      <div className="legal-bg" />

      <header className="legal-header">
        <button className="back-btn" onClick={() => router.back()}>
          <ArrowLeft size={22} />
        </button>
        <h1 className="header-title">Mentions Legales</h1>
      </header>

      <main className="legal-content">
        <section className="legal-section">
          <h2>Editeur de l'application</h2>
          <p>
            <strong>Agence UMAIN</strong><br />
            SIRET : 989 982 913 00018<br />
            Pierre-Levee, France<br />
            Email : contact@weareumain.com
          </p>
        </section>

        <section className="legal-section">
          <h2>Directeur de la publication</h2>
          <p>Agence UMAIN</p>
        </section>

        <section className="legal-section">
          <h2>Hebergement</h2>
          <p>
            <strong>Vercel Inc.</strong><br />
            440 N Barranca Ave #4133<br />
            Covina, CA 91723, USA<br />
            Site : vercel.com
          </p>
        </section>

        <section className="legal-section">
          <h2>Base de donnees</h2>
          <p>
            <strong>Google Firebase</strong><br />
            Google LLC<br />
            1600 Amphitheatre Parkway<br />
            Mountain View, CA 94043, USA
          </p>
        </section>

        <section className="legal-section">
          <h2>Propriete intellectuelle</h2>
          <p>
            L'ensemble du contenu de l'application Gigglz (textes, images, logos,
            elements graphiques, sons, logiciels) est la propriete exclusive
            d'Agence UMAIN ou de ses partenaires et est protege par les lois
            francaises et internationales relatives a la propriete intellectuelle.
          </p>
          <p>
            Toute reproduction, representation, modification ou exploitation
            non autorisee de tout ou partie du contenu est interdite.
          </p>
        </section>

        <section className="legal-section">
          <h2>Services tiers</h2>
          <p>L'application utilise les services suivants :</p>
          <ul>
            <li><strong>Spotify</strong> - Integration musicale pour le Blind Test (Spotify AB)</li>
            <li><strong>Firebase</strong> - Authentification et base de donnees (Google LLC)</li>
            <li><strong>RevenueCat</strong> - Gestion des abonnements in-app</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>Limitation de responsabilite</h2>
          <p>
            Agence UMAIN s'efforce de fournir des informations exactes et a jour,
            mais ne peut garantir l'exactitude, la completude ou l'actualite des
            informations diffusees sur l'application.
          </p>
          <p>
            L'utilisateur reconnait utiliser ces informations sous sa responsabilite
            exclusive.
          </p>
        </section>

        <section className="legal-section">
          <h2>Droit applicable</h2>
          <p>
            Les presentes mentions legales sont regies par le droit francais.
            En cas de litige, les tribunaux francais seront seuls competents.
          </p>
        </section>

        <section className="legal-section">
          <h2>Contact</h2>
          <p>
            Pour toute question concernant ces mentions legales, vous pouvez
            nous contacter a : <a href="mailto:contact@weareumain.com">contact@weareumain.com</a>
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
          margin: 0;
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
