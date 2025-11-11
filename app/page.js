"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to splash screen on app launch
    router.replace('/splash');
  }, [router]);

  // Show nothing while redirecting
  return null;
}
