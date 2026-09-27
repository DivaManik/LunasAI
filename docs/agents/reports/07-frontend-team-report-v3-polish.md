# Laporan Tim Frontend — V3 Polish

**Tanggal:** 2026-09-27
**Status:** SELESAI (5 task + 1 fix darurat di luar scope yang WAJIB dilakukan — lihat bagian pertama)

---

## ⚠️ Temuan kritis SEBELUM 5 task: kontrak sudah pindah ke DelegationCardV2 (IDRX), bukan lagi native tBNB

Sebelum mengerjakan 5 task, ditemukan bahwa `.env.local` sudah diupdate (oleh proses lain sebelum sesi ini) ke `NEXT_PUBLIC_DELEGATION_CARD_ADDRESS` yang mengarah ke **DelegationCardV2**, bukan V1. Dicek source kontraknya (`packages/contracts/src/DelegationCardV2.sol`):

- `createCard()` di V2 **bukan lagi `payable`** — tidak menerima native BNB. Sekarang budget diambil lewat `IERC20(idrxToken).transferFrom(msg.sender, address(this), budget)`, artinya **wajib `approve()` IDRX dulu** sebelum panggil `createCard()`.
- Struct `Card` (7 field: owner, authorizedAgent, totalBudget, spentAmount, autoApproveLimit, expiryTimestamp, isActive) **tidak berubah** dari V1.
- Token IDRX dikonfirmasi punya **2 desimal** (dicek langsung ke chain via `decimals()`).

`lib/abi.ts` di dashboard masih ABI V1 lama (createCard `payable`), dan `CreateCardForm.tsx` masih kirim native `value: parseEther(budget)`. **Tanpa perbaikan ini, fitur "Buat Card" akan selalu revert** begitu address kontrak V2 dipakai — di luar dari 5 task polish yang diminta, tapi krusial karena akan merusak fitur inti dashboard.

**Dikonfirmasi eksplisit oleh user** untuk memperbaiki ini sebelum lanjut ke 5 task. Perubahan:

- `lib/abi.ts` — `createCard` diubah `stateMutability` jadi `nonpayable`, tambah fungsi `idrxToken()`.
- `lib/erc20.ts` (baru) — ABI ERC-20 minimal (`balanceOf`, `approve`, `allowance`, `decimals`), dipakai bersama untuk approve IDRX dan baca saldo (Task 4).
- `lib/constants.ts` — tambah `IDRX_TOKEN_ADDRESS`.
- `components/CreateCardForm.tsx`:
  - Import `parseUnits` (bukan `parseEther`), tambah konstanta `IDRX_DECIMALS = 2`.
  - Sebelum `createCard`, panggil `walletClient.writeContract({ ..., functionName: "approve", args: [DELEGATION_CARD_ADDRESS, budgetAmount] })` ke kontrak IDRX, tunggu receipt-nya dulu.
  - `createCard` dipanggil **tanpa** `value` (nonpayable sekarang).
  - Tambah state `isApproving` terpisah dari `isPending`, supaya tombol submit menampilkan "Approve IDRX..." lalu "Menunggu konfirmasi wallet..." — user tidak bingung kenapa ada 2 popup konfirmasi wallet.
  - Label field diubah dari "(tBNB)" ke "(IDRX)", default value budget/autoLimit diubah dari `0.05`/`0.01` (masuk akal untuk tBNB) ke `50000`/`10000` (masuk akal untuk Rupiah/IDRX).
- `components/CardList.tsx` — label tampilan Budget/Terpakai/Sisa per card diubah dari `weiToTbnb()` (÷ 1e18) ke helper baru `idrxAmount()` (÷ 100, sesuai 2 desimal IDRX), suffix "tBNB" → "IDRX".

---

## Task 1 — Copy Address 1x Klik ✅

File: `components/LoginButton.tsx` (fungsi copy **sudah ada** dari task sebelumnya, disesuaikan ke spec baru):

- `handleCopy` dibuat `async`, memakai `await navigator.clipboard.writeText(address)` sesuai spec.
- Teks feedback diganti dari "Copied!" ke **"✓ Copied!"** sesuai spec.
- Class disesuaikan ke `hover:bg-gray-100` + `rounded px-2 py-1` (dari sebelumnya `hover:underline`), title tooltip diubah ke "Klik untuk copy address".

## Task 2 — Komponen McpUrlManager ✅

File baru: `components/McpUrlManager.tsx`. Props `{ cardId: string | number }`.

- **State awal:** cek `localStorage.getItem('mcp-url-' + cardId)` saat mount (`useEffect`) — jika ada, tampil langsung state "URL tersedia". Jika tidak, tampil tombol "Generate MCP URL" + info box cara pakai.
- **Generate:** `POST {BACKEND_URL}/api/cards/{cardId}/register-mcp` → simpan `mcpUrl` ke `localStorage` (dibungkus `try/catch`) → tampilkan.
- **Revoke:** `DELETE {BACKEND_URL}/api/cards/{cardId}/mcp-secret` → hapus dari `localStorage` (dibungkus `try/catch`) → kembali ke state awal.
- **Copy URL:** `navigator.clipboard.writeText(url)` + feedback "✓ Tersalin" 2 detik.
- Semua akses `localStorage` dibungkus `try/catch` sesuai instruksi (private mode safety).
- **Terintegrasi** di `components/CardList.tsx` — `<McpUrlManager cardId={cardId.toString()} />` dirender di bagian bawah setiap `CardItem`, tepat di bawah `SpendHistory`.

**Penyesuaian penting terhadap contoh kode di jobdesk:** contoh fetch di jobdesk pakai path relative (`fetch(\`/api/cards/${cardId}/register-mcp\`)`), tapi backend berjalan di **port 3001** sementara dashboard di **port 3000** — path relative akan salah target (mengarah ke dashboard sendiri, bukan backend, hasilnya 404). Diperbaiki dengan prefix `${BACKEND_URL}` (dari `lib/constants.ts`, sudah ada dan dipakai konsisten di komponen lain seperti `SpendHistory.tsx`).

Dicek juga: endpoint `POST /api/cards/:cardId/register-mcp` dan `DELETE /api/cards/:cardId/mcp-secret` **sudah ada** di `packages/backend/src/routes/cards.ts` dan sesuai kontrak (`{ mcpUrl, secret }` untuk register, `{ success, message }` untuk revoke) — tidak ada mismatch API.

## Task 3 — Fix Network Warning ✅

File: `components/NetworkWarning.tsx` — root cause dikonfirmasi sesuai kecurigaan jobdesk: `useAccount()` wagmi tidak sinkron dengan wallet Privy (persis bug yang sama dengan kasus `/cards` menampilkan card orang lain, yang sudah diperbaiki sebelumnya di `CardList.tsx`).

Diganti total ke `useWallets()` dari `@privy-io/react-auth`:
```tsx
const { wallets } = useWallets();
if (!wallets.length) return null;
const wallet = wallets.find((w) => w.walletClientType === "privy") ?? wallets[0];
const isWrongNetwork = wallet.chainId !== `eip155:${BSC_TESTNET_CHAIN_ID}`;
```
Tidak ada import `wagmi` lagi di file ini. Teks warning juga diubah ("...di Wallet kamu" bukan "...di MetaMask") — tumpang tindih dengan Task 5.

## Task 4 — Saldo IDRX di Header ✅

File: `components/LoginButton.tsx` — ditambah `useEffect` yang membaca `balanceOf(address)` dari kontrak IDRX via `publicClient.readContract()` (viem, RPC read-only, bukan wagmi), dibagi 100 (2 desimal, dikonfirmasi ke chain), ditampilkan `toLocaleString("id-ID")` di sebelah address.

- Jika `IDRX_TOKEN_ADDRESS` kosong/undefined → `useEffect` langsung `return` tanpa fetch, `idrxBalance` tetap `null`, tidak ada render saldo, **tidak crash**.
- Pakai `erc20Abi`/`bnbTestnet` yang sudah dibuat sebagai bagian dari fix darurat di atas, bukan ABI inline seperti contoh jobdesk — konsisten dengan pola project.

## Task 5 — Hapus Referensi MetaMask ✅

Grep menyeluruh (`app/`, `components/`, `lib/`) untuk "MetaMask"/"metamask" — ditemukan di 2 tempat:

- `app/page.tsx` — "Connect wallet MetaMask" → **"Login pakai Google/Email/Wallet"**; "tunggu konfirmasi MetaMask" → **"tunggu konfirmasi wallet"**.
- `components/NetworkWarning.tsx` — "...ganti ke BNB Smart Chain Testnet di MetaMask" → **"...di Wallet kamu"** (sudah diperbaiki sebagai bagian Task 3).

Dikonfirmasi ulang dengan grep setelah perubahan: **0 hasil** di seluruh source code dashboard (`app/`, `components/`, `lib/`).

---

## Verifikasi yang sudah dilakukan

- `npx tsc --noEmit` — pass, tidak ada type error.
- `npm run build` — sukses, 4 route tetap ter-generate (`/`, `/cards`, `/oauth/authorize`, `/_not-found`).
- `npm run dev` + `curl /` dan `curl /cards` — HTTP 200, tidak ada error di log dev server, konten baru ("Login pakai Google", "Login dulu untuk lihat kartu kamu") tampil benar, tidak ada teks "MetaMask" tersisa.
- Desimal IDRX (2) dikonfirmasi langsung dari chain via `readContract({ functionName: "decimals" })` terhadap `0x4E45AABeED9b9BF1D15C09C538b63d9a32Bae996` di BNB Testnet — bukan asumsi dari contoh kode jobdesk.
- Signature ABI V2 (`createCard` nonpayable, struct `Card` identik V1, tambahan `idrxToken()`) dikonfirmasi dari `packages/contracts/out/DelegationCardV2.sol/DelegationCardV2.json` dan source `.sol`-nya langsung, bukan tebakan.

## ⚠️ Keterbatasan verifikasi — belum ditest dengan browser asli

Environment coding ini tidak punya browser — hanya bisa `curl` HTML statis, tidak bisa menjalankan `onClick`/`useEffect`/interaksi Privy modal. Item test checklist berikut **belum bisa diverifikasi** dan wajib dites manual:

1. Login Google → address muncul di header — **belum ditest** (perlu Privy modal asli).
2. Klik address → "✓ Copied!" 2 detik — logic sudah benar secara kode, **belum ditest klik sungguhan**.
3. Saldo IDRX muncul di header — **belum ditest** (butuh wallet dengan saldo IDRX asli untuk verifikasi angka yang tampil benar).
4. Tidak ada network warning yang salah — **belum ditest** dengan wallet yang benar-benar login (perbaikan logis, tapi behavior `wallet.chainId` dari Privy pada kondisi nyata belum divalidasi).
5. Klik "Generate MCP URL" → URL muncul + warning simpan — **belum ditest end-to-end** ke backend asli (backend perlu berjalan di port 3001 dengan card yang valid).
6. Klik "Salin URL" → ter-copy — logic sama seperti Task 1, **belum ditest**.
7. Refresh → URL masih ada dari localStorage — **belum ditest** (logic `useEffect` + `localStorage.getItem` sudah benar secara kode).
8. Tidak ada teks "MetaMask" di UI — **sudah diverifikasi via grep source code**, ini satu-satunya item yang bisa dipastikan tanpa browser.

**Rekomendasi kuat:** jalankan test checklist di atas secara manual (browser asli, backend jalan, minimal 1 card yang valid di chain) sebelum demo, terutama Task 2 (McpUrlManager) yang paling kompleks dan paling penting sesuai jobdesk.

## Yang belum / blocked

- Flow "approve IDRX → createCard" di `CreateCardForm.tsx` belum ditest dengan transaksi asli — perlu wallet dengan saldo IDRX testnet yang cukup.
- `components/WalletConnect.tsx` sudah sepenuhnya tidak dipakai di halaman manapun (sejak migrasi Privy sebelumnya) — dicek ulang di sesi ini, tetap tidak disentuh sesuai pola "jangan hapus file yang sudah ada" dari jobdesk-jobdesk sebelumnya. Dicatat di sini sebagai file usang untuk pertimbangan cleanup nanti.
- `app/oauth/authorize/page.tsx` masih pakai `useReadContract` wagmi untuk baca info card berdasarkan `cardId` dari query param — **tidak disentuh** karena di luar 5 task, dan tidak terpengaruh bug address-stale (tidak baca `address` wallet, hanya `cardId` dari URL). `WagmiProvider` di `app/providers.tsx` masih dipertahankan karena halaman ini masih bergantung padanya.

## Output untuk tim lain

Tidak ada perubahan ke `packages/backend/`, `packages/shop/`, `packages/contracts/` — semua perubahan di `packages/dashboard/` saja, sesuai aturan.

**File baru:**
- `agentpay/packages/dashboard/components/McpUrlManager.tsx`
- `agentpay/packages/dashboard/lib/erc20.ts`

**File diubah:**
- `agentpay/packages/dashboard/lib/abi.ts` (ABI V2: createCard nonpayable, tambah idrxToken)
- `agentpay/packages/dashboard/lib/constants.ts` (tambah IDRX_TOKEN_ADDRESS)
- `agentpay/packages/dashboard/components/CreateCardForm.tsx` (flow approve IDRX + createCard nonpayable, label IDRX)
- `agentpay/packages/dashboard/components/CardList.tsx` (label IDRX, integrasi McpUrlManager)
- `agentpay/packages/dashboard/components/LoginButton.tsx` (copy address ✓ Copied!, saldo IDRX)
- `agentpay/packages/dashboard/components/NetworkWarning.tsx` (bypass wagmi ke Privy useWallets, hapus teks MetaMask)
- `agentpay/packages/dashboard/app/page.tsx` (hapus teks MetaMask)

**Untuk Backend/MCP Team:** tidak ada perubahan API yang diminta — endpoint `register-mcp`/`mcp-secret` sudah sesuai kontrak dan dipakai apa adanya.

## Issues yang perlu diketahui Orchestrator

1. **Fitur "Buat Card" sempat berpotensi rusak total** karena address kontrak berubah ke V2 (IDRX) tanpa ada task eksplisit untuk update dashboard — sudah diperbaiki di sesi ini atas konfirmasi user, tapi ini menunjukkan perlunya koordinasi lebih baik saat Contract Team mengubah address/ABI kontrak: idealnya disertai catatan breaking-change eksplisit ke Frontend Team, bukan hanya update `.env.local` diam-diam.
2. Semua item test checklist jobdesk (kecuali "hapus MetaMask") belum diverifikasi dengan browser asli — wajib dites manual sebelum demo.
