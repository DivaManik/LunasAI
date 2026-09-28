import Image from "next/image";
import { Bot, CheckCircle, CreditCard, Wallet, type LucideIcon } from "lucide-react";
import { type RefObject, useEffect, useRef, useState } from "react";
import { t, type Lang } from "@/lib/i18n";
import { Reveal } from "../Reveal";

const STEP_ICONS: LucideIcon[] = [Wallet, CreditCard, Bot, CheckCircle];

export function Steps({
  lang,
  bgRef,
  sectionRef,
}: {
  lang: Lang;
  bgRef: RefObject<HTMLDivElement | null>;
  sectionRef: RefObject<HTMLElement | null>;
}) {
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [visibleSteps, setVisibleSteps] = useState<number[]>([]);
  const [progressHeight, setProgressHeight] = useState(0);

  useEffect(() => {
    const total = t.steps.items.length;
    const observers = stepRefs.current.map((el, i) => {
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => {
          setVisibleSteps((prev) => {
            const next = entry.isIntersecting
              ? prev.includes(i)
                ? prev
                : [...prev, i]
              : prev.filter((s) => s !== i);
            setProgressHeight(next.length === 0 ? 0 : ((Math.max(...next) + 1) / total) * 100);
            return next;
          });
        },
        { threshold: 0.4 }
      );
      obs.observe(el);
      return obs;
    });

    return () => observers.forEach((obs) => obs?.disconnect());
  }, []);

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

        <div className="steps-container relative mx-auto max-w-[720px]">
          <div className="timeline-track absolute top-0 left-6 h-full w-0.5 bg-line md:left-1/2 md:-translate-x-1/2" />
          <div
            className="timeline-progress absolute top-0 left-6 w-0.5 bg-brand transition-[height] duration-1000 ease-in-out md:left-1/2 md:-translate-x-1/2"
            style={{ height: `${progressHeight}%` }}
          />

          {t.steps.items.map((step, i) => {
            const Icon = STEP_ICONS[i];
            const isVisible = visibleSteps.includes(i);
            return (
              <div
                key={step.num}
                ref={(el) => {
                  stepRefs.current[i] = el;
                }}
                className={`step-item relative mb-12 flex items-center gap-6 pl-16 transition-all duration-1000 ease-in-out last:mb-0 md:gap-8 md:pl-0 ${
                  isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
                } ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}
              >
                <div
                  className={`step-node absolute top-0 left-0 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-1000 ease-in-out md:static md:left-auto ${
                    isVisible
                      ? "step-node-glow border-brand bg-[rgba(217,119,6,0.2)] text-brand"
                      : "border-line bg-surface text-dim"
                  }`}
                >
                  <Icon size={20} />
                </div>

                <div
                  className={`step-content flex-1 rounded-xl border bg-[rgba(18,17,24,0.8)] p-6 backdrop-blur-sm transition-all duration-1000 ease-in-out ${
                    isVisible ? "step-content-glow border-line-amber" : "border-line"
                  }`}
                >
                  <span className="mono text-sm font-semibold text-brand">Step {i + 1}</span>
                  <h3 className="mt-1 mb-2 font-display text-lg font-semibold">
                    {step.title[lang]}
                  </h3>
                  <p className="text-sm leading-[1.65] text-muted">{step.desc[lang]}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
