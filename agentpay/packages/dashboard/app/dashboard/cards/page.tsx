"use client";

import Link from "next/link";
import { Breadcrumb } from "@/components/Breadcrumb";
import { CardList } from "@/components/CardList";
import { useLangContext } from "@/components/LangProvider";
import { t } from "@/lib/i18n";

export default function CardsPage() {
  const { lang } = useLangContext();
  const d = t.dashboard;

  return (
    <>
      <Breadcrumb
        crumbs={[
          { label: d.breadcrumb.dashboard[lang], href: "/dashboard" },
          { label: d.breadcrumb.cards[lang] },
        ]}
      />

      <div className="mb-6 flex items-start justify-between gap-2">
        <div>
          <div className="content-heading">{d.cardList.headingActive[lang]}</div>
          <div className="content-sub">{d.cardList.subConnected[lang]}</div>
        </div>
        <Link href="/dashboard/cards/create" className="btn-primary !px-4 !text-[13px]">
          {d.btnCreate[lang]}
        </Link>
      </div>

      <CardList />
    </>
  );
}
