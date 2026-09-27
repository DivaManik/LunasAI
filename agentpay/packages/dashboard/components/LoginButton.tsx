"use client";

import { useEffect, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { createPublicClient, http } from "viem";
import { bnbTestnet } from "@/lib/chain";
import { erc20Abi } from "@/lib/erc20";
import { IDRX_TOKEN_ADDRESS } from "@/lib/constants";

const publicClient = createPublicClient({
  chain: bnbTestnet,
  transport: http(),
});

export function LoginButton() {
  const { ready, login, logout, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const [copied, setCopied] = useState(false);
  const [idrxBalance, setIdrxBalance] = useState<number | null>(null);

  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const externalWallet = wallets.find((w) => w.walletClientType !== "privy");
  const address = embeddedWallet?.address || externalWallet?.address;

  useEffect(() => {
    if (!IDRX_TOKEN_ADDRESS || !address) {
      setIdrxBalance(null);
      return;
    }

    let cancelled = false;
    publicClient
      .readContract({
        address: IDRX_TOKEN_ADDRESS,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address as `0x${string}`],
      })
      .then((bal) => {
        if (!cancelled) setIdrxBalance(Number(bal) / 100);
      })
      .catch(() => {
        if (!cancelled) setIdrxBalance(null);
      });

    return () => {
      cancelled = true;
    };
  }, [address]);

  async function handleCopy() {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!ready) {
    return (
      <button disabled className="btn-ghost">
        Memuat...
      </button>
    );
  }

  if (authenticated && address) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-line bg-surface py-1 pl-1 pr-2">
        <button
          onClick={handleCopy}
          className={`mono cursor-pointer rounded-md px-2 py-1 text-xs transition-colors hover:bg-white/5 ${
            copied ? "font-semibold text-[#4ade80]" : "text-brand"
          }`}
          title="Klik untuk copy address"
        >
          {copied ? "✓ Copied!" : `${address.slice(0, 6)}...${address.slice(-4)}`}
        </button>
        {idrxBalance !== null && (
          <span className="num hidden text-xs font-semibold text-gold sm:inline">
            {idrxBalance.toLocaleString("id-ID")} IDRX
          </span>
        )}
        <button
          onClick={logout}
          className="ml-1 text-xs text-muted transition-colors hover:text-ember"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <button onClick={login} className="btn-primary">
      Launch App
    </button>
  );
}
