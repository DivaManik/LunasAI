# Laporan Tim Backend

**Tanggal:** 2026-09-24
**Status:** SELESAI

---

## Yang sudah selesai

- Semua file backend sesuai scope jobdesk (`packages/backend/`):
  - `package.json`, `tsconfig.json`
  - `src/index.ts` — entry point Hono, port 3001, CORS aktif untuk semua origin
  - `src/db.ts` — in-memory store (`Map`) untuk spend history, mapping Telegram, pending spend
  - `src/routes/cards.ts`, `src/routes/spend.ts`, `src/routes/history.ts`
  - `src/services/contract.ts` — integrasi viem ke BNB Testnet
  - `src/services/telegram.ts` — notifikasi via Telegram Bot API (raw fetch, bukan SDK)
- Semua 7 endpoint sesuai API spec, sudah dites manual dengan `curl` langsung ke kontrak live di BNB Testnet:
  ```
  GET  /health
  POST /api/connect-telegram
  GET  /api/cards/:id
  POST /api/spend
  POST /api/spend/approve/:spendId
  POST /api/spend/reject/:spendId
  GET  /api/history/:cardId
  ```
- Error handling: setiap route menangkap error kontrak dan mengembalikan pesan revert yang bersih (contoh: `{"error":"Not card owner"}`), bukan raw error viem yang panjang. Server tidak pernah crash di skenario error manapun yang dites (card tidak ada, field kurang, revert kontrak).
- ABI dibaca langsung dari file compile Foundry (`packages/contracts/out/DelegationCard.sol/DelegationCard.json`), bukan hand-written, supaya selalu sinkron dengan kontrak yang benar-benar dideploy.

## Yang belum / blocked

- Belum bisa tes flow end-to-end penuh (`createCard → spend → approveSpend`) karena belum ada card yang dibuat di chain — pembuatan card itu scope Dashboard/Frontend Team. Path read (`getCard`/`cards`) dan write (`spend`/`approveSpend`/`rejectSpend`) sendiri sudah terverifikasi jalan ke RPC dan bisa decode revert reason dengan benar.
- `TELEGRAM_BOT_TOKEN` masih kosong di `.env` (menunggu Bot Team bikin bot via BotFather). Backend sudah handle ini secara graceful (log warning, tidak crash) supaya tidak memblokir development tim lain.

## Output untuk tim lain

**ENV vars yang perlu di-update** (sudah ditambahkan ke `agentpay/.env`, bukan `E:\Hackaton\BNB\.env` root — lihat isu di bawah):
```
SHOP_WALLET_ADDRESS=0xBa4918Ff177C289F01fd362bc8a55B3e0469149f
SHOP_URL=http://localhost:3002
BACKEND_URL=http://localhost:3001
TELEGRAM_BOT_TOKEN=        <- Bot Team isi setelah bikin bot
```

**File penting yang dihasilkan:**
- `agentpay/packages/backend/` (seluruh package)
- `agentpay/packages/backend/PROGRESS.md` — detail teknis, koreksi terhadap jobdesk doc, dan hasil test manual

**Untuk Bot Team:**
```
BACKEND_URL=http://localhost:3001
API_ENDPOINTS:
  POST /api/spend            { cardId, merchantAddress, amount, description, productName }
  POST /api/spend/approve/:spendId
  POST /api/spend/reject/:spendId
  GET  /api/cards/:id
  POST /api/connect-telegram { walletAddress, telegramChatId }
```
Callback data format untuk tombol approve/reject di notifikasi Telegram: `approve_[spendId]` / `reject_[spendId]`.

**Untuk Shop Team:**
Saat checkout, `merchantAddress` yang dikirim ke `POST /api/spend` harus `SHOP_WALLET_ADDRESS` (`0xBa4918Ff177C289F01fd362bc8a55B3e0469149f`), dan `productName`/`description` dari produk yang dipilih (product id yang benar tetap `kopi-premium`, bukan `coffee-premium`, sesuai jobdesk).

---

## Issues yang perlu diketahui Orchestrator

### 1. Jobdesk doc `docs/agents/02-backend-team.md` tidak akurat soal lokasi `.env`

Jobdesk instruksikan baca env dari `E:\Hackaton\BNB\.env` (root repo). Ternyata file itu peninggalan lama punya Shop Team (isi cuma `SHOP_WALLET_ADDRESS` + `SHOP_PORT`, dan value wallet-nya beda dari yang tercantum di jobdesk). File env yang sebenarnya dipakai Contract Team dan Shop Team adalah **`agentpay/.env`** (dikonfirmasi dari `packages/contracts/PROGRESS.md`). Backend sudah disesuaikan pakai `agentpay/.env`. **Rekomendasi:** update jobdesk doc supaya tim berikutnya (Bot, Frontend) tidak salah baca env dari lokasi yang salah juga.

### 2. Bug desain: `approveSpend`/`rejectSpend` akan selalu gagal kecuali card dibuat oleh deployer wallet

Smart contract mensyaratkan `require(card.owner == msg.sender)` di `approveSpend` dan `rejectSpend`. Backend selalu sign transaksi ini pakai **deployer wallet** (`PRIVATE_KEY`), sesuai instruksi eksplisit jobdesk ("Backend menggunakan deployer wallet... untuk approveSpend, rejectSpend"). Tapi ini berarti: **kalau user membuat card lewat Dashboard pakai wallet mereka sendiri (bukan deployer wallet), maka approve/reject on-chain akan selalu revert dengan "Not card owner".**

Ini **blocking issue potensial untuk demo end-to-end**. Perlu keputusan Orchestrator/user:
- **Opsi A (cepat, tidak ubah kontrak):** demo pakai card yang dibuat oleh deployer wallet sendiri (bukan wallet user asli). Cocok untuk MVP hackathon, tapi tidak merepresentasikan real user flow.
- **Opsi B (ubah kontrak):** tambah mekanisme delegate/agent authorization di `DelegationCard.sol` supaya card owner bisa authorize deployer wallet sebagai agent yang boleh approve/reject atas nama mereka. Ini di luar scope Backend Team — perlu Contract Team.

Saya tidak mengubah kontrak karena di luar scope saya. Perlu diputuskan sebelum Task 6 (Dashboard) dan Task 7 (Audit) jalan supaya flow demo tidak stuck di approval.

### 3. Minor: ABI `getCard()` return unnamed tuple

Fungsi `getCard(cardId)` di ABI hasil compile Foundry return `tuple` tanpa nama field, jadi tidak bisa didecode by-name lewat viem dengan aman. Solusi yang dipakai backend: baca lewat getter mapping publik `cards(cardId)` yang field-nya bernama (data sama persis, cuma beda cara akses). Tidak perlu aksi dari tim lain — sudah diselesaikan di sisi backend.

---

**Referensi teknis lengkap:** `agentpay/packages/backend/PROGRESS.md`
