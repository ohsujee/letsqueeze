"use client";
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

export function CountdownOverlay({ isVisible, message, onComplete, countFrom = 3 }) {
  const [count, setCount] = useState(countFrom);

  useEffect(() => {
    if (!isVisible) {
      setCount(countFrom);
      return;
    }

    if (count > 0) {
      const timer = setTimeout(() => {
        setCount(count - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // Countdown finished
      const timer = setTimeout(() => {
        onComplete && onComplete();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isVisible, count, countFrom, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9998,
            backdropFilter: 'blur(10px)'
          }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{
              textAlign: 'center',
              color: 'white',
              maxWidth: '600px',
              padding: '20px'
            }}
          >
            <h2 style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              marginBottom: '2rem'
            }}>
              {message}
            </h2>

            {count > 0 ? (
              <motion.div
                key={count}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                style={{
                  fontSize: '8rem',
                  fontWeight: 'black',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                {count}
              </motion.div>
            ) : (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                style={{
                  fontSize: '4rem',
                  fontWeight: 'black'
                }}
              >
                🎮
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
