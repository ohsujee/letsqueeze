"use client";
import { useParams } from "next/navigation";
import BlindTestHostView from "@/components/game/BlindTestHostView";
import { useAppShellBg } from "@/lib/hooks/useAppShellBg";
import '@/app/blindtest/blindtest-theme.css';

export function BlindTestHostContent({ code }) {
  useAppShellBg('#04060f');
  return <BlindTestHostView code={code} isActualHost={true} />;
}

export default function BlindTestHostPage() {
  const { code } = useParams();
  return <BlindTestHostContent code={code} />;
}
