# Laporan Backend Team — V2: MCP Server + OAuth 2.1

**Tanggal:** 2026-09-25
**Status:** SELESAI
**Referensi jobdesk:** `docs/agents/07-mcp-team.md`

---

## Yang sudah selesai

Semua 11 task di jobdesk sudah dikerjakan:

1. `@modelcontextprotocol/sdk` v1.30.1 terinstall di `packages/backend`.
2. `src/mcp/tools.ts` — 4 tool definitions (`get_card_info`, `get_products`, `spend`, `get_history`) sesuai spec.
3. `src/mcp/server.ts` — MCP server dengan handler `ListToolsRequestSchema`/`CallToolRequestSchema`, memakai fungsi yang sudah ada (`getCardFromChain`, `callSpend`, `addSpendRecord`, `getSpendHistory`, `sendApprovalRequest`) — tidak ada logic contract/db yang dibuat ulang.
4. `src/routes/mcp.ts` — HTTP route `/mcp/:cardId`.
5. `src/routes/oauth.ts` — 4 endpoint OAuth (`.well-known`, `authorize`, `consent`, `token`).
6. `oauthSessions` dan `oauthTokens` ditambahkan di `src/db.ts` — stores lama (`spendHistory`, `telegramMappings`, `pendingSpendMap`, `pendingNonces`) tidak diubah.
7. Route `/mcp` dan `/` (untuk oauth, lihat penjelasan di bawah) didaftarkan di `src/index.ts`.
8. Env vars `MCP_BASE_URL`, `DASHBOARD_URL`, `OAUTH_SECRET` ditambahkan ke `agentpay/.env`.
9. Test MCP lewat `@modelcontextprotocol/inspector` (CLI mode) dan curl langsung — keduanya berhasil.
10. Test OAuth manual dengan curl — flow lengkap `authorize → consent → token` berhasil end-to-end.
11. Laporan ini.

## Perbedaan penting dari kode contoh di jobdesk (dengan alasan teknis)

Sebelum implementasi, saya cek dokumentasi terbaru `@modelcontextprotocol/sdk` via context7 dan baca source code package yang benar-benar terinstall (v1.30.1) — ditemukan 3 ketidaksesuaian antara kode contoh di jobdesk dan API SDK yang tersedia di npm:

### 1. Transport class yang salah di kode contoh

Kode contoh jobdesk pakai `StreamableHTTPServerTransport` dari `@modelcontextprotocol/sdk/server/streamableHttp.js`, dipanggil dengan `transport.handleRequest(req)` di mana `req = c.req.raw` (Web Standard `Request` dari Hono), lalu hasilnya dibungkus manual jadi `new Response(res.body, {...})`.

**Masalah:** class `StreamableHTTPServerTransport` di v1.30.1 itu didesain untuk Node.js `IncomingMessage`/`ServerResponse` (Express-style), method signature-nya `handleRequest(req: IncomingMessage, res: ServerResponse, body?)` — **bukan** untuk Web Standard `Request`/`Response` yang dipakai Hono. Kalau kode contoh jobdesk dipakai apa adanya, ini akan type-error atau gagal di runtime.

**Fix:** pakai `WebStandardStreamableHTTPServerTransport` dari `@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js` — class ini didesain khusus untuk `Request`/`Response` Web Standard dan cocok dengan runtime apapun (Node 18+, Workers, Deno, Bun). Signature-nya `handleRequest(req: Request): Promise<Response>` — return value-nya sudah `Response` langsung, tidak perlu dibungkus manual. Saya konfirmasi ini dengan membaca contoh resmi SDK sendiri untuk integrasi Hono (`examples/server/honoWebStandardStreamableHttp.js`), yang persis memakai pola ini.

### 2. `sessionIdGenerator` menyebabkan "Server not initialized" di request kedua

Awalnya saya ikuti instruksi jobdesk apa adanya (`sessionIdGenerator: () => crypto.randomUUID()`). Setelah test dengan MCP Inspector, `tools/list` selalu gagal dengan `"Bad Request: Server not initialized"`.

**Penyebab:** `sessionIdGenerator` mengaktifkan **stateful session mode** di protokol MCP — mengasumsikan `Server`/`Transport` instance yang sama dipakai lintas multiple HTTP request dalam satu sesi percakapan (dilacak lewat header `Mcp-Session-Id`). Tapi implementasi route saya (dan juga pola di kode contoh jobdesk) membuat `Server`+`Transport` baru di **setiap** request HTTP dan tidak menyimpannya di memori antar request. Akibatnya, state "initialized" dari request `initialize` hilang begitu request itu selesai, dan request `tools/list` berikutnya datang ke instance yang benar-benar baru dan "lupa" bahwa handshake sudah terjadi.

**Fix:** hapus `sessionIdGenerator` sepenuhnya (biarkan `undefined`, default), yang mengaktifkan **stateless mode** — cocok untuk arsitektur "instance baru per-request" yang memang kita pakai. Ini juga persis pola yang dipakai contoh resmi Hono dari SDK sendiri. Ditambahkan komentar di kode menjelaskan alasan ini karena tidak obvious dari membaca kode saja.

### 3. `matchedSession` type-safety di `oauth.ts`

Bukan dari jobdesk, tapi saya perbaiki sendiri: kode saya awalnya pakai trik conditional type (`typeof oauthSessions extends Map<string, infer V> ? V : never`) untuk lookup session by code — diganti pakai tipe eksplisit `OAuthSession` yang diimport dari `db.ts`, lebih jelas dan konsisten dengan gaya kode lain di project.

### 4. Register route `/oauth` — hanya satu `app.route`, bukan tiga seperti instruksi jobdesk

Instruksi jobdesk minta 3 baris register (`/mcp`, `/oauth`, dan `/` untuk `.well-known`). Tapi karena saya sudah menaruh **full path** (`/oauth/authorize`, `/oauth/consent`, `/oauth/token`, `/.well-known/oauth-authorization-server`) langsung di dalam definisi route `oauth.ts` (bukan path relatif seperti `/authorize`), maka mount ganda (`app.route("/oauth", oauth)` + `app.route("/", oauth)`) akan menghasilkan path yang salah/dobel-prefix (misal `/oauth/oauth/authorize`). Saya cukup pakai **satu** `app.route("/", oauth)` — semua path sudah benar karena didefinisikan lengkap di dalam file route-nya sendiri. Sudah diverifikasi lewat test: `.well-known`, `/oauth/authorize`, `/oauth/consent`, `/oauth/token` semuanya bisa diakses dengan benar di path yang sesuai spec.

### 5. Import lokal tidak pakai ekstensi `.js`

Jobdesk bilang "ESM import: backend menggunakan TypeScript ESM, import harus pakai `.js` di akhir." Ini **tidak akurat** — backend ini sebenarnya CommonJS (`tsconfig.json` set `"module": "commonjs"`, `package.json` tidak punya `"type": "module"`), dan semua file V1 (`routes/cards.ts`, `services/contract.ts`, dll) konsisten import lokal **tanpa** ekstensi `.js`. File MCP/OAuth baru saya samakan gayanya — import lokal tanpa `.js`, tapi import dari `@modelcontextprotocol/sdk` (package eksternal) tetap pakai `.js` karena itu **wajib** sesuai `exports` map package tersebut (subpath export butuh ekstensi eksplisit, terlepas dari CJS/ESM konsumennya).

## Test yang dijalankan

### MCP — via curl langsung (JSON-RPC raw) dan `@modelcontextprotocol/inspector@latest --cli`

```
POST /mcp/1  initialize                         → 200, capabilities.tools terdaftar
POST /mcp/1  tools/list                          → 200, 4 tools lengkap dengan inputSchema
POST /mcp/1  tools/call get_card_info (cardId=1)  → 200, data on-chain nyata (budget, spent, expiry, dst)
POST /mcp/999 tools/call get_card_info (cardId=999) → isError:true "Card not found"
POST /mcp/1  tools/call get_products (shop mati)  → isError:true "Tidak bisa menghubungi demo shop..." (TIDAK crash)
POST /mcp/1  tools/call get_products (shop hidup) → 200, 4 produk dari shop (termasuk kopi-premium)
POST /mcp/2  tools/call spend (kopi-premium)      → 200 autoApproved:true — TRANSAKSI ON-CHAIN NYATA berhasil,
                                                      spentAmount di kontrak naik tepat 0.003 tBNB, history tercatat
POST /mcp/2  tools/call spend (laptop-gaming)     → 200 autoApproved:false, pendingSpendId dikembalikan
POST /mcp/2  tools/call spend (productId ngaco)   → isError:true "Product not found"
POST /mcp/2  tools/call unknown_tool              → isError:true "Unknown tool: ..."
GET  /health di setiap langkah                    → selalu 200, server tidak pernah crash
```

Untuk test `spend`, saya buat card baru (cardId 2) on-chain langsung lewat `writeContract` (budget 0.1 tBNB, auto-approve limit 0.01 tBNB) karena card 1 dari sesi sebelumnya sudah hampir habis budget-nya — bukan bagian dari perubahan kode, murni untuk keperluan test.

### OAuth — curl manual sesuai contoh di jobdesk

```
GET  /oauth/authorize?client_id=2&redirect_uri=...&state=test123&response_type=code
     → 302 redirect ke http://localhost:3000/oauth/authorize?session=<id>&cardId=2

POST /oauth/consent { sessionId, approved: true }
     → 200 { "redirectTo": "http://localhost:3000/?code=<code>&state=test123" }

POST /oauth/token (form-encoded) grant_type=authorization_code&code=<code>&redirect_uri=...
     → 200 { "access_token": "...", "token_type": "Bearer", "expires_in": 86400 }
```

Edge case:
```
GET  /oauth/authorize (tanpa param wajib)          → 400 "Missing required query params..."
POST /oauth/consent   (tanpa sessionId)             → 400 "Missing required field: sessionId"
POST /oauth/consent   (sessionId palsu)             → 400 "Session not found or expired"
POST /oauth/consent   { approved: false }           → 200 { redirectTo: "...?error=access_denied&state=..." }
POST /oauth/token     (code palsu)                  → 400 { "error": "invalid_grant" }
```

Server tetap hidup (`GET /health` → 200) di setiap langkah, termasuk semua skenario error.

## Catatan tambahan

- **Route lama tidak disentuh** — dikonfirmasi lewat test regresi: `/api/cards`, `/api/auth/nonce` tetap berfungsi normal setelah semua perubahan V2.
- **Tidak ada file di package lain yang diubah** — hanya `packages/backend/src/`.
- **Tools `spend` di MCP TIDAK memvalidasi ownership berbasis `chatId`** seperti pola security fix V1 (`routes/spend.ts`). Ini sesuai desain jobdesk — `chatId` di tool `spend` cuma untuk notifikasi (opsional), karena mekanisme otorisasi MCP levelnya berbeda: seharusnya lewat OAuth Bearer token yang terikat ke `cardId` (didapat dari consent flow eksplisit di dashboard), bukan `chatId` Telegram. **Tapi** — lihat isu kritis di bawah, otorisasi Bearer token ini belum benar-benar ditegakkan di endpoint `/mcp/:cardId`.

## ⚠️ Isu kritis untuk Orchestrator — otorisasi MCP endpoint belum ditegakkan

Kode contoh `routes/mcp.ts` di jobdesk **tidak menyertakan pengecekan Bearer token OAuth sama sekali** — endpoint `/mcp/:cardId` langsung terbuka berdasarkan `cardId` di URL path saja. Saya implementasikan persis sesuai instruksi (scope eksplisit yang diminta), tapi ini artinya:

**Siapapun yang tahu `cardId` bisa langsung akses semua MCP tools (termasuk `spend`, transaksi on-chain nyata) tanpa perlu melalui OAuth flow apapun.** OAuth endpoints (`authorize`/`consent`/`token`) yang saya buat berfungsi penuh dan menghasilkan access token yang valid, tapi **token itu tidak pernah divalidasi** di `/mcp/:cardId` — jadi secara praktis OAuth layer ini saat ini kosmetik, tidak benar-benar melindungi endpoint MCP.

Pola ini mirip persis BUG-001 sebelumnya (approve/reject tanpa validasi ownership) — bedanya kali ini di endpoint MCP yang baru. Saya tidak menambahkan validasi Bearer token secara sepihak karena **di luar scope eksplisit** yang diminta di jobdesk V2 ini (11 langkah yang diminta tidak menyebutkan validasi token di `mcp.ts`), dan menambah validasi tanpa diminta bisa jadi bertentangan dengan alur test/demo yang direncanakan Orchestrator (misal, mungkin memang sengaja dibuat terbuka dulu untuk mempermudah testing sebelum enforcement ditambahkan di iterasi berikutnya).

**Rekomendasi:** perlu keputusan eksplisit apakah `/mcp/:cardId` perlu dilindungi dengan cek header `Authorization: Bearer <token>` terhadap `oauthTokens` map (dan pastikan `token.cardId === cardId` dari URL) sebelum dianggap production-ready / dipakai di demo dengan Claude Web sungguhan.

## Output untuk Orchestrator

```
MCP_ENDPOINT=http://localhost:3001/mcp/:cardId
TOOLS_READY: get_card_info, get_products, spend, get_history
OAUTH_ENDPOINTS_READY: /oauth/authorize, /oauth/token, /oauth/consent
WELL_KNOWN_READY: /.well-known/oauth-authorization-server
TEST_RESULT: Semua 4 MCP tools bekerja (get_card_info, get_products, get_history dites read-only;
             spend dites dengan transaksi on-chain nyata, baik auto-approve maupun pending).
             Semua 4 OAuth endpoint bekerja end-to-end (authorize → consent → token, termasuk deny flow
             dan error handling). Server tidak pernah crash di seluruh skenario test.
             ISU KRITIS: endpoint /mcp/:cardId belum validasi Bearer token — lihat bagian di atas.
```

---

**File yang ditambah:** `src/mcp/tools.ts`, `src/mcp/server.ts`, `src/routes/mcp.ts`, `src/routes/oauth.ts`
**File yang dimodifikasi:** `src/db.ts` (tambah `oauthSessions`/`oauthTokens`), `src/index.ts` (register 2 route baru), `agentpay/.env` (3 env var baru)
