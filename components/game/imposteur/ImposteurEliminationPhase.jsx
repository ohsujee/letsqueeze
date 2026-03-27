"use client";

import ImposteurMrWhiteGuess from '@/components/game/ImposteurMrWhiteGuess';
import ImposteurEliminationReveal from '@/components/game/ImposteurEliminationReveal';

/**
 * Wrapper for the 3 elimination sub-states:
 * 1. Mr. White is guessing (input mode for Mr. White, spectator for others)
 * 2. Mr. White guess result is available (result display)
 * 3. Normal elimination reveal with slot machine
 */
export default function ImposteurEliminationPhase({
  isMrWhiteGuessing,
  amIMrWhite,
  lastEliminatedUid,
  myUid,
  eliminatedPlayer,
  eliminatedRole,
  state,
  onMrWhiteGuess,
  onContinue,
  isHost,
}) {
  // Sub-state 1: Mr. White is actively guessing
  if (isMrWhiteGuessing) {
    return (
      <ImposteurMrWhiteGuess
        isMe={amIMrWhite && lastEliminatedUid === myUid}
        onSubmitGuess={onMrWhiteGuess}
        mrWhiteGuess={state?.mrWhiteGuess}
        mrWhiteGuessCorrect={state?.mrWhiteGuessCorrect}
        playerName={eliminatedPlayer?.name}
      />
    );
  }

  // Sub-state 2: Mr. White guess result available (guess was submitted)
  if (state?.mrWhiteGuess !== null && state?.mrWhiteGuess !== undefined) {
    return (
      <ImposteurMrWhiteGuess
        isMe={false}
        mrWhiteGuess={state.mrWhiteGuess}
        mrWhiteGuessCorrect={state.mrWhiteGuessCorrect}
        playerName={eliminatedPlayer?.name}
      />
    );
  }

  // Sub-state 3: Normal elimination reveal with slot machine
  return (
    <ImposteurEliminationReveal
      eliminatedPlayer={eliminatedPlayer}
      role={eliminatedRole?.role}
      word={eliminatedRole?.word}
      mrWhiteEnabled={!!state?.mrWhiteEnabled}
      onContinue={onContinue}
      isHost={isHost}
      isMrWhiteGuessing={isMrWhiteGuessing}
    />
  );
}
