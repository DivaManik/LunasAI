import Link from "next/link";
import { LoginButton } from "./LoginButton";
import { LogoMoon } from "./LogoMoon";

export function Navbar() {
  return (
    <nav className="fixed inset-x-0 top-0 z-[100] flex h-16 items-center justify-between border-b border-line bg-[rgba(7,7,15,0.85)] px-4 backdrop-blur-[20px] md:px-8">
      <Link
        href="/"
        className="flex items-center gap-2.5 font-display text-xl font-extrabold tracking-[-0.02em] text-ink"
      >
        <LogoMoon size={24} />
        LunasAI
      </Link>

      <div className="flex items-center gap-2">
        <Link
          href="/#features"
          className="hidden rounded-md px-3.5 py-1.5 text-sm font-medium text-muted transition-colors hover:text-ink md:inline-block"
        >
          Features
        </Link>
        <Link
          href="/#howitworks"
          className="hidden rounded-md px-3.5 py-1.5 text-sm font-medium text-muted transition-colors hover:text-ink md:inline-block"
        >
          How it works
        </Link>
        <Link href="/cards" className="btn-ghost hidden md:inline-flex">
          Dashboard →
        </Link>
        <LoginButton />
      </div>
    </nav>
  );
}
