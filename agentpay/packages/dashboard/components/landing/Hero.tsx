import Image from "next/image";
import Link from "next/link";
import type { RefObject } from "react";
import { t, type Lang } from "@/lib/i18n";

export function Hero({
  lang,
  ready,
  bgRef,
}: {
  lang: Lang;
  ready: boolean;
  bgRef: RefObject<HTMLDivElement | null>;
}) {
  const words = t.hero.heading2[lang].split(" ");
  const lastWord = words.pop();

  return (
    <section className="relative h-[100dvh] min-h-[560px] overflow-hidden">
      <div ref={bgRef} className="absolute inset-[-20%] z-0 will-change-transform">
        <Image
          src="/images/hero-bg.png"
          alt=""
          fill
          priority
          sizes="140vw"
          className="object-cover object-center"
        />
      </div>

      <div
        aria-hidden="true"
        className="absolute inset-0 z-[1] bg-[linear-gradient(90deg,rgba(7,7,15,0.92)_0%,rgba(7,7,15,0.7)_50%,rgba(7,7,15,0.2)_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 z-[1] h-40 bg-[linear-gradient(to_bottom,transparent,var(--bg))]"
      />

      <div
        className={`relative z-[2] mx-auto flex h-full max-w-[1320px] flex-col justify-center px-5 pt-16 md:px-10 ${
          ready ? "fade-up" : "hero-wait"
        }`}
      >
        <div className="mb-7 inline-flex w-fit items-center gap-1.5 rounded-full border border-[rgba(217,119,6,0.25)] bg-[rgba(217,119,6,0.1)] px-3 py-1 text-xs font-medium tracking-[0.04em] text-brand uppercase backdrop-blur-sm">
          <span className="pulse-dot" />
          {t.hero.badge[lang]}
        </div>

        <h1 className="mb-6 font-display text-[clamp(44px,5.4vw,80px)] leading-[1.02] font-extrabold tracking-[-0.03em]">
          {t.hero.heading1[lang]}
          <br />
          {words.join(" ")} <em className="gradient-text not-italic">{lastWord}</em>
        </h1>

        <p className="mb-10 max-w-[520px] text-[17px] leading-[1.7] text-[#b8ae9c] md:text-lg">
          {t.hero.sub[lang]}
        </p>

        <div className="flex flex-wrap gap-3">
          <Link href="/cards" className="btn-primary px-7 py-3 text-[15px]">
            {t.hero.cta1[lang]}
          </Link>
          <a
            href="#howitworks"
            className="btn-ghost bg-[rgba(7,7,15,0.4)] px-6 py-3 text-[15px] backdrop-blur-sm"
          >
            {t.hero.cta2[lang]}
          </a>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="absolute bottom-8 left-1/2 z-[2] hidden -translate-x-1/2 flex-col items-center gap-2 text-[11px] font-medium tracking-[0.2em] text-muted uppercase md:flex"
      >
        {t.hero.scroll[lang]}
        <span className="h-10 w-px bg-[linear-gradient(to_bottom,var(--amber),transparent)]" />
      </div>
    </section>
  );
}
