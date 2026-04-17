'use client';

/**
 * DailyLeaderboard — leaderboard complet flat cartoon pour les jeux daily.
 *
 * Props :
 *  - firebaseNode : string (ex: 'daily/semantic', 'daily/wordle', 'daily/total')
 *  - todayDate    : string (YYYY-MM-DD)
 *  - renderMeta   : (entry, tab) => string   (meta sous le score, ex: "4 essais")
 *  - formatScore  : (entry) => string        (ex: "4 200 pts")
 *  - yesterdayWord: string | null (optionnel — affiche "Le mot d'hier était X")
 *  - emptyEmoji   : string (ex: '🧠')
 *  - emptyText    : string
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import Avatar from '@/components/ui/Avatar';
import { useDailyLeaderboard, assignRanks, getDayLabel, getWeekLabel, getFullWeekDates } from './useDailyLeaderboard';

const RANK_CLASS = ['gold', 'silver', 'bronze'];
const RANK_MEDAL = ['🥇', '🥈', '🥉'];
const DAY_LABELS = ['lu', 'ma', 'me', 'je', 've', 'sa', 'di'];

function WeekProgressBar({ todayDate, weekOffset }) {
  const allDates = getFullWeekDates(todayDate);
  const isPastWeek = weekOffset < 0;
  const todayIdx = isPastWeek ? 6 : allDates.indexOf(todayDate);
  const scaleX = todayIdx > 0 ? todayIdx / 6 : 0;

  return (
    <div className="daily-week-bar">
      <div className="daily-week-pips">
        <div className="daily-week-line-bg" />
        {todayIdx > 0 && (
          <motion.div
            className="daily-week-line-filled"
            initial={{ scaleX: 0 }}
            animate={{ scaleX }}
            transition={{ duration: 0.55, ease: 'easeOut', delay: 0.1 }}
          />
        )}
        {allDates.map((date, i) => {
          const state = isPastWeek ? 'past' : (date < todayDate ? 'past' : date === todayDate ? 'today' : 'future');
          return (
            <div key={date} className="daily-week-cell">
              <motion.div
                className={`daily-week-pip ${state}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.05, duration: 0.2, ease: 'easeOut' }}
              />
            </div>
          );
        })}
      </div>
      <div className="daily-week-lbls">
        {allDates.map((date, i) => {
          const state = isPastWeek ? 'past' : (date < todayDate ? 'past' : date === todayDate ? 'today' : 'future');
          return <span key={date} className={`daily-week-lbl ${state}`}>{DAY_LABELS[i]}</span>;
        })}
      </div>
    </div>
  );
}

function LbRow({ entry, rank, isMe, meta, formatScore, maxScore, animDelay = 0 }) {
  const pct = Math.max(10, ((entry.score || 0) / maxScore) * 100);
  const podiumClass = RANK_CLASS[rank - 1] || '';
  const rowClass = podiumClass
    ? `${podiumClass}${isMe ? ' is-me' : ''}`
    : (isMe ? 'me' : '');

  return (
    <motion.div
      layout
      className={`daily-lb-row ${rowClass}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: animDelay, duration: 0.22, layout: { duration: 0.25, ease: 'easeOut' } }}
    >
      <div className="daily-lb-row-top">
        <Avatar
          size="sm"
          initial={(entry.name || '?')[0]?.toUpperCase()}
          avatarId={entry.avatar?.id}
          avatarColor={entry.avatar?.color}
        />
        {rank <= 3
          ? <span className="daily-lb-rank medal">{RANK_MEDAL[rank - 1]}</span>
          : <span className="daily-lb-rank num">{rank}</span>}
        <span className="daily-lb-name">{entry.name}</span>
        {isMe && <span className="daily-lb-me-badge">Toi</span>}
        <div className="daily-lb-right">
          <span className="daily-lb-score">{formatScore(entry)}</span>
          {meta && <span className="daily-lb-meta">{meta}</span>}
        </div>
      </div>
      <div className="daily-lb-bar-track">
        <motion.div
          className="daily-lb-bar-fill"
          style={{ width: `${pct}%`, transformOrigin: 'left center' }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: animDelay + 0.08, duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
  );
}

function LbRows({ entries, myUid, renderMeta, formatScore, tab, emptyEmoji, emptyText }) {
  if (!entries || entries.length === 0) {
    return (
      <div className="daily-lb-empty">
        <span>{emptyEmoji}</span>
        <p>{emptyText}</p>
      </div>
    );
  }
  const maxScore = entries.reduce((max, e) => Math.max(max, e.score || 0), 1);
  const myEntry = myUid ? entries.find((e) => e.uid === myUid) : null;
  const ranks = assignRanks(entries);
  const myRank = myEntry ? ranks[entries.findIndex((e) => e.uid === myUid)] : 0;
  const top100 = entries.slice(0, 100);
  const top100Ranks = ranks.slice(0, 100);

  return (
    <>
      {myEntry && (
        <div className="daily-lb-my-pin">
          <p className="daily-lb-my-pin-label">Ma position · #{myRank}</p>
          <LbRow
            entry={myEntry}
            rank={myRank}
            isMe
            meta={renderMeta ? renderMeta(myEntry, tab) : null}
            formatScore={formatScore}
            maxScore={maxScore}
          />
        </div>
      )}
      <div className="daily-lb-list-header">
        <span>{entries.length} joueur{entries.length > 1 ? 's' : ''}</span>
        <span>Score</span>
      </div>
      <div className="daily-lb-list">
        {top100.map((entry, idx) => (
          <LbRow
            key={entry.uid}
            entry={entry}
            rank={top100Ranks[idx]}
            isMe={entry.uid === myUid}
            meta={renderMeta ? renderMeta(entry, tab) : null}
            formatScore={formatScore}
            maxScore={maxScore}
            animDelay={idx * 0.03}
          />
        ))}
      </div>
    </>
  );
}

export default function DailyLeaderboard({
  firebaseNode,
  todayDate,
  renderMeta,
  formatScore = (e) => Math.round(e.score || 0).toLocaleString('fr-FR'),
  yesterdayWord = null,
  emptyEmoji = '🏆',
  emptyText = 'Personne encore — sois le premier !',
}) {
  const [lbTab, setLbTab] = useState('today');
  const lb = useDailyLeaderboard({ firebaseNode, todayDate, lbTab });

  return (
    <div className="daily-lb">
      {yesterdayWord && (
        <div className="daily-lb-yesterday">
          Le mot d&apos;hier était&nbsp;<strong>{yesterdayWord}</strong>
        </div>
      )}

      <div className="daily-lb-tabs">
        <div className="daily-lb-tab-indicator" style={{ transform: lbTab === 'week' ? 'translateX(100%)' : 'translateX(0)' }} />
        <button
          className={`daily-lb-tab${lbTab === 'today' ? ' active' : ''}`}
          onClick={() => setLbTab('today')}
        >
          Aujourd&apos;hui
        </button>
        <button
          className={`daily-lb-tab${lbTab === 'week' ? ' active' : ''}`}
          onClick={() => setLbTab('week')}
        >
          Cette semaine
        </button>
      </div>

      {/* Carrousel Today ↔ Week */}
      <div className="daily-tab-carousel">
        <div className="daily-tab-track" style={{ transform: lbTab === 'week' ? 'translateX(-100%)' : 'translateX(0)' }}>
          {/* Slide Today */}
          <div className="daily-tab-slide" style={{ overflowY: 'auto' }}>
            {todayDate && (
              <div className="daily-lb-nav">
                <button
                  className="daily-lb-nav-btn"
                  onClick={() => lb.setDayOffset((o) => o - 1)}
                  disabled={lb.dayOffset <= -7}
                >‹</button>
                <span className="daily-lb-nav-label">
                  {lb.dayOffset === 0 ? "Aujourd'hui" : getDayLabel(lb.getDateForOffset(lb.dayOffset))}
                </span>
                <button
                  className="daily-lb-nav-btn"
                  onClick={() => lb.setDayOffset((o) => o + 1)}
                  disabled={lb.dayOffset >= 0}
                >›</button>
              </div>
            )}
            {lb.dayLoading ? (
              <div className="daily-lb-loading">
                <div className="daily-spinner" />
                <p>Chargement…</p>
              </div>
            ) : (
              <LbRows
                entries={lb.dayEntries}
                myUid={lb.myUid}
                renderMeta={renderMeta}
                formatScore={formatScore}
                tab="today"
                emptyEmoji={emptyEmoji}
                emptyText={emptyText}
              />
            )}
          </div>

          {/* Slide Week */}
          <div className="daily-tab-slide" style={{ overflowY: 'auto' }}>
            {todayDate && (
              <div className="daily-lb-nav">
                <button
                  className="daily-lb-nav-btn"
                  onClick={() => lb.setWeekOffset((o) => o - 1)}
                  disabled={lb.weekOffset <= -4}
                >‹</button>
                <span className="daily-lb-nav-label">
                  {lb.weekOffset === 0 ? 'Cette semaine' : getWeekLabel(todayDate, lb.weekOffset)}
                </span>
                <button
                  className="daily-lb-nav-btn"
                  onClick={() => lb.setWeekOffset((o) => o + 1)}
                  disabled={lb.weekOffset >= 0}
                >›</button>
              </div>
            )}
            {todayDate && <WeekProgressBar todayDate={todayDate} weekOffset={lb.weekOffset} />}
            {lb.weekLoading ? (
              <div className="daily-lb-loading">
                <div className="daily-spinner" />
                <p>Chargement…</p>
              </div>
            ) : (
              <LbRows
                entries={lb.weekEntries}
                myUid={lb.myUid}
                renderMeta={renderMeta}
                formatScore={formatScore}
                tab="week"
                emptyEmoji={emptyEmoji}
                emptyText={emptyText}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
