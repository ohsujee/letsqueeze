'use client';

import { useEffect, useState } from 'react';
import './download.css';

const IOS_STORE_URL = 'https://apps.apple.com/app/gigglz/id6758512562';
const ANDROID_STORE_URL = 'https://play.google.com/store/apps/details?id=com.gigglz.app';

const GAMES = [
  {
    img: '/images/optimized/quiz-buzzer.webp',
    name: 'Quiz Buzzer',
    desc: 'Buzzez plus vite que vos amis pour marquer des points',
    color: '#8b5cf6',
  },
  {
    img: '/images/optimized/blind-test.webp',
    name: 'Blind Test',
    desc: 'Devinez les chansons avant tout le monde',
    color: '#A238FF',
  },
  {
    img: '/images/optimized/alibi.webp',
    name: 'Alibi',
    desc: 'Menez l\'enquête et démasquez les suspects',
    color: '#f59e0b',
  },
  {
    img: '/images/optimized/mime-game.webp',
    name: 'Mime',
    desc: 'Faites deviner sans prononcer un seul mot',
    color: '#00ff66',
  },
];

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" className="dl-store-icon" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" className="dl-store-icon" fill="currentColor">
    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
  </svg>
);

function StoreButton({ store, platform }) {
  const isIos = store === 'ios';
  const url = isIos ? IOS_STORE_URL : ANDROID_STORE_URL;

  // On mobile, only show the relevant store
  if (platform === 'ios' && !isIos) return null;
  if (platform === 'android' && isIos) return null;

  return (
    <a href={url} className={`dl-store-btn ${isIos ? 'ios' : 'android'}`}>
      {isIos ? <AppleIcon /> : <PlayIcon />}
      <div className="dl-store-btn-text">
        <span className="dl-store-label">{isIos ? 'Télécharger sur' : 'Disponible sur'}</span>
        <span className="dl-store-name">{isIos ? 'App Store' : 'Google Play'}</span>
      </div>
    </a>
  );
}

export default function DownloadPage() {
  const [platform, setPlatform] = useState(null);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setPlatform('ios');
    } else if (/android/.test(ua)) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }
  }, []);

  return (
    <div className="dl-page">
      {/* Background */}
      <div className="dl-bg">
        <div className="dl-bg-glow glow-1" />
        <div className="dl-bg-glow glow-2" />
        <div className="dl-bg-glow glow-3" />
        <div className="dl-bg-grid" />
      </div>

      {/* Hero */}
      <section className="dl-hero">
        <div className="dl-hero-content">
          <div className="dl-hero-text">
            <div className="dl-mascot">
              <img
                src="/images/mascot/giggly-excited.webp"
                alt="Giggly la mascotte Gigglz"
                className="dl-mascot-img"
                width={140}
                height={140}
              />
            </div>
            <h1 className="dl-title">GIGGLZ</h1>
            <p className="dl-tagline">Transforme tes soirées en fous rires</p>
            <p className="dl-subtitle">L'app de jeux de soirée entre amis. Disponible uniquement sur mobile.</p>

            <div className="dl-hero-cta">
              <StoreButton store="ios" platform={platform} />
              <StoreButton store="android" platform={platform} />
            </div>

            <div className="dl-hero-badges">
              <span className="dl-badge">Gratuit</span>
              <span className="dl-badge">Sans inscription</span>
              <span className="dl-badge">2-20 joueurs</span>
            </div>
          </div>
        </div>
      </section>

      {/* Games showcase */}
      <section className="dl-section">
        <div className="dl-section-inner">
          <h2 className="dl-section-title">Des jeux pour tous les styles de soirée</h2>
          <p className="dl-section-subtitle">Et de nouveaux jeux ajoutés régulièrement</p>

          <div className="dl-games-grid">
            {GAMES.map((game) => (
              <div key={game.name} className="dl-game-card" style={{ '--game-color': game.color }}>
                <div className="dl-game-img-wrapper">
                  <img src={game.img} alt={game.name} className="dl-game-img" loading="lazy" />
                </div>
                <div className="dl-game-info">
                  <h3 className="dl-game-name">{game.name}</h3>
                  <p className="dl-game-desc">{game.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="dl-section">
        <div className="dl-section-inner">
          <h2 className="dl-section-title">Pourquoi Gigglz ?</h2>
          <div className="dl-features">
            <div className="dl-feature">
              <div className="dl-feature-icon">🎮</div>
              <h3 className="dl-feature-title">Prêt en 10 secondes</h3>
              <p className="dl-feature-desc">Crée une partie, partage le code, jouez. Pas de compte requis.</p>
            </div>
            <div className="dl-feature">
              <div className="dl-feature-icon">👥</div>
              <h3 className="dl-feature-title">2 à 20 joueurs</h3>
              <p className="dl-feature-desc">En petit comité ou en grande soirée, tout le monde peut jouer.</p>
            </div>
            <div className="dl-feature">
              <div className="dl-feature-icon">🆕</div>
              <h3 className="dl-feature-title">Toujours plus de jeux</h3>
              <p className="dl-feature-desc">De nouveaux jeux et contenus ajoutés régulièrement.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="dl-section dl-bottom-cta">
        <div className="dl-section-inner">
          <img
            src="/images/mascot/giggly-determined.webp"
            alt="Giggly"
            className="dl-bottom-mascot"
            width={100}
            height={100}
            loading="lazy"
          />
          <h2 className="dl-bottom-title">Prêt à jouer ?</h2>
          <p className="dl-bottom-subtitle">Télécharge Gigglz et lance ta première partie en quelques secondes.</p>
          <div className="dl-hero-cta">
            <StoreButton store="ios" platform={platform} />
            <StoreButton store="android" platform={platform} />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="dl-footer">
        <div className="dl-footer-links">
          <a href="/legal">Mentions légales</a>
          <a href="/privacy">Confidentialité</a>
          <a href="/terms">CGU</a>
          <a href="/support">Support</a>
        </div>
        <p className="dl-footer-copy">&copy; {new Date().getFullYear()} Gigglz. Tous droits réservés.</p>
      </footer>
    </div>
  );
}
