"use client";

import { useEffect, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { createPublicClient, createWalletClient, custom, http } from "viem";
import { delegationCardAbi } from "@/lib/abi";
import { bnbTestnet } from "@/lib/chain";
import { DELEGATION_CARD_ADDRESS, timestampToDate } from "@/lib/constants";
import { SpendHistory } from "./SpendHistory";
import { SkeletonRow } from "./Skeleton";

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

const STATUS_CHIP: Record<CardStatus, { label: string; className: string }> = {
  active: { label: "Aktif", className: "chip-active" },
  expired: { label: "Expired", className: "chip-expired" },
  revoked: { label: "Revoked", className: "chip-revoked" },
};

const emptyStateClass = "panel px-6 py-5 text-center text-sm text-muted";

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
    return <SkeletonRow />;
  }

  const [, authorizedAgent, totalBudget, spentAmount, autoApproveLimit, expiryTimestamp, isActive] =
    card;
  const status = getStatus(isActive, expiryTimestamp);
  const remaining = totalBudget - spentAmount;
  const usedPct =
    totalBudget > BigInt(0) ? Math.min(100, (Number(spentAmount) / Number(totalBudget)) * 100) : 0;

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

  const chip = STATUS_CHIP[status];

  return (
    <div className="panel agent-card flex flex-col gap-4 px-5 py-5 sm:px-6">
      <div className="flex items-center gap-4">
        <div className="agent-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[rgba(217,119,6,0.12)] bg-[rgba(217,119,6,0.08)] text-lg">
          💳
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-[3px] text-sm font-semibold">Kartu #{cardId.toString()}</div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className={`chip ${chip.className}`}>
              <span className="chip-dot" />
              {chip.label}
            </span>
            <span className="num">Auto ≤ {idrxAmount(autoApproveLimit)} IDRX</span>
          </div>
          <div className="mono mt-1 truncate text-[11px] text-dim" title={authorizedAgent}>
            Agent {authorizedAgent.slice(0, 6)}...{authorizedAgent.slice(-4)}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="num font-display text-[15px] font-semibold text-gold">
            {idrxAmount(totalBudget)}
          </div>
          <div className="num mt-0.5 text-xs text-muted">
            {idrxAmount(spentAmount)} terpakai
          </div>
          <div className="mt-2 ml-auto h-[3px] w-20 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,var(--amber),var(--gold))]"
              style={{ width: `${usedPct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <span className="num text-xs text-muted">
          Sisa {idrxAmount(remaining)} IDRX · s/d {timestampToDate(expiryTimestamp)}
        </span>
        <div className="flex gap-2">
          <button onClick={() => setShowHistory((v) => !v)} className="btn-small">
            {showHistory ? "Tutup History" : "Lihat History"}
          </button>
          {status === "active" && (
            <button
              onClick={handleRevoke}
              disabled={isRevoking || !wallet}
              className="btn-small btn-small-danger"
            >
              {isRevoking ? "Memproses..." : "Revoke"}
            </button>
          )}
        </div>
      </div>

      {showHistory && <SpendHistory cardId={cardId} />}
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
    return <div className={emptyStateClass}>Login dulu untuk lihat kartu kamu</div>;
  }

  if (!address) {
    return <div className={emptyStateClass}>Wallet belum terdeteksi. Coba login ulang.</div>;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }

  if (!cardIds || cardIds.length === 0) {
    return (
      <div className={emptyStateClass}>
        Belum ada kartu. Klik &quot;+ Buat Kartu&quot; di atas untuk membuat kartu pertama.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {cardIds.map((id) => (
        <CardItem key={id.toString()} cardId={id} />
      ))}
    </div>
  );
}
