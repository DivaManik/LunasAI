import { useCallback, useEffect, useState } from "react";
import { useWallets } from "@privy-io/react-auth";
import { createPublicClient, http } from "viem";
import { delegationCardAbi } from "./abi";
import { bnbTestnet } from "./chain";
import { erc20Abi } from "./erc20";
import { BACKEND_URL, DELEGATION_CARD_ADDRESS, IDRX_TOKEN_ADDRESS } from "./constants";

const publicClient = createPublicClient({ chain: bnbTestnet, transport: http() });

export type CardData = readonly [
  owner: `0x${string}`,
  authorizedAgent: `0x${string}`,
  totalBudget: bigint,
  spentAmount: bigint,
  autoApproveLimit: bigint,
  expiryTimestamp: bigint,
  isActive: boolean,
];

export type OwnedCard = { id: bigint; data: CardData };

export type ActivityRecord = {
  id: string;
  cardId: string;
  description: string;
  amount: string;
  status: string;
  createdAt: number;
};

export function isCardActive(data: CardData): boolean {
  return data[6] && BigInt(Math.floor(Date.now() / 1000)) <= data[5];
}

export function useActiveWallet() {
  const { wallets } = useWallets();
  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const externalWallet = wallets.find((w) => w.walletClientType !== "privy");
  return embeddedWallet ?? externalWallet;
}

export function useOwnerCards(address: `0x${string}` | undefined) {
  const [cards, setCards] = useState<OwnedCard[]>([]);
  const [fetchedKey, setFetchedKey] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const currentKey = address ? `${address}-${version}` : null;
  const loading = currentKey !== null && fetchedKey !== currentKey;

  useEffect(() => {
    if (!address) {
      setCards([]);
      return;
    }
    let cancelled = false;
    const key = `${address}-${version}`;

    (async () => {
      try {
        const ids = (await publicClient.readContract({
          address: DELEGATION_CARD_ADDRESS,
          abi: delegationCardAbi,
          functionName: "getOwnerCards",
          args: [address],
        })) as readonly bigint[];

        const data = await Promise.all(
          ids.map(
            (id) =>
              publicClient.readContract({
                address: DELEGATION_CARD_ADDRESS,
                abi: delegationCardAbi,
                functionName: "cards",
                args: [id],
              }) as Promise<CardData>
          )
        );
        if (!cancelled) setCards(ids.map((id, i) => ({ id, data: data[i] })));
      } catch {
        if (!cancelled) setCards([]);
      } finally {
        if (!cancelled) setFetchedKey(key);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address, version]);

  return { cards, loading, reload };
}

export function useIdrxBalance(address: `0x${string}` | undefined) {
  const [balance, setBalance] = useState<bigint | null>(null);

  useEffect(() => {
    if (!IDRX_TOKEN_ADDRESS || !address) {
      setBalance(null);
      return;
    }
    let cancelled = false;
    publicClient
      .readContract({
        address: IDRX_TOKEN_ADDRESS,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      })
      .then((bal) => {
        if (!cancelled) setBalance(bal);
      })
      .catch(() => {
        if (!cancelled) setBalance(null);
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  return balance;
}

export function useActivity(cardIds: readonly bigint[]) {
  const [records, setRecords] = useState<ActivityRecord[] | null>(null);
  const key = cardIds.map(String).join(",");

  useEffect(() => {
    if (!key) {
      setRecords([]);
      return;
    }
    let cancelled = false;
    setRecords(null);

    Promise.all(
      key.split(",").map(async (cardId) => {
        try {
          const res = await fetch(`${BACKEND_URL}/api/history/${cardId}`);
          if (!res.ok) return [];
          const data = await res.json();
          return Array.isArray(data)
            ? (data as ActivityRecord[]).map((r) => ({ ...r, cardId }))
            : [];
        } catch {
          return [];
        }
      })
    ).then((lists) => {
      if (cancelled) return;
      setRecords(lists.flat().sort((a, b) => b.createdAt - a.createdAt));
    });

    return () => {
      cancelled = true;
    };
  }, [key]);

  return records;
}

export function timeAgo(timestamp: number): string {
  const diff = Math.max(0, Date.now() - timestamp) / 1000;
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 172800) return "kemarin";
  return `${Math.floor(diff / 86400)} hari lalu`;
}

export function isToday(timestamp: number): boolean {
  return new Date(timestamp).toDateString() === new Date().toDateString();
}

export function last7DaysSpending(
  records: ActivityRecord[] | null
): { date: string; amount: number }[] {
  const days: { date: string; key: string; amount: number }[] = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push({
      date: d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
      key: d.toDateString(),
      amount: 0,
    });
  }

  if (records) {
    for (const r of records) {
      const key = new Date(r.createdAt).toDateString();
      const day = days.find((d) => d.key === key);
      if (day) {
        const amount = Number(BigInt(r.amount || "0")) / 100;
        day.amount += amount;
      }
    }
  }

  return days.map(({ date, amount }) => ({ date, amount }));
}
