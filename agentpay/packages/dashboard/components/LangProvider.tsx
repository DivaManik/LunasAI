"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useLang } from "@/hooks/useLang";
import type { Lang } from "@/lib/i18n";

const LangContext = createContext<{ lang: Lang; toggle: () => void }>({
  lang: "id",
  toggle: () => {},
});

export function LangProvider({ children }: { children: ReactNode }) {
  const value = useLang();
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLangContext() {
  return useContext(LangContext);
}
