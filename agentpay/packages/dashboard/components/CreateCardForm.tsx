"use client";

import { useState, type FormEvent } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  createPublicClient,
  createWalletClient,
  custom,
  decodeEventLog,
  http,
  parseUnits,
} from "viem";
import { delegationCardAbi } from "@/lib/abi";
import { erc20Abi } from "@/lib/erc20";
import { bnbTestnet } from "@/lib/chain";
import {
  AUTHORIZED_AGENT,
  BOT_TELEGRAM_URL,
  BOT_USERNAME,
  BSCSCAN_TESTNET_URL,
  DELEGATION_CARD_ADDRESS,
  IDRX_TOKEN_ADDRESS,
} from "@/lib/constants";

const IDRX_DECIMALS = 2;

const publicClient = createPublicClient({
  chain: bnbTestnet,
  transport: http(),
});

export function CreateCardForm() {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const address = (wallets.find((w) => w.walletClientType === "privy") ?? wallets[0])
    ?.address;

  const [budget, setBudget] = useState("50000");
  const [autoLimit, setAutoLimit] = useState("10000");
  const [expiryDays, setExpiryDays] = useState("7");
  const [validationError, setValidationError] = useState<string | null>(null);

  const [hash, setHash] = useState<`0x${string}` | null>(null);
  const [cardId, setCardId] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setHash(null);
    setCardId(null);
    setIsConfirmed(false);
    setError(null);
  }

  function validate(): string | null {
    const budgetNum = Number(budget);
    const autoLimitNum = Number(autoLimit);
    const expiryNum = Number(expiryDays);

    if (!(budgetNum > 0)) return "Budget harus > 0";
    if (!(expiryNum >= 1)) return "Expiry harus minimal 1 hari";
    if (autoLimitNum > budgetNum)
      return "Auto-approve limit harus ≤ total budget";
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const err = validate();
    setValidationError(err);
    if (err) return;

    const wallet = wallets.find((w) => w.walletClientType === "privy") ?? wallets[0];
    if (!wallet) {
      setError("Wallet tidak ditemukan. Login ulang.");
      return;
    }

    if (!IDRX_TOKEN_ADDRESS) {
      setError("Token IDRX belum dikonfigurasi. Hubungi admin.");
      return;
    }

    setError(null);
    setIsApproving(true);
    try {
      const provider = await wallet.getEthereumProvider();
      const walletClient = createWalletClient({
        chain: bnbTestnet,
        transport: custom(provider),
      });
      const account = wallet.address as `0x${string}`;
      const budgetAmount = parseUnits(budget, IDRX_DECIMALS);

      const approveHash = await walletClient.writeContract({
        address: IDRX_TOKEN_ADDRESS,
        abi: erc20Abi,
        functionName: "approve",
        args: [DELEGATION_CARD_ADDRESS, budgetAmount],
        account,
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });
      setIsApproving(false);
      setIsPending(true);

      const txHash = await walletClient.writeContract({
        address: DELEGATION_CARD_ADDRESS,
        abi: delegationCardAbi,
        functionName: "createCard",
        args: [
          budgetAmount,
          parseUnits(autoLimit, IDRX_DECIMALS),
          BigInt(expiryDays),
          AUTHORIZED_AGENT,
        ],
        account,
      });

      setHash(txHash);
      setIsPending(false);
      setIsConfirming(true);

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: delegationCardAbi,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "CardCreated") {
            setCardId((decoded.args as { cardId: bigint }).cardId.toString());
            break;
          }
        } catch {
          continue;
        }
      }

      setIsConfirming(false);
      setIsConfirmed(true);
    } catch (err) {
      setIsApproving(false);
      setIsPending(false);
      setIsConfirming(false);
      setError(err instanceof Error ? err.message.split("\n")[0] : "Transaksi gagal");
    }
  }

  if (!authenticated) {
    return (
      <div className="rounded border border-gray-200 bg-white p-6 text-center text-gray-500 shadow-sm">
        Login untuk melanjutkan
      </div>
    );
  }

  const isBusy = isApproving || isPending || isConfirming;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded border border-gray-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-lg font-bold">Buat Spending Card Baru</h2>

      <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
        Total Budget (IDRX)
        <input
          type="number"
          step="0.01"
          min="0"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          disabled={isBusy}
          className="rounded border border-gray-300 px-3 py-2 disabled:bg-gray-100"
          required
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
        Auto-Approve Limit (IDRX)
        <input
          type="number"
          step="0.01"
          min="0"
          value={autoLimit}
          onChange={(e) => setAutoLimit(e.target.value)}
          disabled={isBusy}
          className="rounded border border-gray-300 px-3 py-2 disabled:bg-gray-100"
          required
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
        Berlaku (hari)
        <input
          type="number"
          step="1"
          min="1"
          value={expiryDays}
          onChange={(e) => setExpiryDays(e.target.value)}
          disabled={isBusy}
          className="rounded border border-gray-300 px-3 py-2 disabled:bg-gray-100"
          required
        />
      </label>

      {validationError && (
        <p className="text-sm text-red-500">{validationError}</p>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {isConfirmed && hash && (
        <div className="flex flex-col gap-3 rounded border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-600">
          <div>
            ✅ Card berhasil dibuat!{" "}
            <a
              href={`${BSCSCAN_TESTNET_URL}/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline"
            >
              Lihat di BscScan →
            </a>
          </div>

          {cardId && (
            <div className="font-bold text-green-700">Card ID: #{cardId}</div>
          )}

          <div className="flex flex-col gap-1 border-t border-green-200 pt-3 text-gray-700">
            <p>
              Sekarang buka{" "}
              <a
                href={BOT_TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-yellow-600 underline"
              >
                {BOT_USERNAME}
              </a>{" "}
              di Telegram dan ketik:
            </p>
            <code className="rounded bg-white px-2 py-1 text-gray-900">
              /connect {address ?? "<wallet_address_kamu>"}
            </code>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isBusy}
        className="rounded bg-yellow-400 px-4 py-2 font-bold text-black hover:bg-yellow-500 disabled:opacity-50"
      >
        {isApproving
          ? "Approve IDRX..."
          : isPending
            ? "Menunggu konfirmasi wallet..."
            : isConfirming
              ? "Memproses transaksi..."
              : "Buat Card"}
      </button>

      {hash && !isConfirmed && (
        <p className="text-xs text-gray-500">
          Tx:{" "}
          <a
            href={`${BSCSCAN_TESTNET_URL}/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {hash}
          </a>
        </p>
      )}

      {isConfirmed && (
        <button
          type="button"
          onClick={() => reset()}
          className="text-sm text-gray-500 underline"
        >
          Buat card lain
        </button>
      )}
    </form>
  );
}
