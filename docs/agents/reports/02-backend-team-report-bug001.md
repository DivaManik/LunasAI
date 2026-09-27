# Laporan Tim Backend — BUG-001: Ownership Validation di approve/reject Spend

**Tanggal:** 2026-09-25
**Status:** SELESAI
**Priority:** CRITICAL (fixed sebelum demo)

---

## Masalah

`POST /api/spend/approve/:spendId` dan `POST /api/spend/reject/:spendId` langsung memanggil `callApproveSpend`/`callRejectSpend` on-chain tanpa validasi siapa pemanggilnya. Card lookup (`pendingSpendMap.get(spendId)`) sebelumnya baru dilakukan **setelah** eksekusi kontrak, cuma untuk update record lokal dan notifikasi — bukan untuk otorisasi. Akibatnya siapapun yang tahu `spendId` (integer sekuensial, mudah ditebak) bisa approve/reject pending spend milik card orang lain.

## Fix

File yang diubah: **hanya `agentpay/packages/backend/src/routes/spend.ts`**.

Ditambahkan helper `authorizeSpendAction(spendId, chatId)` yang dipakai kedua endpoint (`approve` dan `reject`) — dijalankan **sebelum** `callApproveSpend`/`callRejectSpend` dipanggil:

1. Cek `chatId` ada di request body → kalau tidak, `400`.
2. Lookup `cardId` dari `pendingSpendMap.get(spendId)` → kalau `spendId` tidak dikenal (tidak ada di map), `404` (bukan diloloskan tanpa cek — kalau data lokal hilang, misal karena server restart, request tetap ditolak, bukan celah baru).
3. Ambil `card` dari chain (`getCardFromChain(cardId)`).
4. Reverse-lookup `chatId → walletAddress` lewat `telegramMappings` (pola yang sama seperti fix `POST /api/spend` sebelumnya).
5. Bandingkan wallet hasil lookup dengan `card.owner` (case-insensitive) → kalau tidak cocok, `403 { "error": "Bukan pemilik card" }`.

Kalau semua validasi lolos, baru lanjut eksekusi kontrak seperti sebelumnya — tidak ada perubahan logic setelah titik ini.

### Perubahan request body

```json
POST /api/spend/approve/:spendId
POST /api/spend/reject/:spendId
Body: { "chatId": "123456789" }
```
`chatId` sekarang wajib untuk kedua endpoint.

## Test yang dijalankan (curl, terhadap kontrak live di BNB Testnet, wallet & signature asli — bukan mock)

Setup: wallet deployer (`0xBa4918Ff...`, owner card 1 di chain) dihubungkan ke `chatId="OWNER-777"` lewat flow signature verification (`/api/auth/nonce` + `/api/auth/verify`) yang sudah ada dari hotfix sebelumnya. Lalu dibuat 1 pending spend nyata di card 1 (amount di atas `autoApproveLimit`) untuk jadi target test approve/reject.

```
1. POST /api/spend/approve/1  (tanpa chatId)
   → 400 {"error":"Missing required field: chatId"}

2. POST /api/spend/approve/1  (chatId "ATTACKER-666", belum pernah connect wallet manapun)
   → 403 {"error":"Bukan pemilik card"}                     ✅ exploit diblokir

3. POST /api/spend/reject/1   (chatId "ATTACKER-666")
   → 403 {"error":"Bukan pemilik card"}                     ✅ exploit diblokir (reject juga)

4. POST /api/spend/approve/99999  (spendId acak, tidak pernah ada)
   → 404 {"error":"Pending spend not found"}                ✅ tidak diloloskan begitu saja

5. GET /api/history/1 (setelah step 2-4)
   → record masih status "pending" — attacker TIDAK berhasil mengubah apapun on-chain

6. POST /api/spend/approve/1  (chatId "OWNER-777", owner asli)
   → 200 {"success":true}                                   ✅ flow normal tetap jalan

7. GET /api/history/1
   → status record berubah "pending" → "approved"

8. GET /api/cards/1
   → spentAmount naik tepat sebesar amount yang diapprove (transaksi on-chain nyata, bukan simulasi)

9. GET /health di setiap langkah
   → selalu 200 {"status":"ok"}, server tidak pernah crash
```

Skenario exploit BUG-001 (approve/reject spend orang lain pakai spendId tebakan) **sudah tidak bisa lagi**, dikonfirmasi lewat test #2-4. Flow normal (owner asli approve spend miliknya) **tetap berfungsi penuh dengan eksekusi on-chain nyata**, dikonfirmasi lewat test #6-8.

## Dampak ke tim lain

**Bot Team — WAJIB update:** setiap kali bot memanggil `POST /api/spend/approve/:spendId` atau `POST /api/spend/reject/:spendId` (biasanya dipicu tombol inline keyboard "✅ Approve"/"❌ Tolak" di Telegram), request **harus** menyertakan `chatId` (chat ID user yang menekan tombol) di body. Tanpa ini, request akan selalu gagal `400`.

Catatan konsistensi: pola ini sama persis dengan yang sudah dipakai di `POST /api/spend` (security hotfix sebelumnya) — kalau Bot Team sudah update untuk endpoint itu, pola `chatId` di body yang sama tinggal diterapkan lagi di sini.

## Issues untuk Orchestrator

Tidak ada blocking issue baru. Fix ini melengkapi rangkaian security hotfix sebelumnya (ownership validation di `/api/spend`, signature verification di `/connect`, cleanup endpoint lama) — sekarang ketiga titik yang bisa disalahgunakan (connect wallet, spend, approve/reject) semuanya sudah tervalidasi konsisten dengan pola yang sama (`chatId` → reverse-lookup wallet → bandingkan `card.owner`).

---

**File yang diubah:** `agentpay/packages/backend/src/routes/spend.ts` (helper `authorizeSpendAction` baris ~96-116, dipanggil di kedua endpoint `approve`/`reject`)
