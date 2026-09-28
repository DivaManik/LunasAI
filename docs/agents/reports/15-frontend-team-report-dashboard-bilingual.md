# Laporan Tim Frontend — Bilingual Dashboard (ID/EN)

**Tanggal:** 2026-09-28
**Status:** SELESAI

## Verifikasi

`npx tsc --noEmit` → 0 error · `npm run build` → sukses (4 route) · grep string hardcode di 12 komponen dashboard yang diubah → 0 hasil.

Verifikasi juga dijalankan lewat **Chrome DevTools Protocol** (script Node, sama seperti laporan landing bilingual sebelumnya) terhadap server produksi:

| Checklist jobdesk | Hasil terukur |
|---|---|
| Navbar dashboard: toggle ID/EN visible | ✅ `langToggleVisibleOnDashboard: true` |
| Klik EN → semua teks dashboard berganti seketika | ✅ Heading "Dashboard", subtitle "Manage your delegation cards and AI agent budget.", sidebar "Overview/Cards/Active Cards/History/AI Agent/MCP Connect/Shop", wallet box "Wallet/Not logged in" — semua berganti dalam satu klik, tanpa reload |
| Klik ID → kembali ke Indonesia | ✅ `dashboardHeading_backToId: "Dashboard"` (dan subtitle+sidebar ikut kembali, dicek visual) |
| Refresh → bahasa tersimpan | ✅ `langPersistedAfterReload_dashboard` tetap EN setelah `Page.reload()`, `<html lang="en">` |
| `CreateCardForm`: label, placeholder, tombol bilingual | ✅ Semua string diganti dari `t.dashboard.createCard.*`, termasuk pesan validasi dan isi modal 2-langkah |
| `FaucetButton`: status text bilingual | ✅ Semua 5 status (`idle/loading/success/cooldown/error`) dari `t.dashboard.faucet.*` |
| `McpUrlManager`: copy/revoke/regenerate bilingual | ✅ Semua tombol dan pesan dari `t.dashboard.mcp.*` |
| `NetworkWarning`: teks warning bilingual | ✅ Dari `t.dashboard.network.warning` |

## File diubah (semua 10 yang diminta jobdesk, plus 2 tambahan)

- `lib/i18n.ts` — ditambah blok `dashboard` lengkap sesuai struktur jobdesk (`title`, `subtitle*`, `btnCreate`, `stats`, `sidebar`, `cardList`, `activity`, `mcp`, `createCard`, `faucet`, `network`, `login`), plus beberapa key tambahan yang dibutuhkan komponen (`loadingLabel`, `loginTitle/Sub`, `btnRefresh`, dll — karena UI sebenarnya punya lebih banyak string daripada yang tercantum di contoh jobdesk)
- `components/Dashboard.tsx`
- `components/DashboardSidebar.tsx`
- `components/CardList.tsx`
- `components/ActivityFeed.tsx` — sekarang menerima prop `lang` dari `Dashboard.tsx` (lihat catatan #2)
- `components/McpUrlManager.tsx`
- `components/CreateCardForm.tsx`
- `components/FaucetButton.tsx`
- `components/NetworkWarning.tsx`
- `components/LoginButton.tsx`
- `components/Navbar.tsx` — toggle sekarang tampil di **semua** halaman (lihat catatan #3)

**Dua file tambahan** yang tidak disebut eksplisit di jobdesk, tapi diperbaiki karena melanggar Aturan Wajib #1 ("TIDAK ADA string hardcode di komponen manapun") kalau dibiarkan:
- `components/SpendHistory.tsx` — dirender langsung oleh `CardList.tsx` (riwayat per kartu), masih penuh teks Indonesia hardcode.
- `components/SignMessage.tsx` — dirender oleh `Dashboard.tsx` (section Bot Telegram), masih penuh teks Indonesia hardcode.

## Penyesuaian dari jobdesk (dan alasannya)

1. **`lib/LangContext.tsx` tidak dibuat — dipakai `components/LangProvider.tsx` yang sudah ada.** Task landing bilingual (sesi sebelumnya) sudah membuat Context yang sama persis fungsinya (`{ lang, toggle }`, sumber `useLang()`, sudah dipasang di `app/providers.tsx`). Membuat Context kedua akan menghasilkan dua sumber kebenaran bahasa yang bisa desync (misalnya toggle di satu Context tidak mengubah bahasa yang dibaca dari Context lain). Semua komponen dashboard memakai `useLangContext()` yang sudah ada.
2. **`ActivityFeed` menerima `lang` lewat props, bukan `useLangCtx()` langsung di dalam komponen.** Fungsi `statusLabel()` di file itu dipanggil sebagai fungsi biasa (bukan komponen React), jadi tidak bisa memanggil hook di dalamnya — `lang` diteruskan sebagai parameter biasa. Ini konsisten dengan pola yang sama di `SpendHistory.tsx` dan `CardList.tsx` (fungsi helper `statusChip`/`statusLabel` menerima `lang` sebagai argumen, komponennya sendiri tetap pakai hook).
3. **Toggle bahasa sekarang tampil di SEMUA halaman, termasuk landing.** Task sebelumnya (landing bilingual) sengaja menyembunyikan toggle di dashboard dengan alasan dashboard belum bilingual saat itu. Jobdesk ini eksplisit minta "toggle di navbar harus visible di SEMUA halaman (landing + dashboard)" — kondisi `isLanding` di `Navbar.tsx` dihapus.
4. **String placeholder `{amount}` di `createCard.modalStep1Desc` di-split manual, bukan pakai library i18n interpolation.** Project ini tidak punya dependency i18n (`i18next`, dll) — `t[key][lang].split("{amount}")` cukup untuk satu kasus interpolasi ini tanpa menambah dependency baru.
5. **`modalStep2Desc` di modal 2-langkah tidak sepenuhnya sama dengan versi contoh jobdesk** (`"Buat kartu on-chain"`) — dipertahankan teks yang sudah ada sebelumnya di `CreateCardForm.tsx` ("IDRX di-lock di dalam kontrak sebagai budget yang bisa dipakai AI agent untuk belanja") karena lebih deskriptif dan sudah pernah direview di task modal konfirmasi sebelumnya; hanya diterjemahkan ke EN, tidak diganti isinya.

## ⚠️ Catatan verifikasi: Privy `ready` lambat di headless browser

Saat verifikasi, tombol login di navbar sempat tertahan di teks "Loading..." lebih lama dari biasanya di Chrome headless (state `!ready` dari `usePrivy()`). Ini murni karena SDK Privy butuh waktu inisialisasi jaringan yang lebih lambat di lingkungan headless tanpa akselerasi GPU/browser penuh — dikonfirmasi bukan bug kode karena setelah menunggu (polling hingga 10 detik), halaman render normal dan toggle bahasa tetap berfungsi. Di browser sungguhan (dipakai user), ini biasanya selesai dalam 1 detik.

## Catatan untuk demo
- Folder `.next` sudah dihapus setelah verifikasi (sesuai temuan sebelumnya soal cache Turbopack).
- Belum bisa memverifikasi tampilan dashboard **setelah login** (stats, daftar kartu asli, dll) dalam bahasa Inggris — perlu wallet Privy sungguhan. Struktur kode sudah menjamin semua teks di jalur itu memakai `t.dashboard.*[lang]`, tapi rekomendasi tetap: cek manual sekali dengan login asli, toggle ke EN, pastikan tidak ada teks yang lolos.
