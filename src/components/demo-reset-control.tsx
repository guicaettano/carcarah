"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { clearDemoSearchConfiguration } from "@/lib/storefront-demo/session";

export function DemoResetControl() {
  const router = useRouter();
  const [resetting, setResetting] = useState(false);

  function resetDemo() {
    setResetting(true);
    clearDemoSearchConfiguration();
    router.refresh();
    window.setTimeout(() => setResetting(false), 300);
  }

  return (
    <button
      className="demo-reset-control"
      disabled={resetting}
      onClick={resetDemo}
      type="button"
    >
      {resetting ? "Resetando..." : "Reset demo"}
    </button>
  );
}
