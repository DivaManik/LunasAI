import { t, type Lang } from "@/lib/i18n";
import { Reveal } from "../Reveal";

export function Ticker({ lang }: { lang: Lang }) {
  const items = t.ticker.items[lang];
  const doubled = [...items, ...items];

  return (
    <Reveal>
      <div className="overflow-hidden border-y border-line bg-surface py-3.5">
        <div className="ticker-track">
          {doubled.map((item, i) => (
            <span
              key={i}
              aria-hidden={i >= items.length}
              className="px-8 text-[13px] font-medium whitespace-nowrap text-muted"
            >
              <span className="mr-8 text-brand">✦</span>
              {item}
            </span>
          ))}
        </div>
      </div>
    </Reveal>
  );
}
