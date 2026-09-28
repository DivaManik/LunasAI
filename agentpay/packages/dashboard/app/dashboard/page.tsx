"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { useCountUp } from "@/hooks/useCountUp";
import {
  isCardActive,
  isToday,
  last7DaysSpending,
  useActiveWallet,
  useActivity,
  useIdrxBalance,
  useOwnerCards,
} from "@/lib/dashboard";
import { t } from "@/lib/i18n";
import { useLangContext } from "@/components/LangProvider";
import { ActivityFeed } from "@/components/ActivityFeed";
import { CreateCardForm } from "@/components/CreateCardForm";
import { FaucetButton } from "@/components/FaucetButton";
import { SkeletonCard } from "@/components/Skeleton";
import { SpendingChart } from "@/components/SpendingChart";

function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: number | null;
  sub: string;
  tone?: "gold" | "amber";
}) {
  const [started, setStarted] = useState(false);
  useEffect(() => setStarted(true), []);
  const animated = useCountUp(value ?? 0, 1200, started);

  const color = tone === "gold" ? "text-gold" : tone === "amber" ? "text-brand" : "text-ink";
  return (
    <div className="panel px-6 py-[22px]">
      <div className="mb-2.5 text-xs font-medium tracking-[0.02em] text-muted">{label}</div>
      <div
        className={`num font-display text-[28px] leading-none font-bold tracking-[-0.02em] ${color}`}
      >
        {value === null ? "..." : animated.toLocaleString("id-ID")}
      </div>
      <div className="mt-1.5 text-xs text-dim">{sub}</div>
    </div>
  );
}

const idrxNumber = (raw: bigint) => Number(raw) / 100;

export default function DashboardOverviewPage() {
  const { authenticated } = usePrivy();
  const { lang } = useLangContext();
  const d = t.dashboard;
  const wallet = useActiveWallet();
  const address = wallet?.address as `0x${string}` | undefined;

  const { cards, loading: cardsLoading } = useOwnerCards(authenticated ? address : undefined);
  const balance = useIdrxBalance(authenticated ? address : undefined);
  const cardIds = useMemo(() => cards.map((c) => c.id), [cards]);
  const activity = useActivity(cardIds);

  const [showCreate, setShowCreate] = useState(false);

  const activeCards = cards.filter((c) => isCardActive(c.data));
  const totalBudget = activeCards.reduce((sum, c) => sum + c.data[2], BigInt(0));
  const totalSpent = activeCards.reduce((sum, c) => sum + c.data[3], BigInt(0));
  const spentPct =
    totalBudget > BigInt(0) ? (Number(totalSpent) / Number(totalBudget)) * 100 : 0;
  const todayRecords = (activity ?? []).filter((r) => isToday(r.createdAt));
  const todayPending = todayRecords.filter((r) => r.status === "pending").length;
  const statsLoading = !address || cardsLoading || activity === null;
  const chartData = useMemo(() => last7DaysSpending(activity), [activity]);

  return (
    <>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 font-display text-[26px] font-bold tracking-[-0.02em]">
            {d.title[lang]}
          </h1>
          <p className="text-sm text-muted">
            {activeCards.length > 0 ? d.subtitleActive[lang] : d.subtitleEmpty[lang]}
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2.5">
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="btn-ghost !px-4 !text-[13px]"
          >
            {showCreate ? d.btnCloseForm[lang] : d.btnCreate[lang]}
          </button>
          <FaucetButton />
        </div>
      </div>

      {showCreate && (
        <div className="mb-7">
          <CreateCardForm />
        </div>
      )}

      <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statsLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard
              label={d.stats.budget[lang]}
              value={idrxNumber(totalBudget)}
              sub={`IDRX · ${activeCards.length} ${d.stats.cards[lang]}`}
              tone="gold"
            />
            <StatCard
              label={d.stats.spent[lang]}
              value={idrxNumber(totalSpent)}
              sub={`IDRX · ${spentPct.toLocaleString("id-ID", { maximumFractionDigits: 1 })}% ${d.stats.dariBudget[lang]}`}
              tone="amber"
            />
            <StatCard
              label={d.stats.txToday[lang]}
              value={todayRecords.length}
              sub={
                todayRecords.length === 0
                  ? d.stats.noTx[lang]
                  : todayPending > 0
                    ? `${todayPending} ${d.stats.pendingApproval[lang]}`
                    : d.stats.autoApproved[lang]
              }
            />
            <StatCard
              label={d.stats.wallet[lang]}
              value={balance !== null ? idrxNumber(balance) : null}
              sub={`IDRX · ${d.stats.bnbTestnet[lang]}`}
              tone="gold"
            />
          </>
        )}
      </div>

      <section className="mb-7">
        <div className="content-heading">{d.chart.heading[lang]}</div>
        <div className="content-sub">{d.chart.sub[lang]}</div>
        <div className="panel px-4 py-5">
          <SpendingChart data={chartData} />
        </div>
      </section>

      <section className="mb-7">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="content-heading">{d.activity.heading[lang]}</div>
            <div className="content-sub">{d.activity.sub[lang]}</div>
          </div>
        </div>
        <div className="panel px-5 py-1">
          <ActivityFeed records={activity} lang={lang} limit={3} />
        </div>
        <Link
          href="/dashboard/history"
          className="mt-3 inline-block text-sm font-medium text-brand hover:text-gold"
        >
          {t.dashboard.viewAll[lang]}
        </Link>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/dashboard/cards" className="panel agent-card px-6 py-5">
          <div className="mb-1 font-display text-base font-semibold">
            {t.dashboard.quickLinks.cardsTitle[lang]} →
          </div>
          <div className="text-sm text-muted">{t.dashboard.quickLinks.cardsSub[lang]}</div>
        </Link>
        <Link href="/dashboard/mcp" className="panel agent-card px-6 py-5">
          <div className="mb-1 font-display text-base font-semibold">
            {t.dashboard.quickLinks.mcpTitle[lang]} →
          </div>
          <div className="text-sm text-muted">{t.dashboard.quickLinks.mcpSub[lang]}</div>
        </Link>
      </section>
    </>
  );
}
