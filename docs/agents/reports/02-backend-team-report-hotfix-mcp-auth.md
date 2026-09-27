# Laporan Backend Team — Hotfix: Per-Card Secret untuk MCP Auth

**Tanggal:** 2026-09-25
**Status:** SELESAI dengan CATATAN KRITIS (lihat bagian bawah — ada celah keamanan yang tidak bisa saya tutup karena di luar scope file yang diizinkan)
**Konteks:** Revisi ketiga dari rangkaian hotfix MCP auth. Menggantikan Lane A "shared secret" (satu `OAUTH_SECRET` untuk semua card) dengan secret unik per-card, mengikuti pola mirip API key modern (secret ditampilkan sekali, hanya hash yang disimpan).

---

## Yang sudah selesai

Semua 4 step di instruksi:

1. **`db.ts`** — tambah `cardSecretHashes: Map<sha256Hash, cardId>` dan helper `hashSecret(secret): string` (SHA-256 via `node:crypto`).
2. **`routes/cards.ts`** — endpoint baru `POST /api/cards/:cardId/register-mcp`:
   - Verifikasi card benar-benar ada di chain dulu (`getCardFromChain`) sebelum generate secret — proteksi tambahan yang tidak diminta eksplisit tapi konsisten dengan pola error handling di endpoint lain (`GET /api/cards/:id`).
   - Generate secret: `ap_` + `crypto.randomBytes(24).toString("base64url")`.
   - Simpan HANYA hash-nya: `cardSecretHashes.set(hashSecret(secret), cardId)`.
   - Return `{ mcpUrl, secret }` — secret tidak pernah disimpan di memori dalam bentuk plain text, dan tidak ada endpoint untuk retrieve ulang.
3. **`routes/mcp.ts`** — route diubah dari `/:cardId/:secret?` (revisi sebelumnya) menjadi `/:secret` tunggal. `cardId` diresolve dari `cardSecretHashes.get(hashSecret(secret))`. Kalau tidak ketemu (bukan secret valid), fallback ke Lane C (Bearer token OAuth, logic persis dari hotfix sebelumnya).
4. **Keamanan:** dikonfirmasi tidak ada `console.log`/`console.error`/`console.warn` yang menyertakan `secret` di ketiga file yang diubah — di-grep eksplisit untuk memastikan.

## Test yang dijalankan

```
1. POST /api/cards/1/register-mcp
   → 200 { "mcpUrl": "http://localhost:3001/mcp/ap_N-ZHzs...", "secret": "ap_N-ZHzs..." }

2. MCP Inspector (@modelcontextprotocol/inspector@latest --cli) ke mcpUrl hasil step 1
   → tools/list berhasil, 4 tools ditampilkan lengkap
   → tools/call get_card_info via curl raw JSON-RPC (bukan inspector, lihat catatan di bawah)
     berhasil, data on-chain card 1 yang benar terbaca (budget, spent, expiry, dst)

3. curl http://localhost:3001/mcp/wrongsecret
   → 401 {"error":"Unauthorized"}

4. POST /api/cards/2/register-mcp → dapat SECRET_2 (secret berbeda untuk card 2)
   curl ke /mcp/<SECRET_1> dengan tools/call get_card_info TANPA arguments.cardId
   → benar, mengembalikan data card 1 (default dari URL secret)

5. Lane C (Bearer token OAuth) tetap dites lewat curl: authorize → consent → token →
   akses /mcp/<placeholder apa saja> dengan header Authorization: Bearer <token>
   → berhasil, tools/list dikembalikan lengkap. Path segment tidak lagi perlu berupa cardId
   valid untuk Lane C karena route sekarang /:secret tunggal — otorisasi murni dari header.

6. Route lama tidak terganggu:
   GET  /api/cards/1        → 200, data normal
   POST /api/auth/nonce     → 200, nonce di-generate normal
   POST /api/spend (validasi field) → 400, pesan error normal
   GET  /api/history/1      → 200, array normal
   GET  /.well-known/oauth-authorization-server → 200, metadata normal

7. GET /health di setiap langkah → selalu 200, server tidak pernah crash.
```

**Catatan teknis:** `@modelcontextprotocol/inspector@latest --cli --tool-arg cardId=1` gagal parse argumen di CLI (bug/quirk versi inspector ini sendiri, bukan bug di backend — sudah dicoba beberapa format, semua gagal dengan pesan parsing error dari inspector). Untuk verifikasi `tools/call`, saya pakai curl langsung dengan payload JSON-RPC raw (lebih terkontrol dan lebih mudah dipastikan benar) — hasilnya positif dan itulah yang mengungkap temuan kritis di bawah.

---

## 🔴 TEMUAN KRITIS — celah keamanan yang TIDAK BISA saya tutup (di luar scope file yang diizinkan)

Saat menjalankan test skenario 4 secara lebih dalam (isolasi antar-card), saya temukan celah nyata:

**Secret milik card 1 bisa dipakai untuk mengakses (baca dan berpotensi TRANSAKSI) data card 2**, cukup dengan menyertakan `cardId: "2"` secara eksplisit di `arguments` saat memanggil tool — walaupun URL yang dipakai adalah `/mcp/<SECRET_1>` (secret milik card 1).

Reproduksi:
```
curl -X POST http://localhost:3001/mcp/<SECRET_1> \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call",
       "params":{"name":"get_card_info","arguments":{"cardId":"2"}}}'

→ Hasil: mengembalikan data CARD 2 yang benar (budget 0.1 tBNB, dst) — PADAHAL
  yang dipakai adalah secret milik card 1.
```

**Penyebab:** di `src/mcp/server.ts` (fungsi `createMcpServer`, baris ~192-206 — file ini SAYA TIDAK UBAH karena di luar batasan scope hotfix ini), setiap tool handler dipanggil dengan pola:
```typescript
case "get_card_info":
  return handleGetCardInfo(args.cardId ?? cardId);
case "spend":
  return handleSpend({ cardId: args.cardId ?? cardId, ... });
case "get_history":
  return handleGetHistory(args.cardId ?? cardId);
```
`cardId` di sini adalah cardId yang sudah diresolve dari secret URL (parameter fungsi `createMcpServer(cardId)`) — itu **seharusnya** jadi satu-satunya sumber kebenaran cardId untuk request ini. Tapi karena polanya `args.cardId ?? cardId`, kalau tool call menyertakan `cardId` sendiri di `arguments`, nilai itu **menimpa sepenuhnya** cardId hasil resolusi dari secret, alih-alih diabaikan atau divalidasi harus sama.

**Dampak nyata:** ini bukan cuma soal `get_card_info` (read-only). Tool **`spend`** punya pola yang identik (`cardId: args.cardId ?? cardId`) — artinya **secret milik satu card bisa dipakai untuk mengeksekusi transaksi on-chain nyata di card manapun**, selama `cardId` target disertakan eksplisit di argumen `spend`. Ini meniadakan tujuan utama dari hotfix per-card-secret ini, yang secara eksplisit dirancang supaya "secret hanya bisa akses card yang bersangkutan, tidak card lain" (poin test #4 di instruksi hotfix).

**Kenapa saya tidak memperbaikinya:** instruksi eksplisit membatasi perubahan hanya ke `routes/mcp.ts`, `db.ts`, dan endpoint register baru ("Jangan ubah file lain"). Perbaikan yang benar ada di `src/mcp/server.ts` — mengganti `args.cardId ?? cardId` menjadi cukup `cardId` saja (abaikan `args.cardId` sepenuhnya, cardId SELALU datang dari URL/token yang sudah diverifikasi, tidak pernah dari argumen tool call yang bisa dimanipulasi caller). Karena file itu di luar batasan yang diizinkan di hotfix ini, saya **tidak mengubahnya secara sepihak** — tapi celah ini nyata dan signifikan, jadi saya laporkan eksplisit alih-alih diam-diam mengabaikan.

**Rekomendasi mendesak:** perlu hotfix susulan khusus untuk `src/mcp/server.ts` sebelum fitur per-card secret ini benar-benar dipakai di demo — cukup ubah 3 baris (`args.cardId ?? cardId` → `cardId` saja) di ketiga tool handler (`get_card_info`, `spend`, `get_history`). Sampai perbaikan itu dilakukan, secara efektif **semua secret per-card yang sudah di-generate punya kekuatan akses yang sama seperti dulu (bisa akses card manapun)** — persis masalah yang seharusnya diselesaikan oleh hotfix ini, cuma jalur eksploitasinya sedikit lebih tersembunyi (butuh tahu bahwa argumen `cardId` bisa dioverride).

---

## Output untuk Orchestrator

```
REGISTER_ENDPOINT: POST /api/cards/:cardId/register-mcp → { mcpUrl, secret }
MCP_ENDPOINT (Lane A, per-card secret): http://localhost:3001/mcp/<secret dari register>
MCP_ENDPOINT (Lane C, OAuth):           http://localhost:3001/mcp/<apa saja> + Authorization: Bearer <token>
TEST_RESULT: Register, secret salah (401), Lane C tetap jalan, route lama tidak terganggu — SEMUA PASS.
             MCP Inspector berhasil connect & list tools via secret URL.
🔴 BLOCKING SEBELUM DEMO: args.cardId di src/mcp/server.ts menimpa cardId dari secret/token —
             secret satu card bisa dipakai akses/transaksi card lain lewat argumen tool call.
             Perlu hotfix susulan di src/mcp/server.ts (di luar scope hotfix ini) sebelum
             fitur per-card secret ini bisa dianggap benar-benar aman untuk demo.
```

---

**File yang diubah:** `src/db.ts` (tambah `cardSecretHashes`, `hashSecret`), `src/routes/cards.ts` (tambah `POST /:cardId/register-mcp`), `src/routes/mcp.ts` (route `/:secret`, resolusi cardId dari hash, fallback Lane C)
**File yang PERLU diubah tapi TIDAK saya sentuh (di luar scope, lihat temuan kritis di atas):** `src/mcp/server.ts`
