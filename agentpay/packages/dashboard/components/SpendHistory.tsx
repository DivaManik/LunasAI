"use client";

import { useEffect, useState } from "react";
import { BACKEND_URL, formatIdrx } from "@/lib/constants";

type SpendRecord = {
  id: string;
  description: string;
  amount: string;
  status: "auto_approved" | "approved" | "pending" | "rejected" | string;
  createdAt: number;
};

const STATUS_DOT: Record<string, string> = {
  auto_approved: "bg-[#4ade80]",
  approved: "bg-[#4ade80]",
  pending: "dot-amber bg-brand",
  rejected: "bg-ember",
};

export function SpendHistory({ cardId }: { cardId: bigint }) {
  const [history, setHistory] = useState<SpendRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/history/${cardId.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setHistory(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setError("Gagal memuat riwayat transaksi");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [cardId]);

  if (error) {
    return <p className="text-sm text-ember">{error}</p>;
  }

  if (history === null) {
    return <p className="text-sm text-muted">Memuat riwayat...</p>;
  }

  if (history.length === 0) {
    return <p className="text-sm text-muted">Belum ada transaksi.</p>;
  }

  return (
    <ul className="flex flex-col rounded-lg border border-line bg-surface px-4 text-sm">
      {history.map((record, i) => {
        const amountRaw = (() => {
          try {
            return BigInt(record.amount);
          } catch {
            return null;
          }
        })();
        const date = new Date(record.createdAt).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });

        return (
          <li
            key={record.id ?? i}
            className="flex items-start gap-3 border-b border-line py-2.5 last:border-b-0"
          >
            <span
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[record.status] ?? "bg-muted"}`}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium">
                {record.description || "Transaksi"}
              </div>
              <div className="text-xs text-muted">
                {record.status} · {date}
              </div>
            </div>
            <span className="num shrink-0 font-display text-[13px] font-semibold text-brand">
              {amountRaw !== null ? `${formatIdrx(amountRaw)} IDRX` : record.amount}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
