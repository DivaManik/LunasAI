# Laporan Tim Frontend — Animasi & Polish UI LunasAI

**Tanggal:** 2026-09-28
**Status:** SELESAI

## Verifikasi

| Cek | Hasil |
|---|---|
| `npx tsc --noEmit` | ✅ 0 error |
| `npm run build` | ✅ sukses, 4 route |
| Library animasi eksternal | ✅ tidak ada — pure CSS + React hooks |
| Scroll reveal jalan | ✅ DOM dump Chrome headless: viewport 900px → 5 dari 18 elemen `revealed` (hanya 5 langkah flow di hero), viewport 4000px → 18/18 |
| `prefers-reduced-motion` | ✅ screenshot dengan `--force-prefers-reduced-motion`: semua konten langsung terlihat tanpa animasi |
| Skeleton | ✅ screenshot halaman preview sementara (sudah dihapus): 4 stat tile, baris kartu, timeline aktivitas |

## File baru
- `hooks/useScrollReveal.ts` — Intersection Observer, tambah class `revealed` sekali lalu disconnect
- `hooks/useCountUp.ts` — count-up ease-out cubic via `requestAnimationFrame`
- `components/Reveal.tsx` — wrapper client untuk `useScrollReveal` (landing page adalah server component, jadi hook tidak bisa dipanggil langsung di sana)
- `components/Skeleton.tsx` — `SkeletonCard` (stat tile), `SkeletonRow` (baris kartu), `SkeletonLines` (timeline aktivitas)
- `app/template.tsx` — transisi halaman

## File diubah
- `app/globals.css` — semua CSS animasi dan blok `prefers-reduced-motion`
- `app/page.tsx` — Reveal di section Features, How It Works, CTA, dan flow diagram
- `components/Dashboard.tsx` — skeleton stat row + count-up di `StatCard`
- `lib/dashboard.ts` — status `loading` akurat di `useOwnerCards`; `useActivity` reset ke `null` saat refetch
- `components/CardList.tsx`, `ActivityFeed.tsx`, `SpendHistory.tsx` — hanya className (hover/pulse) + markup state loading → skeleton. Logika tidak diubah.

## Deskripsi tiap animasi

1. **Scroll reveal:** header section, card fitur, card langkah, dan CTA banner fade + naik 24px saat masuk viewport. Card dalam grid di-stagger 0 s / 0,07 s / 0,14 s dst. sampai card ke-6.
2. **Skeleton:** 4 stat tile dan list kartu menampilkan balok shimmer selama data kartu/aktivitas dimuat (juga setelah klik Refresh/Tutup Form). Feed aktivitas menampilkan skeleton timeline.
3. **Count-up:** angka stat naik dari 0 ke nilai target dalam 1,2 detik (ease-out cubic), format `id-ID`. Berjalan saat tile muncul, yaitu tepat setelah skeleton selesai.
4. **Transisi halaman:** konten fade + naik 8px (0,3 s) setiap pindah route. Navbar tidak ikut beranimasi.
5. **Micro-interaction:**
   - Ikon flow diagram membesar ke 1.08 dengan border amber saat hover.
   - Langkah flow bounce-in dari bawah dengan stagger per langkah.
   - Agent card mendapat glow amber saat hover, dan ikonnya membesar ke 1.05.
   - Tombol `btn-primary` punya overlay putih 12% saat ditekan.
   - Dot aktivitas berstatus pending berdenyut (pulse).

## Penyesuaian dari contoh kode jobdesk (dan alasannya)

1. **Transisi halaman memakai `app/template.tsx`, bukan `showPage()`.** `showPage()` berasal dari artifact yang berupa single-page HTML. Di Next.js App Router, landing dan dashboard adalah route terpisah, dan `template.tsx` di-remount di setiap navigasi. Class `page-enter` dilepas lewat `onAnimationEnd` (bukan `setTimeout`), sesuai maksud jobdesk "hapus setelah animasi selesai".
2. **State akhir memakai `transform: none`, bukan `translateY(0)`.** Ini berlaku untuk `.reveal.revealed`, dan juga alasan class `page-enter` dilepas. Elemen yang masih punya `transform` apa pun membuat `position: fixed` di dalamnya ikut ter-offset ke elemen itu, bukan ke viewport. Modal konfirmasi di `CreateCardForm` ada di dalam wrapper halaman, jadi dengan `translateY(0)` modal itu bisa salah posisi.
3. **`useCountUp`:**
   - Frame terakhir diset ke nilai target persis, bukan `Math.floor`, supaya saldo desimal (misal 500,5 IDRX) tidak terpotong.
   - Ditambah `cancelAnimationFrame` saat cleanup, supaya tidak ada dua loop berjalan bersamaan kalau target berubah.
   - Dilewati langsung ke nilai akhir jika user mengaktifkan reduced motion.
4. **Stagger flow diagram pakai `transition-delay` inline per index, bukan `nth-child`.** Langkah flow diselingi elemen garis penghubung, jadi urutan `nth-child` tidak cocok. Untuk grid fitur dan langkah tetap memakai `nth-child` persis seperti di jobdesk.
5. **Blok `prefers-reduced-motion` diperluas.** Selain mematikan animasi/transisi, blok ini juga memaksa `.reveal { opacity: 1; transform: none }`. Tujuannya agar konten tidak bergantung pada Intersection Observer untuk terlihat. Daftar selektornya juga mencakup `.dot-amber`, `.agent-icon`, dan `.btn-primary`.

## ⚠️ Temuan penting untuk demo: dev server bisa error 500 setelah `npm run build`

Saat verifikasi, `npm run dev` yang dijalankan **setelah** `npm run build` langsung error 500 di semua halaman: `next/font/google queries have exactly one entry` (font JetBrains Mono, via Turbopack). Error ini konsisten 3 dari 3 percobaan, dan tetap muncul walaupun Turbopack sudah menghapus cache internalnya sendiri.

**Bukan bug kode:**
- URL font dari Google normal.
- `npm run build` sukses.
- Setelah folder `.next` dihapus dan dev server dijalankan ulang, semua halaman kembali 200 dengan kode yang sama persis.

Kemungkinan besar ini bug Turbopack di Next 16.3.6 saat cache build produksi dan dev tercampur.

**Solusi jika terjadi saat demo:** hentikan dev server, jalankan `rm -rf .next` (atau hapus folder `.next`), lalu `npm run dev` lagi.

Dev server `next dev` yang sebelumnya berjalan di port 3000 (kemungkinan milik user) sudah tidak aktif saat sesi ini mulai. Dev server yang saya jalankan untuk verifikasi sudah dimatikan kembali.

## Belum bisa diverifikasi
- **Count-up dan skeleton dengan data asli** perlu login Privy, yang tidak bisa dilakukan headless browser. Tampilan skeleton sudah dicek lewat halaman preview terpisah, tapi transisi dari skeleton ke stat dengan data asli belum.
- **Animasi yang dipicu interaksi** (hover glow, ripple saat klik, transisi saat pindah halaman) tidak bisa ditangkap screenshot statis. Kodenya sudah lolos typecheck dan build, dan perlu dicek manual di browser.
