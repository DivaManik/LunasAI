import { formatIdrx } from "@/lib/constants";
import { timeAgo, type ActivityRecord } from "@/lib/dashboard";
import { SkeletonLines } from "./Skeleton";

const STATUS: Record<string, { dot: string; label: string; amount: string }> = {
  auto_approved: { dot: "bg-[#4ade80]", label: "auto-approved", amount: "text-brand" },
  approved: { dot: "bg-[#4ade80]", label: "disetujui", amount: "text-brand" },
  pending: { dot: "dot-amber bg-brand", label: "menunggu approval", amount: "text-brand" },
  rejected: { dot: "bg-ember", label: "ditolak", amount: "text-ember" },
};

export function ActivityFeed({
  records,
  limit = 6,
}: {
  records: ActivityRecord[] | null;
  limit?: number;
}) {
  if (records === null) {
    return <SkeletonLines />;
  }

  if (records.length === 0) {
    return (
      <p className="py-3 text-sm text-muted">
        Belum ada transaksi. Aktivitas AI agent akan muncul di sini.
      </p>
    );
  }

  return (
    <div className="flex flex-col">
      {records.slice(0, limit).map((r, i) => {
        const s = STATUS[r.status] ?? STATUS.pending;
        return (
          <div
            key={r.id ?? i}
            className="flex items-start gap-3.5 border-b border-line py-3.5 last:border-b-0"
          >
            <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 truncate text-[13px] font-medium">
                {r.description || "Transaksi"}
              </div>
              <div className="text-xs text-muted">
                Kartu #{r.cardId} · {s.label} · {timeAgo(r.createdAt)}
              </div>
            </div>
            <div className={`num shrink-0 font-display text-[13px] font-semibold ${s.amount}`}>
              {formatIdrx(r.amount)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
