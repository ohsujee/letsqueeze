'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { PRO_PRICING } from '@/lib/subscription';
import {
  initRevenueCat,
  purchaseSubscription,
  restorePurchases,
  openManageSubscriptions
} from '@/lib/revenuecat';
import { Capacitor } from '@capacitor/core';
import {
  ArrowLeft,
  Crown,
  Check,
  X,
  Zap,
  Infinity,
  Ban,
  Package,
  BarChart3,
  RotateCcw,
  AlertTriangle,
  Shield
} from 'lucide-react';
import { useAuthProtect } from '@/lib/hooks/useAuthProtect';
import LoadingScreen from '@/components/ui/LoadingScreen';

export default function SubscribePage() {
  const router = useRouter();
  const { user, loading } = useAuthProtect({ allowGuests: true });
  const [selectedPlan, setSelectedPlan] = useState('annual');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isNative, setIsNative] = useState(false);
  const { isPro } = useSubscription(user);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
    if (user?.uid) {
      initRevenueCat(user.uid);
    }
  }, [user]);

  const handleSubscribe = async () => {
    setErrorMessage('');
    setIsProcessing(true);

    if (!isNative) {
      setIsProcessing(false);
      setErrorMessage('Les achats sont disponibles uniquement dans l\'application mobile.');
      return;
    }

    const packageType = selectedPlan;
    const result = await purchaseSubscription(packageType);

    setIsProcessing(false);

    if (result.success) {
      router.refresh();
    } else if (result.error === 'cancelled') {
      // User cancelled - do nothing
    } else {
      setErrorMessage(result.error || 'Une erreur est survenue');
    }
  };

  const handleRestore = async () => {
    setErrorMessage('');
    setIsRestoring(true);

    const result = await restorePurchases();

    setIsRestoring(false);

    if (result.success && result.isPro) {
      router.refresh();
    } else if (result.success && !result.isPro) {
      setErrorMessage('Aucun abonnement actif trouvé');
    } else {
      setErrorMessage(result.error || 'Erreur lors de la restauration');
    }
  };

  const handleManageSubscription = () => {
    openManageSubscriptions();
  };

  if (loading) {
    return <LoadingScreen game="quiz" />;
  }

  // Already Pro - show management
  if (isPro) {
    return (
      <div className="subscribe-page">
        <div className="subscribe-bg" />

        <header className="subscribe-header">
          <button className="back-btn" onClick={() => router.back()}>
            <ArrowLeft size={22} />
          </button>
          <h1 className="header-title">Abonnement</h1>
        </header>

        <main className="subscribe-content">
          <motion.div
            className="pro-active-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="pro-active-icon">
              <Crown size={32} />
            </div>
            <h2 className="pro-active-title">Tu es Pro !</h2>
            <p className="pro-active-desc">
              Tu profites de tous les avantages Gigglz Pro.
            </p>

            <div className="pro-benefits-list">
              <div className="pro-benefit-row">
                <Infinity size={18} />
                <span>Parties illimitées</span>
              </div>
              <div className="pro-benefit-row">
                <Package size={18} />
                <span>Tous les contenus</span>
              </div>
              <div className="pro-benefit-row">
                <Ban size={18} />
                <span>Aucune publicité</span>
              </div>
            </div>

            <button
              className="btn-manage"
              onClick={handleManageSubscription}
            >
              Gérer mon abonnement
            </button>
          </motion.div>
        </main>

        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="subscribe-page">
      <div className="subscribe-bg" />
      <div className="subscribe-glow" />

      {/* Header */}
      <header className="subscribe-header">
        <button className="back-btn" onClick={() => router.back()}>
          <ArrowLeft size={22} />
        </button>
        <h1 className="header-title">Passer Pro</h1>
      </header>

      <main className="subscribe-content">
        {/* Hero Section - Emotional */}
        <motion.section
          className="hero-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="hero-crown">
            <Crown size={40} />
          </div>
          <h2 className="hero-title">Libère tout le fun</h2>
          <p className="hero-subtitle">
            Plus de limites. Plus de pubs.
            <br />
            <span className="hero-emphasis">Juste du jeu.</span>
          </p>
        </motion.section>

        {/* Loss Aversion - Limitations */}
        <motion.section
          className="limitations-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <h3 className="limitations-title">
            <AlertTriangle size={16} />
            Tes limitations en Free
          </h3>
          <div className="limitations-list">
            <div className="limitation-item">
              <X size={16} className="limitation-icon" />
              <span>Contenu supplémentaire bloqué</span>
            </div>
            <div className="limitation-item">
              <X size={16} className="limitation-icon" />
              <span>Publicités entre chaque partie</span>
            </div>
            <div className="limitation-item">
              <X size={16} className="limitation-icon" />
              <span>3 parties gratuites/jour par jeu</span>
            </div>
            <div className="limitation-item">
              <X size={16} className="limitation-icon" />
              <span>Pubs non-skippables pour jouer plus</span>
            </div>
          </div>
        </motion.section>

        {/* Pricing Cards */}
        <motion.section
          className="pricing-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          {/* Annual Plan - Recommended */}
          <button
            className={`plan-card plan-card-annual ${selectedPlan === 'annual' ? 'selected' : ''}`}
            onClick={() => setSelectedPlan('annual')}
          >
            <div className="plan-recommended">Recommandé</div>
            <div className="plan-badge">6 mois offerts</div>

            <div className="plan-main">
              <span className="plan-name">{PRO_PRICING.annual.label}</span>
              <div className="plan-price-row">
                <span className="plan-price-amount">{PRO_PRICING.annual.price.toFixed(2).replace('.', ',')}€</span>
                <span className="plan-price-period">/an</span>
              </div>
              <span className="plan-price-detail">
                Soit {PRO_PRICING.annual.monthlyEquivalent.toFixed(2).replace('.', ',')}€/mois
              </span>
            </div>

            <div className="plan-value">
              <span>Le prix d'un café ☕</span>
            </div>

            <div className="plan-check">
              {selectedPlan === 'annual' ? <Check size={20} /> : null}
            </div>
          </button>

          {/* Monthly Plan */}
          <button
            className={`plan-card ${selectedPlan === 'monthly' ? 'selected' : ''}`}
            onClick={() => setSelectedPlan('monthly')}
          >
            <div className="plan-main">
              <span className="plan-name">{PRO_PRICING.monthly.label}</span>
              <div className="plan-price-row">
                <span className="plan-price-amount">{PRO_PRICING.monthly.price.toFixed(2).replace('.', ',')}€</span>
                <span className="plan-price-period">/mois</span>
              </div>
              <span className="plan-price-detail">Sans engagement</span>
            </div>

            <div className="plan-check">
              {selectedPlan === 'monthly' ? <Check size={20} /> : null}
            </div>
          </button>
        </motion.section>

        {/* Trust Signals */}
        <motion.section
          className="trust-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <div className="trust-item">
            <Shield size={14} />
            <span>Paiement sécurisé</span>
          </div>
          <div className="trust-divider" />
          <div className="trust-item">
            <Check size={14} />
            <span>Annule quand tu veux</span>
          </div>
        </motion.section>

        {/* CTA Button */}
        <motion.section
          className="cta-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <button
            className="cta-button"
            onClick={handleSubscribe}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <div className="cta-spinner" />
            ) : (
              <>
                <Zap size={20} />
                <span>Jouer sans limites</span>
              </>
            )}
          </button>

          {errorMessage && (
            <p className="error-message">{errorMessage}</p>
          )}

          {isNative && (
            <button
              className="restore-btn"
              onClick={handleRestore}
              disabled={isRestoring}
            >
              {isRestoring ? (
                <div className="restore-spinner" />
              ) : (
                <>
                  <RotateCcw size={16} />
                  <span>Restaurer mes achats</span>
                </>
              )}
            </button>
          )}
        </motion.section>

        {/* What you get - Benefits */}
        <motion.section
          className="benefits-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
        >
          <h3 className="benefits-title">Tout ce que tu débloques</h3>
          <div className="benefits-list">
            <div className="benefit-row">
              <div className="benefit-icon"><Package size={18} /></div>
              <div className="benefit-text">
                <span className="benefit-label">Tout le contenu de tous les jeux</span>
                <span className="benefit-desc">Accès complet actuel et à venir</span>
              </div>
            </div>
            <div className="benefit-row">
              <div className="benefit-icon"><Infinity size={18} /></div>
              <div className="benefit-text">
                <span className="benefit-label">Parties illimitées</span>
                <span className="benefit-desc">Joue autant que tu veux, chaque jour</span>
              </div>
            </div>
            <div className="benefit-row">
              <div className="benefit-icon"><Ban size={18} /></div>
              <div className="benefit-text">
                <span className="benefit-label">Zéro publicité</span>
                <span className="benefit-desc">Expérience fluide et sans interruption</span>
              </div>
            </div>
            <div className="benefit-row">
              <div className="benefit-icon"><BarChart3 size={18} /></div>
              <div className="benefit-text">
                <span className="benefit-label">Stats avancées</span>
                <span className="benefit-desc">Analyse tes performances en détail</span>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Legal Links (Required by Apple for subscriptions) */}
        <motion.section
          className="legal-links-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <div className="legal-links">
            <a href="/terms" className="legal-link">
              Conditions d'utilisation (CGU)
            </a>
            <span className="legal-divider">•</span>
            <a href="/privacy" className="legal-link">
              Politique de confidentialité
            </a>
          </div>
        </motion.section>

        {/* Solo Dev Note */}
        <motion.section
          className="solo-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
        >
          <p>
            Gigglz est développé avec passion par un seul dev en France.
            <br />
            Ton soutien compte vraiment. Merci !
          </p>
        </motion.section>

        <div className="bottom-padding" />
      </main>

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
  .subscribe-page {
    flex: 1; min-height: 0;
    background: #0a0a0f;
    position: relative;
    overflow-x: hidden;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .subscribe-bg {
    position: fixed;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(ellipse at 30% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
      radial-gradient(ellipse at 70% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 50%);
    z-index: 0;
  }

  .subscribe-glow {
    position: fixed;
    top: -100px;
    left: 50%;
    transform: translateX(-50%);
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
    animation: pulse 4s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.5; transform: translateX(-50%) scale(1); }
    50% { opacity: 1; transform: translateX(-50%) scale(1.1); }
  }

  /* Header */
  .subscribe-header {
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
    text-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
  }

  /* Content */
  .subscribe-content {
    position: relative;
    z-index: 1;
    max-width: 500px;
    margin: 0 auto;
    padding: 24px 20px;
  }

  /* Hero */
  .hero-section {
    text-align: center;
    margin-bottom: 28px;
  }

  .hero-crown {
    position: relative;
    width: 80px;
    height: 80px;
    margin: 0 auto 16px;
    border-radius: 24px;
    background: linear-gradient(135deg, #8b5cf6, #7c3aed);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    box-shadow:
      0 4px 0 #6d28d9,
      0 8px 30px rgba(139, 92, 246, 0.5),
      inset 0 2px 0 rgba(255, 255, 255, 0.2);
  }

  .hero-title {
    font-family: 'Bungee', cursive;
    font-size: 1.75rem;
    font-weight: 400;
    color: white;
    margin: 0 0 8px 0;
    text-shadow: 0 0 30px rgba(139, 92, 246, 0.5);
  }

  .hero-subtitle {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1rem;
    color: rgba(255, 255, 255, 0.6);
    margin: 0;
    line-height: 1.5;
  }

  .hero-emphasis {
    color: white;
    font-weight: 600;
  }

  /* Limitations Section */
  .limitations-section {
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 16px;
    padding: 16px;
    margin-bottom: 24px;
  }

  .limitations-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.8125rem;
    font-weight: 600;
    color: #f87171;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 12px 0;
  }

  .limitations-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .limitation-item {
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: 'Inter', sans-serif;
    font-size: 0.8125rem;
    color: rgba(255, 255, 255, 0.7);
  }

  .limitation-icon {
    color: #ef4444;
    flex-shrink: 0;
  }

  /* Pricing */
  .pricing-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 16px;
  }

  .plan-card {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px;
    background: rgba(255, 255, 255, 0.03);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    width: 100%;
  }

  .plan-card:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(139, 92, 246, 0.3);
  }

  .plan-card.selected {
    background: rgba(139, 92, 246, 0.1);
    border-color: #8b5cf6;
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.2);
  }

  .plan-card-annual {
    padding-top: 32px;
  }

  .plan-recommended {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    padding: 6px;
    background: linear-gradient(135deg, #8b5cf6, #7c3aed);
    color: white;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.6875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    text-align: center;
    border-radius: 14px 14px 0 0;
  }

  .plan-badge {
    position: absolute;
    top: 32px;
    right: 16px;
    padding: 4px 10px;
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    color: #1a1a2e;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.625rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    border-radius: 999px;
    box-shadow: 0 2px 8px rgba(251, 191, 36, 0.4);
  }

  .plan-main {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .plan-name {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.75rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .plan-price-row {
    display: flex;
    align-items: baseline;
    gap: 2px;
  }

  .plan-price-equivalent,
  .plan-price-amount {
    font-family: 'Bungee', cursive;
    font-size: 1.75rem;
    color: white;
  }

  .plan-price-period {
    font-family: 'Inter', sans-serif;
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .plan-price-detail {
    font-family: 'Inter', sans-serif;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.4);
  }

  .plan-value {
    position: absolute;
    bottom: 16px;
    right: 50px;
    font-family: 'Inter', sans-serif;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .plan-check {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: transparent;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .plan-card.selected .plan-check {
    background: #8b5cf6;
    border-color: #8b5cf6;
    color: white;
  }

  /* Trust Section */
  .trust-section {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 12px 0;
    margin-bottom: 16px;
  }

  .trust-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: 'Inter', sans-serif;
    font-size: 0.6875rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .trust-item svg {
    color: rgba(139, 92, 246, 0.7);
  }

  .trust-divider {
    width: 1px;
    height: 12px;
    background: rgba(255, 255, 255, 0.1);
  }

  /* CTA */
  .cta-section {
    margin-bottom: 32px;
  }

  .cta-button {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 18px;
    background: linear-gradient(135deg, #8b5cf6, #7c3aed);
    color: white;
    border: none;
    border-radius: 14px;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.0625rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow:
      0 4px 0 #6d28d9,
      0 8px 24px rgba(139, 92, 246, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  .cta-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow:
      0 6px 0 #6d28d9,
      0 12px 32px rgba(139, 92, 246, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  .cta-button:active:not(:disabled) {
    transform: translateY(2px);
    box-shadow:
      0 2px 0 #6d28d9,
      0 4px 12px rgba(139, 92, 246, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  .cta-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .cta-spinner {
    width: 24px;
    height: 24px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-message {
    text-align: center;
    font-family: 'Inter', sans-serif;
    font-size: 0.875rem;
    color: #ef4444;
    margin-top: 12px;
    padding: 12px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 8px;
  }

  .restore-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 14px;
    margin-top: 12px;
    background: transparent;
    color: rgba(255, 255, 255, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    font-family: 'Inter', sans-serif;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .restore-btn:hover:not(:disabled) {
    color: rgba(255, 255, 255, 0.7);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .restore-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .restore-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-top-color: rgba(255, 255, 255, 0.6);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  /* Benefits Section */
  .benefits-section {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 16px;
    padding: 20px;
    margin-bottom: 20px;
  }

  .benefits-title {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.875rem;
    font-weight: 700;
    color: white;
    margin: 0 0 16px 0;
    text-align: center;
  }

  .benefits-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .benefit-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .benefit-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: rgba(139, 92, 246, 0.15);
    border: 1px solid rgba(139, 92, 246, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #a78bfa;
    flex-shrink: 0;
  }

  .benefit-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-top: 2px;
  }

  .benefit-label {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.875rem;
    font-weight: 600;
    color: white;
  }

  .benefit-desc {
    font-family: 'Inter', sans-serif;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
  }

  /* Legal Links Section */
  .legal-links-section {
    text-align: center;
    padding: 20px 16px;
    margin-bottom: 16px;
  }

  .legal-links {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .legal-link {
    font-family: 'Inter', sans-serif;
    font-size: 0.8125rem;
    color: #a78bfa;
    text-decoration: none;
    transition: color 0.2s ease;
  }

  .legal-link:hover {
    color: #8b5cf6;
    text-decoration: underline;
  }

  .legal-divider {
    font-family: 'Inter', sans-serif;
    font-size: 0.8125rem;
    color: rgba(255, 255, 255, 0.3);
  }

  /* Solo Dev Section */
  .solo-section {
    text-align: center;
    padding: 16px;
    margin-bottom: 20px;
  }

  .solo-section p {
    font-family: 'Inter', sans-serif;
    font-size: 0.8125rem;
    color: rgba(255, 255, 255, 0.4);
    margin: 0;
    line-height: 1.6;
  }

  /* Pro Active Card */
  .pro-active-card {
    text-align: center;
    padding: 40px 24px;
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%);
    border: 1px solid rgba(251, 191, 36, 0.3);
    border-radius: 20px;
  }

  .pro-active-icon {
    width: 72px;
    height: 72px;
    margin: 0 auto 20px;
    border-radius: 18px;
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #1a1a2e;
    box-shadow:
      0 4px 12px rgba(251, 191, 36, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }

  .pro-active-title {
    font-family: 'Bungee', cursive;
    font-size: 1.5rem;
    color: #fbbf24;
    margin: 0 0 8px 0;
    text-shadow: 0 0 20px rgba(251, 191, 36, 0.4);
  }

  .pro-active-desc {
    font-family: 'Inter', sans-serif;
    font-size: 0.9375rem;
    color: rgba(255, 255, 255, 0.6);
    margin: 0 0 24px 0;
  }

  .pro-benefits-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 24px;
  }

  .pro-benefit-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    font-family: 'Inter', sans-serif;
    font-size: 0.9375rem;
    color: rgba(255, 255, 255, 0.8);
  }

  .pro-benefit-row svg {
    color: #fbbf24;
  }

  .btn-manage {
    width: 100%;
    padding: 14px;
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-manage:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.15);
  }

  /* Bottom padding */
  .bottom-padding {
    height: 40px;
  }

  /* Mobile adjustments */
  @media (max-width: 380px) {
    .hero-title {
      font-size: 1.5rem;
    }

    .plan-price-equivalent,
    .plan-price-amount {
      font-size: 1.5rem;
    }

    .trust-section {
      flex-wrap: wrap;
      gap: 8px;
    }

    .trust-divider {
      display: none;
    }

    .plan-value {
      display: none;
    }
  }
`;
