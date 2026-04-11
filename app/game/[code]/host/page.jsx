"use client";
import { useParams } from "next/navigation";
import QuizHostView from "@/components/game/QuizHostView";
import { useAppShellBg } from "@/lib/hooks/useAppShellBg";
import '@/app/game/quiz-guide-styles.css';

export function QuizHostContent({ code }) {
  // Safe-area color continuity with the host view dark background
  useAppShellBg('#0e0e1a');
  return <QuizHostView code={code} isActualHost={true} />;
}

export default function HostGame() {
  const { code } = useParams();
  return <QuizHostContent code={code} />;
}
