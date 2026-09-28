"use client";

import { useWallets } from "@privy-io/react-auth";
import { BSC_TESTNET_CHAIN_ID } from "@/lib/constants";
import { t } from "@/lib/i18n";
import { useLangContext } from "./LangProvider";

export function NetworkWarning() {
  const { wallets } = useWallets();
  const { lang } = useLangContext();

  if (!wallets.length) return null;

  const wallet = wallets.find((w) => w.walletClientType === "privy") ?? wallets[0];
  const isWrongNetwork = wallet.chainId !== `eip155:${BSC_TESTNET_CHAIN_ID}`;

  if (!isWrongNetwork) return null;

  return (
    <div className="rounded-xl border border-[rgba(234,88,12,0.3)] bg-[rgba(234,88,12,0.08)] px-4 py-3 text-sm text-ember">
      ⚠️ {t.dashboard.network.warning[lang]}
    </div>
  );
}
