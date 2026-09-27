"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useReadContract } from "wagmi";
import { LoginButton } from "@/components/LoginButton";
import { delegationCardAbi } from "@/lib/abi";
import { LogoMoon } from "@/components/LogoMoon";
import { BACKEND_URL, DELEGATION_CARD_ADDRESS, formatIdrx } from "@/lib/constants";

function AuthorizeContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  const cardIdParam = searchParams.get("cardId");

  const { ready, authenticated } = usePrivy();
  const [isSubmitting, setIsSubmitting] = useState<"approve" | "reject" | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const cardId = cardIdParam ? BigInt(cardIdParam) : undefined;

  const { data: card, isLoading: isLoadingCard } = useReadContract({
    address: DELEGATION_CARD_ADDRESS,
    abi: delegationCardAbi,
    functionName: "cards",
    args: cardId !== undefined ? [cardId] : undefined,
    query: { enabled: cardId !== undefined },
  });

  async function handleDecision(approved: boolean) {
    if (!sessionId) {
      setSubmitError("Session ID tidak ditemukan di URL.");
      return;
    }

    setSubmitError(null);
    setIsSubmitting(approved ? "approve" : "reject");
    try {
      const res = await fetch(`${BACKEND_URL}/oauth/consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, approved }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { redirectTo } = await res.json();
      window.location.href = redirectTo;
    } catch {
      setSubmitError("Gagal mengirim keputusan. Coba lagi.");
      setIsSubmitting(null);
    }
  }

  if (!sessionId || !cardIdParam) {
    return (
      <div className="rounded-xl border border-[rgba(234,88,12,0.3)] bg-[rgba(234,88,12,0.08)] p-6 text-center text-sm text-ember">
        Parameter tidak lengkap. URL harus mengandung <code>session</code> dan{" "}
        <code>cardId</code>.
      </div>
    );
  }

  if (!ready) {
    return <p className="text-center text-sm text-muted">Memuat...</p>;
  }

  if (!authenticated) {
    return (
      <div className="panel flex flex-col items-center gap-4 p-6 text-center">
        <p className="text-sm text-muted">Login dulu untuk melanjutkan otorisasi.</p>
        <LoginButton />
      </div>
    );
  }

  return (
    <div className="panel flex flex-col gap-4 p-6">
      <h2 className="font-display text-lg font-bold">Izinkan Akses MCP Server?</h2>
      <p className="text-sm text-muted">
        Aplikasi AI meminta akses ke Kartu #{cardIdParam} kamu.
      </p>

      {isLoadingCard ? (
        <p className="text-sm text-muted">Memuat info kartu...</p>
      ) : card ? (
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-line bg-surface p-3 text-sm">
          <div>
            <div className="text-xs text-muted">Budget</div>
            <div className="num font-display font-semibold text-gold">
              {formatIdrx(card[2])} IDRX
            </div>
          </div>
          <div>
            <div className="text-xs text-muted">Sisa</div>
            <div className="num font-display font-semibold text-brand">
              {formatIdrx(card[2] - card[3])} IDRX
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-ember">Kartu tidak ditemukan.</p>
      )}

      <div className="flex flex-col gap-1 border-t border-line pt-3 text-sm text-muted">
        <p>✅ Melihat info dan sisa budget kartu</p>
        <p>✅ Melakukan pembelian dalam batas budget</p>
        <p>✅ Melihat riwayat transaksi</p>
        <p>❌ Tidak bisa revoke atau transfer kartu</p>
      </div>

      {submitError && <p className="text-sm text-ember">{submitError}</p>}

      <div className="flex gap-3 pt-2">
        <button
          onClick={() => handleDecision(true)}
          disabled={isSubmitting !== null}
          className="btn-primary flex-1"
        >
          {isSubmitting === "approve" ? "Memproses..." : "Izinkan"}
        </button>
        <button
          onClick={() => handleDecision(false)}
          disabled={isSubmitting !== null}
          className="btn-ghost flex-1"
        >
          {isSubmitting === "reject" ? "Memproses..." : "Tolak"}
        </button>
      </div>
    </div>
  );
}

export default function AuthorizePage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-10">
      <header className="flex flex-col items-center gap-2 text-center">
        <LogoMoon size={32} />
        <h1 className="font-display text-2xl font-extrabold tracking-[-0.02em]">LunasAI</h1>
        <p className="text-sm text-muted">Otorisasi MCP</p>
      </header>

      <Suspense fallback={<p className="text-center text-sm text-muted">Memuat...</p>}>
        <AuthorizeContent />
      </Suspense>
    </div>
  );
}
