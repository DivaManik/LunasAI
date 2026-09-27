# Laporan Tim Frontend — V2 Privy Migration + OAuth Consent

**Tanggal:** 2026-09-25
**Status:** SELESAI (dengan 1 catatan penting soal App ID & 1 penyimpangan desain terhadap jobdesk — lihat di bawah)
**Referensi:** `docs/agents/08-privy-team.md`

---

## Ringkasan

Dashboard V1 (wagmi + MetaMask) sekarang mendukung login Privy (email/Google/wallet, embedded wallet otomatis) untuk flow utama (buat card, sign message), dan menambahkan halaman OAuth consent baru untuk MCP server. **wagmi tidak dihapus sepenuhnya** — lihat bagian "Penyimpangan dari jobdesk" di bawah untuk alasannya.

---

## Yang sudah selesai

### Task A — Setup Privy
- `npm install @privy-io/react-auth @privy-io/wagmi @stripe/stripe-js` (pakai `--legacy-peer-deps`, lihat catatan konflik dependency di bawah)
- `lib/chain.ts` (baru) — helper `bnbTestnet` pakai `defineChain` dari viem, dipakai bersama di `lib/privy.ts`, `lib/wagmi.ts`, `CreateCardForm.tsx`, `SignMessage.tsx`. Ini sesuai saran jobdesk "buat helper lib/chain.ts daripada hardcode chain object di tiap file".
- `lib/privy.ts` (baru) — `PrivyClientConfig` dengan `loginMethods`, `appearance` (accent `#F0B90B`), `embeddedWallets.ethereum.createOnLogin`, `defaultChain` + `supportedChains` (lihat "Penyimpangan" untuk kenapa struktur beda dari contoh di jobdesk)
- `app/layout.tsx` — **tidak diubah strukturnya**, tetap Server Component dengan `metadata` export. Hanya tambah `suppressHydrationWarning` di `<html>`. `PrivyProvider` **tidak** dipindah ke sini — tetap di `app/providers.tsx` (client component) yang sudah dipanggil dari layout. Ini menghindari refactor besar yang disarankan jobdesk (`app/metadata.ts` terpisah) karena polanya sudah benar dari awal (server layout → client Providers).
- `app/providers.tsx` (diubah) — sekarang: `PrivyProvider` (dari `@privy-io/react-auth`) membungkus `QueryClientProvider` membungkus `WagmiProvider` (dari **`@privy-io/wagmi`**, bukan `wagmi` — lihat penjelasan di bawah)

### Task B — LoginButton
- `components/LoginButton.tsx` (baru) — sesuai contoh jobdesk, pakai `usePrivy()` + `useWallets()`, tampilkan address singkat + Logout jika sudah login, tombol "Login / Connect Wallet" jika belum. Tambahan: guard `!ready` (tampilkan tombol disabled "Memuat...") supaya tidak flash/error saat Privy SDK belum siap.
- `app/page.tsx` — `WalletConnect` diganti `LoginButton` di header.

### Task C — CreateCardForm
- `components/CreateCardForm.tsx` (diubah total) — semua wagmi hooks (`useAccount`, `useWriteContract`, `useWaitForTransactionReceipt`) dihapus, diganti:
  - `usePrivy()` untuk cek `authenticated`
  - `useWallets()` untuk ambil wallet aktif (embedded Privy diprioritaskan, fallback wallet eksternal)
  - `wallet.getEthereumProvider()` → `createWalletClient({ chain: bnbTestnet, transport: custom(provider) })` → `walletClient.writeContract(...)` untuk kirim transaksi `createCard`
  - `publicClient.waitForTransactionReceipt()` (viem `createPublicClient`, bukan wagmi hook) untuk menunggu konfirmasi dan decode event `CardCreated` (fitur Card ID otomatis dari hotfix sebelumnya tetap dipertahankan)
  - State loading/error dikelola manual dengan `useState` (`isPending`, `isConfirming`, `isConfirmed`, `error`) menggantikan state bawaan `useWriteContract`/`useWaitForTransactionReceipt`

### Task D — SignMessage
- `components/SignMessage.tsx` (diubah) — `useSignMessage` wagmi diganti `usePrivy()` + `useWallets()` + `walletClient.signMessage()` (pola sama seperti CreateCardForm). Fungsi dan tampilan (copy signature, link ke bot, instruksi `/verify`) tetap sama persis seperti sebelumnya.

### Task E — OAuth Consent Page
- `app/oauth/authorize/page.tsx` (baru) — baca query params `session` dan `cardId` via `useSearchParams` (dibungkus `<Suspense>` sesuai requirement Next.js App Router untuk `useSearchParams`).
  - Jika `session`/`cardId` tidak ada → pesan error parameter tidak lengkap
  - Jika Privy belum `ready` → "Memuat..."
  - Jika belum login → tampilkan `<LoginButton />` dengan teks "Login dulu untuk melanjutkan otorisasi"
  - Jika sudah login → fetch info card langsung dari contract (`useReadContract` dengan getter `cards(cardId)`, pola sama seperti `CardList.tsx`) untuk tampilkan budget & sisa, lalu tampilkan daftar consent info sesuai teks di jobdesk (✅/✅/✅/❌) dan 2 tombol Izinkan/Tolak
  - Submit ke `POST {BACKEND_URL}/oauth/consent` dengan `{ sessionId, approved }`, lalu redirect ke `redirectTo` dari response — persis sesuai spec jobdesk

### Environment Variables
- `.env.local` ditambah `NEXT_PUBLIC_PRIVY_APP_ID=cmugdjdjb009j0clc8s5k0p29` — **App ID nyata dari user** (dikirim langsung oleh user di tengah pengerjaan), bukan placeholder. `PRIVY_APP_ID_NEEDED=false`.

---

## Penyimpangan dari kode contoh di jobdesk (dan alasannya)

### 1. wagmi TIDAK dihapus — dipertahankan via `@privy-io/wagmi` sebagai bridge

**Masalah yang ditemukan:** Jobdesk hanya menyebut 4 file untuk diubah (`layout.tsx`, `CreateCardForm.tsx`, `SignMessage.tsx`, + `LoginButton.tsx` baru). Tapi di codebase yang ada, `components/WalletConnect.tsx`, `components/CardList.tsx`, dan `components/NetworkWarning.tsx` — yang semuanya dipakai halaman `/cards` dan `/` — juga bergantung penuh pada wagmi hooks (`useAccount`, `useReadContract`, `useConnect`, `useDisconnect`). Instruksi jobdesk sendiri eksplisit: **"Jangan hapus file yang sudah ada, hanya update"**, dan scope pekerjaan tidak menyebut ketiga file itu untuk diubah.

Jika saya ikuti literal jobdesk (hapus `WagmiProvider` dari provider tree, ganti total dengan `PrivyProvider`), maka `WalletConnect`, `CardList`, `NetworkWarning`, dan halaman `/cards` akan **crash** (`useAccount must be used within WagmiProvider`) karena kehilangan context wagmi — sebuah regresi besar di luar scope yang diminta.

**Solusi yang dipakai:** `@privy-io/wagmi` — paket resmi dari Privy yang menyediakan `createConfig`/`WagmiProvider` sebagai drop-in replacement untuk versi native wagmi, yang menyinkronkan state wallet Privy ke dalam wagmi connector state. Saya konfirmasi pola ini lewat context7 (dokumentasi resmi Privy: `docs.privy.io/wallets/connectors/ethereum/integrations/wagmi`). Hasilnya:
- `PrivyProvider` tetap yang utama (login Google/email/wallet + embedded wallet)
- `WagmiProvider` (dari `@privy-io/wagmi`, bukan `wagmi`) tetap ada, hanya untuk kompatibilitas `useAccount`/`useReadContract` di `WalletConnect.tsx`, `CardList.tsx`, `NetworkWarning.tsx`, dan halaman `/oauth/authorize` (yang saya buat juga pakai `useReadContract` untuk baca info card, konsisten dengan pola `CardList.tsx`)
- `lib/wagmi.ts` diupdate: `createConfig`/`http` sekarang diimpor dari `@privy-io/wagmi` (bukan `wagmi` langsung), connector `injected()` dihapus karena Privy yang mengelola koneksi wallet

**Dampak:** `CreateCardForm.tsx` dan `SignMessage.tsx` (2 file yang eksplisit diminta jobdesk) 100% sudah pindah ke Privy + viem langsung, tidak sentuh wagmi sama sekali — sesuai instruksi. Sementara `WalletConnect.tsx`/`CardList.tsx`/`NetworkWarning.tsx` tidak disentuh isinya sama sekali (0 baris diubah) dan tetap berfungsi normal karena wagmi context masih ada, hanya "didukung" oleh Privy di baliknya.

### 2. `PrivyClientConfig` pakai struktur `embeddedWallets.ethereum.createOnLogin` (nested), bukan `embeddedWallets.createOnLogin` (flat) seperti contoh di jobdesk

Dicek via context7 terhadap dokumentasi Privy terkini: versi API sekarang (dan versi `@privy-io/react-auth@3.45.0` yang ter-install) mengharuskan struktur nested per-chain (`embeddedWallets: { ethereum: { createOnLogin } }`). Struktur flat di contoh jobdesk adalah API versi lama dan akan type-error di versi yang ter-install. Saya pakai struktur baru supaya lolos `tsc --noEmit`.

### 3. Install butuh `--legacy-peer-deps` dan tambahan `@stripe/stripe-js`

- `npm install @privy-io/react-auth` gagal default karena konflik versi `ox` (dependency transitif) antara `wagmi@3.7.7` yang sudah terpasang dan `permissionless` (dependency opsional Privy untuk smart-account). Semua peer dep yang bentrok bersifat `peerOptional` (Solana, permissionless, Farcaster mini-app, dll — tidak dipakai project ini), jadi `--legacy-peer-deps` aman dipakai.
- Build sempat gagal dengan `Module not found: @stripe/stripe-js` karena `@privy-io/react-auth` mengimpor fitur fiat on-ramp (`FiatOnrampScreen`) yang butuh `@stripe/stripe-js` tapi tidak otomatis ter-install sebagai transitive dependency oleh npm. Solusi: install `@stripe/stripe-js` langsung sebagai dependency eksplisit. Fitur on-ramp ini tidak dipakai di dashboard, tapi package-nya wajib ada supaya bundler bisa resolve import di dalam `@privy-io/react-auth`.

### 4. `Pimlico API key` yang dikirim user tidak dipakai di kode

User sempat mengirim `PIMLICO_API_KEY` di tengah pengerjaan. Pimlico dipakai untuk smart account / paymaster (ERC-4337 gasless transactions), yang **tidak** disebutkan di jobdesk V2 ini (jobdesk hanya minta embedded wallet biasa, transaksi tetap dibayar user dari saldo tBNB embedded wallet). Key ini **tidak dimasukkan ke `.env.local` maupun kode** — dicatat di sini saja untuk keputusan Orchestrator apakah dipakai di iterasi berikutnya (misal untuk sponsor gas fee card creation).

---

## Verifikasi yang sudah dilakukan

- `npx tsc --noEmit` — pass, tidak ada type error.
- `npm run build` — sukses, 4 route ter-generate: `/`, `/cards`, `/oauth/authorize`, `/_not-found`.
- `npm run dev` + `curl` ke `/`, `/cards`, `/oauth/authorize?session=test&cardId=1` — ketiganya HTTP 200.
  - `/` — mengandung teks "AgentPay", `LoginButton` render (state awal "Memuat..." sebelum Privy SDK ready di client, sesuai desain guard `!ready`)
  - `/cards` — "Kartu Saya" tetap render normal (konfirmasi `WalletConnect`/`CardList` tidak rusak oleh migrasi)
  - `/oauth/authorize?session=test&cardId=1` — "Otorisasi MCP" render, tidak ada error boundary/`Application error`
- Log dev server dicek manual — tidak ada error (hanya `npm warn` terkait audit, tidak relevan).
- **Belum bisa diverifikasi end-to-end dengan browser asli**: login Google → embedded wallet ter-generate → buat card → sign message → buka `/oauth/authorize` dengan login aktif → klik Izinkan/Tolak. Semua butuh interaksi Privy modal (popup OAuth Google, embedded wallet creation flow) yang tidak bisa disimulasikan tanpa browser sungguhan. **Ini perlu dilakukan manual oleh user/Audit Team** sebelum demo.

## Yang belum / blocked

- Test checklist dari jobdesk (login Google → embedded wallet → buat card → sign message → BscScan link) belum dijalankan end-to-end di browser asli.
- Test consent page dengan sesi OAuth asli dari MCP server (bukan `?session=test&cardId=1` dummy) belum bisa dilakukan karena bergantung pada MCP Team/Backend Team menyelesaikan endpoint `POST /oauth/consent` yang sesungguhnya (jobdesk berasumsi endpoint ini "sudah dibuat oleh MCP Team, asumsi sudah jalan" — belum saya verifikasi apakah benar sudah ada dan responnya sesuai kontrak `{ redirectTo }`).
- Karena `useReadContract` di halaman `/oauth/authorize` bergantung pada `WagmiProvider` (dari `@privy-io/wagmi`) yang membaca `cardId` on-chain, jika card belum pernah dibuat (`cardId` tidak valid) tampilan akan menunjukkan "Card tidak ditemukan" — sudah dihandle, tapi belum ditest dengan card asli.

## Output untuk tim lain

```
DASHBOARD_URL=http://localhost:3000
LOGIN_METHOD=Privy (Google, Email, MetaMask/external wallet)
EMBEDDED_WALLET=implemented, belum ditest manual dengan browser asli
CREATE_CARD=implemented (Privy walletClient.writeContract), belum ditest manual
SIGN_MESSAGE=implemented (Privy walletClient.signMessage), belum ditest manual
OAUTH_CONSENT_PAGE=implemented, ready di /oauth/authorize?session=<id>&cardId=<id>
PRIVY_APP_ID_NEEDED=false (sudah diisi App ID nyata: cmugdjdjb009j0clc8s5k0p29)
WAGMI_STATUS=tidak dihapus, dipakai via @privy-io/wagmi sebagai bridge untuk WalletConnect.tsx/CardList.tsx/NetworkWarning.tsx/oauth authorize page (baca detail di atas)
PIMLICO_API_KEY=diterima dari user tapi TIDAK dipakai (di luar scope jobdesk V2 ini) — perlu keputusan Orchestrator untuk iterasi berikutnya jika mau smart-account/gasless tx
```

**File yang dibuat:**
- `agentpay/packages/dashboard/lib/chain.ts`
- `agentpay/packages/dashboard/lib/privy.ts`
- `agentpay/packages/dashboard/components/LoginButton.tsx`
- `agentpay/packages/dashboard/app/oauth/authorize/page.tsx`

**File yang diubah:**
- `agentpay/packages/dashboard/lib/wagmi.ts` (createConfig/http dari `@privy-io/wagmi`, hapus connector injected)
- `agentpay/packages/dashboard/app/providers.tsx` (tambah PrivyProvider, WagmiProvider dari `@privy-io/wagmi`)
- `agentpay/packages/dashboard/app/layout.tsx` (tambah `suppressHydrationWarning`, tidak ada perubahan struktural lain)
- `agentpay/packages/dashboard/app/page.tsx` (WalletConnect → LoginButton)
- `agentpay/packages/dashboard/components/CreateCardForm.tsx` (wagmi hooks → Privy + viem walletClient langsung)
- `agentpay/packages/dashboard/components/SignMessage.tsx` (wagmi hooks → Privy + viem walletClient langsung)
- `agentpay/packages/dashboard/.env.local` (tambah `NEXT_PUBLIC_PRIVY_APP_ID`)
- `agentpay/packages/dashboard/package.json` (tambah `@privy-io/react-auth`, `@privy-io/wagmi`, `@stripe/stripe-js`)

**File yang TIDAK diubah isinya (masih pakai wagmi hooks murni, tetap berfungsi via bridge `@privy-io/wagmi`):**
- `agentpay/packages/dashboard/components/WalletConnect.tsx` (masih ada, tidak dihapus, tapi sudah tidak dipakai di halaman manapun setelah fix di bawah)
- `agentpay/packages/dashboard/components/CardList.tsx`
- `agentpay/packages/dashboard/components/NetworkWarning.tsx`

**Fix tambahan (di luar 4 file yang eksplisit disebut jobdesk, tapi diperlukan untuk mencegah regresi):**
- `agentpay/packages/dashboard/app/cards/page.tsx` — `WalletConnect` diganti `LoginButton`. **Alasan:** `lib/wagmi.ts` sekarang tidak lagi mendaftarkan connector `injected()` (Privy yang mengambil alih koneksi wallet), jadi tombol "Connect Wallet" di `WalletConnect.tsx` tidak akan menemukan connector apapun dan gagal berfungsi jika tetap dipakai. Mengganti ke `LoginButton` di halaman ini adalah perbaikan 1-baris yang menjaga `/cards` tetap bisa dipakai untuk login, tanpa mengubah `WalletConnect.tsx`, `CardList.tsx`, atau `NetworkWarning.tsx` itu sendiri.

## Issues yang perlu diketahui Orchestrator

1. **Perlu verifikasi:** endpoint `POST /oauth/consent` di backend — apakah sudah benar-benar ada dan mengembalikan `{ redirectTo }` sesuai kontrak, karena Frontend hanya berasumsi sesuai jobdesk.
2. **Pimlico API key** diterima tapi tidak dipakai — perlu arahan apakah dibutuhkan untuk fitur gasless transaction di iterasi berikutnya.
3. **`WalletConnect.tsx` sekarang tidak dipakai di halaman manapun** (digantikan `LoginButton` di `/` dan `/cards`). File-nya sengaja tidak dihapus sesuai instruksi jobdesk, tapi secara fungsional sudah usang — bisa dipertimbangkan untuk dihapus di iterasi berikutnya jika Orchestrator setuju, atau dibiarkan sebagai referensi.
