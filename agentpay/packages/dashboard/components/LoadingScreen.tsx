"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { clientNav } from "@/lib/clientNav";

export function LoadingScreen({ onDone, label }: { onDone: () => void; label: string }) {
  const [progress, setProgress] = useState(0);
  const [hiding, setHiding] = useState(false);
  // Load awal: render inline (harus sama dengan HTML server). Navigasi client: portal ke
  // body supaya tidak terjebak di wrapper transisi halaman yang sedang ber-transform.
  const [usePortal] = useState(() => clientNav.hydrated);

  useEffect(() => {
    const start = Date.now();
    const duration = 2000;
    let frame = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const tick = () => {
      const p = Math.min(100, Math.round(((Date.now() - start) / duration) * 100));
      setProgress(p);
      if (p < 100) {
        frame = requestAnimationFrame(tick);
      } else {
        timers.push(
          setTimeout(() => {
            setHiding(true);
            timers.push(setTimeout(onDone, 400));
          }, 200)
        );
      }
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      timers.forEach(clearTimeout);
    };
  }, [onDone]);

  const screen = (
    <div
      className="loading-screen"
      role="status"
      aria-label={label}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#07070f",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        opacity: hiding ? 0 : 1,
        transition: "opacity 0.4s ease",
        pointerEvents: hiding ? "none" : "all",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-syne), sans-serif",
          fontWeight: 800,
          fontSize: "clamp(48px, 10vw, 96px)",
          letterSpacing: "-0.03em",
          background: "linear-gradient(135deg, #f59e0b, #d97706)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          clipPath: `inset(0 ${100 - progress}% 0 0)`,
          transition: "clip-path 0.05s linear",
        }}
      >
        LunasAI
      </div>
      <div
        style={{
          width: 200,
          height: 2,
          background: "#1e1c2e",
          borderRadius: 100,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: "linear-gradient(90deg, #d97706, #f59e0b)",
            borderRadius: 100,
            transition: "width 0.05s linear",
          }}
        />
      </div>
      <div
        className="num"
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 12,
          color: "#7a7060",
        }}
      >
        {progress}%
      </div>
    </div>
  );

  return usePortal ? createPortal(screen, document.body) : screen;
}
