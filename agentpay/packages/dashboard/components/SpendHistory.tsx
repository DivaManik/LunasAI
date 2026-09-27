"use client";

import { useEffect, useState } from "react";
import { BACKEND_URL, weiToTbnb } from "@/lib/constants";

type SpendRecord = {
  id: string;
  description: string;
  amount: string;
  status: "auto_approved" | "approved" | "pending" | "rejected" | string;
  createdAt: number;
};

const STATUS_ICON: Record<string, string> = {
  auto_approved: "✅",
  approved: "✅",
  pending: "⏳",
  rejected: "❌",
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
    return <p className="mt-2 text-sm text-red-500">{error}</p>;
  }

  if (history === null) {
    return <p className="mt-2 text-sm text-gray-400">Memuat riwayat...</p>;
  }

  if (history.length === 0) {
    return <p className="mt-2 text-sm text-gray-400">Belum ada transaksi.</p>;
  }

  return (
    <ul className="mt-2 flex flex-col gap-1 border-t border-gray-100 pt-3 text-sm">
      {history.map((record, i) => {
        const amountWei = (() => {
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
          <li key={record.id ?? i} className="text-gray-700">
            {STATUS_ICON[record.status] ?? "•"}{" "}
            {record.description || "Transaksi"} —{" "}
            {amountWei !== null ? `${weiToTbnb(amountWei)} tBNB` : record.amount} —{" "}
            {record.status} — {date}
          </li>
        );
      })}
    </ul>
  );
}
