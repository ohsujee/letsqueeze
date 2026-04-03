"use client";
import { useParams } from "next/navigation";
import BlindTestHostView from "@/components/game/BlindTestHostView";
import '@/app/blindtest/blindtest-theme.css';

export function BlindTestHostContent({ code }) {
  return <BlindTestHostView code={code} isActualHost={true} />;
}

export default function BlindTestHostPage() {
  const { code } = useParams();
  return <BlindTestHostContent code={code} />;
}
