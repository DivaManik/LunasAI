import { Fragment } from "react";
import Link from "next/link";
import { LogoMoon } from "@/components/LogoMoon";
import { Reveal } from "@/components/Reveal";

const FLOW_STEPS = [
  { icon: "👤", label: "Login Google" },
  { icon: "🪙", label: "Claim IDRX" },
  { icon: "💳", label: "Buat Kartu" },
  { icon: "🔗", label: "Hubungkan MCP" },
  { icon: "🤖", label: "AI Bayar Otomatis" },
];

const FEATURES = [
  {
    icon: "💳",
    title: "Kartu Delegasi On-Chain",
    body: "Set budget, batas auto-approve, dan masa berlaku. AI hanya bisa belanja sesuai aturanmu — tidak lebih.",
  },
  {
    icon: "⚡",
    title: "Protokol x402",
    body: "AI terima HTTP 402, bayar otomatis, dan lanjut akses konten — tanpa interaksi manusia.",
  },
  {
    icon: "🔌",
    title: "MCP Ready",
    body: (
      <>
        Hubungkan ke Claude via Model Context Protocol. Tool <code>paid_fetch</code> bawaan
        untuk akses konten berbayar.
      </>
    ),
  },
  {
    icon: "🪙",
    title: "IDRX Native",
    body: "1 IDRX = 1 Rupiah. Bayar dalam mata uang yang familiar, settlement instan di blockchain.",
  },
  {
    icon: "🔒",
    title: "Non-Custodial",
    body: "Private key tidak pernah meninggalkan perangkatmu. Powered by Privy embedded wallet.",
  },
  {
    icon: "📊",
    title: "Spend History",
    body: "Setiap transaksi tercatat on-chain dan tampil di dashboard real-time. Audit trail lengkap.",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Login & Claim IDRX",
    body: "Login dengan Google. Wallet embedded dibuat otomatis. Claim 100.000 IDRX dari faucet testnet gratis.",
  },
  {
    num: "02",
    title: "Buat Kartu Delegasi",
    body: "Set budget total, batas auto-approve per transaksi, dan masa berlaku kartu. Approve IDRX ke kontrak.",
  },
  {
    num: "03",
    title: "Sambungkan ke Claude",
    body: "Generate MCP URL dari dashboard, tambahkan di Claude Settings → Connectors. Selesai dalam 30 detik.",
  },
  {
    num: "04",
    title: "AI Bayar Otomatis",
    body: (
      <>
        Minta Claude fetch konten berbayar. <code>paid_fetch</code> otomatis mendeteksi 402,
        bayar on-chain, return konten.
      </>
    ),
  },
];

export default function Home() {
  return (
    <div className="min-h-[calc(100dvh-64px)]">
      <section className="fade-up relative flex flex-col items-center overflow-hidden px-4 pt-[60px] pb-12 text-center md:px-6 md:pt-[100px] md:pb-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-1/2 h-[400px] w-[600px] max-w-full -translate-x-1/2 bg-[radial-gradient(ellipse_at_50%_0%,rgba(217,119,6,0.18)_0%,transparent_70%)]"
        />

        <div className="mb-7 inline-flex items-center gap-1.5 rounded-full border border-[rgba(217,119,6,0.2)] bg-[rgba(217,119,6,0.08)] px-3 py-1 text-xs font-medium tracking-[0.04em] text-brand uppercase">
          <span className="pulse-dot" />
          BNB Testnet · IDRX · Live
        </div>

        <h1 className="mb-6 max-w-[900px] font-display text-[clamp(42px,7vw,80px)] leading-[1.05] font-extrabold tracking-[-0.03em] text-balance">
          AI Agent yang Bisa
          <br />
          <em className="gradient-text not-italic">Bayar Sendiri</em>
        </h1>

        <p className="mb-10 max-w-[520px] text-[17px] leading-[1.7] text-muted">
          Beri AI budget IDRX, biarkan ia belanja, bayar API, dan beli konten digital — semuanya
          on-chain, semuanya tercatat, semua dalam kendalimu.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/cards" className="btn-primary !px-7 !py-3 !text-[15px]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 1.5A6.5 6.5 0 1 0 14.5 8 6.508 6.508 0 0 0 8 1.5Zm0 11.5a5 5 0 1 1 5-5 5.006 5.006 0 0 1-5 5ZM6.5 5.5l4 2.5-4 2.5Z" />
            </svg>
            Mulai Gratis
          </Link>
          <a href="#howitworks" className="btn-ghost !px-6 !py-3 !text-[15px]">
            Lihat cara kerja
          </a>
        </div>

        <div
          className="relative mt-[72px] hidden w-full max-w-[720px] items-center md:flex"
          aria-label="Alur kerja"
        >
          {FLOW_STEPS.map((step, i) => (
            <Fragment key={step.label}>
              {i > 0 && (
                <div className="relative -top-[18px] h-px w-10 shrink-0 bg-[linear-gradient(90deg,var(--border),var(--border-amber),var(--border))]" />
              )}
              <Reveal
                delay={0.35 + i * 0.09}
                className="flow-step relative z-[1] flex flex-1 flex-col items-center gap-2.5"
              >
                <div className="flow-icon flex h-[52px] w-[52px] items-center justify-center rounded-[14px] border border-line bg-card text-[22px]">
                  {step.icon}
                </div>
                <span className="text-center text-xs font-medium tracking-[0.01em] text-muted">
                  {step.label}
                </span>
              </Reveal>
            </Fragment>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-[1100px] px-4 py-[52px] md:px-6 md:py-20">
        <Reveal>
          <div className="section-label">Fitur Utama</div>
          <h2 className="section-title">Satu platform, kendali penuh</h2>
          <p className="section-sub">
            Dari pembuatan kartu hingga pembayaran otomatis, semua terjadi transparan di BNB Smart
            Chain.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
          {FEATURES.map((f) => (
            <Reveal key={f.title} className="bg-card p-8 hover:bg-[#161420]">
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-[10px] border border-[rgba(217,119,6,0.15)] bg-[rgba(217,119,6,0.08)] text-lg">
                {f.icon}
              </div>
              <h3 className="mb-2 font-display text-[17px] font-semibold tracking-[-0.01em]">
                {f.title}
              </h3>
              <p className="text-sm leading-[1.65] text-muted">{f.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="howitworks" className="mx-auto max-w-[1100px] px-4 py-[52px] md:px-6 md:py-20">
        <Reveal>
          <div className="section-label">Cara Kerja</div>
          <h2 className="section-title">Empat langkah, AI bisa bayar</h2>
          <p className="section-sub">
            Setup sekali, AI bekerja terus — bayar API, beli data, akses konten premium.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <Reveal key={s.num} className="panel relative p-7">
              <div className="mb-4 font-display text-4xl leading-none font-extrabold text-dim">
                {s.num}
              </div>
              <h3 className="mb-2 font-display text-base font-semibold">{s.title}</h3>
              <p className="text-sm leading-[1.6] text-muted">{s.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-[1100px] px-4 pb-20 md:px-6">
        <Reveal className="rounded-[20px] border border-[rgba(217,119,6,0.15)] bg-[linear-gradient(135deg,rgba(217,119,6,0.06)_0%,rgba(234,88,12,0.04)_100%)] px-6 py-10 text-center md:px-12 md:py-[60px]">
          <h2 className="mb-4 font-display text-[clamp(28px,5vw,48px)] font-extrabold tracking-[-0.025em] text-balance">
            Siap kasih AI budget sendiri?
          </h2>
          <p className="mb-8 text-base text-muted">
            Gratis di BNB Testnet. Tidak perlu kartu kredit, tidak perlu KYC.
          </p>
          <Link href="/cards" className="btn-primary !px-8 !py-3.5 !text-base">
            Buka Dashboard →
          </Link>
        </Reveal>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-5 md:px-8 md:py-7">
        <div className="flex items-center gap-2 font-display text-base font-bold text-muted">
          <LogoMoon size={18} />
          LunasAI
        </div>
        <span className="text-[13px] text-dim">
          © 2026 LunasAI · BNB Chain Hackathon 2026 · IDRX on BNB Testnet
        </span>
      </footer>
    </div>
  );
}
