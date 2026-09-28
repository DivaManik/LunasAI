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
import { t } from "@/lib/i18n";
import { useLangContext } from "./LangProvider";

const IDRX_DECIMALS = 2;

const publicClient = createPublicClient({
  chain: bnbTestnet,
  transport: http(),
});

export function CreateCardForm({ onSuccess }: { onSuccess?: (cardId: string | null) => void } = {}) {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { lang } = useLangContext();
  const cc = t.dashboard.createCard;
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

    if (!(budgetNum > 0)) return cc.validationBudget[lang];
    if (!(expiryNum >= 1)) return cc.validationExpiry[lang];
    if (autoLimitNum > budgetNum) return cc.validationAutoLimit[lang];
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
      setError(cc.walletNotFound[lang]);
      return;
    }

    if (!IDRX_TOKEN_ADDRESS) {
      setError(cc.idrxNotConfigured[lang]);
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

      let decodedCardId: string | null = null;
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: delegationCardAbi,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "CardCreated") {
            decodedCardId = (decoded.args as { cardId: bigint }).cardId.toString();
            setCardId(decodedCardId);
            break;
          }
        } catch {
          continue;
        }
      }

      setIsConfirming(false);
      setIsConfirmed(true);
      onSuccess?.(decodedCardId);
    } catch (err) {
      setIsApproving(false);
      setIsPending(false);
      setIsConfirming(false);
      setError(err instanceof Error ? err.message.split("\n")[0] : cc.txFailed[lang]);
    }
  }

  if (!authenticated) {
    return (
      <div className="panel px-6 py-5 text-center text-sm text-muted">
        {cc.loginFirst[lang]}
      </div>
    );
  }

  const isBusy = isApproving || isPending || isConfirming;

  return (
    <>
    <form onSubmit={handleSubmit} className="panel flex flex-col gap-4 px-6 py-6">
      <div>
        <h2 className="font-display text-lg font-bold">{cc.title[lang]}</h2>
        <p className="text-[13px] text-muted">{cc.subtitle[lang]}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="label">
          {cc.budget[lang]}
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
          {cc.autoLimit[lang]}
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
          {cc.expiry[lang]}
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
            ✓ {cc.successTitle[lang]}{" "}
            <a
              href={`${BSCSCAN_TESTNET_URL}/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline"
            >
              {cc.viewOnBscscan[lang]}
            </a>
          </div>

          {cardId && (
            <div className="font-display text-base font-bold text-gold">
              {cc.cardIdLabel[lang]} #{cardId}
            </div>
          )}

          <div className="flex flex-col gap-1.5 border-t border-line pt-3 text-muted">
            <p>
              {cc.nextStep[lang]}{" "}
              <a
                href={BOT_TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-brand underline"
              >
                {BOT_USERNAME}
              </a>{" "}
              {cc.nextStepTelegram[lang]}
            </p>
            <code className="rounded-md border border-line bg-surface px-2.5 py-1.5 break-all text-ink">
              /connect {address ?? "<wallet_address_kamu>"}
            </code>
          </div>
        </div>
      )}

      <button type="submit" disabled={isBusy} className="btn-primary self-start">
        {isApproving
          ? cc.btnApproving[lang]
          : isPending
            ? cc.btnPendingWallet[lang]
            : isConfirming
              ? cc.btnPendingTx[lang]
              : cc.btnCreate[lang]}
      </button>

      {hash && !isConfirmed && (
        <p className="text-xs text-muted">
          {cc.txLabel[lang]}{" "}
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
          {cc.btnCreateAnother[lang]}
        </button>
      )}
    </form>

    {showConfirmModal && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
        <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-line bg-card p-6 shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
          <h2 className="font-display text-lg font-bold">{cc.modalTitle[lang]}</h2>

          <p className="text-sm text-muted">
            {cc.modalIntro[lang]}
          </p>

          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3 rounded-xl border border-[rgba(217,119,6,0.15)] bg-[rgba(217,119,6,0.06)] p-3">
              <span className="text-xl text-brand">①</span>
              <div>
                <p className="text-sm font-semibold">{cc.modalStep1Title[lang]}</p>
                <p className="text-xs text-muted">
                  {cc.modalStep1Desc[lang].split("{amount}")[0]}
                  <strong className="num text-gold">
                    {Number(budget).toLocaleString("id-ID")} IDRX
                  </strong>
                  {cc.modalStep1Desc[lang].split("{amount}")[1]}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-[rgba(234,88,12,0.15)] bg-[rgba(234,88,12,0.05)] p-3">
              <span className="text-xl text-ember">②</span>
              <div>
                <p className="text-sm font-semibold">{cc.modalStep2Title[lang]}</p>
                <p className="text-xs text-muted">{cc.modalStep2Desc[lang]}</p>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-dim">{cc.modalNote[lang]}</p>

          <div className="flex gap-3">
            <button onClick={() => setShowConfirmModal(false)} className="btn-ghost flex-1">
              {cc.modalCancel[lang]}
            </button>
            <button
              onClick={() => {
                setShowConfirmModal(false);
                handleSubmitTransaction();
              }}
              className="btn-primary flex-1"
            >
              {cc.modalContinue[lang]}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
