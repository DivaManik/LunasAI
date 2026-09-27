# Backend Team — Progress Notes

**Update:** 2026-09-27 (V3: migrasi DelegationCardV2 / ERC-20 IDRX + tool paid_fetch)
**Scope:** `packages/backend/src/` — V1 scope per `docs/agents/02-backend-team.md`, V2 scope per `docs/agents/07-mcp-team.md`

## V3 — Migrasi ke DelegationCardV2 (ERC-20 IDRX) + tool `paid_fetch` (2026-09-27)

Backend sekarang pakai ABI `DelegationCardV2` (native BNB → ERC-20 IDRX, decimals=2). `contract.ts`: cuma ganti path ABI + `callSpend` sekarang return `txHash`. `mcp/server.ts`: semua format `tBNB` diganti `formatIdrx()` (helper baru, `toLocaleString("id-ID")`), `ShopProduct.priceIdrx` menggantikan `priceWei`. Tool baru **`paid_fetch`** (protokol x402): fetch URL → kalau 402, bayar via card → fetch ulang dengan `X-Payment: <txHash>` → return konten digital. Refactor `callSpendTool()` jadi logic inti bersama untuk `spend` dan `paid_fetch`.

**Verifikasi:** semua kode sudah diimplementasikan sebelum saya mulai kerja (kemungkinan sesi sebelumnya) — saya audit dan verifikasi lewat test on-chain nyata: buat card baru di kontrak V2 (`createCard` dengan IDRX approve dulu), `spend` produk murah → transaksi ERC-20 nyata berhasil (`spentAmount` naik sesuai), `paid_fetch` flow x402 4-langkah lengkap berhasil sampai menerima konten digital asli dari shop (`activation_code`). Detail lengkap: `docs/agents/reports/08-backend-team-report-v3-idrx.md`.

---

## Defense-in-depth untuk `/mcp/:secret` (2026-09-26)

4 fitur keamanan tambahan di atas mekanisme auth yang sudah ada:
1. **Revoke/regenerate secret** — `DELETE /api/cards/:cardId/mcp-secret` (baru), dan `register-mcp` sekarang auto-invalidasi secret lama sebelum bikin yang baru (max 1 secret aktif per card).
2. **Rate limiting** — `src/middleware/rateLimit.ts` (baru, in-memory Map, tanpa dependency eksternal): 30 percobaan gagal/menit per IP (→429), 240 request/menit per cardId (→429).
3. **Body size cap** — request >1MB ke `/mcp/:secret` → 413.
4. **Host validation** — `src/middleware/hostValidation.ts` (baru): tolak request dengan `Host` header yang bukan domain `MCP_BASE_URL` atau localhost → 421 (proteksi DNS rebinding).

Semua diintegrasikan di `routes/mcp.ts` saja — route lain (`/api/auth`, `/api/spend`, `/api/history`, `/oauth`) tidak disentuh, dikonfirmasi lewat test regresi. Detail lengkap + hasil test semua skenario: `docs/agents/reports/02-backend-team-report-mcp-security.md`.

---

## HOTFIX — Isolasi per-card di tool handlers (2026-09-25, revisi keempat)

Menutup celah dari revisi sebelumnya: `src/mcp/server.ts` sekarang cardId SELALU dari resolusi secret/token di `routes/mcp.ts`, tidak pernah dari `args.cardId` (pola `args.cardId ?? cardId` dihapus total di ketiga tool handler). `src/mcp/tools.ts` juga dibersihkan — field `cardId` dihapus dari inputSchema karena AI agent tidak perlu (dan tidak boleh) mengirimnya lagi.

**Dibuktikan dengan transaksi on-chain nyata, bukan cuma klaim:** spend via secret card 2 dengan argumen `cardId: "1"` (override) tetap TEREKSEKUSI terhadap card 2 — dikonfirmasi lewat `spentAmount` card 1 tidak berubah sama sekali, `spentAmount` card 2 naik tepat sesuai harga produk, dan history baru muncul di card 2 bukan card 1. Detail lengkap + semua skenario test: `docs/agents/reports/02-backend-team-report-hotfix-mcp-isolation.md`.

Dengan ini, rangkaian hotfix MCP auth (Bearer token → 2-lane → per-card secret → isolasi tool handler) selesai — MCP endpoint terlindungi penuh di dua lapis: otorisasi akses (routes/mcp.ts) dan isolasi data per-card (mcp/server.ts).

**⚠️ Catatan keamanan penting:** `OAUTH_SECRET` adalah shared secret yang SAMA untuk semua card, bukan per-card. Kalau satu URL Lane A bocor (screenshot, log, dll), SEMUA card jadi bisa diakses siapapun, bukan cuma yang URL-nya bocor — karena secretnya tidak terikat ke satu cardId tertentu. Ini trade-off sadar untuk kesederhanaan demo (sesuai instruksi eksplisit), bukan bug — tapi perlu diwaspadai kalau demo direkam/dipublikasikan. Detail lengkap di laporan.

---

## V2 — MCP Server + OAuth 2.1 (2026-09-25)

Tambah `src/mcp/tools.ts`, `src/mcp/server.ts`, `src/routes/mcp.ts` (endpoint `/mcp/:cardId`), `src/routes/oauth.ts` (4 endpoint OAuth), plus `oauthSessions`/`oauthTokens` di `db.ts`. Semua fungsi V1 yang sudah ada (`getCardFromChain`, `callSpend`, dll) dipakai ulang, tidak ada logic duplikat.

**Koreksi teknis penting terhadap kode contoh jobdesk** (detail lengkap: `docs/agents/reports/02-backend-team-report-v2-mcp.md`):
1. Transport yang benar untuk Hono adalah `WebStandardStreamableHTTPServerTransport` (Web Standard Request/Response), bukan `StreamableHTTPServerTransport` (Node req/res) yang dicontohkan jobdesk.
2. `sessionIdGenerator` harus DIHILANGKAN (stateless mode) — kalau diisi seperti instruksi jobdesk, `tools/list` gagal "Server not initialized" karena Server/Transport instance dibuat baru tiap HTTP request, tidak persisten antar request seperti yang diasumsikan stateful session.
3. Register route oauth cukup SATU `app.route("/", oauth)`, bukan tiga seperti instruksi jobdesk — karena full path (`/oauth/authorize`, dst) sudah didefinisikan di dalam file route-nya sendiri, mount ganda akan bikin path dobel-prefix salah.
4. Import lokal TIDAK pakai ekstensi `.js` (jobdesk salah bilang backend ini ESM — sebenarnya CommonJS). Import dari `@modelcontextprotocol/sdk` tetap pakai `.js` karena wajib sesuai exports map package tersebut.

**Test:** MCP tools dites via curl JSON-RPC + `@modelcontextprotocol/inspector@latest --cli` — 4 tools semua bekerja, termasuk `spend` dengan transaksi on-chain nyata (auto-approve dan pending). OAuth flow lengkap dites via curl — `authorize → consent → token` end-to-end berhasil, termasuk deny flow dan error handling.

**⚠️ ISU KRITIS:** endpoint `/mcp/:cardId` TIDAK memvalidasi Bearer token OAuth — siapapun yang tahu `cardId` bisa akses semua tools termasuk `spend` tanpa OAuth. OAuth endpoints berfungsi penuh tapi token yang dihasilkan tidak pernah dicek di MCP endpoint. Perlu keputusan Orchestrator sebelum dipakai di demo nyata dengan Claude Web. Detail: laporan V2 MCP.

---

## BUG-001 FIX 2026-09-25 — ownership validation di `approve`/`reject` spend

**Masalah:** `POST /api/spend/approve/:spendId` dan `POST /api/spend/reject/:spendId` tidak validasi siapa pemanggil — siapapun yang tahu `spendId` bisa approve/reject pending spend milik card orang lain.

**Fix (di `src/routes/spend.ts` saja):** tambah helper `authorizeSpendAction(spendId, chatId)`, dipanggil sebelum eksekusi kontrak di kedua endpoint. Alurnya sama seperti fix `/api/spend` sebelumnya: `chatId` wajib di body → reverse-lookup wallet dari `telegramMappings` → bandingkan dengan `card.owner` (didapat dari `pendingSpendMap` → `getCardFromChain`) → kalau tidak cocok, `403`. `spendId` yang tidak dikenal di `pendingSpendMap` juga ditolak (`404`), tidak diloloskan begitu saja. Detail lengkap + hasil test end-to-end (attacker diblokir, owner asli tetap bisa approve dengan eksekusi on-chain nyata): `docs/agents/reports/02-backend-team-report-bug001.md`.

**Breaking change untuk Bot Team:** `POST /api/spend/approve/:spendId` dan `.../reject/:spendId` sekarang wajib sertakan `chatId` di body juga (pola sama seperti `/api/spend`).

---

## SECURITY HOTFIX 2026-09-25 — cleanup endpoint lama `connect-telegram`

Endpoint lama `POST /api/connect-telegram` (tanpa signature, celah bypass yang di-flag di hotfix signature sebelumnya) **sudah dihapus** dari `src/index.ts`. Sekarang satu-satunya jalur connect wallet adalah lewat `/api/auth/nonce` + `/api/auth/verify`. Detail: `docs/agents/reports/02-backend-team-report-cleanup.md`.

---

## SECURITY HOTFIX 2026-09-25 — signature verification untuk `/connect`

**Masalah:** `/connect <walletAddress>` di bot cuma validasi format, tidak membuktikan user benar-benar pemilik wallet — siapapun bisa connect pakai address orang lain dan mengambil alih notifikasi approval.

**Fix:** tambah `POST /api/auth/nonce` dan `POST /api/auth/verify` (file baru `src/routes/auth.ts`) — challenge-response pakai `viem.verifyMessage()` untuk membuktikan kepemilikan wallet via signature ECDSA sebelum `connectTelegram()` dipanggil. Detail lengkap dan hasil test (termasuk simulasi serangan pakai wallet asli via `viem/accounts`): `docs/agents/reports/02-backend-team-report-signature.md`.

---

## Status: SELESAI. Semua endpoint implemented dan tested manual dengan curl terhadap BNB Testnet live.

## SECURITY HOTFIX 2026-09-25 — validasi ownership di `POST /api/spend`

**Masalah:** siapapun yang tahu `cardId` bisa pakai card orang lain untuk belanja dalam batas auto-approve, karena backend tidak validasi ownership sebelum `callSpend()`.

**Fix (di `src/routes/spend.ts` saja):** request `POST /api/spend` sekarang wajib sertakan field `chatId`. Backend reverse-lookup `chatId → walletAddress` dari `telegramMappings` (Map yang sudah ada di `db.ts`, tidak diubah), lalu bandingkan dengan `card.owner`. Kalau tidak cocok → `403 {"error":"Card bukan milik kamu"}`. Detail lengkap dan hasil test: `docs/agents/reports/02-backend-team-report-security.md`.

**Breaking change untuk Bot Team:** `POST /api/spend` sekarang butuh field `chatId` tambahan di request body, kalau tidak ada request akan gagal `400`.

**Verifikasi:** sudah dites end-to-end nyata di chain — attacker wallet diblokir `403`, owner asli tetap bisa spend normal (`autoApproved:true`, `spentAmount` di kontrak naik, history tercatat benar).

---

## HOTFIX 2026-09-25 — sync ABI setelah Contract Team tambah `authorizedAgent`

Contract Team redeploy kontrak dengan address baru (`0xACDAc5d57dB7a97013D002a8d073578347C057AE`) untuk fix bug "approveSpend selalu revert kecuali card dibuat deployer wallet" yang saya flag di laporan sebelumnya (`docs/agents/reports/02-backend-team-report.md`, Issue #2). Detail fix: `packages/contracts/PROGRESS.md` bagian HOTFIX.

**Perubahan di sisi kontrak:**
- Struct `Card` tambah field `authorizedAgent` (address), posisinya di antara `owner` dan `totalBudget`.
- `createCard` sekarang 4 parameter (`budget, autoApproveLimit, expiryDays, authorizedAgent`) — tidak mempengaruhi backend karena backend tidak pernah memanggil `createCard` (itu tanggung jawab Frontend/Dashboard).
- `approveSpend`/`rejectSpend` sekarang bisa dipanggil `card.owner` ATAU `card.authorizedAgent` — pesan revert berubah dari `"Not card owner"` jadi `"Not authorized"`.

**Perubahan yang saya lakukan di backend:**
- `DELEGATION_CARD_ADDRESS` di `agentpay/.env` sudah otomatis terupdate ke address baru (dilakukan Contract Team saat redeploy).
- `src/services/contract.ts`: update tipe `OnChainCard` dan decode tuple dari getter `cards(cardId)` — sekarang 7 elemen (tadinya 6), karena ada field `authorizedAgent` baru di posisi index 1. **Ini wajib diubah manual** karena backend baca lewat mapping getter `cards()`, bukan `getCard()` (lihat koreksi #2 di bawah) — kalau tidak diupdate, semua field setelah `owner` akan salah geser dan data yang dikirim ke Telegram/response API jadi korup secara diam-diam (tidak error, tapi angka salah).
- `callSpend`/`callApproveSpend`/`callRejectSpend` **tidak perlu diubah** — signature fungsinya sama, dan ABI dibaca langsung dari file JSON hasil compile jadi otomatis sinkron.

**Hasil test ulang setelah hotfix:**
```
GET  /api/cards/1   (belum ada card)     → 404 {"error":"Card not found"}   (decode tuple 7-elemen sukses, tidak crash)
GET  /api/cards/999                       → 404 {"error":"Card not found"}
POST /api/spend (card 999, tidak ada)     → 404 {"error":"Card not found"}
POST /api/spend/approve/999               → 400 {"error":"Not authorized"}  (dulu "Not card owner" — konfirmasi pesan revert baru dari kontrak diteruskan dengan benar)
POST /api/spend/reject/999                → 400 {"error":"Not authorized"}
```
Server tetap hidup di semua skenario. Belum ada card live di kontrak baru untuk tes flow approve yang benar-benar sukses (`autoApproved: false` → approve → transfer) — itu butuh card dibuat dulu via `createCard`, di luar scope backend, dan `cast` CLI tidak tersedia di environment ini untuk bikin card manual.

**Known limitation lama (Issue #2 di laporan sebelumnya) — SUDAH RESOLVED oleh hotfix ini.** Backend sekarang bisa approve/reject pakai deployer wallet tanpa perlu card dibuat oleh deployer wallet itu sendiri, selama Frontend mengirim `authorizedAgent = 0xBa4918Ff177C289F01fd362bc8a55B3e0469149f` (deployer address) saat `createCard`. Tidak perlu perubahan logic apapun di backend untuk ini (sesuai catatan jobdesk terbaru).

---

## Hasil

```
BACKEND_URL=http://localhost:3001
ENDPOINTS_READY:
  GET  /health
  POST /api/connect-telegram
  GET  /api/cards/:id
  POST /api/spend
  POST /api/spend/approve/:spendId
  POST /api/spend/reject/:spendId
  GET  /api/history/:cardId
```

Semua endpoint sudah dites manual dengan curl (lihat riwayat test di bawah), termasuk error path (card not found, missing fields, contract revert) — server tidak crash di skenario manapun.

## Koreksi penting terhadap jobdesk doc (`docs/agents/02-backend-team.md`)

1. **Lokasi `.env` yang benar bukan `E:\Hackaton\BNB\.env`.** Jobdesk bilang baca dari root repo `.env`, tapi itu file punya Shop Team lama (cuma isi `SHOP_WALLET_ADDRESS` + `SHOP_PORT`, dan wallet address-nya beda dari yang tercantum di jobdesk). File env yang sebenarnya dipakai Contract Team dan Shop Team adalah **`agentpay/.env`** (lihat `packages/contracts/PROGRESS.md` baris ~109). Backend juga pakai `agentpay/.env` — sudah ditambahkan var yang belum ada (`SHOP_WALLET_ADDRESS`, `SHOP_URL`, `BACKEND_URL`, `TELEGRAM_BOT_TOKEN` kosong menunggu Bot Team).

2. **`getCard(cardId)` di ABI hasil compile Foundry return unnamed tuple** — viem tidak bisa decode by field name dengan aman. Backend pakai public mapping getter `cards(cardId)` sebagai gantinya (return value sama persis, tapi ABI-nya named fields).

3. **ABI dibaca langsung dari file JSON Foundry** (`packages/contracts/out/DelegationCard.sol/DelegationCard.json`, field `.abi`) sesuai instruksi jobdesk — bukan hand-written `parseAbi()` string seperti contoh di plan doc, supaya selalu sinkron dengan kontrak yang benar-benar dideploy.

4. **dotenv.config() harus dipanggil di dalam `services/contract.ts` dan `services/telegram.ts` sendiri-sendiri**, bukan cuma sekali di `index.ts`. `tsx` mentranspile `import` sebagai ESM (hoisted), jadi `dotenv.config()` di `index.ts` baru jalan SETELAH semua module lain (termasuk `contract.ts`) sudah load dan baca `process.env` — bikin `DELEGATION_CARD_ADDRESS is not set` error meski `.env` sudah benar. Fix: load dotenv di setiap service file yang butuh env var saat module-load time.

## Known limitation (bukan bug, konsekuensi desain MVP)

`approveSpend` dan `rejectSpend` di smart contract punya `require(card.owner == msg.sender)`. Backend selalu sign transaksi ini pakai **deployer wallet** (`PRIVATE_KEY` di `.env`), bukan wallet asli pemilik card. Artinya on-chain call ini **akan selalu revert dengan "Not card owner" kecuali card dibuat oleh deployer wallet sendiri**.

Ini sesuai instruksi eksplisit di jobdesk ("Backend menggunakan deployer wallet... untuk approveSpend, rejectSpend"), jadi diikuti as-is. Tapi ini blocker potensial untuk demo end-to-end kalau card dibuat lewat Dashboard pakai wallet user yang berbeda dari deployer. **Orchestrator/Audit Team perlu tahu ini** — kemungkinan solusi: (a) demo pakai card yang dibuat oleh deployer wallet, atau (b) kontrak perlu diubah supaya card owner authorize deployer wallet sebagai delegate (di luar scope Backend Team untuk fix, itu perubahan Solidity).

## Test manual yang sudah dijalankan (pre-hotfix, kontrak address lama — histori)

```
GET  /health                          → 200 {"status":"ok"}
POST /api/connect-telegram (ok)       → 200 {"success":true}
POST /api/connect-telegram (missing)  → 400 {"error":"Missing walletAddress or telegramChatId"}
GET  /api/cards/999 (not exist)       → 404 {"error":"Card not found"}
POST /api/spend (missing fields)      → 400 {"error":"Missing required fields..."}
POST /api/spend (card not found)      → 404 {"error":"Card not found"}
POST /api/spend/approve/999 (invalid) → 400 {"error":"Not card owner"}  (clean revert reason dari kontrak, address lama)
POST /api/spend/reject/999 (invalid)  → 400 {"error":"Not card owner"}
GET  /api/history/42 (empty)          → 200 []
```

**Catatan:** pesan error `"Not card owner"` di atas sudah tidak berlaku lagi setelah hotfix 2026-09-25 — sekarang jadi `"Not authorized"` (lihat bagian HOTFIX di atas untuk hasil test terbaru).

Belum sempat tes flow lengkap `createCard → spend → approve` end-to-end karena belum ada card yang dibuat di chain (itu scope Dashboard/Frontend Team, dan/atau bisa dites manual via `cast send` dari Contract Team). Contract read (`getCard`/`cards`) dan write path (`spend`/`approveSpend`/`rejectSpend`) sudah terverifikasi jalan — RPC Alchemy connect dan simulate/revert-decode bekerja dengan benar (dibuktikan lewat error "Not card owner" yang datang asli dari kontrak, bukan network error).

## Next steps untuk tim lain

1. **Bot Team:** isi `TELEGRAM_BOT_TOKEN` di `agentpay/.env` setelah bikin bot via BotFather. Backend sudah handle token kosong dengan graceful skip (warning log, tidak crash) supaya development lain tidak terblokir.
2. **Frontend/Dashboard Team:** setelah user create card via `createCard()` on-chain, panggil `POST /api/connect-telegram` supaya notifikasi approval bisa jalan.
3. **Audit Team:** perhatikan known limitation `approveSpend`/`rejectSpend` di atas — perlu strategi demo yang tidak stuck di step approval on-chain.
4. **Shop Team:** endpoint `POST /api/spend` sudah terima `merchantAddress` dan `productName` sesuai kontrak API — pastikan Bot Team kirim `SHOP_WALLET_ADDRESS` sebagai `merchantAddress` saat checkout.

## Yang TIDAK boleh disentuh (di luar scope)

- Tidak mengubah `packages/contracts/` atau `packages/shop/`.
- Tidak menambah database eksternal — tetap in-memory `Map`.
- Tidak menambah auth/JWT.
