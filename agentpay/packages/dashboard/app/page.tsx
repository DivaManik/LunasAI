"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLangContext } from "@/components/LangProvider";
import { LoadingScreen } from "@/components/LoadingScreen";
import { CtaSection, LandingFooter } from "@/components/landing/CtaSection";
import { FeatureCards } from "@/components/landing/FeatureCards";
import { Hero } from "@/components/landing/Hero";
import { Steps } from "@/components/landing/Steps";
import { Ticker } from "@/components/landing/Ticker";
import { t } from "@/lib/i18n";

const LOADED_KEY = "lunasai-loaded";

// Jalan sebelum browser menggambar loading screen: pengunjung yang sudah melihatnya
// di sesi ini tidak akan melihat loader berkedip sebelum React hydrate.
const SKIP_LOADER_SCRIPT = `try{if(sessionStorage.getItem("${LOADED_KEY}"))document.documentElement.classList.add("ls-skip")}catch(e){}`;

export default function Home() {
  const { lang } = useLangContext();
  const [showLoader, setShowLoader] = useState(true);
  const [ready, setReady] = useState(false);

  const heroBgRef = useRef<HTMLDivElement>(null);
  const stepsBgRef = useRef<HTMLDivElement>(null);
  const stepsSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(LOADED_KEY) !== null;
    } catch {}
    if (seen) {
      setShowLoader(false);
      setReady(true);
    }
  }, []);

  const handleLoaded = useCallback(() => {
    try {
      sessionStorage.setItem(LOADED_KEY, "1");
    } catch {}
    setShowLoader(false);
    setReady(true);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const vh = window.innerHeight;

      if (heroBgRef.current && y < vh * 1.5) {
        heroBgRef.current.style.transform = `translate3d(0, ${y * 0.4}px, 0)`;
      }

      const section = stepsSectionRef.current;
      if (stepsBgRef.current && section) {
        const rect = section.getBoundingClientRect();
        if (rect.bottom > 0 && rect.top < vh) {
          const fromCenter = rect.top + rect.height / 2 - vh / 2;
          stepsBgRef.current.style.transform = `translate3d(0, ${-fromCenter * 0.15}px, 0)`;
        }
      }
    };
    const handleScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: SKIP_LOADER_SCRIPT }} />
      {showLoader && <LoadingScreen onDone={handleLoaded} label={t.loading.label[lang]} />}

      <div className="-mt-16">
        <Hero lang={lang} ready={ready} bgRef={heroBgRef} />
        <Ticker lang={lang} />
        <FeatureCards lang={lang} />
        <Steps lang={lang} bgRef={stepsBgRef} sectionRef={stepsSectionRef} />
        <CtaSection lang={lang} />
        <LandingFooter lang={lang} />
      </div>
    </>
  );
}
