import Image from "next/image";
import { t, type Lang } from "@/lib/i18n";
import { Reveal } from "../Reveal";

const CARD_VISUALS = [
  {
    before: "/images/card1-before.jpg",
    hover: "/images/card1-hover.jpg",
  },
  {
    before: "/images/card2-before.jpg",
    hover: "/images/card2-hover.jpg",
  },
  {
    before: "/images/card3-before.jpg",
    hover: "/images/card3-hover.jpg",
  },
];

const FEATURE_ICONS = [
  "/images/feature-delegation-icon-3d.png",
  "/images/feature-agent-icon-3d.png",
  "/images/feature-x402-icon-3d.png",
];

export function FeatureCards({ lang }: { lang: Lang }) {
  return (
    <section id="features" className="mx-auto max-w-[1200px] px-5 py-24 md:px-10 md:py-32">
      <Reveal>
        <div className="section-label">{t.features.label[lang]}</div>
        <h2 className="mb-12 font-display text-[clamp(32px,5vw,56px)] leading-[1.05] font-extrabold tracking-[-0.03em] text-balance md:mb-16">
          {t.features.title[lang]}{" "}
          <span className="gradient-text">{t.features.title2[lang]}</span>
        </h2>
      </Reveal>

      <Reveal>
        <div className="feature-row">
          {t.features.cards.map((card, i) => (
            <article key={card.title.en} className="feature-card" data-card={i + 1}>
              <Image
                src={CARD_VISUALS[i].before}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 60vw"
                className="card-image-before object-cover"
              />
              <Image
                src={CARD_VISUALS[i].hover}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 60vw"
                className="card-image-hover object-cover"
              />
              <div className="feature-card-overlay" />

              <div className="absolute top-8 left-8 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[rgba(217,119,6,0.2)] bg-[rgba(217,119,6,0.1)] backdrop-blur-sm">
                  <Image
                    src={FEATURE_ICONS[i]}
                    alt=""
                    width={28}
                    height={28}
                    className="h-7 w-7 object-contain"
                  />
                </span>
                <span className="num font-display text-sm font-bold text-dim">0{i + 1}</span>
              </div>

              <div className="feature-card-content">
                <h3 className="mb-3 font-display text-2xl leading-tight font-bold tracking-[-0.02em]">
                  {card.title[lang]}
                </h3>
                <p className="max-w-[420px] text-[15px] leading-[1.65] text-[#b8ae9c]">
                  {card.desc[lang]}
                </p>
              </div>
            </article>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
