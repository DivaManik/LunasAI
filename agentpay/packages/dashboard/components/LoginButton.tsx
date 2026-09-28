"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { t } from "@/lib/i18n";
import { useLangContext } from "./LangProvider";

export function LoginButton() {
  const { ready, login, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { lang } = useLangContext();

  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const externalWallet = wallets.find((w) => w.walletClientType !== "privy");
  const address = embeddedWallet?.address || externalWallet?.address;

  if (!ready) {
    return (
      <button disabled className="btn-ghost">
        {t.dashboard.login.loadingLabel[lang]}
      </button>
    );
  }

  // Sudah login: navbar tidak menampilkan apa pun di sini — tombol Logout
  // ada di pojok kiri-bawah sidebar (dekat info wallet), bukan di navbar.
  if (authenticated && address) {
    return null;
  }

  return (
    <button onClick={login} className="btn-primary">
      {t.nav.launch[lang]}
    </button>
  );
}
