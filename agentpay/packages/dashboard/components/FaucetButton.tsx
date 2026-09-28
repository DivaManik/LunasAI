"use client";

import { useState } from "react";
import { useWallets } from "@privy-io/react-auth";
import { BACKEND_URL } from "@/lib/constants";
import { t } from "@/lib/i18n";
import { useLangContext } from "./LangProvider";

export function FaucetButton() {
  const { wallets } = useWallets();
  const { lang } = useLangContext();
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
        setMessage(data.error ?? t.dashboard.faucet.cooldownMsg[lang]);
        return;
      }
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? t.dashboard.faucet.failedMsg[lang]);
        return;
      }

      setStatus("success");
      setMessage(`${data.amount} ${t.dashboard.faucet.sentSuffix[lang]}`);
      // Reset ke idle setelah 5 detik
      setTimeout(() => {
        setStatus("idle");
        setMessage("");
      }, 5000);
    } catch {
      setStatus("error");
      setMessage(t.dashboard.faucet.connError[lang]);
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
        {status === "idle" && `🪙 ${t.dashboard.faucet.btn[lang]}`}
        {status === "loading" && t.dashboard.faucet.loading[lang]}
        {status === "success" && t.dashboard.faucet.success[lang]}
        {status === "cooldown" && t.dashboard.faucet.cooldown[lang]}
        {status === "error" && t.dashboard.faucet.error[lang]}
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
