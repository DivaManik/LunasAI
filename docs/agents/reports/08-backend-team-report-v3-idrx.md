# Laporan Backend Team — V3: Migrasi ke DelegationCardV2 (ERC-20 IDRX) + Tool paid_fetch

**Tanggal:** 2026-09-27
**Status:** SELESAI
**Konteks:** Migrasi backend dari native BNB (V1) ke ERC-20 IDRX (V2), plus tool baru `paid_fetch` untuk protokol x402 (pay-per-request untuk konten digital).

---

## Temuan awal penting

**Semua 5 task di instruksi ini sudah terimplementasi penuh sebelum saya mulai** — file `contract.ts`, `mcp/server.ts`, dan `mcp/tools.ts` sudah dalam kondisi final sesuai spec (ABI path sudah ke `DelegationCardV2.sol`, `formatIdrx` helper sudah ada, `callSpendTool`/`handleSpend`/`handlePaidFetch` sudah direfactor persis sesuai desain 2-layer yang diminta, `callSpend` di `contract.ts` sudah return `txHash`). Kemungkinan dikerjakan di sesi/agent sebelumnya. Tugas saya jadi **verifikasi menyeluruh** bahwa implementasi yang ada benar-benar berfungsi end-to-end di chain nyata, bukan cuma review kode statis — dan saya temukan implementasi ini sudah benar, dengan sedikit peningkatan kualitas dibanding kode contoh di instruksi (misal `IDRX_DECIMALS` sebagai konstanta bernama, interface `SpendToolResult` yang lebih bersih daripada return type anonim di contoh).

## Verifikasi yang dilakukan sebelum test on-chain

Sebelum menjalankan test, saya baca source Solidity `DelegationCardV2.sol` (bukan cuma ABI) untuk memvalidasi satu asumsi kritis di instruksi: *"Tidak ada perubahan lain di contract.ts karena interface kontrak identik"*. Dikonfirmasi benar — kontrak V2 sendiri yang memanggil `IERC20.transferFrom`/`transfer` secara internal; **backend tidak perlu approve token apapun**, karena approval ERC-20 (`IDRX.approve(cardContract, budget)`) adalah tanggung jawab **user/card-owner** saat `createCard`, bukan backend/deployer wallet. `spend()`, `approveSpend()`, `rejectSpend()` semuanya dipanggil backend persis seperti V1.

## Task 1 — ABI DelegationCardV2 (sudah diterapkan)

`contract.ts` baris 25-28 sudah membaca dari `contracts/out/DelegationCardV2.sol/DelegationCardV2.json`. Tidak ada perubahan lain di file ini di luar itu (dan penambahan `txHash` ke return `callSpend`, Task 5).

## Task 2 — Format IDRX menggantikan tBNB (sudah diterapkan)

- `ShopProduct` interface di `mcp/server.ts` sudah pakai `priceIdrx` (bukan `priceWei`).
- Helper `formatIdrx(amount: bigint)` sudah ada, dengan `IDRX_DECIMALS = 2` sebagai konstanta bernama (bukan angka ajaib) — `Number(amount) / 10**2`, lalu `.toLocaleString("id-ID")`.
- `handleGetCardInfo` sudah pakai `formatIdrx(...)` untuk semua field budget (`totalBudget`, `spentAmount`, `remainingBudget`, `autoApproveLimit`).
- `handleSpend`/`callSpendTool` sudah pakai `BigInt(product.priceIdrx)`, dan pesan sukses pakai `product.priceDisplay` (bukan `formatEther`).
- `import { formatEther } from "viem"` sudah dihapus dari `mcp/server.ts` — dikonfirmasi lewat `grep`, tidak ada sisa pemakaian.

## Task 3 — Tool `paid_fetch` (sudah diterapkan)

`mcp/tools.ts` sudah punya entry `paid_fetch` sebagai tool ke-5, dengan `inputSchema` persis sesuai spec (`url` required, `chatId` opsional).

## Task 4 — Refactor `handleSpend` + `handlePaidFetch` (sudah diterapkan)

- `callSpendTool(cardId, productId, chatId?)` — fungsi internal yang dipakai bersama oleh `handleSpend` dan `handlePaidFetch`, return `SpendToolResult { success, txHash?, message?, error? }`.
- `handleSpend` sekarang tipis, cuma validasi `productId` lalu delegasi ke `callSpendTool`.
- `handlePaidFetch` mengimplementasikan flow x402 4-langkah persis sesuai spec: fetch tanpa payment → kalau bukan 402, return body langsung; kalau 402, parse `paymentInfo.x402.productId` → bayar via `callSpendTool` → fetch ulang dengan header `X-Payment: <txHash>` → return konten.
- Terdaftar di switch-case `CallToolRequestSchema` sebagai `case "paid_fetch"`.

## Task 5 — `callSpend` return `txHash` (sudah diterapkan)

`contract.ts` `callSpend` sekarang return `{ autoApproved, pendingSpendId, txHash }`. `callSpendTool` di `server.ts` pakai `result.txHash` asli (bukan placeholder `"0x" + "0".repeat(64)` seperti disebut sebagai contoh sementara di instruksi).

## Verifikasi tambahan: `db.ts` — TIDAK diubah

Saya perhatikan komentar `amount: string; // wei as string` di `SpendRecord` interface (`db.ts`) sekarang sedikit usang (bukan lagi wei, tapi unit IDRX 2-desimal). Ini murni kosmetik (tidak mempengaruhi logic), dan `db.ts` **tidak termasuk** daftar file yang boleh diubah di instruksi task ini — jadi saya sengaja tidak menyentuhnya. Dicatat di sini untuk transparansi, bukan tindakan yang diambil.

---

## Test wajib — SEMUA PASS

```
1. Restart backend (tsx src/index.ts)              → server start bersih, tidak ada error
2. GET /health                                       → 200 {"status":"ok"}
3. MCP get_card_info                                 → budget tampil "100.000 IDRX", bukan tBNB
4. MCP get_products                                  → 5 produk digital, semua dengan priceIdrx +
                                                        priceDisplay format IDRX (Shop Team sudah selesai)
5. MCP tools/list                                    → 5 tools termasuk paid_fetch
6. npx tsc --noEmit                                  → 0 error di src/ (noise viem/ox internal diabaikan,
                                                        sudah dikonfirmasi bukan dari kode kita)
```

### Detail test 3 (get_card_info)
```json
{
  "cardId": "1", "owner": "0xBa4918Ff...",
  "totalBudget": "100.000 IDRX", "spentAmount": "0 IDRX",
  "remainingBudget": "100.000 IDRX", "autoApproveLimit": "10.000 IDRX",
  "expiryTimestamp": "2026-10-27T10:54:30.000Z", "isActive": true, "isExpired": false
}
```

### Detail test 4 (get_products) — 5 produk, semua field IDRX benar
`ai-premium` (5.000), `ebook-web3` (15.000), `newsletter-pro` (25.000), `kursus-blockchain` (150.000), `software-license` (500.000) — semua `priceIdrx` (unit 2-desimal) dan `priceDisplay` konsisten.

## Test tambahan (di luar 6 langkah wajib, untuk verifikasi fungsional nyata)

Card di kontrak V2 baru-baru saja dideploy, jadi belum ada card apapun untuk test transaksi nyata. Saya buat card test on-chain (`createCard` dengan budget 100.000 IDRX, auto-approve limit 10.000 IDRX) via script sekali-pakai (dihapus setelah test) — proses ini juga mengonfirmasi ulang bahwa flow `IDRX.approve()` → `createCard()` → `IDRX.transferFrom` bekerja sesuai desain kontrak.

```
tools/call spend (ai-premium, 5.000 IDRX, di bawah limit)
→ {"autoApproved":true,"txHash":"0xaed1a7...","message":"Berhasil membeli \"Akses AI Premium\" seharga 5.000 IDRX."}
→ Verifikasi on-chain: spentAmount naik tepat dari 0 ke 500000 (5.000 IDRX)   ✅ TRANSAKSI ERC-20 NYATA

tools/call paid_fetch (url ke /x402/products/ebook-web3/content, 15.000 IDRX, DI ATAS limit)
→ "Pembayaran gagal: ... melebihi auto-approve limit. Menunggu approval ... (pendingSpendId: 1)."
→ Flow x402 sampai step bayar, berhenti dengan benar saat pending — tidak crash, pesan jelas   ✅

tools/call paid_fetch (url ke /x402/products/ai-premium/content, 5.000 IDRX, di bawah limit)
→ "✅ Pembayaran berhasil! Konten:\n\n{...\"content\":{\"type\":\"activation_code\",
   \"code\":\"AGENTPAY-AI-B2DC3555\",...}}"
→ FLOW X402 4-LANGKAH LENGKAP TERVERIFIKASI: fetch → 402 → bayar (txHash on-chain nyata) →
  fetch ulang dengan X-Payment header → konten digital asli dikembalikan shop   ✅✅✅

Verifikasi final: spentAmount card = 1000000 (10.000 IDRX = 2x pembelian ai-premium),
history mencatat 3 record (2 auto_approved, 1 pending) dengan benar.
GET /health di setiap langkah → selalu 200, server tidak pernah crash.
```

Test `paid_fetch` ini adalah bukti paling kuat bahwa implementasi Task 3+4 bekerja end-to-end nyata — bukan cuma lolos test format string, tapi benar-benar mengeksekusi pembayaran ERC-20 on-chain dan menerima konten digital asli dari shop lewat protokol x402.

## Issues untuk Orchestrator

Tidak ada blocking issue. Migrasi V1→V2 dan tool `paid_fetch` sudah berfungsi penuh dan terverifikasi dengan transaksi on-chain nyata (bukan simulasi). Satu catatan minor: komentar usang di `db.ts` (`// wei as string`) — tidak diubah karena di luar scope file yang diizinkan task ini, tapi bisa dibersihkan di iterasi berikutnya kalau ada task yang menyentuh `db.ts`.

---

**File yang diverifikasi sudah sesuai spec (tidak perlu diubah lagi):** `src/services/contract.ts`, `src/mcp/server.ts`, `src/mcp/tools.ts`
**File yang TIDAK diubah** (sesuai batasan, dan memang tidak perlu): `src/db.ts`, `src/index.ts`, `src/routes/*`
