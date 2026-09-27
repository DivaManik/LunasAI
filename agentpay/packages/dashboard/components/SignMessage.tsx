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
    <div className="panel flex flex-col gap-4 px-6 py-5">
      <p className="text-sm text-muted">
        Ketik <code className="text-brand">/connect &lt;address&gt;</code> di{" "}
        <a
          href={BOT_TELEGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-brand hover:text-gold"
        >
          {BOT_USERNAME}
        </a>
        , paste pesan dari bot di bawah, lalu sign dengan wallet kamu.
      </p>

      <label className="label">
        Pesan dari bot (contoh: AGENTPAY-VERIFY-abc123...)
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="AGENTPAY-VERIFY-..."
          className="field mono !text-[13px]"
        />
      </label>

      <button
        onClick={handleSign}
        disabled={!message || isPending}
        className="btn-primary self-start"
      >
        {isPending ? "Menunggu konfirmasi wallet..." : "Sign Message"}
      </button>

      {signature && (
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <p className="text-sm font-medium text-[#4ade80]">✓ Signature berhasil!</p>
          <p className="text-xs text-muted">Copy dan kirim ke bot dengan /verify:</p>
          <div className="mono rounded-lg border border-[rgba(217,119,6,0.12)] bg-[rgba(217,119,6,0.06)] p-3 text-xs break-all text-brand">
            {signature}
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(signature)}
            className="btn-small btn-small-amber self-start"
          >
            Copy Signature
          </button>
          <p className="mt-2 text-xs text-muted">
            Lalu kirim ke{" "}
            <a
              href={BOT_TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand"
            >
              {BOT_USERNAME}
            </a>
            :
          </p>
          <div className="mono rounded-lg border border-line bg-surface p-2.5 text-xs break-all text-ink">
            /verify {signature}
          </div>
        </div>
      )}
    </div>
  );
}
