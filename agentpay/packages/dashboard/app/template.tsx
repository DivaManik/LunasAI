"use client";

import { useEffect, useState, type ReactNode } from "react";
import { clientNav } from "@/lib/clientNav";

// template.tsx di-remount setiap navigasi, jadi animasi masuk jalan di tiap pindah halaman
// (tidak di load pertama — di sana landing punya loading screen sendiri).
// Class dilepas setelah animasi selesai: transform yang tertinggal akan membuat
// elemen `position: fixed` di dalam halaman ikut ter-offset ke wrapper ini.
export default function Template({ children }: { children: ReactNode }) {
  const [entering, setEntering] = useState(() => clientNav.hydrated);

  useEffect(() => {
    clientNav.hydrated = true;
  }, []);

  return (
    <div
      className={entering ? "page-enter" : undefined}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) setEntering(false);
      }}
    >
      {children}
    </div>
  );
}
