"use client";

import { useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, CreditCard, Loader2 } from "lucide-react";
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
import { useIdrxBalance } from "@/lib/dashboard";
import { t } from "@/lib/i18n";
import { useLangContext } from "./LangProvider";

const IDRX_DECIMALS = 2;

const BUDGET_PRESETS = [50000, 100000, 250000, 500000];
const AUTO_LIMIT_PERCENTAGES = [10, 20, 25, 50];
const EXPIRY_PRESETS = [7, 14, 30, 60, 90];

const publicClient = createPublicClient({
  chain: bnbTestnet,
  transport: http(),
});

function formatIdr(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString("id-ID") : "0";
}

export function CreateCardForm({ onSuccess }: { onSuccess?: (cardId: string | null) => void } = {}) {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { lang } = useLangContext();
  const cc = t.dashboard.createCard;
  const address = (wallets.find((w) => w.walletClientType === "privy") ?? wallets[0])
    ?.address;
  const rawBalance = useIdrxBalance(address as `0x${string}` | undefined);
  const walletBalance = rawBalance !== null ? Number(rawBalance) / 100 : null;

  const [budget, setBudget] = useState("100000");
  const [autoLimit, setAutoLimit] = useState("20000");
  const [expiryDays, setExpiryDays] = useState("30");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [hash, setHash] = useState<`0x${string}` | null>(null);
  const [cardId, setCardId] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const budgetNum = Number(budget) || 0;
  const autoLimitNum = Number(autoLimit) || 0;
  const expiryNum = Number(expiryDays) || 0;

  const expiryDate = useMemo(() => {
    if (!(expiryNum > 0)) return lang === "id" ? "Belum ditentukan" : "Not set";
    const date = new Date(Date.now() + expiryNum * 86400000);
    return date.toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { dateStyle: "long" });
  }, [expiryNum, lang]);

  function reset() {
    setHash(null);
    setCardId(null);
    setIsConfirmed(false);
    setError(null);
  }

  function validate(): string | null {
    if (!(budgetNum > 0)) return cc.validationBudget[lang];
    if (walletBalance !== null && budgetNum > walletBalance) return cc.budgetExceedsBalance[lang];
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
  const autoLimitAtBudget = budgetNum > 0 && autoLimitNum >= budgetNum;

  return (
    <>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form onSubmit={handleSubmit} className="panel flex flex-col gap-6 px-6 py-6">
          <div>
            <h2 className="font-display text-lg font-bold">{cc.title[lang]}</h2>
            <p className="text-[13px] text-muted">{cc.subtitle[lang]}</p>
          </div>

          {/* Step 1: Budget */}
          <div className="flex flex-col gap-2.5 border-l-2 border-transparent pl-4 focus-within:border-brand">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-semibold text-ink">{cc.stepBudget[lang]}</label>
              <span className="rounded-full bg-[rgba(217,119,6,0.1)] px-2.5 py-0.5 text-[11px] font-medium text-brand">
                {cc.budgetBadge[lang]}
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 transition-colors focus-within:border-brand">
              <span className="mono text-xs font-semibold text-dim">IDRX</span>
              <input
                type="number"
                step="0.01"
                min="0"
                max={walletBalance ?? undefined}
                value={budget}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || walletBalance === null) {
                    setBudget(val);
                    return;
                  }
                  const num = Number(val);
                  setBudget(Number.isFinite(num) ? String(Math.min(num, walletBalance)) : val);
                }}
                disabled={isBusy}
                className="num w-full bg-transparent text-sm text-ink outline-none"
                required
              />
            </div>
            <p className="text-xs text-brand">
              ≈ Rp {formatIdr(budgetNum)} <span className="text-dim">({cc.rupiahNote[lang]})</span>
            </p>
            {walletBalance !== null && (
              <p className="text-xs text-muted">
                {cc.availableBalance[lang]}{" "}
                <span className={budgetNum > walletBalance ? "text-red-400" : "text-[#4ade80]"}>
                  {formatIdr(walletBalance)} IDRX
                </span>
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {BUDGET_PRESETS.filter((v) => walletBalance === null || v <= walletBalance).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setBudget(String(v))}
                  disabled={isBusy}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    budgetNum === v
                      ? "border-brand bg-[rgba(217,119,6,0.15)] text-brand"
                      : "border-line bg-[rgba(255,255,255,0.02)] text-muted hover:border-brand hover:bg-[rgba(217,119,6,0.08)]"
                  }`}
                >
                  {formatIdr(v)}
                </button>
              ))}
              {walletBalance !== null && walletBalance > 0 && (
                <button
                  type="button"
                  onClick={() => setBudget(String(walletBalance))}
                  disabled={isBusy}
                  className="rounded-lg border border-[rgba(217,119,6,0.3)] bg-[rgba(217,119,6,0.06)] px-3 py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-[rgba(217,119,6,0.15)]"
                >
                  {cc.budgetMax[lang]} ({formatIdr(walletBalance)})
                </button>
              )}
            </div>
            <p className="text-xs leading-[1.6] text-muted">{cc.budgetDesc[lang]}</p>
            {walletBalance !== null && budgetNum > walletBalance && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300">
                <AlertTriangle size={13} className="shrink-0" />
                {cc.budgetExceedsBalance[lang]}
              </div>
            )}
          </div>

          {/* Step 2: Auto-Approve Limit */}
          <div className="flex flex-col gap-2.5 border-l-2 border-transparent pl-4 focus-within:border-brand">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-semibold text-ink">{cc.stepAutoLimit[lang]}</label>
              <span className="rounded-full bg-[rgba(234,88,12,0.1)] px-2.5 py-0.5 text-[11px] font-medium text-ember">
                {cc.autoLimitBadge[lang]}
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 transition-colors focus-within:border-brand">
              <span className="mono text-xs font-semibold text-dim">IDRX</span>
              <input
                type="number"
                step="0.01"
                min="0"
                max={budgetNum || undefined}
                value={autoLimit}
                onChange={(e) => setAutoLimit(e.target.value)}
                disabled={isBusy}
                className="num w-full bg-transparent text-sm text-ink outline-none"
                required
              />
            </div>
            <p className="text-xs text-brand">≈ Rp {formatIdr(autoLimitNum)}</p>
            <div className="flex flex-wrap gap-2">
              {AUTO_LIMIT_PERCENTAGES.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setAutoLimit(String(Math.floor((budgetNum * pct) / 100)))}
                  disabled={isBusy}
                  className="rounded-lg border border-line bg-[rgba(255,255,255,0.02)] px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-brand hover:bg-[rgba(217,119,6,0.08)]"
                >
                  {pct}%
                </button>
              ))}
            </div>
            <p className="text-xs leading-[1.6] text-muted">{cc.autoLimitDesc[lang]}</p>
            {autoLimitAtBudget && (
              <div className="rounded-lg border border-[rgba(234,88,12,0.3)] bg-[rgba(234,88,12,0.1)] px-3 py-2 text-xs text-orange-300">
                ⚠️ {cc.autoLimitWarning[lang]}
              </div>
            )}
          </div>

          {/* Step 3: Expiry */}
          <div className="flex flex-col gap-2.5 border-l-2 border-transparent pl-4 focus-within:border-brand">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-semibold text-ink">{cc.stepExpiry[lang]}</label>
              <span className="rounded-full bg-[rgba(217,119,6,0.1)] px-2.5 py-0.5 text-[11px] font-medium text-brand">
                {cc.expiryBadge[lang]}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {EXPIRY_PRESETS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setExpiryDays(String(d))}
                  disabled={isBusy}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    expiryNum === d
                      ? "border-brand bg-[rgba(217,119,6,0.15)] text-brand"
                      : "border-line bg-[rgba(255,255,255,0.02)] text-muted hover:border-brand hover:bg-[rgba(217,119,6,0.08)]"
                  }`}
                >
                  {d} {cc.daysSuffix[lang]}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted">
              {cc.expiryUntil[lang]} <strong className="text-ink">{expiryDate}</strong>
            </p>
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

          <button
            type="submit"
            disabled={
              isBusy || !(budgetNum > 0) || (walletBalance !== null && budgetNum > walletBalance)
            }
            className="btn-primary inline-flex items-center justify-center gap-2 self-start"
          >
            {isApproving ? (
              <>
                <Loader2 size={16} className="animate-spin" /> {cc.btnApproving[lang]} (1/2)
              </>
            ) : isPending || isConfirming ? (
              <>
                <Loader2 size={16} className="animate-spin" />{" "}
                {isPending ? cc.btnPendingWallet[lang] : cc.btnPendingTx[lang]} (2/2)
              </>
            ) : (
              <>
                <CreditCard size={16} /> {cc.btnCreate[lang]}
              </>
            )}
          </button>
          <p className="-mt-3 text-center text-xs text-dim">{cc.walletConfirmNote[lang]}</p>

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

        {/* Live preview */}
        <div className="flex flex-col gap-4">
          <div className="text-xs font-semibold tracking-[0.08em] text-dim uppercase">
            {cc.previewTitle[lang]}
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-[#1a1824] to-[#0f0e18] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
            <div className="mb-8 flex h-8 w-11 items-center justify-center rounded-md bg-[rgba(217,119,6,0.15)] text-brand">
              ▣
            </div>

            <div className="mb-6 flex flex-col gap-1">
              <span className="text-[11px] text-dim uppercase">{cc.previewBudgetLabel[lang]}</span>
              <span className="mono text-2xl font-bold text-ink">{formatIdr(budgetNum)} IDRX</span>
              <span className="text-xs text-muted">≈ Rp {formatIdr(budgetNum)}</span>
            </div>

            <div className="flex items-end justify-between gap-3 border-t border-[rgba(255,255,255,0.08)] pt-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-dim uppercase">{cc.previewAutoLimitLabel[lang]}</span>
                <span className="mono text-sm font-semibold text-ink">{formatIdr(autoLimitNum)} IDRX</span>
              </div>
              <div className="flex flex-col gap-0.5 text-right">
                <span className="text-[10px] text-dim uppercase">{cc.previewExpiryLabel[lang]}</span>
                <span className="text-sm font-semibold text-ink">{expiryDate}</span>
              </div>
            </div>

            <div className="mt-6 text-right font-display text-sm font-bold tracking-[-0.02em] text-brand">
              LunasAI
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4">
            <div className="mb-1 text-xs font-semibold tracking-[0.08em] text-dim uppercase">
              {cc.summaryTitle[lang]}
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">{cc.summaryLocked[lang]}</span>
              <span className="mono font-semibold text-brand">{formatIdr(budgetNum)} IDRX</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">{cc.summaryAutoApprove[lang]}</span>
              <span className="mono text-ink">
                {formatIdr(autoLimitNum)} IDRX {cc.summaryPerTx[lang]}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">{cc.summaryManual[lang]}</span>
              <span className="mono text-ink">&gt; {formatIdr(autoLimitNum)} IDRX</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">{cc.summaryExpired[lang]}</span>
              <span className="text-ink">{expiryDate}</span>
            </div>
            <div className="my-1 border-t border-line" />
            <div className="flex justify-between text-sm">
              <span className="text-muted">{cc.summaryGas[lang]}</span>
              <span className="text-dim">~0.001 tBNB</span>
            </div>
          </div>
        </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-line bg-card p-6 shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
            <h2 className="font-display text-lg font-bold">{cc.modalTitle[lang]}</h2>

            <p className="text-sm text-muted">{cc.modalIntro[lang]}</p>

            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3 rounded-xl border border-[rgba(217,119,6,0.15)] bg-[rgba(217,119,6,0.06)] p-3">
                <span className="text-xl text-brand">①</span>
                <div>
                  <p className="text-sm font-semibold">{cc.modalStep1Title[lang]}</p>
                  <p className="text-xs text-muted">
                    {cc.modalStep1Desc[lang].split("{amount}")[0]}
                    <strong className="num text-gold">{formatIdr(budgetNum)} IDRX</strong>
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
