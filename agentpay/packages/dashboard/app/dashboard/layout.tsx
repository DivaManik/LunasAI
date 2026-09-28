"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { NetworkWarning } from "@/components/NetworkWarning";
import { isCardActive, useActiveWallet, useIdrxBalance, useOwnerCards } from "@/lib/dashboard";
import { t } from "@/lib/i18n";
import { useLangContext } from "@/components/LangProvider";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { ready, authenticated } = usePrivy();
  const { lang } = useLangContext();
  const router = useRouter();
  const wallet = useActiveWallet();
  const address = wallet?.address as `0x${string}` | undefined;
  const balance = useIdrxBalance(authenticated ? address : undefined);
  const { cards } = useOwnerCards(authenticated ? address : undefined);
  const activeCardCount = cards.filter((c) => isCardActive(c.data)).length;

  useEffect(() => {
    if (ready && !authenticated) {
      router.replace("/");
    }
  }, [ready, authenticated, router]);

  if (!ready || !authenticated) {
    return (
      <div className="flex min-h-[calc(100dvh-64px)] items-center justify-center">
        <p className="text-sm text-muted">{t.dashboard.loadingLabel[lang]}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-64px)]">
      <DashboardSidebar address={address} balance={balance} activeCardCount={activeCardCount} />

      <main className="min-w-0 flex-1 px-4 py-5 md:p-8">
        <div className="mb-6 empty:hidden">
          <NetworkWarning />
        </div>
        {children}
      </main>
    </div>
  );
}
