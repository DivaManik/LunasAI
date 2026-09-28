import Link from "next/link";
import { t, type Lang } from "@/lib/i18n";
import { LogoMoon } from "../LogoMoon";
import { Reveal } from "../Reveal";

export function CtaSection({ lang }: { lang: Lang }) {
  return (
    <section className="flex min-h-[80dvh] flex-col items-center justify-center border-t border-line bg-[linear-gradient(135deg,rgba(217,119,6,0.05)_0%,rgba(7,7,15,1)_50%,rgba(234,88,12,0.04)_100%)] px-6 py-20 text-center">
      <Reveal className="flex flex-col items-center">
        <h2 className="mb-6 max-w-[900px] font-display text-[clamp(40px,7vw,88px)] leading-[1.05] font-extrabold tracking-[-0.03em] text-balance">
          {t.cta.title[lang]}
        </h2>
        <p className="mb-10 text-lg text-muted">{t.cta.sub[lang]}</p>
        <Link href="/cards" className="btn-primary px-10 py-4 text-lg">
          {t.cta.btn[lang]}
        </Link>
      </Reveal>
    </section>
  );
}

export function LandingFooter({ lang }: { lang: Lang }) {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-6 md:px-10">
      <div className="flex items-center gap-2 font-display text-base font-bold text-muted">
        <LogoMoon size={18} />
        LunasAI
      </div>
      <span className="text-[13px] text-dim">© 2026 LunasAI · {t.footer.note[lang]}</span>
    </footer>
  );
}
