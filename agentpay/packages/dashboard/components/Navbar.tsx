"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { usePrivy, useWallets } from "@privy-io/react-auth";
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

const navLinkClass = "nav-item hidden text-sm font-medium md:inline-block";

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
        if (window.scrollY < 200) {
          setSection(null);
          return;
        }
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setSection(visible.target.id);
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    targets.forEach((el) => observer.observe(el));

    // IntersectionObserver hanya callback saat ada elemen yang melintasi
    // threshold — scroll cepat langsung ke atas (mis. via tombol Home/logo,
    // atau lompat jauh) bisa tidak memicu callback baru sama sekali, jadi
    // section aktif nyangkut di nilai lama. Scroll listener ringan ini
    // memaksa clear begitu benar-benar dekat top, independen dari observer.
    const handleScroll = () => {
      if (window.scrollY < 200) setSection(null);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, [pathname]);

  return section;
}

export function Navbar() {
  const { lang, toggle } = useLangContext();
  const pathname = usePathname();
  const router = useRouter();
  const activeSection = useActiveSection();
  const isDashboard = pathname.startsWith("/dashboard");

  const { ready, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const externalWallet = wallets.find((w) => w.walletClientType !== "privy");
  const isLoggedIn = ready && authenticated && !!(embeddedWallet?.address || externalWallet?.address);

  // Redirect ke dashboard hanya pada transisi login (belum login -> login),
  // bukan setiap kali authenticated user berada di "/" (mis. klik logo/Home
  // sengaja balik ke landing page setelah login harus tetap dibiarkan).
  const wasLoggedIn = useRef(isLoggedIn);
  useEffect(() => {
    if (isLoggedIn && !wasLoggedIn.current && pathname === "/") {
      router.replace("/dashboard");
    }
    wasLoggedIn.current = isLoggedIn;
  }, [isLoggedIn, pathname, router]);

  function linkClass(isActive: boolean) {
    return `${navLinkClass} ${isActive ? "active text-brand" : "text-muted"}`;
  }

  function scrollToTop(e: React.MouseEvent) {
    if (pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
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

      <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex">
        <Link href="/" onClick={scrollToTop} className={linkClass(pathname === "/" && !activeSection)}>
          {t.nav.home[lang]}
        </Link>
        <Link href="/#features" className={linkClass(activeSection === "features")}>
          {t.nav.features[lang]}
        </Link>
        <Link href="/#howitworks" className={linkClass(activeSection === "howitworks")}>
          {t.nav.howItWorks[lang]}
        </Link>
        {isLoggedIn && (
          <Link href="/dashboard" className={linkClass(isDashboard)}>
            {t.nav.dashboard[lang]}
          </Link>
        )}
      </div>

      <div className="flex items-center gap-2">
        <LangToggle lang={lang} toggle={toggle} />
        <LoginButton />
      </div>
    </nav>
  );
}
