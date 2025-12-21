'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { trackPaywallShown, trackPaywallConversion } from '@/lib/analytics';
import { auth } from '@/lib/firebase';

/**
 * Paywall Modal Component
 * Shows when a free user tries to access premium content
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {function} props.onClose - Close handler
 * @param {string} props.contentType - "quiz" | "alibi" | "mode"
 * @param {string} props.contentName - Name of locked content
 */
export default function PaywallModal({ isOpen, onClose, contentType = 'quiz', contentName = 'ce contenu' }) {
  const [pricingTier, setPricingTier] = useState('annual');

  // Track when paywall is shown
  useEffect(() => {
    if (isOpen && auth.currentUser) {
      trackPaywallShown(contentType, contentName, auth.currentUser.uid);
    }
  }, [isOpen, contentType, contentName]);

  if (!isOpen) return null;

  const benefits = [
    '✅ Accès à tous les quiz et alibis',
    '✅ Jeux illimités par jour',
    '✅ Créateur de quiz personnalisés',
    '✅ Statistiques avancées',
    '✅ Badges et cosmétiques exclusifs',
    '✅ Pas de publicités',
  ];

  const handleUpgrade = () => {
    // Track conversion attempt
    if (auth.currentUser) {
      trackPaywallConversion(contentType, auth.currentUser.uid, pricingTier);
    }

    // TODO: Integrate payment gateway (RevenueCat/Stripe)
    alert('Intégration paiement à venir ! (RevenueCat/Stripe)');
  };

  return (
    <>
      {/* Backdrop */}
      <div className="paywall-backdrop" onClick={onClose}></div>

      {/* Modal */}
      <div className="paywall-modal">
        {/* Close Button */}
        <button onClick={onClose} className="close-btn">
          <X size={24} />
        </button>

        {/* Icon */}
        <div className="icon-container">
          <div className="icon">🔒</div>
        </div>

        {/* Title */}
        <h2 className="title">Contenu Premium</h2>

        {/* Description */}
        <p className="description">
          {contentType === 'quiz' && `Le quiz "${contentName}" est réservé aux membres Pro.`}
          {contentType === 'alibi' && `L'alibi "${contentName}" est réservé aux membres Pro.`}
          {contentType === 'mode' && `Cette fonctionnalité est réservée aux membres Pro.`}
        </p>

        {/* Benefits List */}
        <div className="benefits-container">
          <h3 className="benefits-title">Avantages Pro :</h3>
          <ul className="benefits-list">
            {benefits.map((benefit, index) => (
              <li key={index} className="benefit-item">
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        {/* Pricing */}
        <div className="pricing-container">
          <div
            className={`pricing-option ${pricingTier === 'monthly' ? 'pricing-option-selected' : ''}`}
            onClick={() => setPricingTier('monthly')}
            style={{ cursor: 'pointer' }}
          >
            <div className="pricing-header">
              <span className="pricing-label">Mensuel</span>
              <span className="pricing-badge">-17%</span>
            </div>
            <div className="pricing-price">5,99€<span className="pricing-period">/mois</span></div>
          </div>
          <div
            className={`pricing-option pricing-option-best ${pricingTier === 'annual' ? 'pricing-option-selected' : ''}`}
            onClick={() => setPricingTier('annual')}
            style={{ cursor: 'pointer' }}
          >
            <div className="pricing-header">
              <span className="pricing-label">Annuel</span>
              <span className="pricing-badge pricing-badge-best">MEILLEUR PRIX</span>
            </div>
            <div className="pricing-price">49,99€<span className="pricing-period">/an</span></div>
            <p className="pricing-savings">4,17€/mois • Économise 22€</p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="buttons-container">
          <button onClick={handleUpgrade} className="btn-upgrade">
            Passer à Pro ⭐
          </button>
          <button onClick={onClose} className="btn-cancel">
            Peut-être plus tard
          </button>
        </div>

        {/* Footer */}
        <p className="footer-text">
          Résiliation à tout moment • Paiement sécurisé
        </p>
      </div>

      <style jsx>{`
        /* Backdrop */
        .paywall-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 9998;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Modal */
        .paywall-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          background: rgba(20, 20, 30, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 2px solid rgba(139, 92, 246, 0.3);
          border-radius: 20px;
          padding: 2rem;
          z-index: 9999;
          box-shadow:
            0 20px 60px rgba(0, 0, 0, 0.5),
            0 0 60px rgba(139, 92, 246, 0.15);
          animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translate(-50%, -40%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }

        /* Close Button */
        .close-btn {
          position: absolute;
          top: 1rem;
          right: 1rem;
          width: 40px;
          height: 40px;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          color: var(--text-secondary, rgba(255, 255, 255, 0.7));
        }

        .close-btn:hover {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.4);
          color: var(--danger, #ef4444);
          transform: scale(1.05);
        }

        /* Icon */
        .icon-container {
          text-align: center;
          margin-bottom: 1rem;
        }

        .icon {
          font-size: 4rem;
          display: inline-block;
          animation: bounce 2s ease-in-out infinite;
          filter: drop-shadow(0 0 20px rgba(139, 92, 246, 0.5));
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        /* Title */
        .title {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 2rem;
          font-weight: 400;
          text-align: center;
          color: var(--text-primary, #ffffff);
          margin-bottom: 0.75rem;
          text-shadow:
            0 0 10px rgba(139, 92, 246, 0.5),
            0 0 30px rgba(139, 92, 246, 0.3);
        }

        /* Description */
        .description {
          text-align: center;
          color: var(--text-secondary, rgba(255, 255, 255, 0.7));
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 1rem;
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }

        /* Benefits */
        .benefits-container {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .benefits-title {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary, #ffffff);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 1rem;
        }

        .benefits-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .benefit-item {
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 0.9375rem;
          color: var(--text-secondary, rgba(255, 255, 255, 0.7));
          margin-bottom: 0.75rem;
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
        }

        .benefit-item:last-child {
          margin-bottom: 0;
        }

        /* Pricing */
        .pricing-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .pricing-option {
          background: rgba(255, 255, 255, 0.03);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          padding: 1rem;
          text-align: center;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .pricing-option:hover {
          border-color: rgba(139, 92, 246, 0.4);
          transform: translateY(-2px);
        }

        .pricing-option-best {
          border-color: rgba(245, 158, 11, 0.4);
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.05));
          box-shadow: 0 0 30px rgba(245, 158, 11, 0.1);
        }

        .pricing-option-selected {
          border-color: var(--success, #22c55e) !important;
          box-shadow: 0 0 0 2px var(--success, #22c55e), 0 0 20px rgba(34, 197, 94, 0.3);
        }

        .pricing-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .pricing-label {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-weight: 700;
          font-size: 0.875rem;
          color: var(--text-primary, #ffffff);
        }

        .pricing-badge {
          background: var(--quiz-primary, #8b5cf6);
          color: white;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.625rem;
          font-weight: 700;
          padding: 0.25rem 0.5rem;
          border-radius: 10px;
          text-transform: uppercase;
        }

        .pricing-badge-best {
          background: linear-gradient(135deg, var(--alibi-primary, #f59e0b), #ea580c);
          box-shadow: 0 0 15px rgba(245, 158, 11, 0.4);
        }

        .pricing-price {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.75rem;
          font-weight: 400;
          color: var(--text-primary, #ffffff);
          margin-bottom: 0.25rem;
        }

        .pricing-period {
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-secondary, rgba(255, 255, 255, 0.7));
        }

        .pricing-savings {
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 0.75rem;
          color: var(--text-muted, rgba(255, 255, 255, 0.5));
          margin-top: 0.25rem;
        }

        /* Buttons */
        .buttons-container {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .btn-upgrade {
          width: 100%;
          padding: 1rem 1.5rem;
          background: linear-gradient(135deg, var(--alibi-primary, #f59e0b), #ea580c);
          color: white;
          border: none;
          border-radius: 12px;
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
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .btn-upgrade:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow:
            0 6px 20px rgba(245, 158, 11, 0.5),
            0 0 40px rgba(245, 158, 11, 0.3);
        }

        .btn-upgrade:active {
          transform: translateY(1px) scale(0.98);
        }

        .btn-cancel {
          width: 100%;
          padding: 0.875rem 1.5rem;
          background: transparent;
          color: var(--text-secondary, rgba(255, 255, 255, 0.7));
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-cancel:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.2);
        }

        /* Footer */
        .footer-text {
          text-align: center;
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 0.75rem;
          color: var(--text-muted, rgba(255, 255, 255, 0.5));
        }

        /* Mobile adjustments */
        @media (max-width: 640px) {
          .paywall-modal {
            padding: 1.5rem;
            max-height: 95vh;
          }

          .title {
            font-size: 1.5rem;
          }

          .pricing-container {
            grid-template-columns: 1fr;
          }

          .icon {
            font-size: 3rem;
          }
        }
      `}</style>
    </>
  );
}
