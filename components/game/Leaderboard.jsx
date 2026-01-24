'use client';

import { useMemo, useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, ChevronDown, ChevronUp } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamic import Lottie to avoid SSR issues
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

/**
 * Leaderboard - Composant de classement réutilisable avec animations
 * - Score animé (compte progressivement)
 * - Triangle vert ▲ / rouge ▼ pour les changements de position
 * - Animation de glissement quand les positions changent
 * - Largeur fixe pour les scores (4 digits max)
 * - Support mode équipes: affiche les équipes avec scores agrégés
 */
export default function Leaderboard({ players = [], currentPlayerUid = null, mode = 'individuel', teams = {} }) {
  const prevPositionsRef = useRef({});
  const prevScoresRef = useRef({});
  const listRef = useRef(null);
  const [displayScores, setDisplayScores] = useState({});
  const [positionChanges, setPositionChanges] = useState({});
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [fireAnimation, setFireAnimation] = useState(null);
  const [smokeAnimation, setSmokeAnimation] = useState(null);

  // View toggle for team mode (teams vs individual players)
  const isTeamModeRoom = mode === 'équipes';
  const hasTeams = teams && Object.keys(teams).length > 0;
  const canToggle = isTeamModeRoom || hasTeams;
  // Track if user has manually toggled (to not override their choice)
  const userHasToggledRef = useRef(false);
  // Track if animation should be skipped (for initial auto-switch)
  const skipAnimationRef = useRef(true);
  // Initialize directly to 'teams' if teams exist to avoid flash
  const [viewMode, setViewMode] = useState(() => hasTeams ? 'teams' : 'players');
  const [slideDirection, setSlideDirection] = useState(0); // -1 = left, 1 = right

  // Auto-switch to teams view when teams data arrives (if user hasn't manually toggled)
  // useLayoutEffect runs synchronously before paint, preventing flash
  useLayoutEffect(() => {
    if (hasTeams && viewMode === 'players' && !userHasToggledRef.current) {
      skipAnimationRef.current = true; // Skip animation for auto-switch
      setViewMode('teams');
    }
  }, [hasTeams, viewMode]);

  // Enable animations after initial render
  useEffect(() => {
    // Small delay to ensure first render is complete
    const timer = setTimeout(() => {
      skipAnimationRef.current = false;
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Toggle handlers with slide direction
  // Direction based on toggle position: [équipes] [joueurs]
  // équipes→joueurs = going right = content moves LEFT (direction = -1)
  // joueurs→équipes = going left = content moves RIGHT (direction = 1)
  const switchToTeams = useCallback(() => {
    if (viewMode !== 'teams') {
      userHasToggledRef.current = true;
      setSlideDirection(1); // Going left: content moves right
      setViewMode('teams');
    }
  }, [viewMode]);

  const switchToPlayers = useCallback(() => {
    if (viewMode !== 'players') {
      userHasToggledRef.current = true;
      setSlideDirection(-1); // Going right: content moves left
      setViewMode('players');
    }
  }, [viewMode]);

  // Smoke animation final values (hardcoded after dev testing)
  const smokeControls = {
    scaleX: 860,
    scaleY: 466,
    left: 4,
    top: -4,
    rotation: 84,
    opacity: 100
  };

  // Check if showing teams view (controlled by toggle)
  const isTeamMode = viewMode === 'teams' && hasTeams;

  // Build teams array with aggregated scores (needed for toggle count and team view)
  const teamsArray = useMemo(() => {
    if (!hasTeams) return [];
    return Object.entries(teams).map(([id, team]) => ({
      id,
      name: team.name || `Équipe ${id}`,
      color: team.color || '#8b5cf6',
      score: team.score || 0,
      memberCount: players.filter(p => p.teamId === id).length,
      activeCount: players.filter(p => p.teamId === id && (!p.status || p.status === 'active')).length
    })).sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [hasTeams, teams, players]);

  // Calculate max score for progress bars (team mode)
  const maxTeamScore = useMemo(() => {
    if (teamsArray.length === 0) return 100;
    const max = Math.max(...teamsArray.map(t => t.score || 0));
    return max > 0 ? max : 100;
  }, [teamsArray]);

  // Determine if we need Lottie animations (only for specific leader themes)
  const leaderTheme = useMemo(() => {
    if (teamsArray.length === 0) return null;
    const leader = teamsArray[0];
    return (leader?.name || '').toLowerCase().replace('équipe ', '').replace('team ', '');
  }, [teamsArray]);

  // Lazy load Lottie animations only when needed
  useEffect(() => {
    if (leaderTheme === 'blaze' && !fireAnimation) {
      fetch('/animations/fire-blaze.json')
        .then(res => res.json())
        .then(data => setFireAnimation(data))
        .catch(err => console.error('Failed to load fire animation:', err));
    }
  }, [leaderTheme, fireAnimation]);

  useEffect(() => {
    if (leaderTheme === 'venom' && !smokeAnimation) {
      fetch('/lottie/smoke.json')
        .then(res => res.json())
        .then(data => setSmokeAnimation(data))
        .catch(err => console.error('Failed to load smoke animation:', err));
    }
  }, [leaderTheme, smokeAnimation]);

  // Sort by score descending (for individual mode)
  const sorted = useMemo(() =>
    [...players].sort((a, b) => (b.score || 0) - (a.score || 0)),
    [players]
  );

  // Count active players
  const activeCount = useMemo(() =>
    players.filter(p => !p.status || p.status === 'active').length,
    [players]
  );

  // Find current player's team (for team highlighting)
  const myTeamId = useMemo(() => {
    if (!isTeamMode || !currentPlayerUid) return null;
    const me = players.find(p => p.uid === currentPlayerUid);
    return me?.teamId || null;
  }, [isTeamMode, currentPlayerUid, players]);

  // Helper to get team info for a player (works even when not in team mode display)
  // This allows showing team colors on individual players in end screens
  const getPlayerTeam = useCallback((player) => {
    if (!player.teamId || !teams || !teams[player.teamId]) return null;
    const team = teams[player.teamId];
    return {
      id: player.teamId,
      name: team.name || `Équipe ${player.teamId}`,
      color: team.color || '#8b5cf6',
      initial: (team.name || 'E').replace('Équipe ', '').replace('Team ', '').charAt(0).toUpperCase()
    };
  }, [teams]);

  // Track position changes (for both players and teams)
  useEffect(() => {
    const newPositions = {};
    const newChanges = {};

    // Use teams array in team mode, sorted players otherwise
    const items = isTeamMode ? teamsArray : sorted;
    const keyFn = isTeamMode ? (t) => `team_${t.id}` : (p) => p.uid;

    items.forEach((item, i) => {
      const key = keyFn(item);
      const currentPos = i + 1;
      const prevPos = prevPositionsRef.current[key];
      newPositions[key] = currentPos;

      // Only show triangle if position actually changed
      if (prevPos !== undefined && prevPos !== currentPos) {
        newChanges[key] = prevPos > currentPos ? 'up' : 'down';
        // Clear the indicator after 3s (longer visibility)
        setTimeout(() => {
          setPositionChanges(prev => {
            const updated = { ...prev };
            delete updated[key];
            return updated;
          });
        }, 3000);
      }
    });

    // Only update state if there are actual changes to avoid infinite loop
    if (Object.keys(newChanges).length > 0) {
      setPositionChanges(prev => ({ ...prev, ...newChanges }));
    }
    prevPositionsRef.current = newPositions;
  }, [sorted, teamsArray, isTeamMode]);

  // Animate scores (for both players and teams)
  useEffect(() => {
    const newScores = {};
    const intervals = [];

    // Add player scores
    players.forEach(p => {
      newScores[p.uid] = p.score || 0;
    });

    // Add team scores in team mode
    if (isTeamMode) {
      teamsArray.forEach(t => {
        newScores[`team_${t.id}`] = t.score || 0;
      });
    }

    Object.keys(newScores).forEach(key => {
      const target = newScores[key];
      const current = prevScoresRef.current[key] ?? target;

      if (current !== target) {
        const diff = target - current;
        const steps = 8; // Fewer steps for smoother performance
        const stepValue = diff / steps;
        let step = 0;

        const interval = setInterval(() => {
          step++;
          if (step >= steps) {
            setDisplayScores(prev => ({ ...prev, [key]: target }));
            clearInterval(interval);
          } else {
            setDisplayScores(prev => ({
              ...prev,
              [key]: Math.round(current + stepValue * step)
            }));
          }
        }, 80); // 80ms intervals (~12fps) - sufficient for number counters
        intervals.push(interval);
      }
    });

    prevScoresRef.current = newScores;

    // Cleanup intervals on unmount or dependency change
    return () => {
      intervals.forEach(clearInterval);
    };
  }, [players, teamsArray, isTeamMode]);

  // Check if list is scrollable and update indicators
  const checkScroll = useCallback(() => {
    const list = listRef.current;
    if (!list) return;

    const { scrollTop, scrollHeight, clientHeight } = list;
    const threshold = 5; // Small threshold for rounding errors

    setCanScrollUp(scrollTop > threshold);
    setCanScrollDown(scrollTop + clientHeight < scrollHeight - threshold);
  }, []);

  // Monitor scroll position
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    // Initial check
    checkScroll();

    // Listen to scroll events
    list.addEventListener('scroll', checkScroll);

    // Also check when content changes (players added/removed)
    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(list);

    return () => {
      list.removeEventListener('scroll', checkScroll);
      resizeObserver.disconnect();
    };
  }, [checkScroll, players.length]);

  return (
    <div className="leaderboard-card">
      <div className="leaderboard-header">
        <span className="leaderboard-title">Classement</span>
        {canToggle ? (
          <div className="view-toggle">
            <button
              className={`toggle-btn ${viewMode === 'teams' ? 'active' : ''}`}
              onClick={switchToTeams}
            >
              {teamsArray.length || Object.keys(teams).length} équipes
            </button>
            <button
              className={`toggle-btn ${viewMode === 'players' ? 'active' : ''}`}
              onClick={switchToPlayers}
            >
              {players.length} joueurs
            </button>
          </div>
        ) : (
          <span className="leaderboard-count">
            {activeCount === players.length
              ? `${players.length} joueurs`
              : `${activeCount}/${players.length} actifs`
            }
          </span>
        )}
      </div>
      <div className="leaderboard-list-wrapper">
        {/* Scroll up indicator */}
        <AnimatePresence>
          {canScrollUp && (
            <motion.div
              className="scroll-indicator up"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronUp size={16} />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="carousel-viewport">
          {/* True carousel: single container with both views that slides */}
          <motion.div
            className="carousel-track"
            initial={false}
            animate={{ x: viewMode === 'teams' ? '0%' : '-50%' }}
            transition={{
              duration: skipAnimationRef.current ? 0 : 0.35,
              ease: [0.4, 0, 0.2, 1]
            }}
          >
            {/* Teams view */}
            <div className={`carousel-slide ${isTeamMode ? 'team-mode' : ''} ${viewMode === 'teams' ? 'active' : ''} teams-count-${teamsArray.length}`} ref={viewMode === 'teams' ? listRef : null}>
              {teamsArray.map((team, i) => {
                const isMyTeam = team.id === myTeamId;
                const isLeader = i === 0;
                const posChange = positionChanges[`team_${team.id}`];
                const animatedScore = displayScores[`team_${team.id}`] ?? team.score ?? 0;
                const progressPercent = maxTeamScore > 0 ? (animatedScore / maxTeamScore) * 100 : 0;
                const teamTheme = (team.name || '').toLowerCase().replace('équipe ', '').replace('team ', '');
                const showBlazeFlames = isLeader && teamTheme === 'blaze';
                const showFrostCracks = isLeader && teamTheme === 'frost';

                return (
                  <div
                    key={`team_${team.id}`}
                    className={`team-race-row ${isLeader ? 'leader' : ''} ${isMyTeam ? 'my-team' : ''} ${posChange ? `moved-${posChange}` : ''} ${isLeader ? `leader-${teamTheme}` : ''}`}
                    style={{ '--team-color': team.color }}
                  >
                    {showBlazeFlames && fireAnimation && (
                      <div className="blaze-fire-lottie">
                        <Lottie animationData={fireAnimation} loop={true} className="fire-lottie" rendererSettings={{ preserveAspectRatio: 'xMidYMax slice' }} />
                      </div>
                    )}
                    {isLeader && teamTheme === 'venom' && smokeAnimation && (
                      <div className="venom-smoke-lottie">
                        <Lottie animationData={smokeAnimation} loop={true} className="smoke-lottie" style={{ left: `${smokeControls.left}%`, top: `${smokeControls.top}%`, transform: `scaleX(${smokeControls.scaleX / 100}) scaleY(${smokeControls.scaleY / 100}) rotate(${smokeControls.rotation}deg)`, opacity: smokeControls.opacity / 100 }} />
                      </div>
                    )}
                    {showFrostCracks && (
                      <div className="frost-hexagons">
                        {/* Reduced to 16 hexagons for better performance */}
                        <div className="hex hex-lg hex-1"></div><div className="hex hex-lg hex-2"></div>
                        <div className="hex hex-lg hex-3"></div><div className="hex hex-lg hex-4"></div>
                        <div className="hex hex-md hex-5"></div><div className="hex hex-md hex-6"></div>
                        <div className="hex hex-md hex-7"></div><div className="hex hex-md hex-8"></div>
                        <div className="hex hex-sm hex-9"></div><div className="hex hex-sm hex-10"></div>
                        <div className="hex hex-sm hex-11"></div><div className="hex hex-sm hex-12"></div>
                        <div className="hex hex-xs hex-13"></div><div className="hex hex-xs hex-14"></div>
                        <div className="hex hex-xs hex-15"></div><div className="hex hex-xs hex-16"></div>
                      </div>
                    )}
                    <div className="team-rank"><span className="rank-num">{i + 1}</span></div>
                    <div className="team-content">
                      <span className="team-name-text">{team.name}{isMyTeam && <span className="my-team-star">⭐</span>}</span>
                      <div className="progress-track">
                        <motion.div className="progress-fill" initial={false} animate={{ width: `${progressPercent}%` }} transition={{ duration: 0.5, ease: "easeOut" }} style={{ background: `linear-gradient(90deg, ${team.color}dd, ${team.color})` }} />
                      </div>
                    </div>
                    <div className="team-score-box">
                      <span className="team-member-count">{team.memberCount} joueurs</span>
                      <span className="team-score-value">{animatedScore}</span>
                    </div>
                  </div>
                );
              })}
              {teamsArray.length === 0 && <div className="no-players">Aucune équipe</div>}
            </div>

            {/* Players view */}
            <div className={`carousel-slide ${viewMode === 'players' ? 'active' : ''}`} ref={viewMode === 'players' ? listRef : null}>
              {sorted.map((p, i) => {
                const isMe = currentPlayerUid && p.uid === currentPlayerUid;
                const isDisconnected = p.status === 'disconnected' || p.status === 'left';
                const rankClass = i === 0 ? 'first' : i === 1 ? 'second' : i === 2 ? 'third' : '';
                const posChange = positionChanges[p.uid];
                const animatedScore = displayScores[p.uid] ?? p.score ?? 0;
                const playerTeam = getPlayerTeam(p);

                return (
                  <div
                    key={p.uid}
                    className={`player-row ${rankClass} ${isMe ? 'is-me' : ''} ${isDisconnected ? 'disconnected' : ''} ${posChange ? `moved-${posChange}` : ''} ${playerTeam ? 'has-team' : ''}`}
                    style={playerTeam ? { '--player-team-color': playerTeam.color } : undefined}
                  >
                    <span className="player-rank">
                      {i < 3 ? ['🥇', '🥈', '🥉'][i] : <span className="rank-number">{i + 1}</span>}
                    </span>
                    {playerTeam && (
                      <span className="team-badge" style={{ background: playerTeam.color }}>{playerTeam.initial}</span>
                    )}
                    <span className="player-name">
                      {p.name}
                      {isMe && <span className="you-badge">vous</span>}
                      {isDisconnected && <WifiOff size={12} className="disconnected-icon" />}
                    </span>
                    <div className="score-area">
                      {posChange && (
                        <span className={`pos-triangle ${posChange}`}>{posChange === 'up' ? '▲' : '▼'}</span>
                      )}
                      <span className="player-score">{animatedScore}</span>
                    </div>
                  </div>
                );
              })}
              {players.length === 0 && <div className="no-players">Aucun joueur</div>}
            </div>
          </motion.div>
        </div>  {/* End carousel-viewport */}

        {/* Scroll down indicator */}
        <AnimatePresence>
          {canScrollDown && (
            <motion.div
              className="scroll-indicator down"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown size={16} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style jsx>{`
        /* Carousel viewport - clips content */
        .carousel-viewport {
          flex: 1;
          min-height: 0;
          overflow: hidden;
          position: relative;
        }

        /* Carousel track - slides horizontally */
        .leaderboard-card :global(.carousel-track) {
          display: flex;
          width: 200%;
          height: 100%;
        }

        /* Each slide takes full viewport width */
        .leaderboard-card :global(.carousel-slide) {
          width: 50%;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 0.8vh;
          overflow-y: auto;
          overflow-x: hidden;
          padding-right: 0.5vw;
          /* Opacity transition - inactive slide fades out quickly */
          opacity: 0;
          transition: opacity 0.15s ease-out;
        }

        /* Active slide is fully visible */
        .leaderboard-card :global(.carousel-slide.active) {
          opacity: 1;
          transition: opacity 0.2s ease-in 0.1s; /* Slight delay on fade-in */
        }


        .leaderboard-card :global(.carousel-slide)::-webkit-scrollbar { width: 0.4vh; }
        .leaderboard-card :global(.carousel-slide)::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); border-radius: 2px; }
        .leaderboard-card :global(.carousel-slide)::-webkit-scrollbar-thumb { background: rgba(139, 92, 246, 0.4); border-radius: 2px; }

        .leaderboard-card :global(.carousel-slide.team-mode) {
          gap: 1vh;
        }

        .leaderboard-card,
        .leaderboard-card *,
        .leaderboard-card *::before,
        .leaderboard-card *::after {
          box-sizing: border-box;
        }

        .leaderboard-card {
          width: 100%;
          max-width: 500px;
          flex: 1;
          min-height: 0;
          min-width: 0;
          display: flex;
          flex-direction: column;
          background: rgba(20, 20, 30, 0.8);
          border: 1px solid rgba(139, 92, 246, 0.25);
          border-radius: 2vh;
          padding: 1.5vh 16px;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          overflow: hidden;
        }

        .leaderboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1vh;
          padding-bottom: 1vh;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          flex-shrink: 0;
        }

        .leaderboard-title {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.8vh;
          color: var(--quiz-glow, #a78bfa);
          text-shadow: 0 0 12px rgba(139, 92, 246, 0.5);
        }

        .leaderboard-count {
          font-family: var(--font-mono, 'Roboto Mono'), monospace;
          font-size: 1.3vh;
          font-weight: 600;
          color: var(--quiz-glow, #a78bfa);
          background: rgba(139, 92, 246, 0.15);
          border: 1px solid rgba(139, 92, 246, 0.3);
          padding: 0.5vh 1vh;
          border-radius: 1vh;
        }

        /* View toggle for team/player switch */
        .view-toggle {
          display: flex;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 1vh;
          padding: 2px;
          gap: 2px;
        }

        .toggle-btn {
          font-family: var(--font-mono, 'Roboto Mono'), monospace;
          font-size: 1.1vh;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.5);
          background: transparent;
          border: none;
          padding: 0.4vh 0.8vh;
          border-radius: 0.8vh;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .toggle-btn:hover {
          color: rgba(255, 255, 255, 0.7);
        }

        .toggle-btn.active {
          color: var(--quiz-glow, #a78bfa);
          background: rgba(139, 92, 246, 0.2);
          box-shadow: 0 0 8px rgba(139, 92, 246, 0.3);
        }

        .leaderboard-list-wrapper {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          position: relative;
        }

        .leaderboard-card :global(.scroll-indicator) {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 20px;
          background: rgba(139, 92, 246, 0.3);
          border: 1px solid rgba(139, 92, 246, 0.5);
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.8);
          z-index: 10;
          pointer-events: none;
          backdrop-filter: blur(4px);
        }

        .leaderboard-card :global(.scroll-indicator.up) {
          top: 0;
        }

        .leaderboard-card :global(.scroll-indicator.down) {
          bottom: 0;
        }

        .leaderboard-card :global(.player-row) {
          display: flex;
          align-items: center;
          gap: 1.5vw;
          padding: 1vh 2vw;
          background: rgba(20, 20, 30, 0.6);
          border-radius: 2vh;
          border: 1px solid rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
          min-width: 0;
          width: 100%;
        }

        .leaderboard-card :global(.player-row.moved-up) {
          animation: flash-up 0.8s ease;
        }

        .leaderboard-card :global(.player-row.moved-down) {
          animation: flash-down 0.8s ease;
        }

        @keyframes flash-up {
          0% { background: rgba(34, 197, 94, 0.5); }
          100% { background: rgba(20, 20, 30, 0.6); }
        }

        @keyframes flash-down {
          0% { background: rgba(239, 68, 68, 0.4); }
          100% { background: rgba(20, 20, 30, 0.6); }
        }

        .leaderboard-card :global(.player-row.first) {
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.25), rgba(255, 215, 0, 0.1));
          border-color: rgba(255, 215, 0, 0.6);
        }

        .leaderboard-card :global(.player-row.first.moved-up) {
          animation: flash-up-gold 0.8s ease;
        }

        @keyframes flash-up-gold {
          0% { background: rgba(34, 197, 94, 0.6); }
          100% { background: linear-gradient(135deg, rgba(255, 215, 0, 0.25), rgba(255, 215, 0, 0.1)); }
        }

        .leaderboard-card :global(.player-row.second) {
          background: linear-gradient(135deg, rgba(192, 192, 192, 0.2), rgba(192, 192, 192, 0.08));
          border-color: rgba(192, 192, 192, 0.5);
        }

        .leaderboard-card :global(.player-row.third) {
          background: linear-gradient(135deg, rgba(205, 127, 50, 0.2), rgba(205, 127, 50, 0.08));
          border-color: rgba(205, 127, 50, 0.5);
        }

        .leaderboard-card :global(.player-row.is-me) {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(139, 92, 246, 0.15)) !important;
          border-color: rgba(139, 92, 246, 0.7) !important;
        }

        .leaderboard-card :global(.player-row.disconnected) {
          opacity: 0.45;
          filter: grayscale(0.6);
        }

        .leaderboard-card :global(.player-row.disconnected) .player-name {
          color: rgba(255, 255, 255, 0.5);
        }

        .leaderboard-card :global(.player-row.disconnected) .player-score {
          color: rgba(255, 255, 255, 0.4);
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.1);
          text-shadow: none;
        }

        /* Team mode - player with team color */
        .leaderboard-card :global(.player-row.has-team) {
          border-left: 3px solid var(--player-team-color);
          padding-left: calc(2vw - 3px);
        }

        .leaderboard-card :global(.player-row.has-team.first),
        .leaderboard-card :global(.player-row.has-team.second),
        .leaderboard-card :global(.player-row.has-team.third) {
          background: linear-gradient(135deg,
            color-mix(in srgb, var(--player-team-color) 20%, transparent),
            color-mix(in srgb, var(--player-team-color) 8%, transparent)
          );
          border-color: var(--player-team-color);
        }

        .team-badge {
          width: 2vh;
          height: 2vh;
          min-width: 18px;
          min-height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.5vh;
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1vh;
          color: white;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
          flex-shrink: 0;
        }

        .disconnected-icon {
          display: inline-block;
          margin-left: 1vw;
          color: rgba(239, 68, 68, 0.7);
          vertical-align: middle;
        }

        .player-rank {
          width: 2.5vh;
          height: 2.5vh;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 2vh;
        }

        .rank-number {
          font-family: var(--font-mono, 'Roboto Mono'), monospace;
          font-size: 1.3vh;
          font-weight: 700;
          color: var(--text-muted, rgba(255, 255, 255, 0.5));
          background: rgba(255, 255, 255, 0.08);
          width: 2.5vh;
          height: 2.5vh;
          border-radius: 0.6vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .player-name {
          flex: 1;
          min-width: 0;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 1.6vh;
          font-weight: 600;
          color: var(--text-primary, #ffffff);
          display: flex;
          align-items: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .you-badge {
          display: inline;
          font-size: 1vh;
          padding: 0.3vh 0.6vh;
          margin-left: 1vw;
          background: var(--quiz-primary, #8b5cf6);
          border-radius: 0.4vh;
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.05em;
          flex-shrink: 0;
        }

        .score-area {
          display: flex;
          align-items: center;
          gap: 0.8vh;
          margin-left: auto;
          flex-shrink: 0;
        }

        .leaderboard-card :global(.pos-triangle) {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2.2vh;
          height: 2.2vh;
          border-radius: 0.5vh;
          font-size: 1.1vh;
          font-weight: 700;
          line-height: 1;
        }

        .leaderboard-card :global(.pos-triangle.up) {
          color: #fff;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
        }

        .leaderboard-card :global(.pos-triangle.down) {
          color: #fff;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
        }

        .player-score {
          font-family: var(--font-mono, 'Roboto Mono'), monospace;
          font-size: 1.5vh;
          font-weight: 700;
          color: var(--success, #22c55e);
          text-shadow: 0 0 12px rgba(34, 197, 94, 0.6);
          background: rgba(34, 197, 94, 0.12);
          padding: 0.5vh 1vh;
          border-radius: 0.8vh;
          border: 1px solid rgba(34, 197, 94, 0.3);
          width: 6vh;
          text-align: center;
        }

        /* ===== TEAM MODE - RACE BARS (Adaptive) ===== */
        .leaderboard-card :global(.carousel-slide.team-mode) {
          overflow: visible; /* Allow flames to extend above rows */
        }

        .leaderboard-card :global(.team-race-row) {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0.8vh 8px;
          /* Adaptive height: fills available space equally */
          flex: 1;
          min-height: 0;
          background: rgba(15, 15, 25, 0.9);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          position: relative;
          overflow: hidden;
        }

        /* Left color accent */
        .leaderboard-card :global(.team-race-row)::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: var(--team-color);
          border-radius: 10px 0 0 10px;
        }

        /* Leader special styling */
        .leaderboard-card :global(.team-race-row.leader) {
          background: linear-gradient(135deg, rgba(20, 20, 35, 0.95), rgba(15, 15, 25, 0.95));
          border-color: color-mix(in srgb, var(--team-color) 40%, transparent);
          box-shadow: 0 0 15px color-mix(in srgb, var(--team-color) 15%, transparent);
        }

        .leaderboard-card :global(.team-race-row.leader)::before {
          width: 4px;
          box-shadow: 0 0 8px var(--team-color);
        }

        /* My team highlight */
        .leaderboard-card :global(.team-race-row.my-team) {
          border-color: color-mix(in srgb, var(--team-color) 60%, transparent);
        }

        /* ===== 2-3 TEAMS: LARGER TEXT ===== */
        .leaderboard-card :global(.teams-count-2) .team-name-text,
        .leaderboard-card :global(.teams-count-3) .team-name-text {
          font-size: 1rem;
        }

        .leaderboard-card :global(.teams-count-2) .team-score-value,
        .leaderboard-card :global(.teams-count-3) .team-score-value {
          font-size: 1.1rem;
        }

        /* 2 teams: even bigger */
        .leaderboard-card :global(.teams-count-2) .team-name-text {
          font-size: 1.2rem;
        }

        .leaderboard-card :global(.teams-count-2) .team-score-value {
          font-size: 1.3rem;
        }

        .leaderboard-card :global(.teams-count-2 .team-race-row) {
          padding-top: 26px !important;
          padding-bottom: 26px !important;
          min-height: 100px;
        }

        .leaderboard-card :global(.teams-count-2) .team-score-box {
          position: static !important;
        }

        .leaderboard-card :global(.teams-count-2) .team-member-count {
          position: absolute !important;
          top: 8px !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          margin: 0 !important;
          z-index: 10 !important;
        }

        /* Position change animations */
        .leaderboard-card :global(.team-race-row.moved-up) {
          animation: team-flash-up 0.8s ease;
        }

        .leaderboard-card :global(.team-race-row.moved-down) {
          animation: team-flash-down 0.8s ease;
        }

        @keyframes team-flash-up {
          0% { background: rgba(34, 197, 94, 0.3); }
          100% { background: rgba(15, 15, 25, 0.9); }
        }

        @keyframes team-flash-down {
          0% { background: rgba(239, 68, 68, 0.3); }
          100% { background: rgba(15, 15, 25, 0.9); }
        }

        /* Rank number */
        .team-rank {
          flex-shrink: 0;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: color-mix(in srgb, var(--team-color) 15%, transparent);
          border: 1px solid color-mix(in srgb, var(--team-color) 30%, transparent);
          border-radius: 6px;
          position: relative;
          z-index: 2;
        }

        .rank-num {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 0.75rem;
          color: var(--team-color);
          text-shadow: 0 0 6px color-mix(in srgb, var(--team-color) 50%, transparent);
        }

        /* Team content (name + progress bar) */
        .team-content {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
          position: relative;
          z-index: 2;
        }

        .team-header {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .team-name-text {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 0.7rem;
          color: var(--team-color);
          text-shadow: 0 0 8px color-mix(in srgb, var(--team-color) 40%, transparent);
          letter-spacing: 0.02em;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .my-team-star {
          font-size: 0.65rem;
          animation: star-pulse 1.5s ease-in-out infinite;
          filter: drop-shadow(0 0 4px rgba(255, 215, 0, 0.6));
        }

        .my-team-badge {
          font-size: 0.65rem;
          color: var(--team-color);
          animation: star-pulse 1.5s ease-in-out infinite;
        }

        @keyframes star-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
        }

        .team-member-count {
          margin-left: auto;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.6rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.8);
          white-space: nowrap;
        }

        /* Progress bar track */
        .progress-track {
          position: relative;
          height: 6px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 3px;
          overflow: hidden;
        }

        /* Progress bar fill */
        .leaderboard-card :global(.progress-fill) {
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          background: linear-gradient(90deg,
            color-mix(in srgb, var(--team-color) 80%, transparent),
            var(--team-color)
          );
          border-radius: 3px;
          min-width: 3px;
        }

        /* Leader glow effect on progress bar */
        .leader-glow {
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 14px;
          height: 14px;
          background: var(--team-color);
          border-radius: 50%;
          filter: blur(6px);
          opacity: 0.6;
          animation: glow-pulse 1.5s ease-in-out infinite;
        }

        @keyframes glow-pulse {
          0%, 100% { opacity: 0.6; transform: translateY(-50%) scale(1); }
          50% { opacity: 0.9; transform: translateY(-50%) scale(1.2); }
        }

        /* Score box */
        .team-score-box {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 4px;
          position: relative;
          z-index: 2;
        }

        .leaderboard-card :global(.team-pos-change) {
          font-size: 0.6rem;
          font-weight: 700;
        }

        .leaderboard-card :global(.team-pos-change.up) {
          color: #22c55e;
        }

        .leaderboard-card :global(.team-pos-change.down) {
          color: #ef4444;
        }

        .team-score-value {
          font-family: var(--font-mono, 'Roboto Mono'), monospace;
          font-size: 0.85rem;
          font-weight: 700;
          color: white;
          min-width: 36px;
          text-align: right;
          text-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
        }

        .leaderboard-card :global(.team-race-row.leader) .team-score-value {
          color: var(--team-color);
          text-shadow: 0 0 10px color-mix(in srgb, var(--team-color) 60%, transparent);
        }

        /* ===== TEAM-SPECIFIC LEADER EFFECTS ===== */

        /* 🔥 BLAZE - Fire effect with Lottie flames */
        .leaderboard-card :global(.team-race-row.leader-blaze) {
          background: rgba(20, 10, 5, 0.95);
          border: 2px solid rgba(255, 120, 40, 0.8) !important;
          box-shadow: inset 0 0 15px rgba(255, 100, 30, 0.2);
        }

        /* Text styling for Blaze - ensure readability over flames */
        .leaderboard-card :global(.team-race-row.leader-blaze) .team-rank,
        .leaderboard-card :global(.team-race-row.leader-blaze) .team-content,
        .leaderboard-card :global(.team-race-row.leader-blaze) .team-score-box {
          position: relative;
          z-index: 5;
        }

        /* Left border accent above fire */
        .leaderboard-card :global(.team-race-row.leader-blaze)::before {
          z-index: 2;
        }

        .leaderboard-card :global(.team-race-row.leader-blaze) .team-name-text {
          text-shadow: 0 0 10px rgba(0, 0, 0, 0.9), 0 0 20px rgba(0, 0, 0, 0.7), 0 2px 4px rgba(0, 0, 0, 1);
        }

        .leaderboard-card :global(.team-race-row.leader-blaze) .team-score-value {
          text-shadow: 0 0 10px rgba(0, 0, 0, 0.9), 0 0 20px rgba(0, 0, 0, 0.7);
        }

        .leaderboard-card :global(.team-race-row.leader-blaze) .team-member-count {
          text-shadow: 0 0 8px rgba(0, 0, 0, 0.9);
        }

        /* Lottie Fire Effect - Fixed height with gradient fade at top */
        .leaderboard-card :global(.blaze-fire-lottie) {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 1;
          overflow: hidden;
          border-radius: inherit;
          /* Gradient mask to fade flames at top */
          -webkit-mask-image: linear-gradient(to top, black 0%, black 60%, transparent 100%);
          mask-image: linear-gradient(to top, black 0%, black 60%, transparent 100%);
        }

        .leaderboard-card :global(.fire-lottie) {
          position: absolute;
          bottom: -20%;
          left: 0;
          width: 100%;
          height: 120%;
          opacity: 0.55;
        }

        .leaderboard-card :global(.fire-lottie svg) {
          width: 100% !important;
          height: 100% !important;
        }

        /* ❄️ FROST - Spectacular frozen ice effect with animated variable-width cracks */
        .leaderboard-card :global(.team-race-row.leader-frost) {
          background:
            /* Frost crystallization texture */
            repeating-linear-gradient(
              60deg,
              rgba(255, 255, 255, 0.03) 0px,
              transparent 1px,
              transparent 4px
            ),
            repeating-linear-gradient(
              -60deg,
              rgba(255, 255, 255, 0.03) 0px,
              transparent 1px,
              transparent 4px
            ),
            /* Ice crystal gradient base */
            linear-gradient(135deg,
              rgba(0, 50, 90, 0.97) 0%,
              rgba(0, 70, 110, 0.95) 25%,
              rgba(10, 90, 130, 0.9) 50%,
              rgba(0, 70, 110, 0.95) 75%,
              rgba(0, 50, 90, 0.97) 100%
            );
          border: 2px solid rgba(180, 240, 255, 0.8) !important;
          box-shadow:
            inset 0 0 20px rgba(0, 150, 200, 0.3),
            inset 0 2px 0 rgba(255, 255, 255, 0.5),
            inset 0 -2px 0 rgba(0, 100, 150, 0.4);
          overflow: visible !important;
        }

        /* Frost Hexagons Container */
        .leaderboard-card :global(.frost-hexagons) {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 3;
          border-radius: inherit;
          overflow: hidden;
        }

        /* Base hexagon style */
        .leaderboard-card :global(.hex) {
          position: absolute;
          background: linear-gradient(135deg,
            rgba(200, 240, 255, 0.5) 0%,
            rgba(150, 220, 255, 0.3) 50%,
            rgba(200, 240, 255, 0.4) 100%
          );
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
          box-shadow: 0 0 4px rgba(150, 220, 255, 0.5);
        }

        .leaderboard-card :global(.hex)::before {
          content: '';
          position: absolute;
          inset: 1px;
          background: linear-gradient(135deg,
            rgba(255, 255, 255, 0.4) 0%,
            rgba(200, 240, 255, 0.15) 100%
          );
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
        }

        /* Size variants - optimized for 16 hexagons */
        .leaderboard-card :global(.hex-lg) { width: 42px; height: 46px; animation: hex-float-lg 3s ease-in-out infinite; }
        .leaderboard-card :global(.hex-md) { width: 24px; height: 26px; animation: hex-float-md 3.5s ease-in-out infinite; }
        .leaderboard-card :global(.hex-sm) { width: 12px; height: 14px; animation: hex-float-sm 4s ease-in-out infinite; }
        .leaderboard-card :global(.hex-xs) { width: 6px; height: 7px; animation: hex-sparkle 2s ease-in-out infinite; }

        /* Large hexagons (4) - corners */
        .leaderboard-card :global(.hex-1) { left: -3%; top: -12%; animation-delay: 0s; }
        .leaderboard-card :global(.hex-2) { right: 5%; top: -8%; animation-delay: 0.5s; }
        .leaderboard-card :global(.hex-3) { left: 8%; bottom: -15%; animation-delay: 1s; }
        .leaderboard-card :global(.hex-4) { right: 10%; bottom: -10%; animation-delay: 1.5s; }

        /* Medium hexagons (4) - edges */
        .leaderboard-card :global(.hex-5) { left: 5%; top: 40%; animation-delay: 0.2s; }
        .leaderboard-card :global(.hex-6) { right: 8%; top: 50%; animation-delay: 0.7s; }
        .leaderboard-card :global(.hex-7) { left: 40%; top: -5%; animation-delay: 1.2s; }
        .leaderboard-card :global(.hex-8) { left: 55%; bottom: -5%; animation-delay: 1.7s; }

        /* Small hexagons (4) - scattered */
        .leaderboard-card :global(.hex-9) { left: 25%; top: 20%; animation-delay: 0.3s; }
        .leaderboard-card :global(.hex-10) { right: 25%; top: 70%; animation-delay: 0.8s; }
        .leaderboard-card :global(.hex-11) { left: 15%; bottom: 25%; animation-delay: 1.3s; }
        .leaderboard-card :global(.hex-12) { right: 20%; bottom: 30%; animation-delay: 1.8s; }

        /* Tiny sparkle hexagons (4) - accents */
        .leaderboard-card :global(.hex-13) { left: 35%; top: 50%; animation-delay: 0.4s; }
        .leaderboard-card :global(.hex-14) { right: 35%; top: 35%; animation-delay: 0.9s; }
        .leaderboard-card :global(.hex-15) { left: 60%; top: 65%; animation-delay: 1.4s; }
        .leaderboard-card :global(.hex-16) { right: 45%; bottom: 45%; animation-delay: 1.9s; }

        @keyframes hex-float-lg {
          0%, 100% {
            opacity: 0.7;
            transform: translateY(0) scale(1) rotate(0deg);
          }
          50% {
            opacity: 1;
            transform: translateY(-3px) scale(1.1) rotate(5deg);
          }
        }

        @keyframes hex-float-md {
          0%, 100% {
            opacity: 0.6;
            transform: translateY(0) scale(1) rotate(0deg);
          }
          50% {
            opacity: 0.95;
            transform: translateY(-2px) scale(1.08) rotate(-3deg);
          }
        }

        @keyframes hex-float-sm {
          0%, 100% {
            opacity: 0.5;
            transform: translateY(0) scale(1);
          }
          50% {
            opacity: 0.85;
            transform: translateY(-2px) scale(1.15);
          }
        }

        @keyframes hex-sparkle {
          0%, 100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.3);
            box-shadow: 0 0 8px rgba(200, 240, 255, 0.8);
          }
        }

        /* Frost/ice edge effect - gelure spreading from borders */
        .leaderboard-card :global(.team-race-row.leader-frost)::after {
          content: '';
          position: absolute;
          inset: 0;
          background:
            /* Frost creeping from edges - top */
            radial-gradient(ellipse 80% 25% at 50% 0%, rgba(200, 245, 255, 0.5) 0%, rgba(150, 230, 255, 0.2) 40%, transparent 70%),
            /* Frost creeping from edges - bottom */
            radial-gradient(ellipse 80% 25% at 50% 100%, rgba(180, 240, 255, 0.4) 0%, rgba(150, 230, 255, 0.15) 40%, transparent 70%),
            /* Frost creeping from edges - left */
            radial-gradient(ellipse 30% 80% at 0% 50%, rgba(200, 245, 255, 0.5) 0%, rgba(150, 230, 255, 0.2) 50%, transparent 80%),
            /* Frost creeping from edges - right */
            radial-gradient(ellipse 25% 80% at 100% 50%, rgba(180, 240, 255, 0.4) 0%, rgba(150, 230, 255, 0.15) 50%, transparent 80%),
            /* Corner frost accumulation */
            radial-gradient(ellipse 35% 35% at 0% 0%, rgba(220, 250, 255, 0.6) 0%, transparent 70%),
            radial-gradient(ellipse 30% 30% at 100% 0%, rgba(200, 245, 255, 0.5) 0%, transparent 70%),
            radial-gradient(ellipse 30% 35% at 0% 100%, rgba(200, 245, 255, 0.45) 0%, transparent 70%),
            radial-gradient(ellipse 25% 30% at 100% 100%, rgba(180, 240, 255, 0.4) 0%, transparent 70%),
            /* Ice crystal sparkles */
            radial-gradient(2px 2px at 8% 15%, rgba(255, 255, 255, 1) 0%, transparent 100%),
            radial-gradient(2px 2px at 92% 20%, rgba(255, 255, 255, 0.95) 0%, transparent 100%),
            radial-gradient(3px 3px at 5% 85%, rgba(220, 250, 255, 1) 0%, transparent 100%),
            radial-gradient(2px 2px at 95% 80%, rgba(255, 255, 255, 0.9) 0%, transparent 100%),
            radial-gradient(2px 2px at 15% 50%, rgba(255, 255, 255, 0.85) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 88% 45%, rgba(220, 250, 255, 0.9) 0%, transparent 100%),
            radial-gradient(2px 2px at 25% 8%, rgba(255, 255, 255, 0.95) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 75% 92%, rgba(255, 255, 255, 0.85) 0%, transparent 100%);
          animation: frost-edge-breathe 3s ease-in-out infinite;
          pointer-events: none;
          z-index: 2;
          border-radius: inherit;
        }

        @keyframes frost-edge-breathe {
          0%, 100% {
            opacity: 0.85;
            filter: blur(0px);
          }
          50% {
            opacity: 1;
            filter: blur(0.5px);
          }
        }

        /* Ice border with crystals */
        .leaderboard-card :global(.team-race-row.leader-frost)::before {
          background: linear-gradient(180deg,
            rgba(200, 245, 255, 1) 0%,
            rgba(100, 220, 255, 1) 25%,
            rgba(0, 200, 255, 1) 50%,
            rgba(100, 220, 255, 1) 75%,
            rgba(200, 245, 255, 1) 100%
          );
          width: 5px;
          box-shadow: 5px 0 15px rgba(0, 200, 255, 0.4);
        }

        /* Frost text - frozen icy glow */
        .leaderboard-card :global(.team-race-row.leader-frost) .team-name-text {
          color: rgba(220, 250, 255, 1) !important;
          text-shadow:
            0 0 8px rgba(0, 220, 255, 1),
            0 0 16px rgba(100, 220, 255, 0.8),
            0 0 24px rgba(0, 180, 255, 0.5),
            0 1px 2px rgba(0, 0, 0, 0.5);
          position: relative;
          z-index: 5;
        }

        .leaderboard-card :global(.team-race-row.leader-frost) .rank-num {
          color: rgba(220, 250, 255, 1) !important;
          text-shadow: 0 0 10px rgba(0, 200, 255, 0.9);
        }

        .leaderboard-card :global(.team-race-row.leader-frost) .team-rank {
          background: rgba(0, 100, 150, 0.5);
          border-color: rgba(100, 220, 255, 0.6);
          position: relative;
          z-index: 5;
        }

        .leaderboard-card :global(.team-race-row.leader-frost) .team-score-value {
          color: rgba(220, 250, 255, 1) !important;
          text-shadow:
            0 0 8px rgba(0, 200, 255, 0.9),
            0 0 16px rgba(100, 220, 255, 0.6);
          position: relative;
          z-index: 5;
        }

        .leaderboard-card :global(.team-race-row.leader-frost) .team-member-count {
          color: rgba(200, 240, 255, 0.95);
          position: relative;
          z-index: 5;
        }

        .leaderboard-card :global(.team-race-row.leader-frost) .team-content {
          position: relative;
          z-index: 5;
        }

        .leaderboard-card :global(.team-race-row.leader-frost) .team-score-box {
          position: relative;
          z-index: 5;
        }

        /* Frozen progress bar */
        .leaderboard-card :global(.team-race-row.leader-frost) .progress-track {
          background: rgba(0, 80, 120, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.3);
        }

        .leaderboard-card :global(.team-race-row.leader-frost) :global(.progress-fill) {
          background: linear-gradient(90deg,
            rgba(0, 150, 200, 0.9),
            rgba(0, 200, 255, 1),
            rgba(150, 230, 255, 1)
          );
          box-shadow: 0 0 10px rgba(0, 200, 255, 0.6);
        }

        /* ☠️ VENOM - Smoke Lottie Effect */
        .leaderboard-card :global(.venom-smoke-lottie) {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 4;
          overflow: hidden;
          border-radius: inherit;
        }

        .leaderboard-card :global(.smoke-lottie) {
          position: absolute;
          width: 100%;
          height: 100%;
          filter: hue-rotate(80deg) saturate(1.5) brightness(1.1);
        }

        /* ☠️ VENOM - Toxic Poison Gas effect */
        .leaderboard-card :global(.team-race-row.leader-venom) {
          background:
            /* Toxic gas wisps */
            radial-gradient(ellipse 40% 30% at 15% 20%, rgba(80, 200, 50, 0.2) 0%, transparent 70%),
            radial-gradient(ellipse 35% 40% at 75% 70%, rgba(100, 220, 60, 0.15) 0%, transparent 70%),
            radial-gradient(ellipse 50% 25% at 50% 85%, rgba(60, 180, 40, 0.18) 0%, transparent 70%),
            radial-gradient(ellipse 30% 35% at 85% 25%, rgba(120, 230, 80, 0.12) 0%, transparent 70%),
            /* Poison bubbles */
            radial-gradient(circle at 10% 60%, rgba(100, 255, 100, 0.25) 0%, rgba(50, 200, 50, 0.1) 30%, transparent 50%),
            radial-gradient(circle at 30% 30%, rgba(80, 220, 80, 0.2) 0%, rgba(40, 180, 40, 0.08) 25%, transparent 45%),
            radial-gradient(circle at 70% 50%, rgba(100, 240, 100, 0.18) 0%, rgba(60, 200, 60, 0.06) 30%, transparent 50%),
            /* Dark toxic base */
            linear-gradient(135deg,
              rgba(10, 30, 10, 0.98) 0%,
              rgba(15, 40, 15, 0.96) 25%,
              rgba(20, 50, 20, 0.94) 50%,
              rgba(15, 40, 15, 0.96) 75%,
              rgba(10, 30, 10, 0.98) 100%
            );
          border: 2px solid rgba(100, 220, 80, 0.7) !important;
          box-shadow: inset 0 0 20px rgba(80, 200, 60, 0.15);
          overflow: visible !important;
        }

        /* Toxic gas/smoke overlay with rising bubbles */
        .leaderboard-card :global(.team-race-row.leader-venom)::after {
          content: '';
          position: absolute;
          inset: 0;
          background:
            /* Rising poison bubbles */
            radial-gradient(circle 8px at 8% 70%, rgba(100, 255, 100, 0.6) 0%, rgba(80, 220, 80, 0.3) 40%, transparent 70%),
            radial-gradient(circle 5px at 20% 85%, rgba(120, 255, 120, 0.5) 0%, rgba(100, 230, 100, 0.2) 50%, transparent 80%),
            radial-gradient(circle 6px at 35% 60%, rgba(80, 240, 80, 0.55) 0%, rgba(60, 200, 60, 0.25) 45%, transparent 75%),
            radial-gradient(circle 4px at 50% 75%, rgba(100, 255, 100, 0.5) 0%, rgba(80, 220, 80, 0.2) 50%, transparent 80%),
            radial-gradient(circle 7px at 65% 80%, rgba(120, 250, 120, 0.45) 0%, rgba(100, 220, 100, 0.2) 40%, transparent 70%),
            radial-gradient(circle 5px at 80% 65%, rgba(80, 230, 80, 0.5) 0%, rgba(60, 200, 60, 0.2) 50%, transparent 80%),
            radial-gradient(circle 6px at 90% 78%, rgba(100, 240, 100, 0.4) 0%, rgba(80, 210, 80, 0.15) 45%, transparent 75%),
            /* Gas haze */
            linear-gradient(0deg,
              rgba(80, 200, 60, 0.25) 0%,
              rgba(60, 180, 40, 0.1) 30%,
              transparent 60%
            );
          animation: venom-bubbles 3s ease-in-out infinite;
          pointer-events: none;
          border-radius: inherit;
          z-index: 2;
        }

        @keyframes venom-bubbles {
          0%, 100% {
            opacity: 0.7;
            transform: translateY(0);
          }
          50% {
            opacity: 1;
            transform: translateY(-3px);
          }
        }

        /* Toxic border */
        .leaderboard-card :global(.team-race-row.leader-venom)::before {
          background: linear-gradient(180deg,
            rgba(150, 255, 150, 1) 0%,
            rgba(100, 230, 100, 1) 25%,
            rgba(80, 200, 60, 1) 50%,
            rgba(100, 230, 100, 1) 75%,
            rgba(150, 255, 150, 1) 100%
          );
          width: 5px;
          box-shadow: 5px 0 15px rgba(100, 220, 80, 0.4);
          z-index: 5;
        }

        /* Venom text styling */
        .leaderboard-card :global(.team-race-row.leader-venom) .team-name-text {
          color: rgba(180, 255, 180, 1) !important;
          text-shadow:
            0 0 8px rgba(100, 230, 80, 1),
            0 0 16px rgba(80, 200, 60, 0.8),
            0 0 24px rgba(60, 180, 40, 0.5),
            0 1px 2px rgba(0, 0, 0, 0.7);
          position: relative;
          z-index: 5;
        }

        .leaderboard-card :global(.team-race-row.leader-venom) .rank-num {
          color: rgba(180, 255, 180, 1) !important;
          text-shadow: 0 0 10px rgba(100, 230, 80, 0.9);
        }

        .leaderboard-card :global(.team-race-row.leader-venom) .team-rank {
          background: rgba(20, 60, 20, 0.6);
          border-color: rgba(100, 220, 80, 0.6);
          position: relative;
          z-index: 5;
        }

        .leaderboard-card :global(.team-race-row.leader-venom) .team-score-value {
          color: rgba(180, 255, 180, 1) !important;
          text-shadow:
            0 0 8px rgba(100, 230, 80, 0.9),
            0 0 16px rgba(80, 200, 60, 0.6);
          position: relative;
          z-index: 5;
        }

        .leaderboard-card :global(.team-race-row.leader-venom) .team-member-count {
          color: rgba(160, 240, 160, 0.95);
          position: relative;
          z-index: 5;
        }

        .leaderboard-card :global(.team-race-row.leader-venom) .team-content {
          position: relative;
          z-index: 5;
        }

        .leaderboard-card :global(.team-race-row.leader-venom) .team-score-box {
          position: relative;
          z-index: 5;
        }

        /* Toxic progress bar */
        .leaderboard-card :global(.team-race-row.leader-venom) .progress-track {
          background: rgba(20, 50, 20, 0.6);
          border: 1px solid rgba(100, 200, 80, 0.3);
        }

        .leaderboard-card :global(.team-race-row.leader-venom) :global(.progress-fill) {
          background: linear-gradient(90deg,
            rgba(40, 150, 40, 0.9),
            rgba(80, 200, 60, 1),
            rgba(120, 240, 100, 1)
          );
          box-shadow: 0 0 10px rgba(100, 220, 80, 0.6);
        }

        /* 🌟 SOLAR - Radiant Sun effect */
        .leaderboard-card :global(.team-race-row.leader-solar) {
          background:
            /* Light particles - white hot */
            radial-gradient(3px 3px at 8% 25%, rgba(255, 255, 255, 1) 0%, transparent 100%),
            radial-gradient(4px 4px at 92% 35%, rgba(255, 255, 255, 1) 0%, transparent 100%),
            radial-gradient(3px 3px at 20% 75%, rgba(255, 255, 255, 0.95) 0%, transparent 100%),
            radial-gradient(3.5px 3.5px at 78% 85%, rgba(255, 255, 200, 1) 0%, transparent 100%),
            radial-gradient(4px 4px at 45% 20%, rgba(255, 255, 255, 1) 0%, transparent 100%),
            /* Sun glow - bright yellow/orange */
            radial-gradient(ellipse 80% 100% at 0% 50%, rgba(255, 230, 0, 0.6) 0%, transparent 50%),
            radial-gradient(ellipse 60% 80% at 15% 50%, rgba(255, 150, 0, 0.4) 0%, transparent 50%),
            /* White-hot core */
            radial-gradient(ellipse 40% 60% at 0% 50%, rgba(255, 255, 255, 0.8) 0%, transparent 50%),
            /* Bright orange base - NOT dark */
            linear-gradient(135deg,
              rgba(180, 80, 0, 0.95) 0%,
              rgba(200, 100, 0, 0.93) 25%,
              rgba(220, 120, 20, 0.9) 50%,
              rgba(200, 100, 0, 0.93) 75%,
              rgba(180, 80, 0, 0.95) 100%
            );
          border: 2px solid rgba(255, 200, 0, 0.9) !important;
          box-shadow: inset 0 0 20px rgba(255, 255, 150, 0.2);
          overflow: hidden !important;
        }


        /* Rotating sun rays - bright yellow */
        .leaderboard-card :global(.team-race-row.leader-solar)::after {
          content: '';
          position: absolute;
          /* Square element for equal ray lengths in all directions */
          width: 1000px;
          height: 1000px;
          top: calc(50% - 500px);
          left: -500px;
          background: repeating-conic-gradient(
            from 0deg at 50% 50%,
            rgba(255, 230, 0, 0.3) 0deg 6deg,
            transparent 6deg 18deg
          );
          /* Rotate around center of square */
          transform-origin: center center;
          animation: solar-rays-rotate 25s linear infinite;
          pointer-events: none;
          z-index: 1;
        }

        @keyframes solar-rays-rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        /* Solar border - bright sun glow */
        .leaderboard-card :global(.team-race-row.leader-solar)::before {
          background: linear-gradient(180deg,
            rgba(255, 255, 255, 1) 0%,
            rgba(255, 230, 0, 1) 25%,
            rgba(255, 160, 0, 1) 50%,
            rgba(255, 230, 0, 1) 75%,
            rgba(255, 255, 255, 1) 100%
          );
          width: 5px;
          box-shadow: 5px 0 15px rgba(255, 200, 0, 0.4);
          z-index: 5;
        }

        /* Solar text styling - bright yellow/white */
        .leaderboard-card :global(.team-race-row.leader-solar) .team-name-text {
          color: rgba(255, 255, 255, 1) !important;
          text-shadow:
            0 0 8px rgba(255, 240, 0, 1),
            0 0 16px rgba(255, 180, 0, 0.8),
            0 0 24px rgba(255, 120, 0, 0.5),
            0 1px 2px rgba(0, 0, 0, 0.5);
          position: relative;
          z-index: 5;
        }

        .leaderboard-card :global(.team-race-row.leader-solar) .rank-num {
          color: rgba(255, 255, 255, 1) !important;
          text-shadow: 0 0 10px rgba(255, 230, 0, 0.9);
        }

        .leaderboard-card :global(.team-race-row.leader-solar) .team-rank {
          background: rgba(180, 90, 0, 0.6);
          border-color: rgba(255, 230, 0, 0.6);
          position: relative;
          z-index: 5;
        }

        .leaderboard-card :global(.team-race-row.leader-solar) .team-score-value {
          color: rgba(255, 255, 255, 1) !important;
          text-shadow:
            0 0 8px rgba(255, 230, 0, 0.9),
            0 0 16px rgba(255, 150, 0, 0.6);
          position: relative;
          z-index: 5;
        }

        .leaderboard-card :global(.team-race-row.leader-solar) .team-member-count {
          color: rgba(255, 255, 240, 0.95);
          position: relative;
          z-index: 5;
        }

        .leaderboard-card :global(.team-race-row.leader-solar) .team-content {
          position: relative;
          z-index: 5;
        }

        .leaderboard-card :global(.team-race-row.leader-solar) .team-score-box {
          position: relative;
          z-index: 5;
        }

        /* Solar progress bar - bright sun */
        .leaderboard-card :global(.team-race-row.leader-solar) .progress-track {
          background: rgba(150, 70, 0, 0.6);
          border: 1px solid rgba(255, 220, 0, 0.3);
        }

        .leaderboard-card :global(.team-race-row.leader-solar) :global(.progress-fill) {
          background: linear-gradient(90deg,
            rgba(255, 130, 0, 0.9),
            rgba(255, 220, 0, 1),
            rgba(255, 255, 150, 1)
          );
          box-shadow: 0 0 10px rgba(255, 230, 0, 0.6);
        }

        .no-players {
          text-align: center;
          font-size: 1.6vh;
          color: var(--text-muted, rgba(255, 255, 255, 0.5));
          padding: 2vh;
        }

      `}</style>
    </div>
  );
}
