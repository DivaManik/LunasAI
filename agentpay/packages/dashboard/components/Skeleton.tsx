export function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skel skel-label" />
      <div className="skel skel-value" />
      <div className="skel skel-sub" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="skeleton-card flex items-center gap-4" aria-hidden="true">
      <div className="skel h-10 w-10 shrink-0 !rounded-[10px]" />
      <div className="flex-1">
        <div className="skel skel-label !w-2/5" />
        <div className="skel skel-sub !w-3/5" />
      </div>
      <div className="skel h-4 w-16 shrink-0" />
    </div>
  );
}

export function SkeletonLines({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-4 py-3.5" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3.5">
          <div className="skel h-2 w-2 shrink-0 !rounded-full" />
          <div className="flex-1">
            <div className="skel skel-label !mb-2 !w-1/2" />
            <div className="skel skel-sub !w-3/4" />
          </div>
          <div className="skel h-3 w-12 shrink-0" />
        </div>
      ))}
    </div>
  );
}
