import { formatIdrx } from "@/lib/constants";
import { timeAgo, type ActivityRecord } from "@/lib/dashboard";
import { t, type Lang } from "@/lib/i18n";
import { SkeletonLines } from "./Skeleton";

const STATUS_DOT: Record<string, string> = {
  auto_approved: "bg-[#4ade80]",
  approved: "bg-[#4ade80]",
  pending: "dot-amber bg-brand",
  rejected: "bg-ember",
};

const STATUS_AMOUNT: Record<string, string> = {
  auto_approved: "text-brand",
  approved: "text-brand",
  pending: "text-brand",
  rejected: "text-ember",
};

function statusLabel(status: string, lang: Lang): string {
  const a = t.dashboard.activity;
  if (status === "auto_approved") return a.autoApproved[lang];
  if (status === "approved") return a.approved[lang];
  if (status === "pending") return a.pending[lang];
  if (status === "rejected") return a.rejected[lang];
  return status;
}

export function ActivityFeed({
  records,
  lang,
  limit = 6,
}: {
  records: ActivityRecord[] | null;
  lang: Lang;
  limit?: number;
}) {
  if (records === null) {
    return <SkeletonLines />;
  }

  if (records.length === 0) {
    return <p className="py-3 text-sm text-muted">{t.dashboard.activity.empty[lang]}</p>;
  }

  return (
    <div className="flex flex-col">
      {records.slice(0, limit).map((r, i) => (
        <div
          key={r.id ?? i}
          className="flex items-start gap-3.5 border-b border-line py-3.5 last:border-b-0"
        >
          <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[r.status] ?? "bg-muted"}`} />
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 truncate text-[13px] font-medium">
              {r.description || t.dashboard.activity.transaction[lang]}
            </div>
            <div className="text-xs text-muted">
              {t.dashboard.cardList.card[lang]} #{r.cardId} · {statusLabel(r.status, lang)} ·{" "}
              {timeAgo(r.createdAt)}
            </div>
          </div>
          <div
            className={`num shrink-0 font-display text-[13px] font-semibold ${STATUS_AMOUNT[r.status] ?? "text-brand"}`}
          >
            {formatIdrx(r.amount)}
          </div>
        </div>
      ))}
    </div>
  );
}
