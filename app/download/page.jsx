'use client';

import { useEffect, useState } from 'react';
import { Apple, Play } from 'lucide-react';
import './download.css';

const IOS_STORE_URL = 'https://apps.apple.com/app/gigglz/id6758512562';
const ANDROID_STORE_URL = 'https://play.google.com/store/apps/details?id=com.gigglz.app';

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

  const handleDownload = (store) => {
    if (store === 'ios') {
      window.location.href = IOS_STORE_URL;
    } else {
      window.location.href = ANDROID_STORE_URL;
    }
  };

  // Auto-redirect on mobile after short delay
  useEffect(() => {
    if (platform === 'ios') {
      const timer = setTimeout(() => {
        window.location.href = IOS_STORE_URL;
      }, 2000);
      return () => clearTimeout(timer);
    } else if (platform === 'android') {
      const timer = setTimeout(() => {
        window.location.href = ANDROID_STORE_URL;
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [platform]);

  return (
    <div className="download-page">
      <div className="download-content">
        {/* Logo */}
        <div className="download-logo">
          <img src="/icons/icon-512.png" alt="Gigglz" className="app-icon" />
        </div>

        {/* Title */}
        <h1 className="download-title">Gigglz</h1>
        <p className="download-tagline">Le jeu de soirée ultime entre amis</p>

        {/* Redirect message on mobile */}
        {(platform === 'ios' || platform === 'android') && (
          <p className="download-redirect">
            Redirection vers le store...
          </p>
        )}

        {/* Store buttons */}
        <div className="download-buttons">
          {(platform === 'ios' || platform === 'desktop') && (
            <button
              className="store-button ios"
              onClick={() => handleDownload('ios')}
            >
              <Apple size={24} />
              <div className="store-button-text">
                <span className="store-label">Télécharger sur</span>
                <span className="store-name">App Store</span>
              </div>
            </button>
          )}

          {(platform === 'android' || platform === 'desktop') && (
            <button
              className="store-button android"
              onClick={() => handleDownload('android')}
            >
              <Play size={24} fill="currentColor" />
              <div className="store-button-text">
                <span className="store-label">Disponible sur</span>
                <span className="store-name">Google Play</span>
              </div>
            </button>
          )}
        </div>

        {/* Features */}
        <div className="download-features">
          <div className="feature">
            <span className="feature-emoji">🎯</span>
            <span>Quiz & Blind Test</span>
          </div>
          <div className="feature">
            <span className="feature-emoji">🎭</span>
            <span>Mime & Alibi</span>
          </div>
          <div className="feature">
            <span className="feature-emoji">👥</span>
            <span>Jusqu'à 20 joueurs</span>
          </div>
        </div>
      </div>
    </div>
  );
}
