import { useEffect, useState } from "react";
import { LogicVerseLogo } from "@/components/shared/LogicVerseLogo";
import { cn } from "@/lib/utils";

const APP_VERSION = "v0.1.0";
const MIN_DISPLAY_MS = 1500;
const FADE_OUT_MS = 300;

interface SplashScreenProps {
  onFinish: () => void;
  ready?: boolean;
}

export default function SplashScreen({ onFinish, ready = false }: SplashScreenProps) {
  const [minElapsed, setMinElapsed] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setMinElapsed(true), MIN_DISPLAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!minElapsed || !ready || fading) return;

    setFading(true);
    const timer = window.setTimeout(onFinish, FADE_OUT_MS);
    return () => window.clearTimeout(timer);
  }, [fading, minElapsed, onFinish, ready]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-300",
        fading ? "opacity-0" : "opacity-100",
      )}
      style={{
        background: "linear-gradient(135deg, #11111b 0%, #1e1e2e 100%)",
      }}
    >
      <div className="flex flex-col items-center px-6 text-center">
        <LogicVerseLogo size={120} className="mb-6 drop-shadow-[0_8px_32px_rgba(137,180,250,0.25)]" />

        <h1 className="font-ui text-[28px] font-semibold leading-none text-[var(--text-primary,#cdd6f4)]">
          LogicVerse{" "}
          <span className="font-light text-[var(--text-muted,#9399b2)]">DB Studio</span>
        </h1>

        <p className="mt-3 font-ui text-xs text-[var(--text-dim,#585b70)]">
          by Kayzzii / LogicVerse
        </p>

        <div className="mt-10 h-[3px] w-[200px] overflow-hidden rounded-full bg-[rgba(137,180,250,0.12)]">
          <div className="splash-shimmer h-full w-1/2 rounded-full bg-[var(--accent,#89b4fa)]" />
        </div>
      </div>

      <span className="absolute bottom-5 right-6 font-ui text-[11px] text-[var(--text-ghost,#45475a)]">
        {APP_VERSION}
      </span>
    </div>
  );
}
