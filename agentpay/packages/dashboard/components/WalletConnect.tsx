"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <span className="rounded bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm">
          {shortenAddress(address)}
        </span>
        <button
          onClick={() => disconnect()}
          className="rounded bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-300"
        >
          Disconnect
        </button>
      </div>
    );
  }

  const injectedConnector = connectors.find((c) => c.id === "injected") ?? connectors[0];

  return (
    <button
      onClick={() => injectedConnector && connect({ connector: injectedConnector })}
      disabled={isPending || !injectedConnector}
      className="rounded bg-yellow-400 px-4 py-2 font-bold text-black hover:bg-yellow-500 disabled:opacity-50"
    >
      {isPending ? "Menghubungkan..." : "Connect Wallet"}
    </button>
  );
}
