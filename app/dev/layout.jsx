'use client';

import { DevHowToPlayProvider } from './context/DevHowToPlayContext';

export default function DevLayout({ children }) {
  return (
    <DevHowToPlayProvider>
      {children}
    </DevHowToPlayProvider>
  );
}
