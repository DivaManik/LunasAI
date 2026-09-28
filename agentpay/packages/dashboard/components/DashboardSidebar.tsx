"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { SHOP_URL, formatIdrx } from "@/lib/constants";
import { t } from "@/lib/i18n";
import { useLangContext } from "./LangProvider";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  badge?: number;
};

const ICONS = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 3h5v5H2zm7 0h5v5H9zM2 9h5v5H2zm7 0h5v5H9z" />
    </svg>
  ),
  cards: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="4" width="14" height="9" rx="2" />
      <path d="M1 7h14" />
    </svg>
  ),
  history: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2Zm.75 3.25v2.5l2 1.5-1 1.33-2.5-1.83V5.25h1.5Z" />
    </svg>
  ),
  mcp: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1ZM6 8a2 2 0 1 1 4 0 2 2 0 0 1-4 0Z" />
    </svg>
  ),
  telegram: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M14.5 2.5 1.8 7.4c-.6.24-.6.9 0 1.13l3.1 1.1 1.2 3.7c.18.53.87.62 1.19.16l1.4-2 3 2.2c.5.36 1.2.1 1.35-.5l2-9.9c.15-.7-.5-1.24-1.14-.99Z" />
    </svg>
  ),
  shop: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M3 8a5 5 0 0 1 5-5v1.5A3.5 3.5 0 0 0 4.5 8H3Zm5-5a5 5 0 0 1 5 5h-1.5A3.5 3.5 0 0 0 8 4.5V3Zm5 5a5 5 0 0 1-5 5v-1.5A3.5 3.5 0 0 0 11.5 8H13ZM8 13a5 5 0 0 1-5-5h1.5A3.5 3.5 0 0 0 8 11.5V13Z" />
    </svg>
  ),
  power: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M8 2v6" />
      <path d="M4.5 3.8a5.5 5.5 0 1 0 7 0" />
    </svg>
  ),
};

const itemClass =
  "flex w-full cursor-pointer items-center gap-[9px] rounded-lg border px-3 py-2 text-left text-sm font-medium transition-all active:scale-[0.98]";

function isPathActive(pathname: string, href: string): boolean {
  return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
}

export function DashboardSidebar({
  activeCardCount,
  address,
  balance,
}: {
  activeCardCount: number;
  address: string | undefined;
  balance: bigint | null;
}) {
  const { lang } = useLangContext();
  const { logout } = usePrivy();
  const pathname = usePathname();
  const s = t.dashboard.sidebar;
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const sections: { title: string; items: NavItem[] }[] = [
    {
      title: s.overview[lang],
      items: [{ href: "/dashboard", label: s.dashboard[lang], icon: ICONS.dashboard }],
    },
    {
      title: s.cards[lang],
      items: [
        {
          href: "/dashboard/cards",
          label: s.activeCards[lang],
          icon: ICONS.cards,
          badge: activeCardCount,
        },
        { href: "/dashboard/history", label: s.history[lang], icon: ICONS.history },
      ],
    },
    {
      title: s.aiAgent[lang],
      items: [
        { href: "/dashboard/mcp", label: s.mcp[lang], icon: ICONS.mcp },
        { href: "/dashboard/telegram", label: t.dashboard.telegram.heading[lang], icon: ICONS.telegram },
      ],
    },
  ];

  return (
    <aside className="sticky top-16 hidden h-[calc(100dvh-64px)] w-[220px] shrink-0 flex-col gap-1 overflow-y-auto border-r border-line bg-surface px-3 py-6 md:flex">
      {sections.map((section) => (
        <div key={section.title} className="flex flex-col gap-1">
          <div className="mt-2 px-3 pt-2 pb-1 text-[11px] font-semibold tracking-[0.1em] text-dim uppercase">
            {section.title}
          </div>
          {section.items.map((item) => {
            const isActive = isPathActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${itemClass} ${
                  isActive
                    ? "border-[rgba(217,119,6,0.3)] bg-[rgba(217,119,6,0.08)] text-brand"
                    : "border-transparent text-muted hover:border-line hover:bg-white/[0.04] hover:text-ink"
                }`}
              >
                <span className={isActive ? "opacity-100" : "opacity-70"}>{item.icon}</span>
                {item.label}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="num ml-auto rounded-full bg-[rgba(217,119,6,0.12)] px-[7px] py-px text-[11px] font-semibold text-brand">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
          {section.title === s.aiAgent[lang] && (
            <a
              href={SHOP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`${itemClass} border-transparent text-muted hover:border-line hover:bg-white/[0.04] hover:text-ink`}
            >
              <span className="opacity-70">{ICONS.shop}</span>
              {s.shop[lang]}
            </a>
          )}
        </div>
      ))}

      <div className="mt-auto flex flex-col gap-2 p-3 pb-6">
        <div className="rounded-[10px] border border-[rgba(217,119,6,0.12)] bg-[rgba(217,119,6,0.06)] p-3.5">
          <div className="mb-1.5 text-xs text-muted">{s.wallet[lang]}</div>
          {address ? (
            <>
              <button
                onClick={handleCopy}
                title={t.dashboard.login.copyTitle[lang]}
                className={`mono cursor-pointer text-left text-[11px] transition-colors hover:underline ${
                  copied ? "font-semibold text-[#4ade80]" : "text-brand"
                }`}
              >
                {copied
                  ? t.dashboard.login.copied[lang]
                  : `${address.slice(0, 6)}...${address.slice(-4)}`}
              </button>
              <div className="num mt-1.5 text-[13px] font-semibold text-gold">
                {balance !== null ? `${formatIdrx(balance)} IDRX` : "— IDRX"}
              </div>
            </>
          ) : (
            <div className="text-xs text-dim">{s.notLoggedIn[lang]}</div>
          )}
        </div>

        {address && (
          <button
            onClick={logout}
            className={`${itemClass} border-transparent text-muted hover:border-[rgba(234,88,12,0.3)] hover:bg-[rgba(234,88,12,0.06)] hover:text-ember`}
          >
            <span className="opacity-80">{ICONS.power}</span>
            {t.dashboard.login.logout[lang]}
          </button>
        )}
      </div>
    </aside>
  );
}
