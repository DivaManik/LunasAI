"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { ActivityFeed } from "@/components/ActivityFeed";
import { Breadcrumb } from "@/components/Breadcrumb";
import { useLangContext } from "@/components/LangProvider";
import { useActiveWallet, useActivity, useOwnerCards } from "@/lib/dashboard";
import { t } from "@/lib/i18n";

type StatusFilter = "all" | "auto_approved" | "pending" | "rejected";

function HistoryContent() {
  const { authenticated } = usePrivy();
  const { lang } = useLangContext();
  const searchParams = useSearchParams();
  const d = t.dashboard;
  const wallet = useActiveWallet();
  const address = wallet?.address as `0x${string}` | undefined;

  const { cards } = useOwnerCards(authenticated ? address : undefined);
  const cardIds = useMemo(() => cards.map((c) => c.id), [cards]);
  const activity = useActivity(cardIds);

  const preselectCardId = searchParams.get("cardId");
  const [cardFilter, setCardFilter] = useState<string>(preselectCardId ?? "all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    if (!activity) return activity;
    return activity.filter((r) => {
      if (cardFilter !== "all" && r.cardId !== cardFilter) return false;
      if (statusFilter === "all") return true;
      if (statusFilter === "auto_approved") {
        return r.status === "auto_approved" || r.status === "approved";
      }
      return r.status === statusFilter;
    });
  }, [activity, cardFilter, statusFilter]);

  return (
    <>
      <Breadcrumb
        crumbs={[
          { label: d.breadcrumb.dashboard[lang], href: "/dashboard" },
          { label: d.breadcrumb.history[lang] },
        ]}
      />

      <div className="mb-6">
        <div className="content-heading">{d.activity.heading[lang]}</div>
        <div className="content-sub">{d.activity.sub[lang]}</div>
      </div>

      <div className="mb-5 flex flex-wrap gap-3">
        <select
          value={cardFilter}
          onChange={(e) => setCardFilter(e.target.value)}
          className="field w-auto"
        >
          <option value="all">{d.filter.allCards[lang]}</option>
          {cards.map((c) => (
            <option key={c.id.toString()} value={c.id.toString()}>
              {d.cardList.card[lang]} #{c.id.toString()}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="field w-auto"
        >
          <option value="all">{d.filter.allStatus[lang]}</option>
          <option value="auto_approved">{d.filter.statusAutoApproved[lang]}</option>
          <option value="pending">{d.filter.statusPending[lang]}</option>
          <option value="rejected">{d.filter.statusRejected[lang]}</option>
        </select>
      </div>

      <div className="panel px-5 py-1">
        <ActivityFeed records={filtered} lang={lang} limit={200} />
      </div>
    </>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={null}>
      <HistoryContent />
    </Suspense>
  );
}
