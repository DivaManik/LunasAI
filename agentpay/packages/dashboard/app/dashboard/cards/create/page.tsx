"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Breadcrumb } from "@/components/Breadcrumb";
import { CreateCardForm } from "@/components/CreateCardForm";
import { useLangContext } from "@/components/LangProvider";
import { t } from "@/lib/i18n";

const REDIRECT_DELAY_MS = 3000;

export default function CreateCardPage() {
  const { lang } = useLangContext();
  const router = useRouter();
  const d = t.dashboard;
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSuccess() {
    // Beri jeda supaya user sempat mencatat Card ID / link BscScan / instruksi
    // Telegram sebelum pindah halaman.
    redirectTimer.current = setTimeout(() => {
      router.push("/dashboard/cards");
    }, REDIRECT_DELAY_MS);
  }

  return (
    <div className="mx-auto max-w-[980px]">
      <Breadcrumb
        crumbs={[
          { label: d.breadcrumb.dashboard[lang], href: "/dashboard" },
          { label: d.breadcrumb.cards[lang], href: "/dashboard/cards" },
          { label: d.breadcrumb.createCard[lang] },
        ]}
      />

      <Link
        href="/dashboard/cards"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
      >
        ← {d.backToCards[lang]}
      </Link>

      <CreateCardForm onSuccess={handleSuccess} />
    </div>
  );
}
