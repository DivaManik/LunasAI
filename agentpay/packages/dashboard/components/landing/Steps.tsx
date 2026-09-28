import Image from "next/image";
import type { RefObject } from "react";
import { t, type Lang } from "@/lib/i18n";
import { Reveal } from "../Reveal";

export function Steps({
  lang,
  bgRef,
  sectionRef,
}: {
  lang: Lang;
  bgRef: RefObject<HTMLDivElement | null>;
  sectionRef: RefObject<HTMLElement | null>;
}) {
  return (
    <section
      id="howitworks"
      ref={sectionRef}
      className="relative overflow-hidden px-5 py-24 md:px-10 md:py-[120px]"
    >
      <div ref={bgRef} className="absolute inset-[-20%] z-0 opacity-15 will-change-transform">
        <Image src="/images/section-bg.jpg" alt="" fill sizes="140vw" className="object-cover" />
      </div>
      <div aria-hidden="true" className="absolute inset-0 z-[1] bg-[rgba(7,7,15,0.85)]" />

      <div className="relative z-[2] mx-auto max-w-[1200px]">
        <Reveal>
          <div className="section-label">{t.steps.label[lang]}</div>
          <h2 className="mb-12 font-display text-[clamp(32px,5vw,56px)] leading-[1.05] font-extrabold tracking-[-0.03em] text-balance md:mb-16">
            {t.steps.title[lang]} <span className="gradient-text">{t.steps.title2[lang]}</span>
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {t.steps.items.map((step, i) => (
            <Reveal
              key={step.num}
              delay={i * 0.1}
              className="group relative rounded-2xl border border-line bg-[rgba(18,17,24,0.8)] p-7 backdrop-blur-sm hover:border-line-amber"
            >
              <div className="gradient-text mb-6 font-display text-5xl leading-none font-extrabold opacity-80">
                {step.num}
              </div>
              <h3 className="mb-2.5 font-display text-lg font-semibold">{step.title[lang]}</h3>
              <p className="text-sm leading-[1.65] text-muted">{step.desc[lang]}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
