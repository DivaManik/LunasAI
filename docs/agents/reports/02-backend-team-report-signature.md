# Laporan Tim Backend — Signature-Based Wallet Verification

**Tanggal:** 2026-09-25
**Status:** SELESAI
**Referensi instruksi:** `docs/agents/reports/hotfix-signature-verification.md` (bagian "Backend Team")

---

## Yang sudah selesai

Sesuai spec di file instruksi, dikerjakan 3 perubahan di `agentpay/packages/backend/`:

1. **`src/db.ts`** — tambah store `pendingNonces: Map<chatId, {walletAddress, nonce, expiresAt}>` plus interface `PendingNonce` untuk type-safety (TypeScript strict mode).
2. **`src/routes/auth.ts`** (file baru) — 2 endpoint:
   - `POST /api/auth/nonce` — terima `{walletAddress, chatId}`, validasi format address, generate nonce random 16-byte, simpan pending selama 10 menit, return `{message: "AGENTPAY-VERIFY-<nonce>"}`.
   - `POST /api/auth/verify` — terima `{signature, chatId}`, ambil pending nonce, cek belum expired, verifikasi signature dengan `viem.verifyMessage()` (recover address dari signature, bandingkan dengan wallet yang diklaim di step nonce), kalau valid → panggil `connectTelegram()` (fungsi yang sudah ada di `db.ts`, tidak diubah) dan hapus pending nonce.
3. **`src/index.ts`** — register `app.route("/api/auth", auth)`.

Implementasi mengikuti kode contoh di instruksi, dengan beberapa penyesuaian kecil supaya konsisten dengan pola error-handling yang sudah ada di codebase (null-check body, try/catch JSON parse, `chatId` selalu di-`String()` sebagai Map key) — tidak ada perubahan logic inti dari yang diminta.

## Test yang dijalankan

**Flow signature lengkap** (pakai wallet test asli via `viem/accounts`, bukan mock — private key digenerate, message benar-benar di-sign secara kriptografis):

```
1. Generate wallet test A, minta nonce untuk wallet A + chatId "TEST-CHAT-1"
   → 200 {"message":"AGENTPAY-VERIFY-<nonce>"}

2. Sign message pakai private key wallet A yang ASLI (simulasi MetaMask)
   → dapat signature valid

3. POST /api/auth/verify dengan signature asli + chatId "TEST-CHAT-1"
   → 200 {"success":true,"walletAddress":"0x24f2...2cff"}   ✅ owner asli lolos verifikasi

4. SKENARIO SERANGAN: minta nonce untuk wallet A lagi (chatId "TEST-CHAT-2"), tapi
   di-sign pakai private key wallet B (attacker, wallet BERBEDA, mengklaim jadi wallet A)
   → POST /api/auth/verify dengan signature attacker
   → 403 {"error":"Signature tidak valid. Pastikan kamu sign dengan wallet yang benar."}   ✅ attacker diblokir
```

**Edge case:**
```
POST /api/auth/nonce  (wallet address format salah)      → 400 {"error":"Invalid wallet address"}
POST /api/auth/nonce  (field kosong)                      → 400 {"error":"Missing required fields: walletAddress, chatId"}
POST /api/auth/verify (chatId belum pernah minta nonce)    → 400 {"error":"Tidak ada sesi connect aktif. Mulai ulang dengan /connect"}
POST /api/auth/verify (field kosong)                       → 400 {"error":"Missing required fields: signature, chatId"}
POST /api/auth/verify (signature bukan hex valid/garbage)  → 403 {"error":"Signature tidak valid."}
```

Server tetap hidup (`GET /health` → 200) di semua skenario, termasuk setelah percobaan attacker dan input sampah.

## Perbedaan dari kode contoh di instruksi (minor, tidak mengubah behavior inti)

- `verifyMessage` dari viem yang dipakai adalah versi **standalone util** (`import { verifyMessage } from "viem"`), bukan method di public client. Versi ini cukup untuk EOA wallet (MetaMask standar) dan tidak butuh RPC call ke chain — lebih cepat dan tidak bergantung koneksi RPC. Catatan dari dokumentasi viem: versi ini **tidak mendukung smart contract wallet (ERC-1271)** — kalau nanti ada requirement dukung Safe/smart wallet, perlu ganti ke `publicClient.verifyMessage()`. Untuk MVP hackathon ini tidak relevan.
- Tambah null-check dan try/catch di parsing body request (pola yang sudah dipakai di semua route lain di backend), supaya request malformed tidak menyebabkan crash tak terduga.

## Issue kritis yang perlu diketahui Orchestrator

**Endpoint lama `POST /api/connect-telegram` (tanpa signature) masih aktif dan TIDAK dihapus.** Instruksi hotfix tidak menyebutkan untuk menonaktifkannya, jadi saya tidak mengubahnya secara sepihak (di luar scope yang diminta, dan berisiko merusak dependency Bot Team yang belum tentu sudah migrasi).

**Tapi ini artinya security fix ini bisa di-bypass sepenuhnya** — siapapun masih bisa langsung `POST /api/connect-telegram { walletAddress: "wallet-korban", telegramChatId: "chat-attacker" }` tanpa perlu signature apapun, exact vulnerability yang sama seperti sebelum hotfix ini, cuma lewat jalur berbeda.

**Rekomendasi:** setelah Bot Team migrasi ke `/connect` + `/verify` flow baru, endpoint `POST /api/connect-telegram` lama sebaiknya **dinonaktifkan atau dihapus**. Saya tidak melakukan ini karena di luar scope instruksi saat ini — perlu keputusan eksplisit dari Orchestrator, dan perlu dikoordinasikan supaya tidak merusak Bot Team yang sedang mengerjakan bagian mereka secara paralel.

## Output untuk tim lain

**Untuk Bot Team:**
```
POST /api/auth/nonce   { walletAddress, chatId }  → { message: "AGENTPAY-VERIFY-<nonce>" }
POST /api/auth/verify  { signature, chatId }      → { success: true, walletAddress } | error dengan status 400/403
```
Endpoint ini siap dipakai — sudah dites end-to-end dengan wallet asli (bukan mock).

**Untuk Frontend Team:** tidak ada dependency ke frontend dari sisi backend untuk bagian ini — endpoint auth generik, tidak peduli signature datang dari dashboard atau sumber lain, selama format signature-nya valid ECDSA hasil `personal_sign`.

---

**File yang diubah/ditambah:** `src/db.ts` (edit), `src/routes/auth.ts` (baru), `src/index.ts` (edit) — sesuai scope Backend Team di instruksi.
