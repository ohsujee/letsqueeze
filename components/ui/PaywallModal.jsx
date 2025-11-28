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
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
          z-index: 9998;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
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
          background: var(--bg-card);
          border: 3px solid var(--border-primary);
          border-radius: var(--radius-xl);
          padding: 2rem;
          z-index: 9999;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          animation: slideUp 0.3s ease;
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
          background: var(--bg-secondary);
          border: 2px solid var(--border-primary);
          border-radius: var(--radius-md);
          padding: 0.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
          color: var(--text-primary);
        }

        .close-btn:hover {
          background: var(--bg-tertiary);
          border-color: var(--brand-red);
        }

        /* Icon */
        .icon-container {
          text-align: center;
          margin-bottom: 1rem;
        }

        .icon {
          font-size: 4rem;
          display: inline-block;
          animation: bounce 1s ease infinite;
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        /* Title */
        .title {
          font-size: 2rem;
          font-weight: 900;
          text-align: center;
          color: var(--text-primary);
          margin-bottom: 0.75rem;
          background: linear-gradient(135deg, var(--brand-blue), var(--brand-purple));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* Description */
        .description {
          text-align: center;
          color: var(--text-secondary);
          font-size: 1rem;
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }

        /* Benefits */
        .benefits-container {
          background: var(--bg-secondary);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .benefits-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 1rem;
        }

        .benefits-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .benefit-item {
          font-size: 0.9375rem;
          color: var(--text-secondary);
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
          background: var(--bg-secondary);
          border: 3px solid var(--border-primary);
          border-radius: var(--radius-lg);
          padding: 1rem;
          text-align: center;
          transition: all 0.2s ease;
        }

        .pricing-option:hover {
          border-color: var(--brand-blue);
          transform: scale(1.02);
        }

        .pricing-option-best {
          border-color: var(--brand-yellow);
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 109, 0, 0.1));
        }

        .pricing-option-selected {
          border-color: var(--brand-green) !important;
          box-shadow: 0 0 0 2px var(--brand-green);
        }

        .pricing-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .pricing-label {
          font-weight: 700;
          font-size: 0.875rem;
          color: var(--text-primary);
        }

        .pricing-badge {
          background: var(--brand-blue);
          color: white;
          font-size: 0.625rem;
          font-weight: 700;
          padding: 0.25rem 0.5rem;
          border-radius: 10px;
        }

        .pricing-badge-best {
          background: linear-gradient(135deg, var(--brand-yellow), var(--brand-orange));
        }

        .pricing-price {
          font-size: 1.75rem;
          font-weight: 900;
          color: var(--text-primary);
          margin-bottom: 0.25rem;
        }

        .pricing-period {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .pricing-savings {
          font-size: 0.75rem;
          color: var(--text-tertiary);
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
          background: linear-gradient(135deg, var(--brand-yellow), var(--brand-orange));
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-weight: 900;
          font-size: 1.125rem;
          cursor: pointer;
          transition: transform 0.2s ease;
          box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);
        }

        .btn-upgrade:hover {
          transform: scale(1.05);
        }

        .btn-upgrade:active {
          transform: scale(0.95);
        }

        .btn-cancel {
          width: 100%;
          padding: 0.75rem 1.5rem;
          background: transparent;
          color: var(--text-secondary);
          border: 2px solid var(--border-primary);
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-cancel:hover {
          background: var(--bg-secondary);
          border-color: var(--text-tertiary);
        }

        /* Footer */
        .footer-text {
          text-align: center;
          font-size: 0.75rem;
          color: var(--text-tertiary);
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
