"use client";

import { Breadcrumb } from "@/components/Breadcrumb";
import { SignMessage } from "@/components/SignMessage";
import { useLangContext } from "@/components/LangProvider";
import { BOT_TELEGRAM_URL, BOT_USERNAME } from "@/lib/constants";
import { t } from "@/lib/i18n";

export default function TelegramPage() {
  const { lang } = useLangContext();
  const d = t.dashboard;
  const tp = d.telegramPage;

  const commands: [string, string][] = [
    ["/start", tp.cmdStart[lang]],
    ["/connect", tp.cmdConnect[lang]],
    ["/use", tp.cmdUse[lang]],
    ["/buy", tp.cmdBuy[lang]],
    ["/balance", tp.cmdBalance[lang]],
  ];

  return (
    <>
      <Breadcrumb
        crumbs={[
          { label: d.breadcrumb.dashboard[lang], href: "/dashboard" },
          { label: d.breadcrumb.telegram[lang] },
        ]}
      />

      <div className="mx-auto flex max-w-[640px] flex-col gap-6">
        <div className="panel px-6 py-6 text-center">
          <h1 className="mb-2 font-display text-xl font-bold">{tp.title[lang]}</h1>
          <p className="mb-4 text-sm text-muted">{tp.intro[lang]}</p>
          <div className="mono inline-block rounded-lg border border-[rgba(217,119,6,0.15)] bg-[rgba(217,119,6,0.06)] px-4 py-2 text-sm text-brand">
            {BOT_USERNAME}
          </div>
        </div>

        <div className="panel px-6 py-6">
          <h2 className="mb-4 font-display text-base font-semibold">{tp.howToTitle[lang]}</h2>
          <ol className="flex flex-col gap-3 text-sm text-muted">
            {[tp.step1[lang], tp.step2[lang], tp.step3[lang], tp.step4[lang], tp.step5[lang]].map(
              (step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgba(217,119,6,0.1)] text-xs font-semibold text-brand">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              )
            )}
          </ol>
        </div>

        <div className="panel px-6 py-6">
          <h2 className="mb-4 font-display text-base font-semibold">{tp.commandsTitle[lang]}</h2>
          <div className="flex flex-col gap-2">
            {commands.map(([cmd, desc]) => (
              <div key={cmd} className="flex items-center gap-3 text-sm">
                <code className="mono w-24 shrink-0 rounded-md border border-line bg-surface px-2 py-1 text-brand">
                  {cmd}
                </code>
                <span className="text-muted">{desc}</span>
              </div>
            ))}
          </div>
        </div>

        <a
          href={BOT_TELEGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary self-center"
        >
          {tp.openBot[lang]}
        </a>

        <SignMessage />
      </div>
    </>
  );
}
