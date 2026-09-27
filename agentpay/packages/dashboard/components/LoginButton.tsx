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
      <button
        disabled
        className="rounded bg-gray-200 px-4 py-2 font-bold text-gray-400"
      >
        Memuat...
      </button>
    );
  }

  if (authenticated && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-sm">
          <div className="text-xs text-gray-500">Wallet</div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`cursor-pointer rounded px-2 py-1 font-mono text-xs transition-colors hover:bg-gray-100 ${
                copied ? "font-bold text-green-600" : ""
              }`}
              title="Klik untuk copy address"
            >
              {copied ? "✓ Copied!" : `${address.slice(0, 6)}...${address.slice(-4)}`}
            </button>
            {idrxBalance !== null && (
              <span className="text-xs font-semibold text-yellow-600">
                {idrxBalance.toLocaleString("id-ID")} IDRX
              </span>
            )}
          </div>
        </div>
        <button
          onClick={logout}
          className="text-sm text-red-500 underline hover:text-red-700"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={login}
      className="rounded bg-yellow-400 px-4 py-2 font-bold text-black transition-colors hover:bg-yellow-500"
    >
      Login / Connect Wallet
    </button>
  );
}
