# Laporan Tim Frontend — UI Redesign LunasAI (Midnight Amber)

**Tanggal:** 2026-09-28
**Status:** SELESAI
**Referensi desain:** artifact `NhihbW4HVmMq2ioUVetsrN` (dibaca penuh sebelum implementasi)

---

## Verifikasi wajib

| Cek | Hasil |
|---|---|
| `npx tsc --noEmit` | ✅ 0 error |
| `npm run build` | ✅ sukses, 4 route (`/`, `/cards`, `/oauth/authorize`, `/_not-found`) |
| Tidak ada "AgentPay" di UI | ✅ grep `AgentPay\|Agent Pay\|Agent<span` di `app/ components/ lib/` → 0 hasil |
| Background `#07070f` di semua halaman | ✅ diset di `body` (globals.css), terlihat di screenshot `/`, `/cards`, `/oauth/authorize` |
| Font Syne ter-load | ✅ lewat `next/font/google`, dikonfirmasi visual dari screenshot (bentuk huruf Syne 800 yang lebar terlihat jelas di heading) |
| Tidak ada warna biru/ungu | ✅ grep `blue-/purple-/violet-/indigo-` → 0 hasil (sebelumnya ada `bg-blue-50` di modal CreateCardForm, sudah diganti tint orange) |

Screenshot diambil dengan Chrome headless (desktop 1440px dan lebar 500px untuk mobile). Catatan: Chrome headless punya lebar jendela minimum sekitar 500px, jadi uji "mobile" dilakukan di 500px. Lebar ini masih di bawah breakpoint 768px, sehingga semua perilaku mobile (nav disembunyikan, sidebar collapse, flow diagram hilang) tetap teruji.

---

## Deskripsi halaman setelah redesign

**`/` — Landing page**
- Navbar fixed (blur + border bawah): logo bulan sabit + "LunasAI", link Features / How it works, "Dashboard →" (ghost), dan tombol login Privy (amber, label "Launch App").
- Hero: badge pulse "BNB Testnet · IDRX · Live", h1 "AI Agent yang Bisa **Bayar Sendiri**" (gradient amber→gold), glow radial, 2 CTA, flow diagram 5 langkah.
- Grid 6 fitur (3 kolom, 1 kolom di mobile), 4 step card 01–04, CTA banner gradient, footer.

**`/cards` — Dashboard**
- Sidebar 220px:
  - Overview / Kartu / AI Agent.
  - Badge jumlah kartu aktif (data real).
  - Link Shop ke `NEXT_PUBLIC_SHOP_URL` (fallback `localhost:3002`).
  - Kotak wallet di bawah: address JetBrains Mono + saldo IDRX real.
- Header: "Dashboard" + tombol "+ Buat Kartu" (membuka `CreateCardForm` inline) + `FaucetButton` (amber).
- 4 stat tile dari data real on-chain + backend:
  - Total Budget Aktif
  - Sudah Dipakai (+ persentase)
  - Transaksi Hari Ini
  - Saldo Wallet
- Dua kolom:
  - Kiri: Kartu Delegasi, berisi status chip, agent address mono, budget/terpakai, progress bar, dan tombol History/Revoke.
  - Kanan: Aktivitas Terbaru, gabungan riwayat semua kartu dari backend, dengan dot hijau/amber/orange.
- Section MCP Connection: satu `McpUrlManager` per kartu aktif.
- Section Bot Telegram: berisi `SignMessage`.
- Jika belum login: panel "Masuk untuk mulai".

**`/oauth/authorize`** — logo LunasAI + panel consent tema gelap (tidak ada di daftar file jobdesk, tapi di-restyle supaya syarat "background #07070f di semua halaman" terpenuhi dan panel putih tidak kontras aneh).

---

## File baru

- `components/Navbar.tsx` — navbar global (dipasang di `layout.tsx`, jadi muncul di semua halaman)
- `components/LogoMoon.tsx` — SVG bulan sabit (path dan gradient persis dari jobdesk)
- `components/Dashboard.tsx` — layout dashboard (header, stats, 2 kolom, MCP, Telegram)
- `components/DashboardSidebar.tsx` — sidebar + kotak wallet
- `components/ActivityFeed.tsx` — timeline aktivitas
- `lib/dashboard.ts` — hook data dashboard: `useOwnerCards`, `useIdrxBalance`, `useActivity`, `useActiveWallet`, dan helper `timeAgo`/`isToday`/`isCardActive`

## File diubah

- `app/globals.css` — design tokens di `:root`, mapping ke Tailwind (`bg-card`, `text-muted`, `border-line`, `font-display`, dll), serta kelas komponen (`btn-primary`, `btn-ghost`, `btn-small`, `panel`, `field`, `chip`, dll) di `@layer components` supaya utility Tailwind tetap bisa override.
- `app/layout.tsx` — font Syne/Inter/JetBrains Mono via `next/font/google`, metadata LunasAI, Navbar global, grid overlay.
- `app/page.tsx` — landing page baru (lihat catatan #1 di bawah).
- `app/cards/page.tsx` — sekarang hanya merender `<Dashboard />`.
- `app/oauth/authorize/page.tsx` — restyle + brand + format IDRX.
- `lib/constants.ts` — tambah `SHOP_URL`, `formatIdrx()`.
- Restyle saja (logika, props, dan hook tidak diubah): `LoginButton`, `CreateCardForm`, `McpUrlManager`, `NetworkWarning`, `FaucetButton`, `SignMessage`, `SpendHistory`, `CardList`.

---

## Catatan yang perlu perhatian

1. **Form dan tombol fungsional dipindah dari landing ke dashboard.** Landing sekarang murni halaman marketing. `CreateCardForm` (via "+ Buat Kartu"), `FaucetButton`, dan `SignMessage` sekarang ada di `/cards`, sesuai desain header dashboard. Info box lama "Cara Pakai" (langkah `/connect`, `/use`, `/buy` Telegram) digantikan section How it works. Langkah `/connect` bot tetap dijelaskan di section Bot Telegram dashboard.
2. **Label tombol login jadi "Launch App"** (sebelumnya "Login / Connect Wallet") agar sesuai navbar desain. Fungsinya tetap membuka modal login Privy.
3. **`McpUrlManager` dipindah dari dalam tiap kartu ke section "MCP Connection"** tersendiri, sesuai desain. Logika komponen tidak diubah.
4. **Stats dashboard memakai hook baru (`lib/dashboard.ts`), bukan logika `CardList`.** Tujuannya agar logika fetch `CardList` tidak diubah sesuai aturan jobdesk. Konsekuensinya data kartu dibaca dua kali dari RPC (satu oleh stats, satu oleh `CardList`). Untuk jumlah kartu yang sedikit ini tidak masalah. Setelah buat kartu, klik "Tutup Form" atau "Refresh" untuk memuat ulang keduanya. `CreateCardForm` tidak punya callback sukses dan tidak ditambahkan karena props-nya tidak boleh diubah.
5. **Perbaikan tampilan satuan (bug sisa migrasi V2):** `SpendHistory` dan halaman oauth masih memformat jumlah dengan `weiToTbnb` (÷1e18), sehingga IDRX tampil `0.0000 tBNB`. Sekarang memakai `formatIdrx` (÷100, 2 desimal).
6. **Untuk Backend Team:** notifikasi Telegram di `backend/src/routes/spend.ts` masih memformat jumlah dengan `formatEther(...) tBNB`. Di kontrak V2 jumlahnya IDRX 2 desimal, jadi angka di notifikasi bot kemungkinan salah. Di luar scope Frontend, tidak diubah.
7. **Tidak diganti dengan sengaja:** string `AGENTPAY-VERIFY-...` di `SignMessage` adalah format nonce protokol backend (bukan teks brand). Mengubahnya akan memutus verifikasi `/verify`.
8. `components/WalletConnect.tsx` masih ada tapi tidak dirender di mana pun sejak migrasi Privy (masih bertema terang). Aman dihapus nanti jika disetujui.
9. Saat verifikasi, port 3000 sedang dipakai `next dev` dari package dashboard yang sama (kemungkinan milik user). Proses itu tidak dimatikan. Screenshot diambil dari server tersebut, yang meng-compile kode terbaru.

## Belum bisa diverifikasi (butuh login Privy asli)

Tampilan dashboard dalam kondisi login (stats berisi data, list kartu, feed aktivitas, MCP section, modal konfirmasi) belum bisa di-screenshot karena headless browser tidak bisa melewati login Google/Privy. Yang sudah terverifikasi visual: landing (desktop + mobile), dashboard state belum login (desktop + mobile), dan oauth. **Mohon cek manual dashboard setelah login sebelum demo.**
