"use client";
import { useParams } from "next/navigation";
import QuizHostView from "@/components/game/QuizHostView";
import '@/app/game/quiz-guide-styles.css';

export function QuizHostContent({ code }) {
  return <QuizHostView code={code} isActualHost={true} />;
}

export default function HostGame() {
  const { code } = useParams();
  return <QuizHostContent code={code} />;
}
