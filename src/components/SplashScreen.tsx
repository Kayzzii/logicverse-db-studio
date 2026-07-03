import { useCallback, useEffect, useRef, useState } from "react";
import splashLogo from "../assets/logo-splash.svg";
import { cn } from "@/lib/utils";

const APP_VERSION = "v0.1.0";
const MIN_DISPLAY_MS = 1500;
const FADE_OUT_MS = 300;
const EMERGENCY_TIMEOUT_MS = 5000;

const SPLASH_FONT =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

interface SplashScreenProps {
  onFinish: () => void;
  ready?: boolean;
}

export default function SplashScreen({ onFinish, ready = false }: SplashScreenProps) {
  const [minElapsed, setMinElapsed] = useState(false);
  const [fading, setFading] = useState(false);
  const finishedRef = useRef(false);

  const finishSplash = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setFading(true);
    window.setTimeout(onFinish, FADE_OUT_MS);
  }, [onFinish]);

  useEffect(() => {
    const minTimer = window.setTimeout(() => setMinElapsed(true), MIN_DISPLAY_MS);
    const emergencyTimer = window.setTimeout(finishSplash, EMERGENCY_TIMEOUT_MS);

    return () => {
      window.clearTimeout(minTimer);
      window.clearTimeout(emergencyTimer);
    };
  }, [finishSplash]);

  useEffect(() => {
    if (minElapsed && ready) {
      finishSplash();
    }
  }, [finishSplash, minElapsed, ready]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-300",
        fading ? "opacity-0" : "opacity-100",
      )}
      style={{
        background: "linear-gradient(135deg, #11111b 0%, #1e1e2e 100%)",
        fontFamily: SPLASH_FONT,
      }}
    >
      <div className="flex flex-col items-center px-6 text-center">
        <img
          src={splashLogo}
          alt=""
          aria-hidden
          draggable={false}
          className="mb-6 w-[200px] drop-shadow-[0_8px_32px_rgba(137,180,250,0.25)]"
        />

        <h1 className="text-[28px] font-semibold leading-none text-[var(--text-primary,#cdd6f4)]">
          LogicVerse{" "}
          <span className="font-normal text-[var(--text-muted,#9399b2)]">DB Studio</span>
        </h1>

        <p className="mt-3 text-xs text-[var(--text-dim,#585b70)]">by Kayzzii / LogicVerse</p>

        <div className="mt-10 h-[3px] w-[200px] overflow-hidden rounded-full bg-[rgba(137,180,250,0.12)]">
          <div className="splash-shimmer h-full w-1/2 rounded-full bg-[var(--accent,#89b4fa)]" />
        </div>
      </div>

      <span className="absolute bottom-5 right-6 text-[11px] text-[var(--text-ghost,#45475a)]">
        {APP_VERSION}
      </span>
    </div>
  );
}
