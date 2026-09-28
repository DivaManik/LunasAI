"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Breadcrumb } from "@/components/Breadcrumb";
import { useLangContext } from "@/components/LangProvider";
import { McpPlatformGuide } from "@/components/McpPlatformGuide";
import { McpUrlManager, readStoredMcpUrl } from "@/components/McpUrlManager";
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

  const [guideUrl, setGuideUrl] = useState<string | null>(null);
  useEffect(() => {
    function refreshGuideUrl() {
      for (const c of activeCards) {
        const stored = readStoredMcpUrl(c.id.toString());
        if (stored) {
          setGuideUrl(stored);
          return;
        }
      }
      setGuideUrl(null);
    }
    refreshGuideUrl();
    window.addEventListener("mcp-url-changed", refreshGuideUrl);
    return () => window.removeEventListener("mcp-url-changed", refreshGuideUrl);
  }, [activeCards]);

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

        <McpPlatformGuide mcpUrl={guideUrl} />
      </div>
    </>
  );
}
