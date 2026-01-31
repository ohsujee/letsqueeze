import { useState, useEffect } from 'react';

/**
 * Shared countdown tick hook
 * Provides a single interval for all countdown consumers
 * Updates every second only when there are active subscribers
 */

let globalTick = Date.now();
let listeners = new Set();
let intervalId = null;

function startInterval() {
  if (intervalId) return;

  intervalId = setInterval(() => {
    globalTick = Date.now();
    listeners.forEach(listener => listener(globalTick));
  }, 1000);
}

function stopInterval() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

/**
 * Hook that provides a tick value that updates every second
 * Only runs the interval when at least one component is subscribed
 * @returns {number} Current timestamp (updates every second)
 */
export function useCountdownTick() {
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    // Subscribe
    listeners.add(setTick);

    // Start interval if this is the first subscriber
    if (listeners.size === 1) {
      startInterval();
    }

    // Cleanup
    return () => {
      listeners.delete(setTick);

      // Stop interval if no more subscribers
      if (listeners.size === 0) {
        stopInterval();
      }
    };
  }, []);

  return tick;
}

/**
 * Calculate countdown from a target date
 * @param {string|Date} targetDate - The target date
 * @param {number} now - Current timestamp
 * @returns {Object|null} - { days, hours, minutes, seconds } or null if passed
 */
export function calculateCountdown(targetDate, now) {
  const target = new Date(targetDate);
  const diff = target - now;

  if (diff <= 0) return null;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds };
}
