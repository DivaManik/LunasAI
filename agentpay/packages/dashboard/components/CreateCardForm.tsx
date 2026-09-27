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
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const err = validate();
    setValidationError(err);
    if (err) return;

    setShowConfirmModal(true);
  }

  async function handleSubmitTransaction() {
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
    return <div className="panel px-6 py-5 text-center text-sm text-muted">Login untuk melanjutkan</div>;
  }

  const isBusy = isApproving || isPending || isConfirming;

  return (
    <>
    <form onSubmit={handleSubmit} className="panel flex flex-col gap-4 px-6 py-6">
      <div>
        <h2 className="font-display text-lg font-bold">Buat Kartu Delegasi</h2>
        <p className="text-[13px] text-muted">
          IDRX akan di-lock di kontrak sebagai budget AI agent.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="label">
          Total Budget (IDRX)
          <input
            type="number"
            step="0.01"
            min="0"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            disabled={isBusy}
            className="field"
            required
          />
        </label>

        <label className="label">
          Auto-Approve Limit (IDRX)
          <input
            type="number"
            step="0.01"
            min="0"
            value={autoLimit}
            onChange={(e) => setAutoLimit(e.target.value)}
            disabled={isBusy}
            className="field"
            required
          />
        </label>

        <label className="label">
          Berlaku (hari)
          <input
            type="number"
            step="1"
            min="1"
            value={expiryDays}
            onChange={(e) => setExpiryDays(e.target.value)}
            disabled={isBusy}
            className="field"
            required
          />
        </label>
      </div>

      {validationError && <p className="text-sm text-ember">{validationError}</p>}

      {error && <p className="text-sm text-ember">{error}</p>}

      {isConfirmed && hash && (
        <div className="flex flex-col gap-3 rounded-xl border border-[rgba(74,222,128,0.25)] bg-[rgba(34,197,94,0.06)] px-4 py-3 text-sm text-[#4ade80]">
          <div>
            ✓ Kartu berhasil dibuat!{" "}
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
            <div className="font-display text-base font-bold text-gold">Card ID: #{cardId}</div>
          )}

          <div className="flex flex-col gap-1.5 border-t border-line pt-3 text-muted">
            <p>
              Sekarang buka{" "}
              <a
                href={BOT_TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-brand underline"
              >
                {BOT_USERNAME}
              </a>{" "}
              di Telegram dan ketik:
            </p>
            <code className="rounded-md border border-line bg-surface px-2.5 py-1.5 break-all text-ink">
              /connect {address ?? "<wallet_address_kamu>"}
            </code>
          </div>
        </div>
      )}

      <button type="submit" disabled={isBusy} className="btn-primary self-start">
        {isApproving
          ? "Approve IDRX..."
          : isPending
            ? "Menunggu konfirmasi wallet..."
            : isConfirming
              ? "Memproses transaksi..."
              : "Buat Card"}
      </button>

      {hash && !isConfirmed && (
        <p className="text-xs text-muted">
          Tx:{" "}
          <a
            href={`${BSCSCAN_TESTNET_URL}/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mono break-all text-brand underline"
          >
            {hash}
          </a>
        </p>
      )}

      {isConfirmed && (
        <button type="button" onClick={() => reset()} className="btn-small self-start">
          Buat kartu lain
        </button>
      )}
    </form>

    {showConfirmModal && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
        <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-line bg-card p-6 shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
          <h2 className="font-display text-lg font-bold">💳 Buat Kartu Delegasi</h2>

          <p className="text-sm text-muted">
            Proses ini membutuhkan <strong className="text-ink">2 konfirmasi wallet</strong>{" "}
            secara berurutan:
          </p>

          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3 rounded-xl border border-[rgba(217,119,6,0.15)] bg-[rgba(217,119,6,0.06)] p-3">
              <span className="text-xl text-brand">①</span>
              <div>
                <p className="text-sm font-semibold">Approve IDRX</p>
                <p className="text-xs text-muted">
                  Izinkan kontrak mengambil{" "}
                  <strong className="num text-gold">
                    {Number(budget).toLocaleString("id-ID")} IDRX
                  </strong>{" "}
                  dari saldo kamu sebagai budget kartu
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-[rgba(234,88,12,0.15)] bg-[rgba(234,88,12,0.05)] p-3">
              <span className="text-xl text-ember">②</span>
              <div>
                <p className="text-sm font-semibold">Buat Kartu Delegasi</p>
                <p className="text-xs text-muted">
                  IDRX di-lock di dalam kontrak sebagai budget yang bisa dipakai AI agent untuk
                  belanja
                </p>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-dim">
            Ini normal untuk token ERC-20 — satu kali approve per pembuatan kartu.
          </p>

          <div className="flex gap-3">
            <button onClick={() => setShowConfirmModal(false)} className="btn-ghost flex-1">
              Batal
            </button>
            <button
              onClick={() => {
                setShowConfirmModal(false);
                handleSubmitTransaction();
              }}
              className="btn-primary flex-1"
            >
              Mengerti, Lanjutkan →
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
