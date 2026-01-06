'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { onAuthStateChanged, auth } from '@/lib/firebase';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { PRO_PRICING, FREE_LIMITS } from '@/lib/subscription';
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
  Sparkles,
  Zap,
  Infinity,
  Ban,
  Package,
  BarChart3,
  Headphones,
  Palette,
  RotateCcw
} from 'lucide-react';

export default function SubscribePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState('annual');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [contentCounts, setContentCounts] = useState({ quizPacks: 0, alibiScenarios: 0 });
  const [errorMessage, setErrorMessage] = useState('');
  const [isNative, setIsNative] = useState(false);
  const { isPro } = useSubscription(user);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/login');
      } else {
        setUser(currentUser);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Initialize RevenueCat when user is loaded
  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());

    if (user?.uid) {
      initRevenueCat(user.uid);
    }
  }, [user]);

  // Fetch content counts from manifests
  useEffect(() => {
    Promise.all([
      fetch('/data/manifest.json').then(r => r.json()),
      fetch('/data/alibis/manifest.json').then(r => r.json())
    ]).then(([quizManifest, alibiManifest]) => {
      setContentCounts({
        quizPacks: quizManifest.quizzes?.length || 0,
        alibiScenarios: alibiManifest.alibis?.length || 0
      });
    }).catch(console.error);
  }, []);

  const handleSubscribe = async () => {
    setErrorMessage('');
    setIsProcessing(true);

    // Check if we're on native platform
    if (!isNative) {
      setIsProcessing(false);
      setErrorMessage('Les achats sont disponibles uniquement dans l\'application mobile.');
      return;
    }

    const packageType = selectedPlan; // 'monthly' or 'annual'
    const result = await purchaseSubscription(packageType);

    setIsProcessing(false);

    if (result.success) {
      // Pro status is now updated via RevenueCat webhook (server-side)
      // Refresh the page to show Pro status
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
      // Pro status is now updated via RevenueCat webhook (server-side)
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
    return (
      <div className="subscribe-page">
        <div className="loading-container">
          <div className="loading-spinner" />
        </div>
        <style jsx>{`
          .subscribe-page {
            flex: 1; min-height: 0;
            background: #0a0a0f;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(139, 92, 246, 0.2);
            border-top-color: #8b5cf6;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
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
      {/* Animated Background */}
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
        {/* Hero Section */}
        <motion.section
          className="hero-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="hero-crown">
            <Crown size={48} />
          </div>
          <h2 className="hero-title">Gigglz Pro</h2>
          <p className="hero-subtitle">Débloque tout le potentiel du jeu</p>
        </motion.section>

        {/* Benefits Grid */}
        <motion.section
          className="benefits-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="benefits-grid">
            <div className="benefit-item">
              <div className="benefit-icon">
                <Infinity size={20} />
              </div>
              <div className="benefit-content">
                <span className="benefit-title">Parties illimitées</span>
                <span className="benefit-desc">Joue autant que tu veux</span>
              </div>
            </div>

            <div className="benefit-item">
              <div className="benefit-icon">
                <Package size={20} />
              </div>
              <div className="benefit-content">
                <span className="benefit-title">Tous les contenus</span>
                <span className="benefit-desc">{contentCounts.quizPacks} packs + {contentCounts.alibiScenarios} alibis</span>
              </div>
            </div>

            <div className="benefit-item">
              <div className="benefit-icon">
                <Ban size={20} />
              </div>
              <div className="benefit-content">
                <span className="benefit-title">Sans publicité</span>
                <span className="benefit-desc">Expérience sans interruption</span>
              </div>
            </div>

            <div className="benefit-item">
              <div className="benefit-icon">
                <BarChart3 size={20} />
              </div>
              <div className="benefit-content">
                <span className="benefit-title">Stats avancées</span>
                <span className="benefit-desc">Analyse tes performances</span>
              </div>
            </div>

            <div className="benefit-item">
              <div className="benefit-icon">
                <Palette size={20} />
              </div>
              <div className="benefit-content">
                <span className="benefit-title">Cosmétiques Pro</span>
                <span className="benefit-desc">Avatars et effets exclusifs</span>
              </div>
            </div>

            <div className="benefit-item">
              <div className="benefit-icon">
                <Headphones size={20} />
              </div>
              <div className="benefit-content">
                <span className="benefit-title">Support prioritaire</span>
                <span className="benefit-desc">Aide rapide et dédiée</span>
              </div>
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
          {/* Annual Plan */}
          <button
            className={`plan-card ${selectedPlan === 'annual' ? 'selected' : ''}`}
            onClick={() => setSelectedPlan('annual')}
          >
            <div className="plan-badge">-{PRO_PRICING.annual.savings}%</div>
            <div className="plan-header">
              <span className="plan-name">{PRO_PRICING.annual.label}</span>
              <div className="plan-price">
                <span className="price-amount">{PRO_PRICING.annual.price}€</span>
                <span className="price-period">/an</span>
              </div>
              <span className="plan-monthly">
                soit {PRO_PRICING.annual.monthlyEquivalent.toFixed(2)}€/mois
              </span>
            </div>
            <div className="plan-check">
              {selectedPlan === 'annual' && <Check size={20} />}
            </div>
          </button>

          {/* Monthly Plan */}
          <button
            className={`plan-card ${selectedPlan === 'monthly' ? 'selected' : ''}`}
            onClick={() => setSelectedPlan('monthly')}
          >
            <div className="plan-header">
              <span className="plan-name">{PRO_PRICING.monthly.label}</span>
              <div className="plan-price">
                <span className="price-amount">{PRO_PRICING.monthly.price}€</span>
                <span className="price-period">/mois</span>
              </div>
              <span className="plan-monthly">Sans engagement</span>
            </div>
            <div className="plan-check">
              {selectedPlan === 'monthly' && <Check size={20} />}
            </div>
          </button>
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
                <span>
                  Débloquer Pro - {selectedPlan === 'annual'
                    ? `${PRO_PRICING.annual.price}€/an`
                    : `${PRO_PRICING.monthly.price}€/mois`
                  }
                </span>
              </>
            )}
          </button>

          {errorMessage && (
            <p className="error-message">{errorMessage}</p>
          )}

          <p className="cta-legal">
            Annulable à tout moment. Paiement sécurisé.
          </p>

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

        {/* Comparison Table */}
        <motion.section
          className="comparison-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <h3 className="comparison-title">Free vs Pro</h3>

          <div className="comparison-table">
            <div className="comparison-header">
              <span></span>
              <span className="comparison-free">Free</span>
              <span className="comparison-pro">Pro</span>
            </div>

            <div className="comparison-row">
              <span>Packs Quiz</span>
              <span className="comparison-free">{FREE_LIMITS.quiz.packs}</span>
              <span className="comparison-pro">{contentCounts.quizPacks}</span>
            </div>

            <div className="comparison-row">
              <span>Scénarios Alibi</span>
              <span className="comparison-free">{FREE_LIMITS.alibi.scenarios}</span>
              <span className="comparison-pro">{contentCounts.alibiScenarios}</span>
            </div>

            <div className="comparison-row">
              <span>Parties/jour</span>
              <span className="comparison-free">3+3</span>
              <span className="comparison-pro">
                <Infinity size={16} />
              </span>
            </div>

            <div className="comparison-row">
              <span>Publicités</span>
              <span className="comparison-free">Oui</span>
              <span className="comparison-pro">
                <Ban size={16} />
              </span>
            </div>

            <div className="comparison-row">
              <span>Stats avancées</span>
              <span className="comparison-free">
                <X size={16} className="icon-no" />
              </span>
              <span className="comparison-pro">
                <Check size={16} />
              </span>
            </div>

            <div className="comparison-row">
              <span>Cosmétiques exclusifs</span>
              <span className="comparison-free">
                <X size={16} className="icon-no" />
              </span>
              <span className="comparison-pro">
                <Check size={16} />
              </span>
            </div>
          </div>
        </motion.section>

        {/* Bottom padding */}
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
    background: radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%);
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
    padding-top: 16px;
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
    margin-bottom: 32px;
  }

  .hero-crown {
    width: 80px;
    height: 80px;
    margin: 0 auto 16px;
    border-radius: 20px;
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
    font-size: 2rem;
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
  }

  /* Benefits */
  .benefits-section {
    margin-bottom: 32px;
  }

  .benefits-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .benefit-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
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

  .benefit-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .benefit-title {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.8125rem;
    font-weight: 600;
    color: white;
  }

  .benefit-desc {
    font-family: 'Inter', sans-serif;
    font-size: 0.6875rem;
    color: rgba(255, 255, 255, 0.5);
  }

  /* Pricing */
  .pricing-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 24px;
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

  .plan-badge {
    position: absolute;
    top: -10px;
    right: 16px;
    padding: 4px 12px;
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    color: #1a1a2e;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.625rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-radius: 999px;
    box-shadow: 0 2px 8px rgba(251, 191, 36, 0.4);
  }

  .plan-header {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .plan-name {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.875rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.6);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .plan-price {
    display: flex;
    align-items: baseline;
    gap: 4px;
  }

  .price-amount {
    font-family: 'Bungee', cursive;
    font-size: 1.75rem;
    color: white;
  }

  .price-period {
    font-family: 'Inter', sans-serif;
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .plan-monthly {
    font-family: 'Inter', sans-serif;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.4);
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
  }

  .plan-card.selected .plan-check {
    background: #8b5cf6;
    border-color: #8b5cf6;
    color: white;
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

  .cta-legal {
    text-align: center;
    font-family: 'Inter', sans-serif;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.4);
    margin-top: 12px;
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
    margin-top: 16px;
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

  /* Comparison */
  .comparison-section {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 16px;
    padding: 20px;
  }

  .comparison-title {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.875rem;
    font-weight: 700;
    color: white;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 16px 0;
    text-align: center;
  }

  .comparison-table {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .comparison-header,
  .comparison-row {
    display: grid;
    grid-template-columns: 1fr 60px 60px;
    gap: 8px;
    padding: 10px 0;
    align-items: center;
  }

  .comparison-header {
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 12px;
    margin-bottom: 4px;
  }

  .comparison-header span {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.6875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    text-align: center;
  }

  .comparison-header .comparison-free {
    color: rgba(255, 255, 255, 0.5);
  }

  .comparison-header .comparison-pro {
    color: #a78bfa;
  }

  .comparison-row {
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .comparison-row:last-child {
    border-bottom: none;
  }

  .comparison-row span:first-child {
    font-family: 'Inter', sans-serif;
    font-size: 0.8125rem;
    color: rgba(255, 255, 255, 0.8);
  }

  .comparison-row .comparison-free,
  .comparison-row .comparison-pro {
    text-align: center;
    font-family: 'Inter', sans-serif;
    font-size: 0.8125rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .comparison-row .comparison-free {
    color: rgba(255, 255, 255, 0.4);
  }

  .comparison-row .comparison-pro {
    color: #22c55e;
  }

  .comparison-row .icon-no {
    color: rgba(255, 255, 255, 0.3);
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
    .benefits-grid {
      grid-template-columns: 1fr;
    }

    .hero-title {
      font-size: 1.5rem;
    }

    .price-amount {
      font-size: 1.5rem;
    }
  }
`;
