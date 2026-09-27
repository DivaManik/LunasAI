"use client";

import { useEffect, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { createPublicClient, createWalletClient, custom, http } from "viem";
import { delegationCardAbi } from "@/lib/abi";
import { bnbTestnet } from "@/lib/chain";
import { DELEGATION_CARD_ADDRESS, timestampToDate } from "@/lib/constants";
import { SpendHistory } from "./SpendHistory";
import { McpUrlManager } from "./McpUrlManager";

function idrxAmount(raw: bigint): string {
  return (Number(raw) / 100).toLocaleString("id-ID");
}

const publicClient = createPublicClient({
  chain: bnbTestnet,
  transport: http(),
});

type CardStatus = "active" | "expired" | "revoked";

type CardData = readonly [
  owner: `0x${string}`,
  authorizedAgent: `0x${string}`,
  totalBudget: bigint,
  spentAmount: bigint,
  autoApproveLimit: bigint,
  expiryTimestamp: bigint,
  isActive: boolean,
];

function getStatus(isActive: boolean, expiryTimestamp: bigint): CardStatus {
  if (!isActive) return "revoked";
  if (BigInt(Math.floor(Date.now() / 1000)) > expiryTimestamp) return "expired";
  return "active";
}

const STATUS_LABEL: Record<CardStatus, string> = {
  active: "🟢 Aktif",
  expired: "🔴 Expired",
  revoked: "⚫ Revoked",
};

function useActiveWallet() {
  const { wallets } = useWallets();
  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const externalWallet = wallets.find((w) => w.walletClientType !== "privy");
  return embeddedWallet ?? externalWallet;
}

function CardItem({ cardId }: { cardId: bigint }) {
  const wallet = useActiveWallet();
  const [showHistory, setShowHistory] = useState(false);
  const [card, setCard] = useState<CardData | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  async function loadCard() {
    const data = (await publicClient.readContract({
      address: DELEGATION_CARD_ADDRESS,
      abi: delegationCardAbi,
      functionName: "cards",
      args: [cardId],
    })) as CardData;
    setCard(data);
  }

  useEffect(() => {
    loadCard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId]);

  if (!card) {
    return (
      <div className="rounded border border-gray-200 bg-white p-6 shadow-sm text-gray-400">
        Memuat Card #{cardId.toString()}...
      </div>
    );
  }

  const [, , totalBudget, spentAmount, , expiryTimestamp, isActive] = card;
  const status = getStatus(isActive, expiryTimestamp);
  const remaining = totalBudget - spentAmount;

  async function handleRevoke() {
    if (!wallet) return;
    setIsRevoking(true);
    try {
      const provider = await wallet.getEthereumProvider();
      const walletClient = createWalletClient({
        chain: bnbTestnet,
        transport: custom(provider),
      });

      const txHash = await walletClient.writeContract({
        address: DELEGATION_CARD_ADDRESS,
        abi: delegationCardAbi,
        functionName: "revokeCard",
        args: [cardId],
        account: wallet.address as `0x${string}`,
      });

      await publicClient.waitForTransactionReceipt({ hash: txHash });
      await loadCard();
    } finally {
      setIsRevoking(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">Card #{cardId.toString()}</h3>
        <span className="text-sm">{STATUS_LABEL[status]}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm text-gray-700">
        <div>
          <div className="text-gray-400">Budget</div>
          <div className="font-medium">{idrxAmount(totalBudget)} IDRX</div>
        </div>
        <div>
          <div className="text-gray-400">Terpakai</div>
          <div className="font-medium">{idrxAmount(spentAmount)} IDRX</div>
        </div>
        <div>
          <div className="text-gray-400">Sisa</div>
          <div className="font-medium">{idrxAmount(remaining)} IDRX</div>
        </div>
      </div>

      <div className="text-sm text-gray-700">
        <span className="text-gray-400">Berlaku:</span>{" "}
        {timestampToDate(expiryTimestamp)}
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={() => setShowHistory((v) => !v)}
          className="rounded bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-300"
        >
          {showHistory ? "Sembunyikan History" : "Lihat History"}
        </button>
        {status === "active" && (
          <button
            onClick={handleRevoke}
            disabled={isRevoking || !wallet}
            className="rounded bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
          >
            {isRevoking ? "Memproses..." : "Revoke Card"}
          </button>
        )}
      </div>

      {showHistory && <SpendHistory cardId={cardId} />}

      <McpUrlManager cardId={cardId.toString()} />
    </div>
  );
}

export function CardList() {
  const { authenticated } = usePrivy();
  const wallet = useActiveWallet();
  const address = wallet?.address as `0x${string}` | undefined;

  const [cardIds, setCardIds] = useState<readonly bigint[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!authenticated || !address) {
      setCardIds(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    publicClient
      .readContract({
        address: DELEGATION_CARD_ADDRESS,
        abi: delegationCardAbi,
        functionName: "getOwnerCards",
        args: [address],
      })
      .then((result) => {
        if (!cancelled) setCardIds(result as readonly bigint[]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authenticated, address]);

  if (!authenticated) {
    return (
      <div className="rounded border border-gray-200 bg-white p-6 text-center text-gray-500 shadow-sm">
        Login dulu untuk lihat kartu kamu
      </div>
    );
  }

  if (!address) {
    return (
      <div className="rounded border border-gray-200 bg-white p-6 text-center text-gray-500 shadow-sm">
        Wallet belum terdeteksi. Coba login ulang.
      </div>
    );
  }

  if (isLoading) {
    return <p className="text-gray-500">Memuat kartu...</p>;
  }

  if (!cardIds || cardIds.length === 0) {
    return (
      <div className="rounded border border-gray-200 bg-white p-6 text-center text-gray-500 shadow-sm">
        Belum ada card. Buat card baru di halaman utama.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {cardIds.map((id) => (
        <CardItem key={id.toString()} cardId={id} />
      ))}
    </div>
  );
}
