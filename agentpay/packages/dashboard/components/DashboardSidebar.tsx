"use client";

import { useState, type ReactNode } from "react";
import { SHOP_URL, formatIdrx } from "@/lib/constants";

type NavItem = {
  id: string;
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
  shop: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M3 8a5 5 0 0 1 5-5v1.5A3.5 3.5 0 0 0 4.5 8H3Zm5-5a5 5 0 0 1 5 5h-1.5A3.5 3.5 0 0 0 8 4.5V3Zm5 5a5 5 0 0 1-5 5v-1.5A3.5 3.5 0 0 0 11.5 8H13ZM8 13a5 5 0 0 1-5-5h1.5A3.5 3.5 0 0 0 8 11.5V13Z" />
    </svg>
  ),
};

const itemClass =
  "flex w-full items-center gap-[9px] rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors";

export function DashboardSidebar({
  activeCardCount,
  address,
  balance,
}: {
  activeCardCount: number;
  address: string | undefined;
  balance: bigint | null;
}) {
  const [active, setActive] = useState("overview");

  const sections: { title: string; items: NavItem[] }[] = [
    { title: "Overview", items: [{ id: "overview", label: "Dashboard", icon: ICONS.dashboard }] },
    {
      title: "Kartu",
      items: [
        { id: "kartu", label: "Kartu Aktif", icon: ICONS.cards, badge: activeCardCount },
        { id: "riwayat", label: "Riwayat", icon: ICONS.history },
      ],
    },
    { title: "AI Agent", items: [{ id: "mcp", label: "MCP Connect", icon: ICONS.mcp }] },
  ];

  function go(id: string) {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <aside className="sticky top-16 hidden h-[calc(100dvh-64px)] w-[220px] shrink-0 flex-col gap-1 overflow-y-auto border-r border-line bg-surface px-3 py-6 md:flex">
      {sections.map((section) => (
        <div key={section.title} className="flex flex-col gap-1">
          <div className="mt-2 px-3 pt-2 pb-1 text-[11px] font-semibold tracking-[0.1em] text-dim uppercase">
            {section.title}
          </div>
          {section.items.map((item) => {
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => go(item.id)}
                className={`${itemClass} ${
                  isActive
                    ? "bg-[rgba(217,119,6,0.08)] text-brand"
                    : "text-muted hover:bg-white/[0.04] hover:text-ink"
                }`}
              >
                <span className={isActive ? "opacity-100" : "opacity-70"}>{item.icon}</span>
                {item.label}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="num ml-auto rounded-full bg-[rgba(217,119,6,0.12)] px-[7px] py-px text-[11px] font-semibold text-brand">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
          {section.title === "AI Agent" && (
            <a
              href={SHOP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`${itemClass} text-muted hover:bg-white/[0.04] hover:text-ink`}
            >
              <span className="opacity-70">{ICONS.shop}</span>
              Shop
            </a>
          )}
        </div>
      ))}

      <div className="mt-auto p-3">
        <div className="rounded-[10px] border border-[rgba(217,119,6,0.12)] bg-[rgba(217,119,6,0.06)] p-3.5">
          <div className="mb-1.5 text-xs text-muted">Wallet</div>
          {address ? (
            <>
              <div className="mono text-[11px] text-brand">
                {address.slice(0, 6)}...{address.slice(-4)}
              </div>
              <div className="num mt-1.5 text-[13px] font-semibold text-gold">
                {balance !== null ? `${formatIdrx(balance)} IDRX` : "— IDRX"}
              </div>
            </>
          ) : (
            <div className="text-xs text-dim">Belum login</div>
          )}
        </div>
      </div>
    </aside>
  );
}
