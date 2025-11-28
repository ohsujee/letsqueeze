"use client";
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useGameAudio } from '@/hooks/useGameAudio';

export const GameStartCountdown = ({ onComplete }) => {
  const [count, setCount] = useState(3);
  const audio = useGameAudio();

  useEffect(() => {
    audio.play('game/countdown');

    const interval = setInterval(() => {
      setCount(c => {
        if (c <= 1) {
          clearInterval(interval);
          setTimeout(onComplete, 1000);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [audio, onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(10px)'
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <AnimatePresence mode="wait">
        {count > 0 ? (
          <motion.div
            key={count}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            style={{
              fontSize: '15rem',
              fontWeight: 900,
              background: 'linear-gradient(135deg, #3B82F6, #06B6D4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: '0 0 80px rgba(59, 130, 246, 0.8)'
            }}
          >
            {count}
          </motion.div>
        ) : (
          <motion.div
            key="go"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.5, 1.2], opacity: [1, 1, 0] }}
            transition={{ duration: 1, times: [0, 0.5, 1] }}
            style={{
              fontSize: '10rem',
              fontWeight: 900,
              background: 'linear-gradient(135deg, #10B981, #F59E0B)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: '0 0 80px rgba(16, 185, 129, 0.8)'
            }}
          >
            GO!
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
