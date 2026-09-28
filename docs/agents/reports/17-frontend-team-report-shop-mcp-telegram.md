# Laporan Tim Frontend — Landing Polish, Dashboard Shop/MCP/Telegram

**Tanggal:** 2026-09-28
**Status:** SELESAI (rangkaian task kecil-menengah berurutan, tidak ada yang ditolak/dipending)

Laporan ini merangkum semua task yang dikerjakan setelah laporan #16 (Dashboard Multi-Page Restructure), sebelum sesi berikutnya dimulai.

---

## 1. Feature Cards — Sistem 2-Gambar (Before/Hover)

**File:** `components/landing/FeatureCards.tsx`, `app/globals.css`, `public/images/*`

- 3 feature card landing page sekarang punya 2 layer gambar (`card-image-before`, `card-image-hover`) yang fade antar satu sama lain saat hover, bukan 1 layer seperti sebelumnya.
- 6 file gambar baru di-copy dari `packages/asset/` ke `public/images/` (`card1-before/hover.jpg`, dst).
- Efek `flex: 2.5` hover-expand yang sudah ada **dipertahankan** (dikonfirmasi via AskUserQuestion), digabung dengan sistem 2-gambar baru.
- Card 3 pakai gambar x402 yang sebelumnya sudah diminta (bukan gambar lama dari jobdesk ini) — dikonfirmasi ke user untuk menghindari revert tidak sengaja.
- Card 3 dapat `filter: brightness(0.3)` ekstra karena source bg terang.

## 2. Navbar — Fix Active State, Center Layout, Auth-Aware

**File:** `components/Navbar.tsx`, `app/globals.css`

Melalui beberapa iterasi koreksi:
- Item nav dipindah ke tengah (`absolute left-1/2 -translate-x-1/2`) dengan underline hover `::after` amber.
- Bug: tombol "Dashboard" tetap terlihat aktif di landing page — diperbaiki jadi conditional `pathname.startsWith("/dashboard")`.
- **Auth-aware**: belum login → item pertama nav jadi "Beranda"/"Home" (scroll-to-top / navigasi ke `/`). Sudah login → tambah item "Dashboard" di grup nav yang sama (bukan tombol terpisah di kanan), styling identik dengan item nav lain. "Beranda" tetap tampil di kedua state (tidak hilang saat login).
- Redirect otomatis ke `/dashboard` **hanya sekali** tepat saat transisi login (pakai `useRef` untuk lacak state sebelumnya) — bug awal: redirect nyangkut setiap kali authenticated user kembali ke `/` via klik logo/Home, sudah diperbaiki supaya navigasi manual tetap bebas.
- Bug `useActiveSection`: section aktif tidak clear saat lompat cepat ke atas (klik Home / scroll cepat) karena IntersectionObserver callback tidak selalu fire. Fix: scroll listener independen yang memaksa clear saat `scrollY < 200`.

## 3. How It Works — Timeline Parallax + Glow

**File:** `components/landing/Steps.tsx`, `app/globals.css`

- Diubah dari grid statis 4-kolom jadi timeline vertikal dengan garis progress amber yang tumbuh sesuai step yang terlihat (IntersectionObserver per step).
- Icon Lucide (Wallet, CreditCard, Bot, CheckCircle) per step, layout zigzag kiri-kanan (desktop), rata kiri (mobile).
- Bug: animasi cuma 1 arah (tidak bisa reverse saat scroll naik) — diperbaiki agar `visibleSteps` dan `progressHeight` toggle dua arah sesuai posisi scroll aktual.
- Efek "menyala" (glow amber box-shadow + animasi `stepGlowIn`) ditambah di step card dan icon node saat masuk viewport, transisi diperlambat (`duration-1000`) supaya tidak terasa terlalu cepat.

## 4. Sidebar Dashboard — Wallet Box & Icon

**File:** `components/DashboardSidebar.tsx`

- Icon "Shop" diganti dari SVG custom ke `ShoppingCart` (lucide-react).
- Wallet box: ditambah icon `Wallet`, dot online-indicator hijau, tombol copy dengan icon `Copy`/`Check` (memakai `handleCopy`/`copied` state yang sudah ada, bukan dibuat baru). Posisi dinaikkan sedikit dari tepi bawah sidebar (`pb-6` → `pb-4`).

## 5. Create Card — Redesign 2-Kolom + Live Preview

**File:** `components/CreateCardForm.tsx`, `app/dashboard/cards/create/page.tsx`, `lib/i18n.ts`

- Halaman "Buat Kartu Delegasi" diredesign total: form 3-step (Budget, Auto-Approve Limit, Masa Berlaku) di kiri dengan preset chip, deskripsi, dan warning; live card preview + summary box di kanan.
- Logic on-chain (approve→createCard) **tidak diubah**, modal konfirmasi 2-step yang sudah ada **dipertahankan**.
- **Fix keamanan nyata**: budget sekarang dibatasi ke saldo IDRX wallet asli (pakai `useIdrxBalance` yang sudah ada, bukan bikin fetch baru) — input diclamp otomatis, preset yang melebihi saldo disembunyikan, tombol "Max" ditambah, warning box dan validasi submit disesuaikan.

## 6. DigiStore (`packages/shop`) — Bilingual ID/EN

**File:** `packages/shop/src/index.ts`

- Halaman Express (bukan Next.js — server-rendered HTML string) ditambah toggle bahasa ID/EN dengan object `STRINGS`, fungsi `applyLang`/`toggleLang`, atribut `data-i18n`/`data-i18n-id`/`data-i18n-en` di seluruh teks (hero, stats, produk, how-it-works, modal pembayaran, receipt, footer).
- Persist ke `localStorage['ds-lang']`, diverifikasi via server live + Chrome headless (toggle 2 arah, persist setelah reload).

## 7. Merchant Names — Ganti Brand Asli ke Fiktif

**File:** `app/dashboard/shop/page.tsx`

- 4 merchant (Tokopedia, Gojek, Gramedia, Kursus.id) diganti ke nama fiktif: NusaCart, ZipRide, PageOne, SkillLoop — menghindari risiko klaim brand asli di demo hackathon.

## 8. Dashboard Shop Page — Bilingual (Fix Susulan)

**File:** `app/dashboard/shop/page.tsx`, `lib/i18n.ts`

User melaporkan toggle EN tidak berpengaruh ke halaman ini — root cause: seluruh halaman `/dashboard/shop` (Next.js, beda dari `packages/shop` di atas) hardcoded teks Indonesia, tidak terhubung ke `useLangContext()` sama sekali. Fix: tambah namespace `t.dashboard.shop` lengkap, sambungkan seluruh halaman ke sistem bahasa dashboard yang sudah ada.

## 9. MCP URL Manager — Mask/Show Toggle

**File:** `components/McpUrlManager.tsx`, `lib/i18n.ts`

- MCP URL yang sensitif (berisi token) sekarang default **masked** (`https://domain/mcp/••••••••••••••••••••••••`), dengan tombol toggle icon `Eye`/`EyeOff`. Sebelumnya URL selalu tampil penuh via `<input readOnly>` — jadi ini juga fix keamanan nyata, bukan cuma fitur tambahan.
- Copy button tetap pakai URL asli (bukan versi masked). State per-card otomatis terjaga (tiap card sudah punya instance komponen sendiri).

## 10. MCP Page — Tab Multi-Platform

**File baru:** `components/McpPlatformGuide.tsx`
**File diubah:** `app/dashboard/mcp/page.tsx`, `components/McpUrlManager.tsx` (ekspor helper), `lib/i18n.ts`

- Panduan koneksi MCP yang sebelumnya cuma untuk Claude Web (`claude.ai`) diganti jadi tab selector 4 platform: **Claude Desktop** (config JSON), **Cursor**, **Windsurf**, **VS Code** (dengan badge "⚠️ Eksperimental").
- `<MCP_URL>` di setiap contoh instruksi otomatis diisi dari kartu aktif pertama yang punya MCP URL tersimpan (dikonfirmasi via AskUserQuestion) — disinkronkan lewat custom event `mcp-url-changed` yang di-dispatch `McpUrlManager` setiap generate/revoke, supaya guide section auto-refresh tanpa reload.
- Tab terakhir dipilih disimpan ke `localStorage['mcp-platform-tab']`.

## 11. Telegram Page — Hero CTA & Setup Steps

**File:** `app/dashboard/telegram/page.tsx`, `lib/i18n.ts`

- Tombol CTA "Buka @LunasPayBot" (icon `Send`) dipindah jadi hero CTA prominan di bawah username bot (yang diperbesar jadi `text-lg font-bold`).
- 5 langkah setup diganti total: dari fokus command bot (`/connect`, `/use`, `/buy`) jadi fokus cara hubungkan MCP URL ke bot (klik tombol → Start → `/start` → paste MCP URL).
- Tombol CTA duplikat di bagian bawah halaman (sudah ada sebelumnya) dihapus karena redundan dengan hero CTA baru.

---

## Verifikasi

Setiap task diverifikasi dengan pola konsisten:
- `npm run build` (termasuk `tsc` internal) → 0 error di semua task, total route bertambah dari 10 → 11 (`/dashboard/shop` baru).
- Pembersihan `AGENTS.md`/`CLAUDE.md` auto-generate setelah setiap build.
- Verifikasi visual/behavioral via Chrome headless dikendalikan langsung lewat Chrome DevTools Protocol (screenshot + DOM query), dipakai untuk: navbar active-state, feature card glow, timeline reversibility, toggle bilingual DigiStore.
- Beberapa halaman (Create Card, MCP tabs, Telegram CTA) berada di balik auth guard Privy — **belum bisa diverifikasi visual sungguhan**, hanya diverifikasi lewat build + review kode. Direkomendasikan dicek manual setelah login asli.

## Penyesuaian dari jobdesk (ringkasan)

Beberapa jobdesk merujuk kondisi kode yang sudah berubah sejak ditulis — setiap kali ditemukan, dikonfirmasi ke user via AskUserQuestion sebelum eksekusi (bukan diasumsikan sepihak):
- Sistem 2-gambar feature card: hover-expand dipertahankan, gambar card 3 pakai versi terbaru bukan versi jobdesk.
- MCP guide: URL diisi otomatis dari kartu pertama (bukan placeholder statis).
- Beberapa halaman punya logic/komponen yang sudah ada tapi tidak disebut jobdesk (modal konfirmasi create card, copy handler wallet box, tombol CTA telegram lama) — dipertahankan atau dihapus sesuai konteks, tidak diikuti secara buta.
