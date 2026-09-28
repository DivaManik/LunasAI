"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Breadcrumb } from "@/components/Breadcrumb";
import { useLangContext } from "@/components/LangProvider";
import { McpUrlManager } from "@/components/McpUrlManager";
import { isCardActive, useActiveWallet, useOwnerCards } from "@/lib/dashboard";
import { t } from "@/lib/i18n";

export default function McpPage() {
  const { authenticated } = usePrivy();
  const { lang } = useLangContext();
  const d = t.dashboard;
  const wallet = useActiveWallet();
  const address = wallet?.address as `0x${string}` | undefined;

  const { cards } = useOwnerCards(authenticated ? address : undefined);
  const activeCards = cards.filter((c) => isCardActive(c.data));

  return (
    <>
      <Breadcrumb
        crumbs={[
          { label: d.breadcrumb.dashboard[lang], href: "/dashboard" },
          { label: d.breadcrumb.mcp[lang] },
        ]}
      />

      <div className="mb-6">
        <div className="content-heading">{d.mcp.heading[lang]}</div>
        <div className="content-sub">{d.mcp.sub[lang]}</div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          {activeCards.length === 0 ? (
            <div className="panel px-6 py-5 text-sm text-muted">{d.mcp.needActiveCard[lang]}</div>
          ) : (
            activeCards.map((c) => (
              <div key={c.id.toString()} className="panel px-6 py-5">
                <div className="mb-1 text-[13px] text-muted">
                  {d.mcp.card[lang]} {c.id.toString()}
                </div>
                <McpUrlManager cardId={c.id.toString()} />
              </div>
            ))
          )}
        </section>

        <section className="panel h-fit px-6 py-5">
          <h2 className="mb-4 font-display text-base font-semibold">
            {d.mcpPage.guideTitle[lang]}
          </h2>
          <ol className="flex flex-col gap-3 text-sm text-muted">
            {[
              d.mcpPage.step1[lang],
              d.mcpPage.step2[lang],
              d.mcpPage.step3[lang],
              d.mcpPage.step4[lang],
              d.mcpPage.step5[lang],
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgba(217,119,6,0.1)] text-xs font-semibold text-brand">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}
