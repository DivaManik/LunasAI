"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useReadContract } from "wagmi";
import { LoginButton } from "@/components/LoginButton";
import { delegationCardAbi } from "@/lib/abi";
import { BACKEND_URL, DELEGATION_CARD_ADDRESS, weiToTbnb } from "@/lib/constants";

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
      <div className="rounded border border-red-300 bg-red-50 p-6 text-center text-red-600 shadow-sm">
        Parameter tidak lengkap. URL harus mengandung <code>session</code> dan{" "}
        <code>cardId</code>.
      </div>
    );
  }

  if (!ready) {
    return <p className="text-center text-gray-500">Memuat...</p>;
  }

  if (!authenticated) {
    return (
      <div className="flex flex-col items-center gap-4 rounded border border-gray-200 bg-white p-6 text-center shadow-sm">
        <p className="text-gray-700">Login dulu untuk melanjutkan otorisasi.</p>
        <LoginButton />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold">Izinkan Akses MCP Server?</h2>
      <p className="text-sm text-gray-600">
        Aplikasi AI meminta akses ke Card #{cardIdParam} kamu.
      </p>

      {isLoadingCard ? (
        <p className="text-sm text-gray-400">Memuat info card...</p>
      ) : card ? (
        <div className="grid grid-cols-2 gap-2 rounded bg-gray-50 p-3 text-sm text-gray-700">
          <div>
            <div className="text-gray-400">Budget</div>
            <div className="font-medium">{weiToTbnb(card[2])} tBNB</div>
          </div>
          <div>
            <div className="text-gray-400">Sisa</div>
            <div className="font-medium">
              {weiToTbnb(card[2] - card[3])} tBNB
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-red-500">Card tidak ditemukan.</p>
      )}

      <div className="flex flex-col gap-1 border-t border-gray-100 pt-3 text-sm text-gray-700">
        <p>✅ Melihat info dan sisa budget card</p>
        <p>✅ Melakukan pembelian dalam batas budget</p>
        <p>✅ Melihat riwayat transaksi</p>
        <p>❌ Tidak bisa revoke atau transfer card</p>
      </div>

      {submitError && <p className="text-sm text-red-500">{submitError}</p>}

      <div className="flex gap-3 pt-2">
        <button
          onClick={() => handleDecision(true)}
          disabled={isSubmitting !== null}
          className="flex-1 rounded bg-yellow-400 px-4 py-2 font-bold text-black hover:bg-yellow-500 disabled:opacity-50"
        >
          {isSubmitting === "approve" ? "Memproses..." : "Izinkan"}
        </button>
        <button
          onClick={() => handleDecision(false)}
          disabled={isSubmitting !== null}
          className="flex-1 rounded bg-gray-200 px-4 py-2 font-bold text-gray-700 hover:bg-gray-300 disabled:opacity-50"
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
      <header className="text-center">
        <h1 className="text-2xl font-extrabold text-gray-900">
          Agent<span className="text-yellow-500">Pay</span>
        </h1>
        <p className="text-sm text-gray-500">Otorisasi MCP</p>
      </header>

      <Suspense fallback={<p className="text-center text-gray-500">Memuat...</p>}>
        <AuthorizeContent />
      </Suspense>
    </div>
  );
}
