# Laporan Tim Frontend — Landing Page Redesign Total + Bilingual (ID/EN)

**Tanggal:** 2026-09-28
**Status:** SELESAI

## Verifikasi

`npx tsc --noEmit` → 0 error · `npm run build` → sukses (4 route).

Verifikasi dijalankan lewat **Chrome DevTools Protocol** (script Node di luar repo), memakai server produksi di port 3005. Script ini benar-benar menunggu loader selesai, scroll, hover dengan mouse, dan mengklik toggle bahasa. Hasilnya berupa angka terukur, bukan sekadar screenshot.

| Checklist jobdesk | Hasil terukur |
|---|---|
| Loading screen muncul, counter jalan, fade out | ✅ Loader ada di detik ke-1, hilang setelah ±2,6 detik; flag `sessionStorage` = `"1"` |
| Loading screen hanya sekali per sesi | ✅ Reload di tab yang sama → loader tidak tampil |
| Navbar: logo + links + toggle ID/EN + login | ✅ (screenshot) |
| Toggle ID→EN < 100ms | ✅ 55–62 ms (sudah termasuk jeda 50 ms dari script tes) · `<html lang>` ikut berganti · pilihan tersimpan di `localStorage` dan bertahan setelah reload |
| Hero fullscreen + parallax | ✅ Scroll 400px → background `translate3d(0, 160px, 0)` (tepat 0,4×) |
| Heading hero 2 baris | ✅ 2 baris di 1280 / 1440 / 1920 px, ID & EN |
| Ticker berjalan | ✅ `animation-name: marquee`; pause on hover via CSS |
| Feature cards hover expand + gambar | ✅ Lebar kartu saat kartu tengah di-hover: 242 / **603** / 242 px, gambar muncul |
| Section cara kerja: tekstur + stagger reveal | ✅ 5/5 elemen ter-reveal, parallax background aktif |
| CTA heading besar + tombol amber | ✅ (screenshot) |
| Footer bilingual | ✅ |
| Mobile: stack vertikal, gambar kartu tampil | ✅ Emulasi 390px: tidak ada horizontal overflow, opacity gambar kartu `0.4` |
| Tidak ada teks hardcode | ✅ Semua teks dari `lib/i18n.ts`; pemindaian komponen landing hanya menemukan nama brand "LunasAI" |
| `/cards` & `/oauth/authorize` tidak rusak | ✅ HTTP 200 |

## File baru
- `lib/i18n.ts` — kamus ID/EN (sesuai jobdesk + key tambahan: `nav.langToggle` untuk aria-label, `hero.scroll`, `loading.label`)
- `hooks/useLang.ts` — sesuai jobdesk + sinkronisasi atribut `<html lang>`
- `components/LangProvider.tsx` — Context `lang`/`toggle`
- `components/LoadingScreen.tsx`
- `components/landing/Hero.tsx`, `Ticker.tsx`, `FeatureCards.tsx`, `Steps.tsx`, `CtaSection.tsx` (termasuk `LandingFooter`)
- `lib/clientNav.ts` — flag "sudah hydrate" untuk membedakan load awal vs navigasi client
- `public/images/` — 5 aset disalin sesuai nama yang diminta

## File diubah
- `app/page.tsx` — ditulis ulang total: orkestrasi loader, props `lang`, parallax
- `app/providers.tsx` — pasang `LangProvider`
- `app/layout.tsx` — wrapper konten tidak lagi punya `z-index` (lihat catatan #4)
- `app/template.tsx` — transisi halaman hanya saat navigasi client, bukan load pertama
- `app/globals.css` — CSS ticker, feature-card, skip-loader, grid overlay `z-index: -1`, dan tambahan blok reduced-motion
- `components/Navbar.tsx` — sekarang client component: teks bilingual + toggle bahasa
- `components/LoginButton.tsx` — label tombol login dari `t.nav.launch` (logika tidak diubah)

**Dashboard (`app/cards/page.tsx` dan komponennya) tidak diubah.**

## Penyesuaian dari jobdesk (dan alasannya)

1. **`lang` dibagikan lewat Context, bukan props dari `page.tsx` ke Navbar.** Navbar berada di `layout.tsx` (global), bukan di dalam `page.tsx`, jadi secara teknis tidak bisa menerima props dari page. Jobdesk Task 3 mengizinkan Context. Di dalam `page.tsx`, `lang` tetap diteruskan ke semua section lewat props sesuai Aturan #2.
2. **Toggle bahasa hanya tampil di landing (`/`).** Dashboard tidak boleh diubah dan tetap berbahasa Indonesia. Kalau toggle muncul di sana, yang berganti hanya teks navbar, sehingga terkesan rusak. Teks navbar tetap mengikuti bahasa yang dipilih.
3. **Rumus parallax section Cara Kerja diubah.** Jobdesk memakai `window.scrollY * 0.15`. Section itu berada di sekitar 2.500 px ke bawah, jadi saat terlihat background akan bergeser ±375 px. Itu melebihi ruang `inset: -20%` (±200 px) dan memunculkan celah kosong. Sekarang offset dihitung relatif terhadap posisi section di viewport (`-(pusat section - pusat layar) × 0.15`), sehingga pergeseran maksimal ±150 px. Parallax hero tetap `scrollY × 0.4` persis sesuai spec. Keduanya memakai satu listener `passive: true`, di-throttle dengan `requestAnimationFrame`, dan dimatikan saat `prefers-reduced-motion`.
4. **Loading screen sempat tertutup navbar (bug layer) — sudah diperbaiki.** Sebelumnya wrapper konten di `layout.tsx` punya `relative z-[1]`, yang membentuk stacking context sendiri. Akibatnya `z-index: 9999` loader tidak bisa melampaui navbar (`z-100`). Bug yang sama sebenarnya juga sudah ada di modal konfirmasi Buat Kartu, yang backdrop-nya tertutup navbar di bagian atas. Perbaikan: grid overlay dipindah ke `z-index: -1` dan z-index wrapper dihapus. Terverifikasi di screenshot bahwa loader kini menutupi seluruh layar termasuk navbar.
5. **Loader dan transisi halaman.** `template.tsx` memakai `transform` selama 300 ms, yang membuat loader (`position: fixed`) salah posisi. Karena itu, transisi halaman hanya berjalan saat navigasi client. Selain itu, loader yang muncul lewat navigasi client (misalnya pertama kali buka `/cards` lalu klik logo) di-render lewat portal ke `body`.
6. **Pengunjung yang sudah melihat loader tidak melihatnya berkedip.** Kalau pengecekan `sessionStorage` hanya lewat `useEffect`, HTML dari server tetap menampilkan loader sesaat sebelum JavaScript jalan. Ditambahkan inline script kecil yang menandai `<html class="ls-skip">` sebelum loader digambar.
7. **Nama font di `LoadingScreen` memakai CSS variable (`var(--font-syne)`, `var(--font-jetbrains)`).** Contoh di jobdesk memakai `'Syne'` langsung, padahal `next/font` memberi nama font ter-hash sehingga nama `'Syne'` tidak akan cocok.
8. **Ukuran heading hero `clamp(44px, 5.4vw, 80px)`, bukan `clamp(52px, 8vw, 96px)`.** Syne 800 sangat lebar: di 96 px, "Biarkan Ia Bekerja" butuh sekitar 1.300 px dan pecah jadi 4 baris, padahal spec minta 2 baris. Dengan ukuran baru, 2 baris tercapai di semua lebar desktop yang diuji. Di mobile, judul wajar pecah lebih banyak baris.
9. **Gambar di-render dengan `next/image`, bukan `background-image` CSS.** `section-bg.jpg` berukuran 2,1 MB (5376×3584). Dengan `next/image`, gambar otomatis dikonversi ke WebP/AVIF sesuai ukuran layar. Hero memakai `priority` supaya dimuat lebih dulu.

## Catatan untuk demo
- **Folder `.next` sudah dihapus setelah verifikasi.** Di laporan animasi sebelumnya ditemukan bahwa `npm run dev` bisa error 500 (font JetBrains Mono) kalau dijalankan setelah `npm run build`. Kalau error itu muncul lagi: hentikan dev server, hapus `.next`, lalu jalankan ulang.
- **Loader berjalan sekali per tab browser** (`sessionStorage`). Untuk melihatnya lagi saat demo, buka tab baru.
- **Belum dites di Safari/iOS.** Parallax memakai `translate3d` dan listener passive, yang umumnya aman.
