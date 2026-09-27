"use client";

import { useState } from "react";
import { useWallets } from "@privy-io/react-auth";
import { BACKEND_URL } from "@/lib/constants";

export function FaucetButton() {
  const { wallets } = useWallets();
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error" | "cooldown"
  >("idle");
  const [message, setMessage] = useState("");

  const wallet = wallets.find((w) => w.walletClientType === "privy") ?? wallets[0];
  const address = wallet?.address;

  if (!address) return null; // Jangan tampilkan jika belum login

  const handleClaim = async () => {
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch(`${BACKEND_URL}/api/faucet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();

      if (res.status === 429) {
        setStatus("cooldown");
        setMessage(data.error ?? "Sudah claim hari ini.");
        return;
      }
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Faucet gagal.");
        return;
      }

      setStatus("success");
      setMessage(`${data.amount} berhasil dikirim!`);
      // Reset ke idle setelah 5 detik
      setTimeout(() => {
        setStatus("idle");
        setMessage("");
      }, 5000);
    } catch {
      setStatus("error");
      setMessage("Tidak bisa terhubung ke server.");
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClaim}
        disabled={status === "loading" || status === "cooldown" || status === "success"}
        className={`
          ${status === "idle" ? "btn-primary !px-4 !text-[13px]" : ""}
          ${status === "loading" ? "btn-ghost !px-4 !text-[13px] cursor-wait" : ""}
          ${status === "success" ? "btn-ghost !px-4 !text-[13px] !border-[rgba(74,222,128,0.3)] !text-[#4ade80] cursor-default" : ""}
          ${status === "cooldown" ? "btn-ghost !px-4 !text-[13px] !border-line-amber !text-brand cursor-not-allowed" : ""}
          ${status === "error" ? "btn-ghost !px-4 !text-[13px] !border-[rgba(234,88,12,0.3)] !text-ember" : ""}
        `}
      >
        {status === "idle" && "🪙 Claim 100.000 IDRX"}
        {status === "loading" && "Mengirim..."}
        {status === "success" && "✓ IDRX Diterima!"}
        {status === "cooldown" && "⏳ Sudah Claim Hari Ini"}
        {status === "error" && "Coba Lagi"}
      </button>
      {message && (
        <p
          className={`max-w-xs text-right text-xs
          ${status === "success" ? "text-[#4ade80]" : ""}
          ${status === "cooldown" ? "text-brand" : ""}
          ${status === "error" ? "text-ember" : ""}
        `}
        >
          {message}
        </p>
      )}
    </div>
  );
}
