# Laporan Tim Frontend — Dashboard Multi-Page Restructure

**Tanggal:** 2026-09-28
**Status:** SELESAI (dengan satu instruksi jobdesk yang sengaja tidak diikuti — dikonfirmasi ke user, lihat catatan #1)

## Verifikasi

`npx tsc --noEmit` → 0 error · `npm run build` → sukses, 10 route:
```
/  /_not-found  /cards  /dashboard  /dashboard/cards  /dashboard/cards/create
/dashboard/history  /dashboard/mcp  /dashboard/telegram  /oauth/authorize
```
Grep string hardcode di semua halaman/komponen baru → 0 hasil (semua teks dari `t.dashboard.*[lang]`).

| Cek | Metode | Hasil |
|---|---|---|
| `/cards` (lama) → redirect ke `/dashboard/cards` | `curl` (server-side redirect) | ✅ `HTTP 307` ke `/dashboard/cards` |
| Auth guard: `/dashboard/*` tanpa login → redirect ke `/` | Chrome dikendalikan via CDP, tunggu Privy `ready` resolve | ✅ `window.location.pathname` = `/` setelah redirect |
| Sidebar: highlight aktif berdasarkan `pathname`, bukan hardcode | Unit-test logic `isPathActive` (9 kombinasi path/href) | ✅ 9/9 lolos, termasuk kasus `/dashboard/cards/create` tetap menandai "Kartu Aktif" aktif (nested route) |
| Semua route `/dashboard/*` merespons | `curl` | ✅ semua `HTTP 200` |

## Struktur baru

```
app/
├── page.tsx                          # Landing (tidak diubah)
├── cards/page.tsx                    # → redirect("/dashboard/cards")
└── dashboard/
    ├── layout.tsx                    # Auth guard + Sidebar + main wrapper
    ├── page.tsx                      # Overview: stats + chart + activity preview + quick links
    ├── cards/
    │   ├── page.tsx                  # List kartu + breadcrumb
    │   └── create/page.tsx           # Form buat kartu + breadcrumb + tombol kembali
    ├── history/page.tsx              # Riwayat + filter card/status + breadcrumb
    ├── mcp/page.tsx                  # 2 kolom: MCP manager | panduan + breadcrumb
    └── telegram/page.tsx             # Info bot + panduan + breadcrumb
```

## File baru
- `components/Breadcrumb.tsx`
- `components/SpendingChart.tsx` — chart canvas pure (tanpa library)
- `app/dashboard/layout.tsx`, `app/dashboard/page.tsx`, dan 5 halaman di bawahnya

## File diubah
- `lib/i18n.ts` — tambah namespace `breadcrumb`, `backToCards`, `chart`, `quickLinks`, `viewAll`, `filter`, `mcpPage`, `telegramPage`
- `lib/dashboard.ts` — tambah `last7DaysSpending()` (group spend per hari untuk chart)
- `components/DashboardSidebar.tsx` — ditulis ulang: dari scroll-anchor (`useState` + `scrollIntoView`) jadi `Link` + `usePathname()`; tambah item "Telegram Bot"; **wallet info box dipertahankan** (lihat catatan #1)
- `components/CardList.tsx` — tombol "Lihat History" sekarang `Link` ke `/dashboard/history?cardId=X` (bukan toggle inline `SpendHistory`)
- `components/CreateCardForm.tsx` — tambah prop opsional `onSuccess?: (cardId) => void`, dipanggil setelah transaksi confirmed (tidak mengubah behavior lama saat prop tidak diberikan)
- `app/cards/page.tsx` — isi diganti total jadi `redirect("/dashboard/cards")`

## File yang dihapus
- `components/Dashboard.tsx` — komponen monolitik lama, isinya sudah dipecah ke `app/dashboard/page.tsx` dan halaman-halaman lain. Dikonfirmasi tidak ada import tersisa sebelum dihapus.

## File yang jadi tidak terpakai (tidak dihapus)
- `components/SpendHistory.tsx` — sebelumnya dipakai `CardList.tsx` untuk riwayat per-kartu inline. Sekarang riwayat terpusat di `/dashboard/history` (pakai `ActivityFeed`, sumber data sama dari backend, tapi scope semua kartu + filter). Tidak dihapus karena bukan instruksi eksplisit di jobdesk ini — kalau disetujui, aman dihapus di iterasi berikutnya.

---

## Catatan penting

### 1. Wallet info box di sidebar — TIDAK dihapus (menyimpang dari checklist jobdesk item terakhir)

Jobdesk ini eksplisit minta "Hapus wallet info box di bagian bawah sidebar — sudah ada di navbar" dan mencantumkannya di checklist verifikasi ("Wallet info di sidebar SUDAH DIHAPUS"). **Ini bertentangan langsung dengan permintaan Anda di sesi sebelumnya**, di mana wallet info + tombol Logout justru diminta dipindah balik ke sidebar karena menumpuk di navbar. Sebelum eksekusi, saya konfirmasi ke Anda dan diminta mempertahankan posisi di sidebar (sudah bagus, sudah diverifikasi sebelumnya) dan mengabaikan instruksi hapus di jobdesk ini. Wallet box + tombol Logout (dengan ikon shutdown) tetap di pojok kiri-bawah sidebar, tidak ada di navbar.

### 2. Redirect setelah create card — diberi jeda 3 detik, bukan langsung

Jobdesk minta `router.push('/dashboard/cards')` langsung setelah transaksi sukses. Tapi `CreateCardForm` menampilkan Card ID, link BscScan, dan instruksi `/connect` Telegram setelah sukses — kalau langsung redirect, informasi itu tidak akan sempat terbaca user. Dikonfirmasi ke Anda, dan diputuskan: tampilkan pesan sukses selama 3 detik, baru redirect otomatis ke `/dashboard/cards`.

### 3. `activeCardCount` di sidebar di-fetch di level `layout.tsx`, bukan per-halaman

Karena sidebar butuh badge jumlah kartu aktif di **semua** halaman `/dashboard/*` (bukan cuma di halaman Kartu Aktif), `useOwnerCards()` dipanggil sekali di `app/dashboard/layout.tsx` dan hasilnya diteruskan sebagai prop ke `DashboardSidebar`. Halaman individual (`/dashboard/cards`, `/dashboard`, dll) tetap punya `useOwnerCards()` sendiri untuk kebutuhan datanya masing-masing — jadi ada duplikasi fetch (sama seperti pola stats vs `CardList` di iterasi sebelumnya), tapi ini konsekuensi wajar dari React Query yang tidak dipakai di sini (fetch manual via `useEffect`). Untuk jumlah kartu yang sedikit ini tidak masalah.

### 4. `SpendingChart` — penyesuaian dari kode contoh jobdesk

- Ditambah `canvas.width = cssW * dpr` + `ctx.scale(dpr, dpr)` untuk dukungan HiDPI/Retina — kode contoh jobdesk pakai `width={800} height={220}` statis yang akan blur di layar dengan `devicePixelRatio > 1`.
- Ditambah fallback `if (typeof ctx.roundRect === "function")` — `CanvasRenderingContext2D.roundRect` belum didukung di semua browser lama; fallback ke `ctx.rect` biasa.
- `Math.max(barH, 1)` — mencegah bar dengan tinggi 0 (hari tanpa transaksi) menjadi tidak digambar sama sekali secara visual aneh (garis nol px).

### 5. Filter status "Auto-approved" di halaman History mencakup dua status backend

Backend punya status `auto_approved` **dan** `approved` (dua nilai berbeda untuk kasus auto-approve vs approve manual oleh agent/owner). Jobdesk minta filter "Auto-approved / Pending / Ditolak" (3 opsi) — filter "Auto-approved" di UI mencocokkan **kedua** status backend tersebut sebagai satu kelompok, karena dari sudut pandang user keduanya sama-sama "berhasil, tidak tertolak/tertunda". Ini konsisten dengan bagaimana `ActivityFeed` sudah menampilkan `auto_approved` dan `approved` dengan warna dot yang sama (hijau).

### 6. Pola breadcrumb dan panduan step-by-step pakai Tailwind, bukan inline `style={}`

Kode contoh jobdesk untuk `Breadcrumb.tsx` pakai inline `style={{ color: 'var(--text-dim)' }}` dan event handler `onMouseEnter`/`onMouseLeave` manual untuk hover. Diganti ke class Tailwind (`text-dim`, `hover:text-ink`) yang sudah dipetakan ke CSS variable yang sama di `globals.css` (`@theme inline`) — konsisten dengan seluruh codebase yang sudah 100% Tailwind + CSS variable, tanpa satu pun inline style manual untuk warna/hover sejauh ini.

---

## Belum bisa diverifikasi

- **Tampilan halaman dashboard dalam kondisi login sungguhan** (stats asli, chart dengan data asli, breadcrumb visual, sidebar active-state visual per halaman) — semua butuh Privy auth asli yang tidak bisa disimulasikan headless browser tanpa akun Google/email sungguhan. Yang sudah diverifikasi terprogram: auth guard redirect (kondisi logged-out), redirect `/cards` lama, dan logic active-state sidebar (unit test murni, tidak butuh browser).
- **Chart dengan data spend asli** — logika `last7DaysSpending()` sudah benar secara kode (grouping by `toDateString()`, sum per hari), tapi belum divisualisasikan dengan data transaksi asli dari backend.
- **Filter History dengan data multi-kartu asli** — logic filter sudah benar secara kode, belum dites dengan lebih dari 1 kartu yang punya riwayat campuran status.

**Rekomendasi:** login sungguhan sekali, buat 2+ kartu dengan transaksi campuran status, lalu cek: chart menampilkan bar yang masuk akal, filter History bekerja untuk kombinasi card+status, breadcrumb dan sidebar highlight berpindah benar saat navigasi antar halaman.
