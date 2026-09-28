"use client";

import { useEffect, useState } from "react";
import type { Lang } from "@/lib/i18n";

export function useLang() {
  const [lang, setLang] = useState<Lang>("id");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("lunasai-lang");
      if (saved === "id" || saved === "en") setLang(saved);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const toggle = () =>
    setLang((prev) => {
      const next = prev === "id" ? "en" : "id";
      try {
        localStorage.setItem("lunasai-lang", next);
      } catch {}
      return next;
    });

  return { lang, toggle };
}
