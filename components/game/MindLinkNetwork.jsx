'use client';

import { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ACCENT = '#ec4899';
const ACCENT_GLOW = 'rgba(236, 72, 153, 0.5)';

/**
 * MindLinkNetwork - SVG neural network visualization
 *
 * Players appear as nodes arranged in a circle, connected by lines.
 * Active links pulse with energy between the connected nodes.
 *
 * @param {Array} players - All players [{ uid, name, role }]
 * @param {string} myUid - Current user's UID
 * @param {Object} activeLink - Current link state from Firebase
 * @param {string} accentColor - Theme color
 */
export default function MindLinkNetwork({
  players = [],
  myUid,
  activeLink = null,
  accentColor = ACCENT,
}) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 300, height: 300 });
  const [energyOffset, setEnergyOffset] = useState(0);

  // Responsive sizing — measure actual container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const w = Math.min(el.clientWidth, 400);
      if (w > 0) setDimensions({ width: w, height: w });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Animate energy flow on active connections
  useEffect(() => {
    if (!activeLink || !['announcing', 'waiting', 'choosing', 'countdown'].includes(activeLink.phase)) return;
    const interval = setInterval(() => {
      setEnergyOffset(prev => (prev + 2) % 20);
    }, 50);
    return () => clearInterval(interval);
  }, [activeLink?.phase]);

  const { width, height } = dimensions;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.38;
  const nodeRadius = Math.min(22, width * 0.06);

  // Calculate node positions
  const nodePositions = useMemo(() => {
    if (players.length === 0) return [];
    // Start from top (-PI/2) and go clockwise
    const angleStep = (2 * Math.PI) / players.length;
    return players.map((player, i) => {
      const angle = -Math.PI / 2 + i * angleStep;
      return {
        ...player,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        angle,
        index: i,
      };
    });
  }, [players, cx, cy, radius]);

  // Generate all connections between nodes
  const connections = useMemo(() => {
    const conns = [];
    for (let i = 0; i < nodePositions.length; i++) {
      for (let j = i + 1; j < nodePositions.length; j++) {
        conns.push({
          from: nodePositions[i],
          to: nodePositions[j],
          key: `${nodePositions[i].uid}-${nodePositions[j].uid}`,
        });
      }
    }
    return conns;
  }, [nodePositions]);

  // Determine connection states
  const getConnectionState = (conn) => {
    if (!activeLink) return 'dormant';

    const { initiatorUid, chosenUid, candidates, phase } = activeLink;
    const uids = [conn.from.uid, conn.to.uid];
    const hasInitiator = uids.includes(initiatorUid);

    // Skip connections involving defenders (they don't link)
    const otherUid = uids.find(uid => uid !== initiatorUid);
    const otherNode = otherUid === conn.from.uid ? conn.from : conn.to;
    const isOtherDefender = otherNode.role === 'defender';

    // Active link between initiator and chosen
    if (hasInitiator && uids.includes(chosenUid)) {
      if (['countdown', 'reveal', 'result'].includes(phase)) return 'active';
    }

    // Candidate connections (only between attackers)
    if (hasInitiator && !isOtherDefender && candidates) {
      const candidateUids = Object.keys(candidates);
      if (candidateUids.some(uid => uids.includes(uid))) {
        if (phase === 'waiting' || phase === 'choosing') return 'candidate';
      }
    }

    // Initiator highlighted (only to other attackers)
    if (hasInitiator && !isOtherDefender && ['announcing', 'clue', 'waiting', 'choosing'].includes(phase)) return 'initiator';

    return 'dormant';
  };

  // Determine node state
  const getNodeState = (node) => {
    if (!activeLink) return 'idle';

    const { initiatorUid, chosenUid, candidates, phase, defenderIntercept } = activeLink;

    if (node.uid === initiatorUid) return 'initiator';
    if (node.uid === chosenUid && ['countdown', 'reveal', 'result'].includes(phase)) return 'linked';
    if (candidates && node.uid in candidates && ['waiting', 'choosing'].includes(phase)) return 'candidate';
    if (defenderIntercept?.defenderUid === node.uid) return 'intercepting';

    return 'idle';
  };

  // Connection colors and styles
  const connectionStyles = {
    dormant: { stroke: 'rgba(236, 72, 153, 0.06)', strokeWidth: 0.5, opacity: 1 },
    initiator: { stroke: 'rgba(236, 72, 153, 0.15)', strokeWidth: 0.8, opacity: 1 },
    candidate: { stroke: accentColor, strokeWidth: 1.5, opacity: 0.4 },
    active: { stroke: accentColor, strokeWidth: 2.5, opacity: 0.9 },
  };

  // Node colors
  const nodeColors = {
    idle: {
      fill: 'rgba(236, 72, 153, 0.08)',
      stroke: 'rgba(236, 72, 153, 0.2)',
      textColor: 'rgba(238, 242, 255, 0.6)',
    },
    initiator: {
      fill: 'rgba(236, 72, 153, 0.2)',
      stroke: accentColor,
      textColor: accentColor,
    },
    candidate: {
      fill: 'rgba(236, 72, 153, 0.15)',
      stroke: 'rgba(236, 72, 153, 0.5)',
      textColor: 'rgba(238, 242, 255, 0.8)',
    },
    linked: {
      fill: 'rgba(236, 72, 153, 0.25)',
      stroke: accentColor,
      textColor: accentColor,
    },
    intercepting: {
      fill: 'rgba(239, 68, 68, 0.2)',
      stroke: '#ef4444',
      textColor: '#ef4444',
    },
  };

  // Clue text to display in center (hide "(oral)" placeholder)
  const clueText = activeLink?.clue || null;
  const showClue = clueText && clueText !== '(oral)' && ['waiting', 'choosing', 'countdown'].includes(activeLink?.phase);

  return (
    <div ref={containerRef} style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      width: '100%', position: 'relative',
    }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        style={{ overflow: 'visible' }}
      >
        {/* Definitions */}
        <defs>
          <filter id="glow-node" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-strong" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="center-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.15" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Center glow */}
        <circle cx={cx} cy={cy} r={radius * 0.35} fill="url(#center-glow)" />

        {/* Connections */}
        {connections.map((conn) => {
          const state = getConnectionState(conn);
          const style = connectionStyles[state];

          // Calculate edge-to-edge line endpoints (stop at circle border)
          const dx = conn.to.x - conn.from.x;
          const dy = conn.to.y - conn.from.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist === 0) return null;
          const ux = dx / dist;
          const uy = dy / dist;
          const rFrom = conn.from.role === 'defender' ? nodeRadius * 1.15 : nodeRadius;
          const rTo = conn.to.role === 'defender' ? nodeRadius * 1.15 : nodeRadius;
          const pad = 3; // small gap between line and circle
          const x1 = conn.from.x + ux * (rFrom + pad);
          const y1 = conn.from.y + uy * (rFrom + pad);
          const x2 = conn.to.x - ux * (rTo + pad);
          const y2 = conn.to.y - uy * (rTo + pad);

          return (
            <g key={conn.key}>
              <motion.line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={style.stroke}
                strokeWidth={style.strokeWidth}
                strokeLinecap="round"
                initial={{ opacity: 0 }}
                animate={{ opacity: style.opacity }}
                transition={{ duration: 0.4 }}
              />
              {/* Energy flow animation for active connections */}
              {state === 'active' && (
                <motion.line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={accentColor}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeDasharray="4 16"
                  strokeDashoffset={energyOffset}
                  filter="url(#glow-node)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.8 }}
                />
              )}
              {/* Candidate pulse */}
              {state === 'candidate' && (
                <motion.line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={accentColor}
                  strokeWidth={1}
                  strokeDasharray="3 12"
                  strokeDashoffset={energyOffset}
                  animate={{ opacity: [0.2, 0.5, 0.2] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {nodePositions.map((node) => {
          const state = getNodeState(node);
          const colors = nodeColors[state] || nodeColors.idle;
          const isDefender = node.role === 'defender';
          const isMe = node.uid === myUid;
          const r = isDefender ? nodeRadius * 1.15 : nodeRadius;

          // Initials
          const initials = (node.name || '?').slice(0, 2).toUpperCase();

          return (
            <g key={node.uid}>
              {/* Pulse ring for active states */}
              {(state === 'initiator' || state === 'linked') && (
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  r={r + 8}
                  fill="none"
                  stroke={accentColor}
                  strokeWidth={1}
                  animate={{
                    scale: [0.85, 1.2, 0.85],
                    opacity: [0.4, 0, 0.4],
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}

              {/* Intercepting pulse (red) */}
              {state === 'intercepting' && (
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  r={r + 7}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  animate={{
                    scale: [0.85, 1.15, 0.85],
                    opacity: [0.6, 0, 0.6],
                  }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}

              {/* Main node circle */}
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={r}
                fill={colors.fill}
                stroke={colors.stroke}
                strokeWidth={isMe ? 2 : 1.5}
                filter={state !== 'idle' ? 'url(#glow-node)' : undefined}
                initial={{ scale: 0 }}
                animate={{
                  scale: 1,
                  // Idle breathing
                  ...(state === 'idle' ? {} : {}),
                }}
                transition={{
                  scale: { delay: node.index * 0.08, type: 'spring', stiffness: 200 },
                }}
              />

              {/* Defender shield indicator */}
              {isDefender && (
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  r={r}
                  fill="none"
                  stroke={colors.stroke}
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                  transition={{ delay: node.index * 0.08 + 0.3 }}
                />
              )}

              {/* Initials text */}
              <motion.text
                x={node.x}
                y={node.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={colors.textColor}
                fontSize={r * 0.7}
                fontWeight={700}
                fontFamily="var(--font-display, 'Space Grotesk'), sans-serif"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: node.index * 0.08 + 0.2 }}
              >
                {initials}
              </motion.text>

              {/* Name label below node */}
              <motion.text
                x={node.x}
                y={node.y + r + 14}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isMe ? accentColor : 'rgba(238, 242, 255, 0.4)'}
                fontSize={9}
                fontWeight={isMe ? 700 : 500}
                fontFamily="var(--font-display, 'Space Grotesk'), sans-serif"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: node.index * 0.08 + 0.3 }}
              >
                {(node.name || '').slice(0, 8)}
                {isMe ? ' •' : ''}
              </motion.text>

              {/* "Me" dot for current user */}
              {isMe && (
                <motion.circle
                  cx={node.x + r * 0.7}
                  cy={node.y - r * 0.7}
                  r={3}
                  fill={accentColor}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: node.index * 0.08 + 0.4 }}
                />
              )}
            </g>
          );
        })}

        {/* Center clue display */}
        <AnimatePresence>
          {showClue && (
            <motion.g
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              {/* Clue background */}
              <motion.rect
                x={cx - 70}
                y={cy - 22}
                width={140}
                height={44}
                rx={12}
                fill="rgba(8, 14, 32, 0.92)"
                stroke={`${accentColor}44`}
                strokeWidth={1}
              />
              {/* Clue text */}
              <motion.text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#eef2ff"
                fontSize={14}
                fontWeight={800}
                fontFamily="var(--font-title, 'Bungee'), cursive"
                style={{ pointerEvents: 'none' }}
              >
                « {clueText.length > 12 ? clueText.slice(0, 12) + '…' : clueText} »
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Center idle indicator (when no link active) */}
        {!activeLink && (
          <motion.circle
            cx={cx}
            cy={cy}
            r={4}
            fill={accentColor}
            animate={{
              opacity: [0.2, 0.5, 0.2],
              scale: [0.75, 1.25, 0.75],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </svg>
    </div>
  );
}
