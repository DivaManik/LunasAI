# Laporan Backend Team — Faucet Endpoint (Claim IDRX Testnet)

**Tanggal:** 2026-09-28
**Status:** SELESAI
**Konteks:** LunasAI (sebelumnya AgentPay) — endpoint faucet supaya user bisa claim IDRX testnet gratis untuk demo/testing.

---

## Yang sudah dikerjakan (sesuai 4 task di instruksi)

1. **`db.ts`** — tambah `faucetClaims: Map<address, lastClaimTimestamp>`, `canClaim(address)` (cooldown 24 jam), `recordClaim(address)`.
2. **`services/contract.ts`** — tambah `IDRX_ABI` minimal (cuma fungsi `mint`) dan `mintIDRX(to, amount)`, memakai `publicClient`/`walletClient`/`account` yang sudah ada di file (tidak ada duplikasi setup client).
3. **`routes/faucet.ts`** (baru) — `POST /api/faucet`: validasi format address, cek rate limit, panggil `mintIDRX`, catat klaim, return `{success, message, amount, txHash}`.
4. **`index.ts`** — import + `app.route("/", faucet)`, konsisten dengan pola `oauth.ts` (full path didefinisikan di dalam route file-nya sendiri, jadi mount di `/` tidak menyebabkan konflik prefix).

Semua kode persis sesuai contoh di instruksi — tidak ada penyesuaian yang diperlukan.

## Test wajib — SEMUA PASS

### Test 1: Faucet claim berhasil
```
curl -X POST http://localhost:3001/api/faucet -H "Content-Type: application/json" \
  -d '{"address":"0x0a18fCB673099443CB8bA44AE7198529275b7c1f"}'

→ 200 {
  "success": true,
  "message": "100.000 IDRX berhasil dikirim ke 0x0a18fCB673099443CB8bA44AE7198529275b7c1f",
  "amount": "100.000 IDRX",
  "txHash": "0x8a170b536572ca84bfcb9cafc395cc87bf2db686b04248f24a12280cd3e87396"
}
```
**Verifikasi tambahan (di luar instruksi, untuk memastikan bukan cuma respons API yang terlihat benar):** dicek `balanceOf` wallet tujuan langsung ke kontrak MockIDRX setelah klaim — balance naik tepat `10000000` unit (100.000 IDRX) dibanding sebelum klaim, mengonfirmasi mint benar-benar tereksekusi on-chain, bukan cuma respons API palsu.

### Test 2: Rate limit — klaim langsung lagi
```
curl -X POST http://localhost:3001/api/faucet -H "Content-Type: application/json" \
  -d '{"address":"0x0a18fCB673099443CB8bA44AE7198529275b7c1f"}'

→ 429 { "error": "Sudah claim hari ini. Coba lagi dalam 24 jam." }
```

### Test 3: Invalid address
```
curl -X POST http://localhost:3001/api/faucet -H "Content-Type: application/json" \
  -d '{"address":"bukan-address"}'

→ 400 { "error": "Invalid wallet address" }
```

## Test tambahan (verifikasi ekstra, tidak diminta eksplisit tapi relevan untuk kepercayaan)

```
Claim dengan wallet BERBEDA (setelah wallet pertama kena rate limit)
→ 200, berhasil normal — rate limit per-address, tidak saling mengganggu antar wallet. ✅

Request tanpa body / body kosong
→ 400 "Invalid wallet address" — tidak crash, ditangani rapi. ✅

Route lain (regresi):
GET  /api/cards/1                              → 200, tidak terganggu
POST /api/auth/nonce                           → 200, tidak terganggu
GET  /.well-known/oauth-authorization-server   → 200, tidak terganggu

GET /health di setiap langkah → selalu 200, server tidak pernah crash.
```

## TxHash dari klaim yang berhasil

- `0x8a170b536572ca84bfcb9cafc395cc87bf2db686b04248f24a12280cd3e87396` — klaim wallet `0x0a18fCB673099443CB8bA44AE7198529275b7c1f`
- `0x8b37ef0d7478606764df3f4f6e5c89cd3ff55cd6f23b99a40ab43c81e4eb64c9` — klaim wallet `0xBa4918Ff177C289F01fd362bc8a55B3e0469149f` (test tambahan wallet berbeda)

## Issues

Tidak ada blocking issue. Satu catatan operasional: rate limit faucet ini **in-memory** (hilang saat server restart), konsisten dengan seluruh state lain di backend MVP ini — jadi kalau backend di-restart, semua wallet bisa langsung claim lagi tanpa menunggu 24 jam. Tidak masalah untuk demo hackathon, tapi bukan mekanisme rate-limit yang tahan restart untuk skenario produksi.

---

**File yang dibuat:** `src/routes/faucet.ts`
**File yang diubah:** `src/db.ts` (tambah faucet state), `src/services/contract.ts` (tambah `mintIDRX`), `src/index.ts` (register route)
**Route lama:** tidak disentuh, dikonfirmasi lewat test regresi di atas.
