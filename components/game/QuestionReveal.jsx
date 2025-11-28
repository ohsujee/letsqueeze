"use client";
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedText } from './AnimatedText';
import PointsRing from './PointsRing';

export const QuestionReveal = ({ question, category, index, pointsEnJeu, ratioRemain, cfg, wasAnticipated, conf }) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={index}
        initial={{
          scale: 0.5,
          opacity: 0,
          rotateX: -90,
          z: -1000
        }}
        animate={{
          scale: 1,
          opacity: 1,
          rotateX: 0,
          z: 0,
          transition: {
            type: "spring",
            stiffness: 200,
            damping: 20,
            mass: 1.5
          }
        }}
        exit={{
          scale: 0.5,
          opacity: 0,
          rotateX: 90,
          z: -1000,
          transition: { duration: 0.4 }
        }}
        className="card space-y-4"
      >
        {/* Catégorie d'abord (slide from top) */}
        {category && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-sm opacity-70 uppercase tracking-wider"
          >
            [{category}]
          </motion.div>
        )}

        {/* Question avec animation */}
        <motion.div
          className="text-xl font-black question-text"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <AnimatedText text={question} />
        </motion.div>

        {/* Timer ring (scale in avec bounce) */}
        {cfg && (
          <motion.div
            className="flex items-center gap-4"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              delay: 0.8,
              type: "spring",
              stiffness: 260,
              damping: 20
            }}
          >
            <PointsRing
              value={ratioRemain}
              points={wasAnticipated ? (conf?.[question?.difficulty === "difficile" ? "difficile" : "normal"]?.start || 0) : pointsEnJeu}
            />
            <div className="text-sm opacity-80">
              De <b>{cfg.start}</b> à <b>{cfg.floor}</b> en <b>{cfg.durationMs/1000}s</b>
              {wasAnticipated && <div className="text-blue-600 font-bold">Buzz anticipé : {cfg.start} points si correct !</div>}
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
