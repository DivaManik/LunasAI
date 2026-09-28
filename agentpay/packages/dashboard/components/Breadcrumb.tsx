import Link from "next/link";

type Crumb = { label: string; href?: string };

export function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav className="mb-6 flex flex-wrap items-center gap-1.5">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-dim">›</span>}
          {crumb.href ? (
            <Link
              href={crumb.href}
              className="text-[13px] text-muted transition-colors hover:text-ink"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="text-[13px] font-medium text-ink">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
