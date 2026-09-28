"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { t, type Lang } from "@/lib/i18n";
import { useLangContext } from "./LangProvider";
import { LoginButton } from "./LoginButton";
import { LogoMoon } from "./LogoMoon";

function LangToggle({ lang, toggle }: { lang: Lang; toggle: () => void }) {
  return (
    <button
      onClick={toggle}
      aria-label={t.nav.langToggle[lang]}
      className="flex cursor-pointer items-center gap-0.5 rounded-full border border-[rgba(217,119,6,0.2)] bg-[rgba(217,119,6,0.08)] p-1"
    >
      {(["id", "en"] as Lang[]).map((l) => (
        <span
          key={l}
          className={`rounded-full px-2.5 py-[3px] text-xs font-semibold uppercase transition-all duration-150 ${
            lang === l ? "bg-brand text-bg" : "text-muted"
          }`}
        >
          {l}
        </span>
      ))}
    </button>
  );
}

const navLinkClass =
  "hidden rounded-md border px-3.5 py-1.5 text-sm font-medium transition-colors md:inline-block";

function useActiveSection() {
  const pathname = usePathname();
  const [section, setSection] = useState<string | null>(null);

  useEffect(() => {
    if (pathname !== "/") {
      setSection(null);
      return;
    }

    const targets = ["features", "howitworks"]
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setSection(visible.target.id);
        else if (window.scrollY < 200) setSection(null);
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pathname]);

  return section;
}

export function Navbar() {
  const { lang, toggle } = useLangContext();
  const pathname = usePathname();
  const activeSection = useActiveSection();
  const isDashboard = pathname === "/cards";

  function linkClass(isActive: boolean) {
    return `${navLinkClass} ${
      isActive
        ? "border-[rgba(217,119,6,0.3)] bg-[rgba(217,119,6,0.08)] text-brand"
        : "border-transparent text-muted hover:text-ink"
    }`;
  }

  return (
    <nav className="fixed inset-x-0 top-0 z-[100] flex h-16 items-center justify-between border-b border-line bg-[rgba(7,7,15,0.85)] px-4 backdrop-blur-[20px] md:px-8">
      <Link
        href="/"
        className="flex items-center gap-2.5 font-display text-xl font-extrabold tracking-[-0.02em] text-ink"
      >
        <LogoMoon size={24} />
        LunasAI
      </Link>

      <div className="flex items-center gap-2">
        <Link href="/#features" className={linkClass(activeSection === "features")}>
          {t.nav.features[lang]}
        </Link>
        <Link href="/#howitworks" className={linkClass(activeSection === "howitworks")}>
          {t.nav.howItWorks[lang]}
        </Link>
        <Link
          href="/cards"
          className={`hidden md:inline-flex ${isDashboard ? "btn-ghost !border-[rgba(217,119,6,0.3)] !text-brand" : "btn-ghost"}`}
        >
          {t.nav.dashboard[lang]} →
        </Link>
        <LangToggle lang={lang} toggle={toggle} />
        <LoginButton />
      </div>
    </nav>
  );
}
