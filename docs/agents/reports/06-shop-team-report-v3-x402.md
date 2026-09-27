# Laporan Tim Shop — v3 (x402 + Produk Digital IDRX)

**Status:** SELESAI

---

## Yang sudah selesai

### Task 1 — Produk digital IDRX
- `packages/shop/src/products.ts` diganti total: 5 produk digital (`ai-premium`, `ebook-web3`, `newsletter-pro`, `kursus-blockchain`, `software-license`), field `priceWei` → `priceIdrx`, tambah `category` dan `deliverable`.

### Task 2 — x402 protocol di shop
- `packages/shop/src/index.ts`:
  - `/purchase` (existing) disesuaikan ke field `priceIdrx` (tidak breaking, hanya internal).
  - Endpoint baru `GET /x402/products/:id/content`: tanpa header `X-Payment` → `402` dengan payload `x402` (token IDRX, amount, recipient, instructions); dengan header valid (`0x` + 64 hex) → generate konten digital sesuai `deliverable` via `generateDigitalContent()`.
  - Logging `[SHOP] x402 content delivered: <id>, tx: <hash>` ditambahkan untuk demo.

### Task 3 — MCP: `paid_fetch` + refactor `callSpendTool`
- `packages/backend/src/mcp/tools.ts`: tambah tool `paid_fetch` (input: `url`, `chatId` opsional).
- `packages/backend/src/mcp/server.ts`:
  - Logic inti tool `spend` diekstrak ke `callSpendTool(cardId, productId, chatId?)` → `Promise<{ success, txHash?, message?, error? }>`.
  - `handleSpend` sekarang tipis, memanggil `callSpendTool` dan memformat ke `CallToolResult` MCP seperti sebelumnya (bentuk pesan JSON dipertahankan agar tidak breaking untuk bot/dashboard yang sudah parsing).
  - Handler baru `handlePaidFetch` mengikuti alur: fetch URL → jika bukan 402, return isi apa adanya → jika 402, parse `x402.productId` → panggil `callSpendTool` → fetch ulang dengan header `X-Payment: <txHash>` → return konten.
  - Ditambahkan `IDRX_DECIMALS = 2` dan helper `formatIdrx()` menggantikan `formatEther()` (18 desimal, salah untuk IDRX) di `handleGetCardInfo` dan `callSpendTool` — supaya card info & notifikasi Telegram approval menampilkan angka IDRX yang benar, bukan angka tBNB yang salah skala.

### Task 4 — DelegationCardV2
- `packages/backend/src/services/contract.ts`:
  - ABI path diarahkan ke `contracts/out/DelegationCardV2.sol/DelegationCardV2.json` (sebelumnya `DelegationCard.sol/DelegationCard.json` V1).
  - `callSpend()` sekarang juga mengembalikan `txHash` (dibutuhkan `paid_fetch` untuk header `X-Payment`), signature lain tidak berubah.
  - Tidak ada `parseEther()` yang perlu diubah di file ini — `amount` sudah selalu diteruskan sebagai `bigint` mentah dari caller (shop mengirim `priceIdrx` sebagai string desimal, langsung di-`BigInt()`-kan). Konversi unit lama (wei/ether) hanya terjadi di lapisan *display*, sudah ditangani di `server.ts` (lihat Task 3).

---

## Test wajib — hasil

1. `curl http://localhost:3002/products` → **5 produk digital dengan `priceIdrx`** ✅ (dijalankan, output terverifikasi)
2. `curl http://localhost:3002/x402/products/ai-premium/content` → **HTTP 402** dengan payload `x402` lengkap ✅
3. `curl .../ai-premium/content -H "X-Payment: 0x{64x'a'}"` → **200, konten `activation_code`** ✅
4. `tools/list` via MCP → **`paid_fetch` terdaftar** ✅ — diverifikasi langsung dari array `agentPayTools` yang dipakai handler `ListToolsRequestSchema` (isi: `get_card_info, get_products, spend, get_history, paid_fetch`). Endpoint HTTP penuh (`/mcp/:secret` → JSON-RPC `tools/list`) **tidak** dites end-to-end karena butuh card secret valid dari on-chain card yang sudah di-provision (di luar scope Shop Team); logic yang diuji identik dengan yang dipanggil endpoint tersebut.

---

## Yang belum / blocked

- Tidak ada blocker untuk scope yang diminta.
- `routes/spend.ts` (di luar scope task ini — tidak disebut di instruksi) masih memakai `formatEther()` untuk notifikasi approval Telegram pada endpoint `POST /api/spend` (dipakai bot/dashboard, bukan MCP). Setelah migrasi ke IDRX, angka yang ditampilkan di sana akan salah skala (18 desimal, seharusnya 2). Perlu tim Backend/Bot menyamakan dengan `formatIdrx()` yang sudah ditambahkan di `mcp/server.ts` jika endpoint itu juga dipakai untuk alur IDRX.

---

## Output untuk tim lain

**Endpoint shop baru:**
```
GET /x402/products/:id/content
  - tanpa X-Payment header → 402 + { error, x402: { version, scheme, network, token, amount, amountDisplay, recipient, productId, productName, description, instructions } }
  - dengan X-Payment: <0x + 64 hex> → 200 + { success, product, txHash, content }
```

**MCP tool baru:**
```
paid_fetch(url: string, chatId?: string)
  → auto: fetch → 402 → bayar via card → fetch ulang dengan X-Payment → return konten
```

**Product IDs baru (IDRX, decimals=2):**
```
ai-premium         → 500000    (5.000 IDRX)
ebook-web3         → 1500000   (15.000 IDRX)
newsletter-pro      → 2500000   (25.000 IDRX)
kursus-blockchain  → 15000000  (150.000 IDRX)
software-license   → 50000000  (500.000 IDRX)
```
Produk lama (`hoodie-basic`, `tshirt-premium`, `kopi-premium`, `laptop-gaming`, harga tBNB) **sudah tidak ada** — Backend/Bot/Frontend yang masih mereferensikan ID lama perlu update.

**Contract/ABI:**
```
DELEGATION_CARD_ADDRESS=0x9c8729f98bD42206D8a390360bd2326FFbf53837 (V2)
ABI: packages/contracts/out/DelegationCardV2.sol/DelegationCardV2.json
callSpend() sekarang return { autoApproved, pendingSpendId, txHash }
```

---

## Issues yang perlu diketahui Orchestrator

- File `.env` di root berisi private key & API key nyata (Alchemy, Telegram bot token) — dibaca ulang saat task ini, tidak dimodifikasi, tidak diekspos ke log/report ini.
- Backend & Shop dev server (`tsx watch`) sudah berjalan sebelum task ini dimulai (port 3001 & 3002) dan otomatis hot-reload dengan kode baru — semua test dijalankan terhadap proses yang sudah berjalan, bukan instance baru yang saya start.
- Typecheck backend (`tsc --noEmit`) menunjukkan beberapa error pre-existing di `node_modules/ox/**` (terkait tipe `window`/WebAuthn, kemungkinan `lib` tsconfig tidak include `dom`) — tidak berhubungan dengan perubahan ini, dibiarkan apa adanya sesuai scope.
