'use client';

import { useMemo, useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiSlash, CaretDown, CaretUp, User } from '@phosphor-icons/react';
import './Leaderboard.css';

/**
 * Leaderboard - Composant de classement réutilisable avec animations
 * - Score animé (compte progressivement)
 * - Triangle vert ▲ / rouge ▼ pour les changements de position
 * - Animation de glissement quand les positions changent
 * - Largeur fixe pour les scores (4 digits max)
 * - Support mode équipes: affiche les équipes avec scores agrégés
 */
export default function Leaderboard({ players = [], currentPlayerUid = null, mode = 'individuel', teams = {}, gameColor = '#8b5cf6', rankOffset = 0 }) {
  const prevPositionsRef = useRef({});
  const listRef = useRef(null);
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

  // Sort by score descending with real rank (handles ties)
  const sorted = useMemo(() => {
    const s = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
    let lastScore = null, lastRank = 0, seen = 0;
    return s.map((p) => {
      seen++;
      const sc = p.score || 0;
      const rank = (lastScore === sc) ? lastRank : seen;
      lastScore = sc;
      lastRank = rank;
      return { ...p, _rank: rank };
    });
  }, [players]);

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
  const posTimersRef = useRef([]);

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
        // Clear the indicator after 3s
        const timer = setTimeout(() => {
          setPositionChanges(prev => {
            const updated = { ...prev };
            delete updated[key];
            return updated;
          });
        }, 3000);
        posTimersRef.current.push(timer);
      }
    });

    // Only update state if there are actual changes to avoid infinite loop
    if (Object.keys(newChanges).length > 0) {
      setPositionChanges(prev => ({ ...prev, ...newChanges }));
    }
    prevPositionsRef.current = newPositions;

    // Cleanup timers on unmount or re-run
    return () => {
      posTimersRef.current.forEach(clearTimeout);
      posTimersRef.current = [];
    };
  }, [sorted, teamsArray, isTeamMode]);


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
    <div className="leaderboard-card" style={{ '--game-color': gameColor }}>
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
              <CaretUp size={16} weight="bold" />
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
                const animatedScore = team.score ?? 0;
                const progressPercent = maxTeamScore > 0 ? (animatedScore / maxTeamScore) * 100 : 0;

                return (
                  <div
                    key={`team_${team.id}`}
                    className={`team-race-row ${isLeader ? 'leader' : ''} ${isMyTeam ? 'my-team' : ''} ${posChange ? `moved-${posChange}` : ''}`}
                    style={{ '--team-color': team.color }}
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
                const hasScore = (p.score || 0) > 0;
                const realRank = p._rank + rankOffset;
                const rankClass = hasScore ? (realRank === 1 ? 'first' : realRank === 2 ? 'second' : realRank === 3 ? 'third' : '') : '';
                const posChange = positionChanges[p.uid];
                const animatedScore = p.score ?? 0;
                const playerTeam = getPlayerTeam(p);

                return (
                  <motion.div
                    key={p.uid}
                    layout
                    transition={{ type: 'spring', stiffness: 500, damping: 35, mass: 0.8 }}
                    className={`player-row ${rankClass} ${isMe ? 'is-me' : ''} ${isDisconnected ? 'disconnected' : ''} ${playerTeam ? 'has-team' : ''}`}
                    style={playerTeam ? { '--player-team-color': playerTeam.color } : undefined}
                  >
                    <span className="player-rank">
                      {hasScore && realRank <= 3 ? ['🥇', '🥈', '🥉'][realRank - 1] : <span className="rank-number">{realRank}</span>}
                    </span>
                    {playerTeam && (
                      <span className="team-badge" style={{ background: playerTeam.color }}>{playerTeam.initial}</span>
                    )}
                    <span className="player-name">
                      {p.name}
                      {isMe && <span className="you-badge">vous</span>}
                      {isDisconnected && <WifiSlash size={12} weight="bold" className="disconnected-icon" />}
                    </span>
                    <div className="score-area">
                      {posChange && (
                        <span className={`pos-triangle ${posChange}`}>{posChange === 'up' ? '▲' : '▼'}</span>
                      )}
                      <span className="player-score">{animatedScore}</span>
                    </div>
                  </motion.div>
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
              <CaretDown size={16} weight="bold" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
