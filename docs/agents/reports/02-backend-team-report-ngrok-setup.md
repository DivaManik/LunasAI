# Laporan Backend Team — Setup Ngrok dan Registrasi MCP Secret

**Tanggal:** 2026-09-26
**Status:** SELESAI
**Konteks:** `MCP_BASE_URL` diupdate ke tunnel ngrok (`https://twilight-protract-unseen.ngrok-free.dev`) supaya endpoint MCP dan OAuth bisa diakses dari internet publik (Claude Web). Task ini murni operasional — restart backend, register secret, dan test; tidak ada kode yang diubah.

---

## 1. Card ID yang tersedia

Dicek langsung dari kontrak on-chain (`GET /api/cards/:id`) untuk cardId 1–8:

| Card ID | Owner | Total Budget | Spent | Auto-Approve Limit | Status |
|---|---|---|---|---|---|
| 1 | `0xBa4918Ff...9149f` | 0.03 tBNB | 0.029 tBNB | 0.01 tBNB | ✅ aktif |
| 2 | `0xBa4918Ff...9149f` | 0.1 tBNB | 0.006 tBNB | 0.01 tBNB | ✅ aktif |
| 3 | `0x0a18fCB6...b7c1f` | 0.06 tBNB | 0 | 0.01 tBNB | ❌ **tidak aktif** (revoked) |
| 4 | `0x0a18fCB6...b7c1f` | 0.02 tBNB | 0 | 0.004 tBNB | ❌ **tidak aktif** (revoked) |
| 5 | `0x0a18fCB6...b7c1f` | 0.06 tBNB | 0 | 0.01 tBNB | ✅ aktif |
| 6 | `0xBa4918Ff...9149f` | 0.02 tBNB | 0 | 0.01 tBNB | ✅ aktif |
| 7, 8 | — | — | — | — | tidak eksis (`404 Card not found`) |

**Card 3 dan 4 dilewati** dari registrasi MCP secret karena `isActive: false` — sesuai instruksi "untuk setiap card yang **aktif**". Total 4 card aktif (1, 2, 5, 6) semuanya diregistrasi.

## 2. MCP URL lengkap (siap di-paste ke Claude Web)

⚠️ **Secret di bawah ditampilkan APA ADANYA sesuai instruksi task ini** ("catat hasilnya"), tapi ingat: secret ini setara password penuh ke card masing-masing — jangan bagikan laporan ini ke luar tim, dan pertimbangkan re-register (generate secret baru) sebelum sistem dipakai di luar konteks demo terkontrol, karena begitu tercatat di file ini, secret lama sebaiknya dianggap tidak lagi rahasia murni.

| Card ID | Owner | MCP URL |
|---|---|---|
| 1 | `0xBa4918Ff...9149f` | `https://twilight-protract-unseen.ngrok-free.dev/mcp/ap_SNEVUcyOb9bmbYlEGUHTf05ycr133rt2` |
| 2 | `0xBa4918Ff...9149f` | `https://twilight-protract-unseen.ngrok-free.dev/mcp/ap_Ym4iIC7IKoTEdLCUtNiklhqO6mRzITcj` |
| 5 | `0x0a18fCB6...b7c1f` | `https://twilight-protract-unseen.ngrok-free.dev/mcp/ap_qmcDyKvX12p-KBA72XpMoncl1KEtjLXb` |
| 6 | `0xBa4918Ff...9149f` | `https://twilight-protract-unseen.ngrok-free.dev/mcp/ap_7UdThPXG_TWxq1HKECTcIm1JBgZ_GW1A` |

Format `mcpUrl` yang dikembalikan endpoint `register-mcp` **sudah otomatis** memakai domain ngrok (bukan `localhost:3001`) — karena backend membaca `MCP_BASE_URL` dari `agentpay/.env` secara langsung saat generate URL. Tidak perlu penggantian manual string seperti di instruksi langkah 4; itu sudah ditangani otomatis oleh kode yang ada.

## 3. Hasil test curl

### Test MCP endpoint (`tools/list`) via ngrok — card 1

```
curl -X POST https://twilight-protract-unseen.ngrok-free.dev/mcp/ap_SNEVUcyOb9bmbYlEGUHTf05ycr133rt2 \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}'
```
→ **Berhasil.** 4 tools dikembalikan lengkap: `get_card_info`, `get_products`, `spend`, `get_history`.

**Catatan penting:** curl TANPA header `Accept: application/json, text/event-stream` (persis seperti contoh di instruksi task ini, yang hanya menyertakan `Content-Type`) menghasilkan error:
```
{"jsonrpc":"2.0","error":{"code":-32000,"message":"Not Acceptable: Client must accept both application/json and text/event-stream"},"id":null}
```
Ini bukan bug — MCP Streamable HTTP transport memang mensyaratkan client mengirim header `Accept` itu (mendukung baik respons JSON biasa maupun SSE stream). Claude Web sebagai MCP client resmi akan mengirim header ini secara otomatis; hanya perlu diwaspadai kalau menguji manual lewat curl seperti di laporan ini.

### Test `tools/call get_card_info` via ngrok — card 1
```
curl -X POST https://twilight-protract-unseen.ngrok-free.dev/mcp/ap_SNEVUcyOb9bmbYlEGUHTf05ycr133rt2 \
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_card_info","arguments":{}},"id":2}'
```
→ **Berhasil.** Data on-chain nyata card 1 terbaca lewat tunnel ngrok:
```json
{"cardId":"1","owner":"0xBa4918Ff...","totalBudget":"0.03 tBNB","spentAmount":"0.029 tBNB","remainingBudget":"0.001 tBNB","autoApproveLimit":"0.01 tBNB","expiryTimestamp":"2026-10-24T18:27:46.000Z","isActive":true,"isExpired":false}
```

### Test 3 secret lain (card 2, 5, 6) via ngrok — sekaligus verifikasi isolasi per-card
Semua berhasil, dan masing-masing mengembalikan data card yang BENAR sesuai secret yang dipakai (card 2 → owner `0xBa4918Ff...`, card 5 → owner `0x0a18fCB6...` yang berbeda, card 6 → `0xBa4918Ff...` dengan budget berbeda dari card 1/2) — mengonfirmasi isolasi per-card (dari hotfix sebelumnya) tetap konsisten diakses lewat ngrok, bukan cuma localhost.

### Test `.well-known/oauth-authorization-server` via ngrok
```
curl https://twilight-protract-unseen.ngrok-free.dev/.well-known/oauth-authorization-server
```
→ **Berhasil.** Semua field sudah otomatis memakai domain ngrok:
```json
{
  "issuer": "https://twilight-protract-unseen.ngrok-free.dev",
  "authorization_endpoint": "https://twilight-protract-unseen.ngrok-free.dev/oauth/authorize",
  "token_endpoint": "https://twilight-protract-unseen.ngrok-free.dev/oauth/token",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code"],
  "code_challenge_methods_supported": ["S256"]
}
```
Sama seperti `mcpUrl`, ini juga otomatis konsisten karena backend membaca `MCP_BASE_URL` dari env untuk membangun URL ini — tidak perlu perubahan kode.

### Health check
`GET /health` (via localhost, sebelum dan sesudah semua test di atas) → selalu `200 {"status":"ok"}`, server tidak pernah crash sepanjang proses restart dan testing.

## 4. Langkah untuk connect ke Claude Web

1. Buka Claude Web (claude.ai), masuk ke pengaturan **Connectors** / **MCP Servers** (atau menu serupa untuk menambah custom connector).
2. Tambahkan connector baru, isi URL dengan salah satu `mcpUrl` dari tabel di atas — misal untuk card 1:
   ```
   https://twilight-protract-unseen.ngrok-free.dev/mcp/ap_SNEVUcyOb9bmbYlEGUHTf05ycr133rt2
   ```
3. Claude Web akan mendeteksi ini sebagai MCP server berbasis Streamable HTTP dan otomatis mencoba `tools/list` untuk menemukan 4 tools yang tersedia (`get_card_info`, `get_products`, `spend`, `get_history`).
4. Karena URL sudah menyertakan secret per-card langsung di path (Lane A), **tidak perlu** melalui flow OAuth interaktif (`authorize`/`consent`/`login`) — akses langsung terotorisasi begitu URL valid dipakai.
5. Setelah connector aktif, coba minta Claude Web (dalam percakapan) untuk "cek info card ini" atau "lihat produk yang tersedia di shop" — itu akan memanggil `get_card_info`/`get_products` secara otomatis.
6. Untuk transaksi (`spend`), pastikan shop service (`localhost:3002`, tidak lewat ngrok) tetap berjalan di sisi server — MCP tool `spend` memanggil shop secara internal, jadi tidak perlu tunnel terpisah untuk shop.
7. **Kalau ngrok tunnel restart** (URL ngrok berubah — versi gratis ngrok biasanya beda URL setiap kali dijalankan ulang), `MCP_BASE_URL` di `agentpay/.env` perlu diupdate ke URL baru, backend di-restart, dan **semua secret perlu diregistrasi ulang** lewat `register-mcp` (karena `mcpUrl` yang lama akan menunjuk ke domain ngrok yang sudah mati — meski secret hash-nya di `cardSecretHashes` tetap valid dan tidak hilang, cuma domain di URL publiknya yang perlu diganti manual kalau mau dipakai lagi dari luar).

## Issues untuk Orchestrator

Tidak ada blocking issue. Satu catatan operasional: **card 3 dan 4 revoked** (tidak aktif) — kalau demo direncanakan memakai salah satu dari card itu, perlu tahu bahwa card tersebut sudah tidak bisa dipakai untuk transaksi (kontrak akan revert). Card yang tersedia untuk demo: **1, 2, 5, 6**.

---

**Tidak ada kode yang diubah** — task ini murni restart, register, dan test sesuai instruksi.
