"use client";

import type { ReactNode } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export function Reveal({
  children,
  className = "",
  delay,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useScrollReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      style={delay !== undefined ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}
