'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';

const LABELS = [
  {
    key: 'free',
    label: 'Free',
    on:  { color: '#38bdf8', bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.3)' },
    off: { color: '#38384f', bg: 'transparent',           border: 'rgba(255,255,255,0.07)' },
  },
  {
    key: 'isNew',
    label: 'New',
    on:  { color: '#4ade80', bg: 'rgba(74,222,128,0.1)', border: 'rgba(74,222,128,0.3)' },
    off: { color: '#38384f', bg: 'transparent',           border: 'rgba(255,255,255,0.07)' },
  },
];

function HealthBar({ total, validatedCount, verifiedStats }) {
  if (!total) return <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }} />;
  const v = verifiedStats || { ok: 0, attention: 0, erreur: 0 };
  const pct = n => `${Math.max(0, Math.round((n / total) * 100))}%`;
  return (
    <div style={{ display: 'flex', height: '3px', borderRadius: '2px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', gap: '1px' }}>
      {validatedCount > 0 && <div style={{ width: pct(validatedCount), background: '#6366f1' }} />}
      {v.ok > 0 && <div style={{ width: pct(v.ok), background: '#4ade80' }} />}
      {v.attention > 0 && <div style={{ width: pct(v.attention), background: '#fcd34d' }} />}
      {v.erreur > 0 && <div style={{ width: pct(v.erreur), background: '#f87171' }} />}
    </div>
  );
}

// ─── Deploy Modal ────────────────────────────────────────────────

function DeployModal({ details, onConfirm, onClose, deploying }) {
  if (!details?.length) return null;
  const totalQ = details.reduce((a, d) => a + d.totalQuestions, 0);
  const totalV = details.reduce((a, d) => a + d.validatedCount, 0);
  const totalAi = details.reduce((a, d) => a + d.aiModifiedCount, 0);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />
      <div style={{
        position: 'relative', background: '#0d0d12', border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: '14px', padding: '24px', width: '560px', maxHeight: '80vh', overflow: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#ededf5', margin: 0 }}>
            Deployer {details.length} quiz sur GitHub
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#38384f', cursor: 'pointer', fontSize: '16px' }}>✕</button>
        </div>

        {/* Summary */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '11px', color: '#55556a' }}>
          <span>{totalQ} questions</span>
          <span style={{ color: '#818cf8' }}>{totalV} validees</span>
          {totalAi > 0 && <span style={{ color: '#c4b5fd' }}>✏️ {totalAi} modifiees IA</span>}
        </div>

        {/* Theme list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          {details.map(d => {
            const pct = d.totalQuestions > 0 ? Math.round((d.validatedCount / d.totalQuestions) * 100) : 0;
            return (
              <div key={d.themeId} style={{
                padding: '10px 14px', borderRadius: '8px',
                background: '#111116', border: '1px solid rgba(255,255,255,0.07)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px' }}>{d.emoji}</span>
                    <span style={{ fontSize: '12px', color: '#c4c4d4', fontWeight: 500 }}>{d.title}</span>
                    {d.category && <span style={{ fontSize: '9px', color: '#38384f' }}>{d.category}</span>}
                  </div>
                  <span style={{ fontSize: '10px', color: '#818cf8', fontWeight: 600 }}>{pct}%</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '10px', color: '#55556a' }}>
                  <span>{d.totalQuestions}q</span>
                  <span style={{ color: '#818cf8' }}>✓ {d.validatedCount}</span>
                  {d.aiModifiedCount > 0 && <span style={{ color: '#c4b5fd' }}>✏️ {d.aiModifiedCount} IA</span>}
                  {d.verifiedStats?.attention > 0 && <span style={{ color: '#fcd34d' }}>⚠ {d.verifiedStats.attention}</span>}
                  {d.verifiedStats?.erreur > 0 && <span style={{ color: '#f87171' }}>✕ {d.verifiedStats.erreur}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onClose} style={{
            padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontFamily: 'inherit',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
            color: '#55556a', cursor: 'pointer',
          }}>Annuler</button>
          <button onClick={onConfirm} disabled={deploying} style={{
            padding: '8px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, fontFamily: 'inherit',
            background: deploying ? 'rgba(255,255,255,0.04)' : '#6366f1',
            border: deploying ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(99,102,241,0.3)',
            color: deploying ? '#2d2d3d' : '#fff',
            cursor: deploying ? 'not-allowed' : 'pointer',
          }}>
            {deploying ? '... Deploiement' : `Confirmer le deploiement`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Global Verification Panel ───────────────────────────────────

function GlobalVerifyPanel({ globalProgress, themeProgress, onStop, onClear }) {
  const gp = globalProgress;
  if (!gp || (!gp.active && !gp.phase)) return null;

  const isActive = gp.active;
  const isDone = gp.phase === 'done';
  const isStopped = gp.phase === 'stopped';
  const isQuota = gp.phase === 'quota';
  const isError = gp.phase === 'error';
  const completed = gp.completedThemes || [];
  const gs = gp.globalStats || {};

  const borderColor = isDone ? 'rgba(74,222,128,0.2)' : isQuota || isError ? 'rgba(239,68,68,0.2)' : isStopped ? 'rgba(245,158,11,0.2)' : 'rgba(99,102,241,0.2)';
  const bgColor = isDone ? 'rgba(74,222,128,0.04)' : isQuota || isError ? 'rgba(239,68,68,0.04)' : isStopped ? 'rgba(245,158,11,0.04)' : 'rgba(99,102,241,0.04)';

  return (
    <div style={{
      marginBottom: '20px', padding: '16px', borderRadius: '12px',
      background: bgColor, border: `1px solid ${borderColor}`,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: isDone ? '#4ade80' : isQuota ? '#fca5a5' : isStopped ? '#fcd34d' : '#818cf8' }}>
            {isActive ? '🔄 Verification globale en cours' : isDone ? '✅ Verification globale terminee' : isQuota ? '⚠️ Quota atteint' : isStopped ? '⏹ Verification arretee' : isError ? '❌ Erreur' : 'Verification'}
          </span>
          {gp.totalThemes > 0 && (
            <span style={{ fontSize: '11px', color: '#55556a' }}>
              {completed.length}/{gp.totalThemes} themes
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {isActive && (
            <button onClick={onStop} style={{
              fontSize: '11px', padding: '4px 10px', borderRadius: '6px', fontFamily: 'inherit',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', cursor: 'pointer',
            }}>⏹ Arreter</button>
          )}
          {!isActive && (
            <button onClick={onClear} style={{
              fontSize: '11px', padding: '4px 10px', borderRadius: '6px', fontFamily: 'inherit',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#38384f', cursor: 'pointer',
            }}>✕</button>
          )}
        </div>
      </div>

      {/* Current theme progress */}
      {isActive && gp.currentThemeTitle && (
        <div style={{ marginBottom: '10px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.1)' }}>
          <div style={{ fontSize: '12px', color: '#c4c4d4', marginBottom: '4px' }}>
            {gp.currentThemeEmoji} {gp.currentThemeTitle}
            <span style={{ color: '#38384f', marginLeft: '8px', fontSize: '10px' }}>{gp.currentThemeCategory}</span>
          </div>
          {/* Per-theme progress from themeProgress */}
          {themeProgress?.active && (
            <div>
              <div style={{ fontSize: '10px', color: '#55556a', marginBottom: '4px' }}>
                {themeProgress.phaseLabel} — {themeProgress.detail}
              </div>
              {themeProgress.total > 0 && (
                <div style={{ height: '3px', background: 'rgba(99,102,241,0.15)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#6366f1', width: `${(themeProgress.current / themeProgress.total) * 100}%`, transition: 'width 0.5s ease' }} />
                </div>
              )}
              {themeProgress.stats && (
                <div style={{ display: 'flex', gap: '10px', fontSize: '10px', marginTop: '4px', color: '#55556a' }}>
                  {themeProgress.stats.confirmed > 0 && <span style={{ color: '#4ade80' }}>✅ {themeProgress.stats.confirmed}</span>}
                  {themeProgress.stats.corrected > 0 && <span style={{ color: '#818cf8' }}>🔧 {themeProgress.stats.corrected}</span>}
                  {themeProgress.stats.uncertain > 0 && <span style={{ color: '#fcd34d' }}>⚠️ {themeProgress.stats.uncertain}</span>}
                  {themeProgress.stats.rewritten > 0 && <span style={{ color: '#c4c4d4' }}>✏️ {themeProgress.stats.rewritten}</span>}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Global progress bar */}
      {gp.totalThemes > 0 && (
        <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', marginBottom: '10px' }}>
          <div style={{
            height: '100%', background: isDone ? '#4ade80' : '#6366f1',
            width: `${Math.round((completed.length / gp.totalThemes) * 100)}%`,
            transition: 'width 0.5s ease',
          }} />
        </div>
      )}

      {/* Global stats */}
      {(gs.confirmed > 0 || gs.corrected > 0 || gs.uncertain > 0 || gs.rewritten > 0) && (
        <div style={{ display: 'flex', gap: '14px', fontSize: '11px', marginBottom: '10px', flexWrap: 'wrap' }}>
          {gs.confirmed > 0 && <span style={{ color: '#4ade80' }}>✅ {gs.confirmed} confirmees</span>}
          {gs.corrected > 0 && <span style={{ color: '#818cf8' }}>🔧 {gs.corrected} corrigees</span>}
          {gs.uncertain > 0 && <span style={{ color: '#fcd34d' }}>⚠️ {gs.uncertain} incertaines</span>}
          {gs.rewritten > 0 && <span style={{ color: '#c4c4d4' }}>✏️ {gs.rewritten} reecrites</span>}
          {gs.errors > 0 && <span style={{ color: '#f87171' }}>❌ {gs.errors} erreurs</span>}
        </div>
      )}

      {/* Completed themes list */}
      {completed.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {completed.map(t => (
            <span key={t.themeId} style={{
              fontSize: '10px', padding: '2px 8px', borderRadius: '4px',
              background: t.status === 'done' ? 'rgba(74,222,128,0.08)' : t.status === 'quota' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
              border: `1px solid ${t.status === 'done' ? 'rgba(74,222,128,0.15)' : t.status === 'quota' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'}`,
              color: t.status === 'done' ? '#4ade80' : t.status === 'quota' ? '#fca5a5' : '#fcd34d',
            }}>
              {t.emoji} {t.title}
              {t.stats && ` (${(t.stats.confirmed || 0) + (t.stats.corrected || 0)} OK)`}
            </span>
          ))}
        </div>
      )}

      {/* Detail */}
      {gp.detail && !isActive && (
        <div style={{ fontSize: '11px', color: '#8888a0', marginTop: '8px' }}>{gp.detail}</div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────

export default function QuizPage() {
  const [manifest, setManifest] = useState(null);
  const [originalJson, setOriginalJson] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [ticketsByTheme, setTicketsByTheme] = useState({});
  const toastTimer = useRef(null);

  // Deploy state
  const [deployInfo, setDeployInfo] = useState(null); // { count, themes[], details[] }
  const [deploying, setDeploying] = useState(false);
  const [deployMsg, setDeployMsg] = useState(null);
  const [showDeployModal, setShowDeployModal] = useState(false);

  // Global verification state
  const [globalVerifyProgress, setGlobalVerifyProgress] = useState(null);
  const [themeVerifyProgress, setThemeVerifyProgress] = useState(null);
  const globalPollRef = useRef(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/quiz/manifest').then(r => r.json()),
      fetch('/api/tickets').then(r => r.json()).catch(() => []),
      fetch('/api/quiz/deploy').then(r => r.json()).catch(() => ({ count: 0, themes: [], details: [] })),
      fetch('/api/quiz/verify-v2?mode=global').then(r => r.json()).catch(() => ({ global: { active: false }, currentTheme: { active: false } })),
    ]).then(([manifestData, ticketsData, deployData, verifyData]) => {
      if (manifestData.error) throw new Error(manifestData.error);
      setManifest(manifestData);
      setOriginalJson(JSON.stringify(manifestData));

      const byTheme = {};
      if (Array.isArray(ticketsData)) {
        ticketsData
          .filter(t => (t.status || 'open') === 'open')
          .forEach(t => {
            if (!t.themeId) return;
            const tid = t.themeId.startsWith('database-') ? t.themeId.slice(9) : t.themeId;
            byTheme[tid] = (byTheme[tid] || 0) + 1;
          });
      }
      setTicketsByTheme(byTheme);
      if (deployData && !deployData.error) setDeployInfo(deployData);

      // Restore global verify state if active or recently finished
      if (verifyData?.global?.active || verifyData?.global?.phase) {
        setGlobalVerifyProgress(verifyData.global);
        setThemeVerifyProgress(verifyData.currentTheme);
        if (verifyData.global.active) startGlobalPolling();
      }

      setLoading(false);
    }).catch(err => { setError(err.message); setLoading(false); });

    return () => { if (globalPollRef.current) clearInterval(globalPollRef.current); };
  }, []);

  const currentJson = manifest ? JSON.stringify(manifest) : '';
  const isDirty = currentJson !== originalJson;

  const origThemesMap = useMemo(() =>
    originalJson
      ? Object.fromEntries(JSON.parse(originalJson).categories.flatMap(c => c.themes).map(t => [t.id, t]))
      : {},
  [originalJson]);

  const changedCount = useMemo(() =>
    isDirty
      ? manifest.categories.flatMap(c => c.themes).filter(
          t => JSON.stringify(t) !== JSON.stringify(origThemesMap[t.id])
        ).length
      : 0,
  [isDirty, manifest, origThemesMap]);

  const pendingDeploySet = useMemo(() =>
    new Set(deployInfo?.themes || []),
  [deployInfo]);

  const showToast = (message, type = 'success') => {
    clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  };

  const toggleLabel = (themeId, labelKey) => {
    setManifest(prev => ({
      ...prev,
      categories: prev.categories.map(cat => ({
        ...cat,
        themes: cat.themes.map(theme => {
          if (theme.id !== themeId) return theme;
          const updated = { ...theme };
          if (updated[labelKey]) delete updated[labelKey]; else updated[labelKey] = true;
          return updated;
        }),
      })),
    }));
  };

  const handleSaveDeploy = async () => {
    setSaving(true);
    try {
      const saveRes = await fetch('/api/quiz/manifest', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manifest),
      });
      if (!saveRes.ok) throw new Error('Erreur lors de la sauvegarde');
      const saveData = await saveRes.json();
      const newManifest = saveData.sha ? { ...manifest, _sha: saveData.sha } : manifest;
      setManifest(newManifest);
      setOriginalJson(JSON.stringify(newManifest));
      showToast('Manifest deploye — Vercel redeploie automatiquement');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDeployModal = () => {
    if (deployInfo?.details?.length > 0) {
      setShowDeployModal(true);
    }
  };

  const handleConfirmDeploy = async () => {
    setDeploying(true);
    setDeployMsg(null);
    try {
      const res = await fetch('/api/quiz/deploy', { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        setDeployMsg({ type: 'error', text: data.error });
      } else {
        setDeployMsg({ type: 'ok', text: data.message });
        setDeployInfo({ count: 0, themes: [], details: [] });
        setShowDeployModal(false);
      }
    } catch (err) {
      setDeployMsg({ type: 'error', text: err.message });
    } finally {
      setDeploying(false);
    }
  };

  // ─── Global verification ──────────────────────────────────────

  const startGlobalPolling = useCallback(() => {
    if (globalPollRef.current) clearInterval(globalPollRef.current);
    globalPollRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/quiz/verify-v2?mode=global');
        const data = await res.json();
        setGlobalVerifyProgress(data.global);
        setThemeVerifyProgress(data.currentTheme);
        if (!data.global?.active) {
          clearInterval(globalPollRef.current);
          globalPollRef.current = null;
          // Refresh deploy info after verification
          fetch('/api/quiz/deploy').then(r => r.json()).then(d => {
            if (d && !d.error) setDeployInfo(d);
          }).catch(() => {});
          // Refresh manifest stats
          fetch('/api/quiz/manifest').then(r => r.json()).then(m => {
            if (!m.error) {
              setManifest(m);
              setOriginalJson(JSON.stringify(m));
            }
          }).catch(() => {});
        }
      } catch {}
    }, 2000);
  }, []);

  const handleStartGlobalVerify = async () => {
    try {
      const res = await fetch('/api/quiz/verify-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start-global' }),
      });
      const data = await res.json();
      if (data.error) {
        showToast(data.error, 'error');
        return;
      }
      setGlobalVerifyProgress({ active: true, phase: 'starting', detail: 'Demarrage...', completedThemes: [], globalStats: {} });
      startGlobalPolling();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleStopGlobalVerify = async () => {
    try {
      await fetch('/api/quiz/verify-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });
    } catch {}
  };

  const handleClearGlobalVerify = async () => {
    setGlobalVerifyProgress(null);
    setThemeVerifyProgress(null);
    try {
      await fetch('/api/quiz/verify-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear-global' }),
      });
    } catch {}
  };

  // ─── Render ───────────────────────────────────────────────────

  if (loading) return (
    <div style={{ padding: '36px 40px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '60px' }}>
        {[...Array(9)].map((_, i) => (
          <div key={i} style={{ height: '130px', background: '#111116', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', animation: 'pulse 1.5s ease-in-out infinite', opacity: 0.6 }} />
        ))}
      </div>
    </div>
  );

  if (error) return (
    <div style={{ padding: '36px 40px' }}>
      <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '12px', padding: '20px', color: '#fca5a5', fontSize: '13px' }}>{error}</div>
    </div>
  );

  const allThemes = manifest.categories.flatMap(c => c.themes);
  const totalQuestions = allThemes.reduce((a, t) => a + (t.questionCount || 0), 0);
  const totalValidated = allThemes.reduce((a, t) => a + (t.validatedCount || 0), 0);
  const totalOk = allThemes.reduce((a, t) => a + (t.verifiedStats?.ok || 0), 0);
  const totalAttention = allThemes.reduce((a, t) => a + (t.verifiedStats?.attention || 0), 0);
  const totalErreur = allThemes.reduce((a, t) => a + (t.verifiedStats?.erreur || 0), 0);
  const totalTickets = Object.values(ticketsByTheme).reduce((a, b) => a + b, 0);
  const totalAiModified = allThemes.reduce((a, t) => a + (t.aiModifiedCount || 0), 0);
  const freeCount = allThemes.filter(t => t.free).length;
  const globalProgress = totalQuestions > 0 ? Math.round((totalValidated / totalQuestions) * 100) : 0;

  const isGlobalVerifyActive = globalVerifyProgress?.active;
  const currentVerifyThemeId = globalVerifyProgress?.currentThemeId;

  return (
    <div style={{ padding: '36px 40px' }}>

      {/* Deploy Modal */}
      {showDeployModal && (
        <DeployModal
          details={deployInfo?.details || []}
          onConfirm={handleConfirmDeploy}
          onClose={() => setShowDeployModal(false)}
          deploying={deploying}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 16px', borderRadius: '10px', fontSize: '13px',
          ...(toast.type === 'error'
            ? { background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }
            : { background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)', color: '#6ee7b7' }
          ),
        }}>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', color: 'inherit', opacity: 0.5, cursor: 'pointer', padding: 0 }}>✕</button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '19px', fontWeight: 600, color: '#ededf5', letterSpacing: '-0.35px', lineHeight: 1.2 }}>Quiz Editor</h1>
          <p style={{ fontSize: '12px', color: '#55556a', marginTop: '4px' }}>
            {allThemes.length} themes · {totalQuestions.toLocaleString('fr-FR')} questions · {freeCount} Free
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {isDirty && (
            <span style={{ fontSize: '11px', color: '#fcd34d', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '6px', padding: '5px 10px', whiteSpace: 'nowrap' }}>
              {changedCount} modif{changedCount > 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={handleStartGlobalVerify}
            disabled={isGlobalVerifyActive}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '7px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, fontFamily: 'inherit',
              cursor: isGlobalVerifyActive ? 'not-allowed' : 'pointer',
              ...(isGlobalVerifyActive
                ? { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#2d2d3d' }
                : { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#6ee7b7' }
              ),
            }}
          >
            {isGlobalVerifyActive ? '... Verification' : '🤖 Verification globale V2'}
          </button>
          <button
            onClick={handleSaveDeploy}
            disabled={!isDirty || saving}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
              fontFamily: 'inherit', cursor: isDirty && !saving ? 'pointer' : 'not-allowed',
              ...(isDirty && !saving
                ? { background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#fcd34d' }
                : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#2d2d3d' }
              ),
            }}
          >
            {saving ? '...' : '↑ Manifest'}
          </button>
          <button
            onClick={handleOpenDeployModal}
            disabled={deploying || !deployInfo?.count}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
              fontFamily: 'inherit',
              cursor: deploying || !deployInfo?.count ? 'not-allowed' : 'pointer',
              ...(deployInfo?.count > 0 && !deploying
                ? { background: '#6366f1', border: '1px solid rgba(99,102,241,0.3)', color: '#fff' }
                : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#2d2d3d' }
              ),
            }}
          >
            {deploying ? '...' : `↑ Deployer ${deployInfo?.count || 0} quiz`}
          </button>
        </div>
      </div>

      {/* Deploy message */}
      {deployMsg && (
        <div style={{
          marginBottom: '16px', padding: '10px 14px', borderRadius: '8px', fontSize: '12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          ...(deployMsg.type === 'ok'
            ? { background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', color: '#6ee7b7' }
            : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#fca5a5' }
          ),
        }}>
          <span>{deployMsg.text}</span>
          <button onClick={() => setDeployMsg(null)} style={{ background: 'none', border: 'none', color: 'inherit', opacity: 0.5, cursor: 'pointer', padding: 0, fontSize: '13px' }}>✕</button>
        </div>
      )}

      {/* Global Verification Panel */}
      <GlobalVerifyPanel
        globalProgress={globalVerifyProgress}
        themeProgress={themeVerifyProgress}
        onStop={handleStopGlobalVerify}
        onClear={handleClearGlobalVerify}
      />

      {/* Global Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {[
          { label: 'Total questions', value: totalQuestions.toLocaleString('fr-FR'), color: '#ededf5' },
          { label: 'Validees', value: `${totalValidated} (${globalProgress}%)`, color: '#818cf8' },
          { label: 'OK (IA)', value: totalOk, color: '#4ade80' },
          { label: 'Attention', value: totalAttention, color: '#fcd34d' },
          { label: 'Modifiees IA', value: totalAiModified, color: totalAiModified > 0 ? '#c4b5fd' : '#38384f' },
          { label: 'Tickets', value: totalTickets, color: totalTickets > 0 ? '#f87171' : '#38384f', link: '/tickets' },
        ].map(stat => (
          <div
            key={stat.label}
            onClick={stat.link ? () => window.location.href = stat.link : undefined}
            style={{
              background: '#111116',
              border: `1px solid ${stat.link && totalTickets > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)'}`,
              borderRadius: '10px', padding: '14px 16px',
              cursor: stat.link ? 'pointer' : 'default', transition: 'border-color .15s',
            }}
            onMouseEnter={e => { if (stat.link) e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; }}
            onMouseLeave={e => { if (stat.link) e.currentTarget.style.borderColor = stat.link && totalTickets > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)'; }}
          >
            <div style={{ fontSize: '10px', color: '#38384f', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '8px' }}>{stat.label}</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: stat.color, letterSpacing: '-0.5px', lineHeight: 1 }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Global progress bar */}
      <div style={{ marginBottom: '32px', padding: '14px 16px', background: '#111116', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', color: '#55556a', fontWeight: 500 }}>Progression globale</span>
          <span style={{ fontSize: '11px', color: '#818cf8', fontWeight: 700 }}>{globalProgress}%</span>
        </div>
        <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden', display: 'flex', gap: '1px' }}>
          {totalValidated > 0 && (
            <div style={{ width: `${globalProgress}%`, background: 'linear-gradient(90deg, #6366f1, #818cf8)', transition: 'width 0.5s', borderRadius: '3px' }} />
          )}
          {totalOk > 0 && (
            <div style={{ width: `${Math.round((totalOk / totalQuestions) * 100)}%`, background: '#4ade80', opacity: 0.7 }} />
          )}
          {totalAttention > 0 && (
            <div style={{ width: `${Math.round((totalAttention / totalQuestions) * 100)}%`, background: '#fcd34d', opacity: 0.7 }} />
          )}
          {totalErreur > 0 && (
            <div style={{ width: `${Math.round((totalErreur / totalQuestions) * 100)}%`, background: '#f87171', opacity: 0.7 }} />
          )}
        </div>
        <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
          {[
            { color: '#818cf8', label: 'Validees', n: totalValidated },
            { color: '#4ade80', label: 'OK (IA)', n: totalOk },
            { color: '#fcd34d', label: 'Attention', n: totalAttention },
            { color: '#f87171', label: 'Erreurs', n: totalErreur },
          ].map(s => (
            <span key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: '#38384f' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.color, display: 'inline-block', flexShrink: 0 }} />
              <span style={{ color: '#55556a' }}>{s.label}</span>
              <span style={{ color: s.color, fontWeight: 600 }}>{s.n}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
        {manifest.categories.map(cat => (
          <div key={cat.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <span style={{ fontSize: '15px' }}>{cat.emoji}</span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#55556a', textTransform: 'uppercase', letterSpacing: '0.09em' }}>{cat.name}</span>
              <span style={{ fontSize: '10px', color: '#2d2d3d', fontFamily: 'monospace' }}>{cat.themes.length} themes</span>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
              {cat.themes.map(theme => {
                const isChanged = JSON.stringify(theme) !== JSON.stringify(origThemesMap[theme.id]);
                const themeTickets = ticketsByTheme[theme.id] || 0;
                const total = theme.questionCount || 0;
                const validated = theme.validatedCount || 0;
                const vs = theme.verifiedStats || { ok: 0, attention: 0, erreur: 0 };
                const aiMod = theme.aiModifiedCount || 0;
                const validatedPct = total > 0 ? Math.round((validated / total) * 100) : 0;
                const hasProblems = vs.erreur > 0 || themeTickets > 0;
                const isFullyValidated = total > 0 && validated >= total;
                const hasPendingDeploy = pendingDeploySet.has(theme.id);
                const isBeingVerified = currentVerifyThemeId === theme.id;

                return (
                  <div
                    key={theme.id}
                    style={{
                      background: '#111116',
                      border: `1px solid ${
                        isBeingVerified ? 'rgba(99,102,241,0.5)'
                        : isFullyValidated ? 'rgba(99,102,241,0.25)'
                        : isChanged ? 'rgba(245,158,11,0.3)'
                        : hasPendingDeploy ? 'rgba(168,85,247,0.3)'
                        : hasProblems ? 'rgba(239,68,68,0.15)'
                        : 'rgba(255,255,255,0.07)'
                      }`,
                      borderRadius: '10px',
                      padding: '14px 16px',
                      transition: 'border-color .15s',
                      ...(isBeingVerified ? { boxShadow: '0 0 12px rgba(99,102,241,0.15)' } : {}),
                    }}
                  >
                    {/* Top row: title + badges */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', minWidth: 0 }}>
                        <span style={{ fontSize: '18px', lineHeight: 1, flexShrink: 0, marginTop: '1px' }}>{theme.emoji}</span>
                        <Link
                          href={`/quiz/${theme.id}`}
                          style={{ fontSize: '12px', fontWeight: 500, color: '#c4c4d4', textDecoration: 'none', lineHeight: 1.4 }}
                          onMouseEnter={e => e.currentTarget.style.color = '#818cf8'}
                          onMouseLeave={e => e.currentTarget.style.color = '#c4c4d4'}
                        >
                          {theme.title}
                        </Link>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {isBeingVerified && <span style={{ fontSize: '9px', color: '#818cf8', animation: 'pulse 1.5s ease-in-out infinite' }}>🔄</span>}
                        {isChanged && <span style={{ fontSize: '9px', color: '#fcd34d' }}>●</span>}
                        {hasPendingDeploy && (
                          <span style={{ fontSize: '9px', color: '#c4b5fd', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)', borderRadius: '3px', padding: '1px 5px', whiteSpace: 'nowrap' }}>
                            📦 a deployer
                          </span>
                        )}
                        {aiMod > 0 && (
                          <span style={{ fontSize: '9px', color: '#c4b5fd', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '3px', padding: '1px 5px', whiteSpace: 'nowrap' }}>
                            ✏️ {aiMod} IA
                          </span>
                        )}
                        {isFullyValidated && (
                          <span style={{ fontSize: '9px', color: '#818cf8', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '3px', padding: '1px 5px', whiteSpace: 'nowrap' }}>✓ Done</span>
                        )}
                        {themeTickets > 0 && (
                          <Link href="/tickets" style={{ textDecoration: 'none' }}>
                            <span style={{ fontSize: '10px', fontWeight: 600, color: '#fca5a5', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '4px', padding: '1px 6px', whiteSpace: 'nowrap' }}>
                              🎫 {themeTickets}
                            </span>
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Health bar */}
                    <HealthBar total={total} validatedCount={validated} verifiedStats={vs} />

                    {/* Stats */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '10px', color: '#38384f', fontFamily: 'monospace' }}>{total}q</span>
                      {validated > 0 && (
                        <span style={{ fontSize: '10px', color: '#818cf8', fontWeight: 500 }}>✓ {validated}/{total} ({validatedPct}%)</span>
                      )}
                      {vs.erreur > 0 && (
                        <span style={{ fontSize: '10px', color: '#f87171' }}>✕ {vs.erreur}</span>
                      )}
                      {vs.attention > 0 && (
                        <span style={{ fontSize: '10px', color: '#fcd34d' }}>⚠ {vs.attention}</span>
                      )}
                      {validated === 0 && vs.ok === 0 && vs.attention === 0 && vs.erreur === 0 && (
                        <span style={{ fontSize: '10px', color: '#2d2d3d' }}>non verifiees</span>
                      )}
                    </div>

                    {/* Labels + Edit button */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {LABELS.map(lbl => {
                        const active = !!theme[lbl.key];
                        const s = active ? lbl.on : lbl.off;
                        return (
                          <button
                            key={lbl.key}
                            onClick={() => toggleLabel(theme.id, lbl.key)}
                            style={{
                              fontSize: '9px', padding: '2px 6px', borderRadius: '3px',
                              border: `1px solid ${s.border}`, background: s.bg, color: s.color,
                              textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600,
                              cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s',
                            }}
                          >
                            {lbl.label}
                          </button>
                        );
                      })}
                      <div style={{ flex: 1 }} />
                      <Link
                        href={`/quiz/${theme.id}`}
                        style={{
                          fontSize: '9px', padding: '2px 8px', borderRadius: '3px',
                          border: '1px solid rgba(255,255,255,0.07)', color: '#55556a',
                          textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.06em',
                          fontWeight: 600, transition: 'all .12s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#818cf8'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#55556a'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
                      >
                        Editer →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
