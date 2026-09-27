# Laporan Backend Team — Hotfix: Isolasi Per-Card di MCP Tool Handlers

**Tanggal:** 2026-09-25
**Status:** SELESAI — celah keamanan yang di-flag di laporan sebelumnya sekarang TERTUTUP
**Konteks:** Menutup temuan kritis dari `docs/agents/reports/02-backend-team-report-hotfix-mcp-auth.md` — `args.cardId` di tool handler bisa menimpa cardId hasil resolusi dari secret/token, sehingga secret satu card bisa dipakai akses/spend card lain.

---

## Masalah

Di `src/mcp/server.ts`, setiap tool handler dipanggil dengan pola `args.cardId ?? cardId` — cardId dari `arguments` yang dikirim caller (AI agent/MCP client) bisa menimpa cardId yang sudah benar diresolve dari secret URL di `routes/mcp.ts`. Ini meniadakan isolasi per-card: secret milik card 1 bisa dipakai untuk baca ATAU spend card 2, cukup sertakan `cardId: "2"` di argumen tool call.

## Fix

File yang diubah: **`src/mcp/server.ts`** dan **`src/mcp/tools.ts`** (sesuai batasan — tidak ada file lain disentuh).

### `src/mcp/server.ts`
- Semua `args.cardId ?? cardId` diganti jadi `cardId` saja, di ketiga tool handler (`get_card_info`, `spend`, `get_history`). `get_products` tidak terpengaruh (tidak pernah pakai cardId).
- Signature `handleGetCardInfo`, `handleGetHistory` disederhanakan dari `(cardId: unknown)` jadi `(cardId: string)` — parameter ini sekarang SELALU dipercaya berasal dari resolusi secret/token di `routes/mcp.ts`, tidak pernah dari input caller yang tidak terverifikasi. Validasi `!cardId || typeof cardId !== "string"` yang sebelumnya perlu (karena cardId bisa datang dari `args` yang tipenya `unknown`) jadi tidak relevan lagi dan dihapus.
- `handleSpend` diubah signature-nya dari `(args: {cardId, productId, chatId})` jadi `(cardId: string, args: {productId, chatId})` — cardId dipisah sebagai parameter tersendiri di luar `args`, secara struktural mencegah kemungkinan cardId diselundupkan lewat objek args di masa depan.
- Ditambahkan komentar di switch-case `CallToolRequestSchema` menjelaskan alasan non-obvious: kenapa cardId TIDAK BOLEH pernah datang dari `args`, supaya developer berikutnya tidak secara tidak sengaja mengembalikan pola lama ini.

### `src/mcp/tools.ts`
- Field `cardId` dihapus dari `inputSchema` di ketiga tool (`get_card_info`, `spend`, `get_history`) — baik dari `properties` maupun `required`. Karena cardId sekarang tidak pernah dibaca dari argumen sama sekali (lihat perubahan di `server.ts`), field ini di schema hanya akan membingungkan AI agent (mengira perlu dikirim, padahal diabaikan) — dihapus sesuai instruksi.

## Test yang dijalankan — bukti isolasi bekerja, bukan cuma diklaim

```
1. POST /api/cards/1/register-mcp → SECRET_1
   POST /api/cards/2/register-mcp → SECRET_2
   (card 1 dan card 2 punya data berbeda: totalBudget, spentAmount, expiryTimestamp semua beda —
    baseline yang jelas untuk membuktikan isolasi)

2. MCP Inspector (@modelcontextprotocol/inspector@latest --cli) connect ke SECRET_1
   → tools/list berhasil, schema tools/spend TIDAK lagi punya field cardId
   → tools/call get_card_info (TANPA argumen apapun) → data card 1 yang benar

3. tools/call get_card_info dengan arguments: { cardId: "2" }, via SECRET_1
   → hasil: cardId "1", totalBudget "0.03 tBNB" — DATA CARD 1, BUKAN CARD 2.
     args.cardId="2" diabaikan sepenuhnya, dikonfirmasi via curl raw JSON-RPC.

4. tools/call spend dengan arguments: { cardId: "2", productId: "kopi-premium" }, via SECRET_1
   → Error: "Insufficient budget" — GAGAL karena card 1 sisa budgetnya memang cuma 0.001 tBNB
     (kurang dari harga kopi-premium 0.003), BUKAN diproses terhadap card 2 (yang budgetnya
     cukup, 0.097 tBNB). spentAmount card 2 dicek SEBELUM dan SESUDAH percobaan — sama sekali
     tidak berubah, membuktikan card 2 tidak tersentuh sedikit pun.

5. Bukti POSITIF (transaksi sungguhan, bukan cuma "gagal karena budget"):
   tools/call spend dengan arguments: { cardId: "1", productId: "kopi-premium" }, via SECRET_2
   → BERHASIL: {"autoApproved":true, "message":"Berhasil membeli \"Kopi Premium 1kg\"..."}
   → Verifikasi on-chain: spentAmount card 1 TETAP TIDAK BERUBAH (29000000000000000),
     spentAmount card 2 NAIK dari 3000000000000000 ke 6000000000000000 (persis +0.003 tBNB).
   → History: record baru muncul di /api/history/2 (bukan /api/history/1).
   Ini bukti definitif: walau caller mencoba override ke cardId "1", transaksi TETAP dieksekusi
   terhadap card 2 (cardId yang benar-benar terikat ke SECRET_2 yang dipakai).

6. Isolasi terjaga di semua kondisi yang dicoba:
   - get_card_info dengan cardId override → diabaikan
   - spend dengan cardId override → diabaikan, transaksi tetap ke card asli pemilik secret
   - Baik saat override menyebabkan error (budget) maupun saat override "kebetulan" masih
     valid secara teknis (card 1 exist) — cardId dari argumen SELALU diabaikan sepenuhnya,
     tidak ada kondisi apapun di mana ia dipakai.

7. Regresi — semua yang sudah ada tetap berfungsi:
   - Route lama (/api/cards, /api/auth/nonce, /.well-known) → semua 200, tidak terganggu.
   - Lane C (OAuth Bearer token, dari hotfix sebelumnya) → tetap berfungsi penuh,
     tools/list berhasil dengan header Authorization: Bearer <token valid>.
   - Secret salah (/mcp/wrongsecret) → tetap 401.
   - GET /health di setiap langkah → selalu 200, server tidak pernah crash.
```

Semua 5 skenario yang diminta di instruksi (register, connect inspector, override cardId di get_card_info, override cardId di spend, isolasi terjaga dalam kondisi apapun) terverifikasi lolos — dengan bukti on-chain nyata (perubahan `spentAmount` dan `history`), bukan cuma respons API yang terlihat benar di permukaan.

## Dampak

**Tujuan awal fitur per-card secret sekarang benar-benar tercapai**: secret satu card hanya bisa mempengaruhi card itu sendiri, dalam kondisi apapun — termasuk saat caller secara aktif mencoba override lewat argumen tool call. Celah yang di-flag di laporan sebelumnya (`02-backend-team-report-hotfix-mcp-auth.md`, bagian "TEMUAN KRITIS") sekarang **tertutup sepenuhnya**.

## Dampak ke tim lain

**AI agent/MCP client (mis. Claude Web) yang mengintegrasikan tools ini TIDAK PERLU dan TIDAK BISA lagi mengirim `cardId`** di argumen `get_card_info`, `spend`, atau `get_history` — field itu sudah dihapus dari schema. cardId sepenuhnya implisit dari secret/token yang dipakai untuk koneksi. Kalau ada dokumentasi/prompt untuk AI agent yang sebelumnya menyebutkan cardId sebagai parameter tool, perlu diupdate supaya tidak membingungkan (walau secara teknis tidak akan error kalau tetap dikirim — cuma diabaikan).

## Issues untuk Orchestrator

Tidak ada blocking issue baru. Ini menutup satu-satunya isu kritis yang tersisa dari rangkaian hotfix MCP auth. Status sekarang: MCP endpoint terlindungi Bearer-token-atau-secret (hotfix auth), DAN isolasi per-card benar-benar ditegakkan di level tool handler (hotfix ini) — dua lapis yang saling melengkapi, bukan cuma satu lapis yang bisa dilewati dari sisi lain.

---

**File yang diubah:** `src/mcp/server.ts` (hapus `args.cardId ??` di 3 tool handler, sederhanakan signature), `src/mcp/tools.ts` (hapus field `cardId` dari 3 inputSchema)
