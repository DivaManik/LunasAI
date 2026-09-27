# Laporan Tim Backend — Security Hotfix (Card Ownership Validation)

**Tanggal:** 2026-09-25
**Status:** SELESAI

---

## Masalah

`POST /api/spend` sebelumnya tidak memvalidasi bahwa requester adalah pemilik card. Siapapun yang tahu `cardId` bisa memakai card orang lain untuk belanja selama masih dalam batas `autoApproveLimit` (auto-approved, tanpa perlu konfirmasi Telegram apapun). Ini vulnerability serius — card ID kemungkinan mudah ditebak (integer sekuensial dari kontrak).

## Fix

File yang diubah: **hanya `agentpay/packages/backend/src/routes/spend.ts`** (sesuai batasan scope).

Alur validasi baru di `POST /api/spend`:
1. Request wajib menyertakan field `chatId` (Telegram chat ID pengirim request) — kalau tidak ada, `400`.
2. Ambil data card dari chain (`getCardFromChain`) — kalau card tidak ada, tetap `404` seperti sebelumnya (dicek duluan).
3. Reverse-lookup `chatId` → `walletAddress` dari `telegramMappings` (Map yang sudah ada di `db.ts`, diisi lewat `POST /api/connect-telegram`).
4. Bandingkan wallet hasil lookup dengan `card.owner` (case-insensitive, karena `telegramMappings` key-nya lowercase sementara address dari kontrak checksummed).
5. Kalau tidak cocok atau `chatId` belum pernah terhubung ke wallet manapun → `403 { "error": "Card bukan milik kamu" }`.
6. Kalau cocok → lanjut proses `callSpend` seperti biasa, tidak ada perubahan logic setelah titik ini.

### Catatan implementasi

`db.ts` **tidak diubah** (sesuai instruksi "jangan ubah file lain"). Reverse-lookup chatId→wallet diimplementasikan langsung di `spend.ts` dengan mengimpor `telegramMappings` Map yang sudah di-export dari `db.ts`, lalu iterasi manual (`for...of entries()`) untuk mencari entry yang value-nya cocok dengan `chatId`. Untuk skala MVP hackathon (in-memory Map, jumlah user kecil) ini cukup — O(n) lookup tidak jadi masalah performa.

### Perubahan request body `POST /api/spend`

```json
{
  "cardId": "1",
  "merchantAddress": "0x...",
  "amount": "5000000000000000",
  "description": "Beli Hoodie Basic",
  "productName": "Hoodie Basic AgentPay",
  "chatId": "123456789"
}
```
`chatId` sekarang **wajib**. Endpoint lain (`/api/spend/approve/:spendId`, `/api/spend/reject/:spendId`, dll) tidak berubah.

## Test yang dijalankan (curl, terhadap kontrak live di BNB Testnet)

```
1. POST /api/spend tanpa chatId
   → 400 {"error":"Missing required fields: cardId, merchantAddress, amount, description, chatId"}

2. POST /api/spend dengan chatId yang belum pernah connect-telegram
   → 403 {"error":"Card bukan milik kamu"}

3. POST /api/connect-telegram (chatId 555 -> wallet asing/attacker 0x000...dEaD)
   → 200 {"success":true}

4. POST /api/spend card 1 pakai chatId 555 (attacker, bukan owner card 1)
   → 403 {"error":"Card bukan milik kamu"}   ✅ exploit lama sekarang diblokir

5. POST /api/connect-telegram (chatId 777 -> wallet owner ASLI card 1, 0xBa4918Ff...)
   → 200 {"success":true}

6. POST /api/spend card 1 pakai chatId 777 (owner asli)
   → 200 {"autoApproved":true,"pendingSpendId":null}   ✅ flow normal tetap jalan

7. GET /api/cards/1 setelah step 6
   → spentAmount naik dari 0 ke 1000000000000000 (transaksi on-chain nyata berhasil)

8. GET /api/history/1
   → tercatat 1 record status "auto_approved"

9. Ulangi step 4 (attacker) setelah ada transaksi sukses sebelumnya
   → tetap 403, tidak ada regresi

10. Server tetap hidup (GET /health → 200) di semua skenario di atas, termasuk setelah percobaan attacker.
```

Skenario exploit yang dilaporkan (pakai `cardId` orang lain untuk belanja tanpa izin) **sudah tidak bisa lagi** — dikonfirmasi lewat test #4 dan #9. Flow normal (owner asli belanja pakai card sendiri) **tetap berfungsi penuh**, termasuk eksekusi on-chain nyata dan auto-approve — dikonfirmasi lewat test #6-8.

## Dampak ke tim lain

**Bot Team — WAJIB update:** setiap kali bot memanggil `POST /api/spend`, sekarang **harus** menyertakan `chatId` (chat ID Telegram user yang melakukan request) di request body. Tanpa ini, semua request spend dari bot akan selalu gagal dengan `400 Missing required fields`. Pastikan juga user sudah pernah `connect-telegram` sebelum bisa spend — kalau belum, akan dapat `403 Card bukan milik kamu` walau sebenarnya card itu miliknya.

**Frontend/Shop Team:** tidak ada dampak langsung — endpoint yang mereka pakai (`/products`, `/purchase` di shop; dashboard baca `/api/cards/:id`) tidak berubah.

## Issues yang perlu diketahui Orchestrator

Tidak ada blocking issue baru. Satu catatan desain untuk dipertimbangkan ke depan (bukan urgent untuk MVP hackathon): reverse-lookup `chatId → wallet` saat ini linear scan di memori — kalau nanti mau scale di luar hackathon (banyak user), sebaiknya `db.ts` diubah untuk simpan mapping dua arah eksplisit. Untuk sekarang tidak perlu diubah karena scope-nya kecil dan saya diminta tidak menyentuh `db.ts`.

---

**Referensi kode:** `agentpay/packages/backend/src/routes/spend.ts` (baris 19-24 untuk helper lookup, baris 32-49 untuk validasi ownership)
