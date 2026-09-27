# Laporan Tim Frontend — Bug Kritis: /cards Menampilkan Card Milik Orang Lain

**Tanggal:** 2026-09-27 (update: fix pertama gagal, root cause kedua ditemukan & diperbaiki)
**Status:** FIX DITERAPKAN — **BELUM diverifikasi end-to-end dengan browser asli, wajib ditest manual sebelum bug ditutup**

---

## Ringkasan untuk yang buru-buru

Ada **dua bug berlapis**, bukan satu:

1. **Bug #1 (diperbaiki di iterasi pertama, tapi ternyata tidak cukup):** `useAccount()` wagmi tidak otomatis sinkron dengan wallet Privy yang login — butuh `setActiveWallet()` manual. Fix pertama menambahkan sinkronisasi ini di `app/providers.tsx`.
2. **Bug #2 (baru ditemukan di iterasi ini, penyebab fix #1 tidak berhasil):** Sinkronisasi di fix #1 memakai `wallets[0]` mentah dari `useWallets()`, padahal urutan array itu tidak menjamin wallet yang sedang login ada di index 0. `LoginButton.tsx` (yang selalu menampilkan address benar) memakai logic prioritas `embeddedWallet ?? externalWallet`, bukan `wallets[0]` — jadi kedua tempat itu bisa mengembalikan wallet yang berbeda.

**Solusi final (atas arahan user):** bukan memperbaiki sinkronisasi wagmi lagi, melainkan **menghapus ketergantungan pada wagmi sepenuhnya** di `CardList.tsx`/`CardItem`. Semua pembacaan (`getOwnerCards`, `cards()`) dan penulisan (`revokeCard`) sekarang langsung pakai Privy `useWallets()` + viem `publicClient`/`walletClient`, persis pola yang sudah dipakai `CreateCardForm.tsx`.

---

## Kronologi

### Iterasi 1: fix `setActiveWallet` di providers.tsx — TIDAK BERHASIL

Root cause awal yang ditemukan: `useAccount()` (wagmi) tidak otomatis mengikuti wallet Privy yang aktif — perlu `setActiveWallet()` manual (dikonfirmasi dari dokumentasi resmi Privy via context7). Fix: tambah komponen `WalletSync` di `app/providers.tsx` yang memanggil `setActiveWallet(wallets[0])` setiap kali wallet berubah.

**User melaporkan fix ini tidak berhasil** — wallet `0xeA2bc2B8821eef9A5d3f97c809775e3D5bE4e9D4` login, tapi `/cards` masih menampilkan card 1, 2, 6 milik `0xBa4918Ff...9149f`.

### Iterasi 2: investigasi kenapa fix #1 gagal

Diminta menambahkan `console.log` diagnostik untuk melihat address yang benar-benar dipakai. Sebelum sempat memverifikasi dengan browser asli (environment coding ini tidak punya browser — hanya bisa `curl` HTML statis, tidak bisa menjalankan `useEffect`/client-side JS), ditemukan kejanggalan dengan membandingkan kode:

- `WalletSync` (iterasi 1) memakai **`wallets[0]`** mentah dari `useWallets()`
- `LoginButton.tsx` (yang address-nya SELALU benar di UI) memakai **`embeddedWallet ?? externalWallet`** — logic prioritas eksplisit, BUKAN `wallets[0]`

Array `wallets` dari Privy `useWallets()` tidak dijamin menaruh wallet yang sedang login/aktif di index 0 — terutama jika ada lebih dari satu wallet ter-link ke akun Privy user (embedded wallet + wallet eksternal yang pernah dipakai). Ini match persis dengan gejala: `LoginButton` benar, `WalletSync`/`CardList` salah, karena keduanya membaca sumber array yang sama tapi dengan logic pemilihan berbeda.

Sempat diperbaiki dengan menyamakan logic `WalletSync` ke `embeddedWallet ?? externalWallet` juga — **tapi user memutuskan untuk tidak melanjutkan pendekatan sinkronisasi wagmi ini sama sekali**, dan memilih pendekatan bypass total (lihat di bawah), karena lebih sederhana dan konsisten dengan pola yang sudah terbukti benar di `CreateCardForm.tsx`.

### Iterasi 3 (final): bypass wagmi total di CardList.tsx/CardItem

Atas arahan eksplisit user, `WalletSync` **dihapus** dari `app/providers.tsx` (dikembalikan ke bentuk semula sebelum iterasi 1 — `WagmiProvider` tetap ada karena masih dipakai `NetworkWarning.tsx`, tapi tanpa logic sinkronisasi tambahan). Semua wagmi hooks di `CardList.tsx` dan `CardItem` (`useAccount`, `useReadContract`, `useWriteContract`) dihapus total, diganti pemanggilan viem langsung.

---

## Perubahan final di `components/CardList.tsx`

- **Sumber wallet aktif:** helper `useActiveWallet()` baru — `embeddedWallet ?? externalWallet` dari `useWallets()` Privy, persis sama dengan logic `LoginButton.tsx`. Tidak ada `useAccount()` wagmi sama sekali.
- **`getOwnerCards`:** dipanggil via `publicClient.readContract()` (viem `createPublicClient`, RPC read-only, tidak butuh wallet) di dalam `useEffect`, memakai `address` dari `useActiveWallet()`.
- **`cards(cardId)`** (per-card detail di `CardItem`): sama, `publicClient.readContract()` di dalam `useEffect`, dipanggil ulang (`loadCard()`) setelah revoke sukses.
- **`revokeCard`:** sekarang pakai `wallet.getEthereumProvider()` → `createWalletClient({ chain: bnbTestnet, transport: custom(provider) })` → `walletClient.writeContract(...)` dengan `account: wallet.address` eksplisit — pola identik `CreateCardForm.tsx`. Tidak bergantung pada wagmi active wallet apa pun.
- Guard `!authenticated` → "Login dulu untuk lihat kartu kamu", guard `!address` → "Wallet belum terdeteksi. Coba login ulang." (dipertahankan dari iterasi sebelumnya, teksnya sama).

## Perubahan final di `app/providers.tsx`

Dikembalikan ke bentuk sebelum iterasi 1 — `WalletSync` dan import terkait (`useSetActiveWallet`, `useWallets`, `useEffect`) dihapus. `WagmiProvider` (dari `@privy-io/wagmi`) tetap dipertahankan karena `NetworkWarning.tsx` masih memakai `useAccount()` untuk cek `chainId` jaringan — file itu tidak disentuh karena tidak disebut dalam instruksi manapun di sesi ini dan tidak terkait langsung dengan bug kebocoran data card (ia hanya baca `chainId`, bukan `address`, untuk keputusan tampil/tidaknya).

## File yang TIDAK diubah

- `app/cards/page.tsx` — tidak perlu perubahan, sudah benar memanggil `<CardList />`.
- `components/NetworkWarning.tsx` — masih pakai `useAccount()` wagmi untuk `chainId`, di luar scope bug ini (tidak baca `address` untuk query on-chain apa pun).
- `app/oauth/authorize/page.tsx` — juga masih pakai `useReadContract` wagmi, tapi **tidak terpengaruh bug ini** karena ia membaca card berdasarkan `cardId` dari query param URL, bukan berdasarkan wallet yang login. Dicek ulang secara eksplisit di iterasi ini untuk memastikan tidak ada bug serupa tersembunyi di sana.

---

## Verifikasi yang sudah dilakukan

- `npx tsc --noEmit` — pass, tidak ada type error.
- `npm run build` — sukses, 4 route tetap ter-generate (`/`, `/cards`, `/oauth/authorize`, `/_not-found`).
- Grep dikonfirmasi: **tidak ada import dari `"wagmi"` sama sekali** di `components/CardList.tsx`.
- `npm run dev` + `curl /cards` dan `curl /` — keduanya HTTP 200, guard "Login dulu untuk lihat kartu kamu" tampil benar di render awal, tidak ada error di log dev server.

## ⚠️ KETERBATASAN VERIFIKASI — WAJIB DIBACA

Environment coding ini **tidak punya browser** — hanya bisa menjalankan `curl` untuk mengambil HTML hasil server-render, yang **tidak menjalankan JavaScript client-side** (tidak ada `useEffect`, tidak ada `onClick`, tidak ada pemanggilan Privy/viem apa pun). Ini berarti:

- Saya **tidak bisa** mengonfirmasi bahwa `useWallets()` benar-benar mengembalikan `0xeA2bc2B8821eef9A5d3f97c809775e3D5bE4e9D4` yang benar setelah login.
- Saya **tidak bisa** mengonfirmasi bahwa `getOwnerCards` dipanggil dengan address yang benar dan mengembalikan array kosong untuk wallet ini.
- Console.log diagnostik dari iterasi sebelumnya sudah dihapus (tidak relevan lagi karena wagmi sudah di-bypass total, bukan disinkronkan).

**Solusi ini secara logis benar** (menghilangkan sumber ambiguitas "wagmi active wallet vs Privy active wallet" sepenuhnya, dengan memakai satu sumber kebenaran yaitu Privy `useWallets()` langsung, dan logic pemilihan wallet yang identik dengan `LoginButton.tsx` yang sudah terbukti benar) — **tapi ini adalah keyakinan berdasarkan penalaran kode, bukan bukti hasil eksekusi**. Bug ini adalah bug kebocoran data (keamanan), jadi verifikasi visual sungguhan **wajib** dilakukan sebelum dianggap selesai.

## Test yang WAJIB dilakukan manual oleh user/Audit Team

1. Buka DevTools Console (F12) sebelum login.
2. Login dengan wallet `0xeA2bc2B8821eef9A5d3f97c809775e3D5bE4e9D4`.
3. Buka `/cards` → **harus tampil "Belum ada card. Buat card baru di halaman utama."** (kosong, karena wallet ini belum punya card).
4. Logout, login dengan wallet `0xBa4918Ff...9149f` (deployer).
5. Buka `/cards` → **harus tampil card 1, 2, 6**.
6. Coba tombol "Revoke Card" pada salah satu card milik wallet yang sedang login → pastikan MetaMask/Privy meminta konfirmasi dari wallet yang benar (bukan wallet lain), dan setelah revoke sukses status card berubah jadi ⚫ Revoked tanpa reload halaman.

## Yang belum / blocked

- Semua item di atas (test manual) belum dijalankan — blocker utama adalah tidak adanya browser di environment coding ini.
- Jika test manual masih menunjukkan bug yang sama, kemungkinan besar penyebabnya bukan lagi soal "sumber address", melainkan cara Privy `useWallets()` sendiri mem-populate array (misalnya wallet lama tidak pernah ke-disconnect dari sesi Privy, bukan dari wagmi) — ini akan butuh investigasi lebih lanjut ke konfigurasi `PrivyProvider`/`embeddedWallets` di `lib/privy.ts`, bukan ke `CardList.tsx` lagi.

## Output untuk tim lain

Tidak ada perubahan API/kontrak/env. Perubahan murni di sisi Frontend.

**File yang diubah (final, iterasi 3):**
- `agentpay/packages/dashboard/components/CardList.tsx` (ditulis ulang total — hapus semua wagmi hooks, pakai Privy `useWallets()` + viem `publicClient`/`walletClient` langsung untuk read dan write)
- `agentpay/packages/dashboard/app/providers.tsx` (dikembalikan ke bentuk sebelum iterasi 1 — `WalletSync` dihapus, tidak diperlukan lagi)
