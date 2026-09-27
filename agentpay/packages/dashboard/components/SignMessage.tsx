"use client";

import { useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { createWalletClient, custom } from "viem";
import { bnbTestnet } from "@/lib/chain";
import { BOT_TELEGRAM_URL, BOT_USERNAME } from "@/lib/constants";

export function SignMessage() {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const [message, setMessage] = useState("");
  const [signature, setSignature] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function handleSign() {
    const wallet = wallets.find((w) => w.walletClientType === "privy") ?? wallets[0];
    if (!wallet) return;

    setIsPending(true);
    try {
      const provider = await wallet.getEthereumProvider();
      const walletClient = createWalletClient({
        chain: bnbTestnet,
        transport: custom(provider),
      });

      const sig = await walletClient.signMessage({
        account: wallet.address as `0x${string}`,
        message,
      });
      setSignature(sig);
    } finally {
      setIsPending(false);
    }
  }

  if (!authenticated) return null;

  return (
    <div className="flex flex-col gap-4 rounded border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold">🔐 Verifikasi Wallet untuk Bot</h2>
      <p className="text-sm text-gray-600">
        Paste pesan dari bot Telegram, lalu sign dengan wallet kamu.
      </p>

      <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
        Pesan dari bot (contoh: AGENTPAY-VERIFY-abc123...)
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="AGENTPAY-VERIFY-..."
          className="rounded border border-gray-300 px-3 py-2 font-mono text-sm"
        />
      </label>

      <button
        onClick={handleSign}
        disabled={!message || isPending}
        className="rounded bg-yellow-400 px-4 py-2 font-bold text-black hover:bg-yellow-500 disabled:opacity-50"
      >
        {isPending ? "Menunggu konfirmasi wallet..." : "Sign Message"}
      </button>

      {signature && (
        <div className="flex flex-col gap-2 border-t border-gray-100 pt-3">
          <p className="text-sm font-medium text-green-600">
            ✅ Signature berhasil!
          </p>
          <p className="text-xs text-gray-500">
            Copy dan kirim ke bot dengan /verify:
          </p>
          <div className="break-all rounded bg-gray-100 p-3 font-mono text-xs">
            {signature}
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(signature)}
            className="text-left text-sm text-yellow-600 underline"
          >
            Copy Signature
          </button>
          <p className="mt-2 text-xs text-gray-500">
            Lalu kirim ke{" "}
            <a
              href={BOT_TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-yellow-600"
            >
              {BOT_USERNAME}
            </a>
            :
          </p>
          <div className="break-all rounded bg-gray-100 p-2 font-mono text-xs">
            /verify {signature}
          </div>
        </div>
      )}
    </div>
  );
}
