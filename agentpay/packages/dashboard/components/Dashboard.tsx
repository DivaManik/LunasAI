"use client";

import { useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useCountUp } from "@/hooks/useCountUp";
import {
  isCardActive,
  isToday,
  useActiveWallet,
  useActivity,
  useIdrxBalance,
  useOwnerCards,
} from "@/lib/dashboard";
import { ActivityFeed } from "./ActivityFeed";
import { CardList } from "./CardList";
import { CreateCardForm } from "./CreateCardForm";
import { DashboardSidebar } from "./DashboardSidebar";
import { FaucetButton } from "./FaucetButton";
import { McpUrlManager } from "./McpUrlManager";
import { NetworkWarning } from "./NetworkWarning";
import { SignMessage } from "./SignMessage";
import { SkeletonCard } from "./Skeleton";

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
        {value === null ? "—" : animated.toLocaleString("id-ID")}
      </div>
      <div className="mt-1.5 text-xs text-dim">{sub}</div>
    </div>
  );
}

const idrxNumber = (raw: bigint) => Number(raw) / 100;

export function Dashboard() {
  const { ready, authenticated, login } = usePrivy();
  const wallet = useActiveWallet();
  const address = wallet?.address as `0x${string}` | undefined;

  const { cards, loading: cardsLoading, reload } = useOwnerCards(
    authenticated ? address : undefined
  );
  const balance = useIdrxBalance(authenticated ? address : undefined);
  const cardIds = useMemo(() => cards.map((c) => c.id), [cards]);
  const activity = useActivity(cardIds);

  const [showCreate, setShowCreate] = useState(false);
  const [listKey, setListKey] = useState(0);

  const activeCards = cards.filter((c) => isCardActive(c.data));
  const totalBudget = activeCards.reduce((sum, c) => sum + c.data[2], BigInt(0));
  const totalSpent = activeCards.reduce((sum, c) => sum + c.data[3], BigInt(0));
  const spentPct =
    totalBudget > BigInt(0) ? (Number(totalSpent) / Number(totalBudget)) * 100 : 0;
  const todayRecords = (activity ?? []).filter((r) => isToday(r.createdAt));
  const todayPending = todayRecords.filter((r) => r.status === "pending").length;
  const statsLoading = !address || cardsLoading || activity === null;

  function refreshAll() {
    reload();
    setListKey((k) => k + 1);
  }

  function closeCreate() {
    setShowCreate(false);
    refreshAll();
  }

  return (
    <div className="flex min-h-[calc(100dvh-64px)]">
      <DashboardSidebar
        activeCardCount={activeCards.length}
        address={authenticated ? address : undefined}
        balance={balance}
      />

      <main className="min-w-0 flex-1 px-4 py-5 md:p-8">
        <div id="overview" className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="mb-1 font-display text-[26px] font-bold tracking-[-0.02em]">
              Dashboard
            </h1>
            <p className="text-sm text-muted">
              {authenticated
                ? activeCards.length > 0
                  ? "Selamat datang kembali — kartu aktif kamu berjalan normal."
                  : "Selamat datang — claim IDRX lalu buat kartu delegasi pertamamu."
                : "Kelola kartu delegasi dan budget AI agent kamu."}
            </p>
          </div>
          {authenticated && (
            <div className="flex flex-wrap items-start gap-2.5">
              <button
                onClick={() => (showCreate ? closeCreate() : setShowCreate(true))}
                className="btn-ghost !px-4 !text-[13px]"
              >
                {showCreate ? "Tutup Form" : "+ Buat Kartu"}
              </button>
              <FaucetButton />
            </div>
          )}
        </div>

        <div className="mb-6 empty:hidden">
          <NetworkWarning />
        </div>

        {!ready ? (
          <p className="text-sm text-muted">Memuat...</p>
        ) : !authenticated ? (
          <div className="panel flex flex-col items-center gap-4 px-6 py-14 text-center">
            <h2 className="font-display text-xl font-bold">Masuk untuk mulai</h2>
            <p className="max-w-sm text-sm text-muted">
              Login dengan Google atau email. Wallet embedded dibuat otomatis — tanpa seed phrase.
            </p>
            <button onClick={login} className="btn-primary">
              Launch App
            </button>
          </div>
        ) : (
          <>
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
                    label="Total Budget Aktif"
                    value={idrxNumber(totalBudget)}
                    sub={`IDRX · ${activeCards.length} kartu aktif`}
                    tone="gold"
                  />
                  <StatCard
                    label="Sudah Dipakai"
                    value={idrxNumber(totalSpent)}
                    sub={`IDRX · ${spentPct.toLocaleString("id-ID", { maximumFractionDigits: 1 })}% dari budget`}
                    tone="amber"
                  />
                  <StatCard
                    label="Transaksi Hari Ini"
                    value={todayRecords.length}
                    sub={
                      todayRecords.length === 0
                        ? "Belum ada transaksi"
                        : todayPending > 0
                          ? `${todayPending} menunggu approval`
                          : "Auto-approved semua"
                    }
                  />
                  <StatCard
                    label="Saldo Wallet"
                    value={balance !== null ? idrxNumber(balance) : null}
                    sub="IDRX · BNB Testnet"
                    tone="gold"
                  />
                </>
              )}
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <section id="kartu" className="mb-7">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="content-heading">Kartu Delegasi</div>
                    <div className="content-sub">Semua kartu milik wallet ini</div>
                  </div>
                  <button onClick={refreshAll} className="btn-small">
                    Refresh
                  </button>
                </div>
                <CardList key={listKey} />
              </section>

              <section id="riwayat" className="mb-7">
                <div className="content-heading">Aktivitas Terbaru</div>
                <div className="content-sub">Transaksi oleh AI agent</div>
                <div className="panel px-5 py-1">
                  <ActivityFeed records={activity} />
                </div>
              </section>
            </div>

            <section id="mcp" className="mt-2 mb-7">
              <div className="content-heading">MCP Connection</div>
              <div className="content-sub">
                URL untuk disambungkan ke Claude Settings → Connectors
              </div>
              {activeCards.length === 0 ? (
                <div className="panel px-6 py-5 text-sm text-muted">
                  Buat kartu aktif dulu untuk generate MCP URL.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {activeCards.map((c) => (
                    <div key={c.id.toString()} className="panel px-6 py-5">
                      <div className="mb-1 text-[13px] text-muted">
                        Kartu #{c.id.toString()}
                      </div>
                      <McpUrlManager cardId={c.id.toString()} />
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section id="telegram" className="mb-7">
              <div className="content-heading">Bot Telegram</div>
              <div className="content-sub">
                Verifikasi wallet supaya bisa approve transaksi lewat Telegram
              </div>
              <SignMessage />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
