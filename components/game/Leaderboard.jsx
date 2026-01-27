'use client';

import { useMemo, useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, ChevronDown, ChevronUp, User } from 'lucide-react';

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

  // View toggle for team mode (teams vs individual players)
  const isTeamModeRoom = mode === 'équipes';
  const hasTeams = teams && Object.keys(teams).length > 0;
  // Only allow toggle if we're in team mode AND have teams data
  const canToggle = isTeamModeRoom && hasTeams;
  // Track if user has manually toggled (to not override their choice)
  const userHasToggledRef = useRef(false);
  // Track if animation should be skipped (for initial auto-switch)
  const skipAnimationRef = useRef(true);
  // Initialize to 'teams' only if in team mode AND teams exist
  const [viewMode, setViewMode] = useState(() => (isTeamModeRoom && hasTeams) ? 'teams' : 'players');
  const [slideDirection, setSlideDirection] = useState(0); // -1 = left, 1 = right

  // Auto-switch to teams view when teams data arrives (if user hasn't manually toggled)
  // Only do this if we're actually in team mode
  // useLayoutEffect runs synchronously before paint, preventing flash
  useLayoutEffect(() => {
    if (isTeamModeRoom && hasTeams && viewMode === 'players' && !userHasToggledRef.current) {
      skipAnimationRef.current = true; // Skip animation for auto-switch
      setViewMode('teams');
    }
    // If mode switches to individual, reset to players view
    if (!isTeamModeRoom && viewMode === 'teams') {
      skipAnimationRef.current = true;
      setViewMode('players');
    }
  }, [isTeamModeRoom, hasTeams, viewMode]);

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

    // Check if overflow actually allows scrolling
    const computedStyle = window.getComputedStyle(list);
    const overflowY = computedStyle.overflowY;
    const canActuallyScroll = overflowY === 'auto' || overflowY === 'scroll';

    if (!canActuallyScroll) {
      setCanScrollUp(false);
      setCanScrollDown(false);
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = list;
    const threshold = 5; // Small threshold for rounding errors

    setCanScrollUp(scrollTop > threshold);
    setCanScrollDown(scrollTop + clientHeight < scrollHeight - threshold);
  }, []);

  // Monitor scroll position
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    // Initial check (with small delay to ensure styles are applied)
    const initialCheck = setTimeout(checkScroll, 50);

    // Listen to scroll events
    list.addEventListener('scroll', checkScroll);

    // Also check when content changes (players added/removed)
    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(list);

    return () => {
      clearTimeout(initialCheck);
      list.removeEventListener('scroll', checkScroll);
      resizeObserver.disconnect();
    };
  }, [checkScroll, players.length, viewMode]);

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

                // Map team themes to PNG images (leader only)
                const teamBgImage = isLeader && ['blaze', 'frost', 'venom', 'solar'].includes(teamTheme)
                  ? `/images/${teamTheme}.png`
                  : null;

                return (
                  <div
                    key={`team_${team.id}`}
                    className={`team-race-row ${isLeader ? 'leader' : ''} ${isMyTeam ? 'my-team' : ''} ${posChange ? `moved-${posChange}` : ''} ${teamBgImage ? `team-${teamTheme}` : ''}`}
                    style={{
                      '--team-color': team.color,
                      '--team-bg-image': teamBgImage ? `url(${teamBgImage})` : 'none'
                    }}
                  >
                    {isMyTeam && (
                      <div className="my-team-indicator">
                        <User size={12} />
                      </div>
                    )}
                    <div className="team-rank"><span className="rank-num">{i + 1}</span></div>
                    <div className="team-content">
                      <span className="team-name-text">{team.name}</span>
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

        /* My team highlight - thicker border for emphasis */
        .leaderboard-card :global(.team-race-row.my-team) {
          border-width: 3px !important;
          border-color: var(--team-color) !important;
          box-shadow: 0 0 12px color-mix(in srgb, var(--team-color) 40%, transparent),
                      inset 0 0 20px color-mix(in srgb, var(--team-color) 10%, transparent);
        }

        /* Post-it style indicator for player's team */
        .my-team-indicator {
          position: absolute;
          top: -1px;
          right: -1px;
          width: 24px;
          height: 24px;
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          border-radius: 0 8px 0 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1a1a1a;
          box-shadow: -2px 2px 4px rgba(0, 0, 0, 0.3),
                      0 0 8px rgba(251, 191, 36, 0.5);
          z-index: 10;
        }

        .my-team-indicator::before {
          content: '';
          position: absolute;
          bottom: -3px;
          left: 0;
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-top: 6px solid #d97706;
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
          padding-top: 2vh !important;
          padding-bottom: 2vh !important;
          /* No min-height - let flex handle sizing */
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
          font-size: 0.9rem;
          color: var(--team-color);
          text-shadow: 0 0 8px color-mix(in srgb, var(--team-color) 40%, transparent);
          letter-spacing: 0.02em;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 6px;
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

        /* ===== TEAM-SPECIFIC EFFECTS (PNG backgrounds) ===== */

        /* Common styles for all teams with PNG backgrounds */
        .leaderboard-card :global(.team-race-row.team-blaze),
        .leaderboard-card :global(.team-race-row.team-frost),
        .leaderboard-card :global(.team-race-row.team-venom),
        .leaderboard-card :global(.team-race-row.team-solar) {
          background-image: var(--team-bg-image);
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          border-width: 2px !important;
          position: relative;
        }

        /* Dark overlay for readability */
        .leaderboard-card :global(.team-race-row.team-blaze)::after,
        .leaderboard-card :global(.team-race-row.team-frost)::after,
        .leaderboard-card :global(.team-race-row.team-venom)::after,
        .leaderboard-card :global(.team-race-row.team-solar)::after {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          border-radius: inherit;
          pointer-events: none;
          z-index: 1;
        }

        /* Ensure text is readable over PNG backgrounds */
        .leaderboard-card :global(.team-race-row.team-blaze) .team-rank,
        .leaderboard-card :global(.team-race-row.team-blaze) .team-content,
        .leaderboard-card :global(.team-race-row.team-blaze) .team-score-box,
        .leaderboard-card :global(.team-race-row.team-frost) .team-rank,
        .leaderboard-card :global(.team-race-row.team-frost) .team-content,
        .leaderboard-card :global(.team-race-row.team-frost) .team-score-box,
        .leaderboard-card :global(.team-race-row.team-venom) .team-rank,
        .leaderboard-card :global(.team-race-row.team-venom) .team-content,
        .leaderboard-card :global(.team-race-row.team-venom) .team-score-box,
        .leaderboard-card :global(.team-race-row.team-solar) .team-rank,
        .leaderboard-card :global(.team-race-row.team-solar) .team-content,
        .leaderboard-card :global(.team-race-row.team-solar) .team-score-box {
          position: relative;
          z-index: 5;
        }

        /* 🔥 BLAZE */
        .leaderboard-card :global(.team-race-row.team-blaze) {
          border-color: rgba(255, 120, 40, 0.8) !important;
        }

        .leaderboard-card :global(.team-race-row.team-blaze) .team-name-text,
        .leaderboard-card :global(.team-race-row.team-blaze) .team-score-value {
          text-shadow: 0 0 10px rgba(0, 0, 0, 0.9), 0 2px 4px rgba(0, 0, 0, 1);
        }

        /* ❄️ FROST */
        .leaderboard-card :global(.team-race-row.team-frost) {
          border-color: rgba(180, 240, 255, 0.8) !important;
        }

        .leaderboard-card :global(.team-race-row.team-frost) .team-name-text {
          color: rgba(220, 250, 255, 1) !important;
          text-shadow: 0 0 8px rgba(0, 220, 255, 1), 0 1px 2px rgba(0, 0, 0, 0.5);
        }

        .leaderboard-card :global(.team-race-row.team-frost) .rank-num {
          color: rgba(220, 250, 255, 1) !important;
        }

        .leaderboard-card :global(.team-race-row.team-frost) .team-score-value {
          color: rgba(220, 250, 255, 1) !important;
          text-shadow: 0 0 8px rgba(0, 200, 255, 0.9);
        }

        /* ☠️ VENOM */
        .leaderboard-card :global(.team-race-row.team-venom) {
          border-color: rgba(100, 220, 80, 0.7) !important;
        }

        .leaderboard-card :global(.team-race-row.team-venom) .team-name-text {
          color: rgba(180, 255, 180, 1) !important;
          text-shadow: 0 0 8px rgba(100, 230, 80, 1), 0 1px 2px rgba(0, 0, 0, 0.7);
        }

        .leaderboard-card :global(.team-race-row.team-venom) .rank-num {
          color: rgba(180, 255, 180, 1) !important;
        }

        .leaderboard-card :global(.team-race-row.team-venom) .team-score-value {
          color: rgba(180, 255, 180, 1) !important;
          text-shadow: 0 0 8px rgba(100, 230, 80, 0.9);
        }

        /* ☀️ SOLAR */
        .leaderboard-card :global(.team-race-row.team-solar) {
          border-color: rgba(255, 200, 0, 0.9) !important;
        }

        .leaderboard-card :global(.team-race-row.team-solar) .team-name-text {
          color: rgba(255, 255, 255, 1) !important;
          text-shadow: 0 0 8px rgba(255, 240, 0, 1), 0 1px 2px rgba(0, 0, 0, 0.5);
        }

        .leaderboard-card :global(.team-race-row.team-solar) .rank-num {
          color: rgba(255, 255, 255, 1) !important;
        }

        .leaderboard-card :global(.team-race-row.team-solar) .team-score-value {
          color: rgba(255, 255, 255, 1) !important;
          text-shadow: 0 0 8px rgba(255, 230, 0, 0.9);
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
