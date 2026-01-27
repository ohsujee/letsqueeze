"use client";
import { useParams } from "next/navigation";
import QuizHostView from "@/components/game/QuizHostView";

export default function HostGame() {
  const { code } = useParams();

  return <QuizHostView code={code} isActualHost={true} />;
}
