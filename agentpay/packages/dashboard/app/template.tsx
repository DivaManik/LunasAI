"use client";

import { useState, type ReactNode } from "react";

// template.tsx di-remount setiap navigasi, jadi animasi masuk jalan di tiap pindah halaman.
// Class dilepas setelah animasi selesai: transform yang tertinggal akan membuat
// modal `position: fixed` di dalam halaman ikut ter-offset ke wrapper ini.
export default function Template({ children }: { children: ReactNode }) {
  const [entering, setEntering] = useState(true);
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
