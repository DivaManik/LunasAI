# Agent: Bot Team — Laporan Hotfix Signature Verification

**Update:** 2026-09-25
**Scope:** Hanya bagian **Bot Team** dari `docs/agents/reports/hotfix-signature-verification.md`
**Referensi instruksi:** `docs/agents/reports/hotfix-signature-verification.md`

## Status: Kode selesai, typecheck bersih. Testing end-to-end dengan signature asli belum dilakukan — dihentikan atas keputusan user karena Frontend/dashboard (komponen `SignMessage`) belum tersedia.

---

## Yang Dikerjakan

### File yang diubah/dibuat (semua di `packages/bot/`)

| File | Perubahan |
|---|---|
| `src/lib/api.ts` | Tambah 2 fungsi baru: `requestNonce(walletAddress, chatId)` → `POST /api/auth/nonce`, `verifySignature(signature, chatId)` → `POST /api/auth/verify`. Mengikuti pola existing (`request<T>()` helper terpusat + `ApiError`), bukan `fetch` langsung seperti contoh mentah di dokumen hotfix. |
| `src/commands/connect.ts` | **Diubah total.** Tidak lagi langsung panggil `connectTelegram()` (endpoint lama `/api/connect-telegram`) dan set `connectedWallets` — sekarang cuma minta nonce dari backend dan tampilkan instruksi sign ke user. Mapping wallet↔chat baru tersimpan setelah `/verify` sukses. |
| `src/commands/verify.ts` | **File baru.** Command `/verify <signature>` — kirim ke `POST /api/auth/verify`, kalau sukses simpan `connectedWallets.set(chatId, walletAddress)` dan balas konfirmasi (address dipendekkan `0x1234...abcd`). |
| `src/commands/start.ts` | Pesan welcome diperbarui: langkah `/connect` sekarang eksplisit disebut "mulai verifikasi wallet", ditambah langkah baru `/verify <signature>` sebelum `/use`. |
| `src/index.ts` | Import & register `registerVerifyCommand(bot)`. |

**Tidak diubah:** `use.ts`, `buy.ts`, `balance.ts`, `state.ts`, `approval.ts` — logic-nya tetap sama, cuma sekarang bergantung pada `connectedWallets` yang diisi oleh `verify.ts`, bukan `connect.ts`. Ini konsisten dengan alur baru: chat dianggap "connected" hanya setelah signature terverifikasi, bukan setelah sekadar mengetik address.

### Penyesuaian dari contoh kode di dokumen instruksi

Dokumen hotfix menyertakan contoh kode mentah (`handleConnect(ctx)`, `handleVerify(ctx)` sebagai fungsi standalone, `fetch` langsung tanpa helper, `dotenv.config()` inline). Saya **tidak** copy-paste literal itu — saya ikuti konvensi yang sudah ada di codebase bot (`registerXCommand(bot)` yang mendaftarkan handler, semua HTTP call lewat `lib/api.ts` terpusat dengan `ApiError`, env loading lewat `lib/env.ts` yang sudah dibuat di iterasi sebelumnya). Kontrak endpoint (path, payload, response) tetap persis mengikuti dokumen — hanya struktur kode bot-side yang disesuaikan ke pola existing.

---

## Verifikasi yang Sudah Dilakukan

✅ **Typecheck bersih** (`npx tsc --noEmit`, 0 error).

✅ **Bot berjalan tanpa error** — dikonfirmasi lewat log `tsx watch`, restart otomatis sukses setiap kali file diubah, tidak ada exception saat start.

✅ **Endpoint backend dikonfirmasi hidup dan sesuai kontrak** (dites langsung via `curl`, bukan lewat bot — murni untuk pastikan sisi Backend Team sudah siap sebelum saya integrasikan):
```
POST /api/auth/nonce   → {"message":"AGENTPAY-VERIFY-<hex>"}                                    ✅
POST /api/auth/verify  (signature invalid)     → 403 {"error":"Signature tidak valid."}         ✅
POST /api/auth/verify  (chatId tanpa sesi)      → 400 {"error":"Tidak ada sesi connect aktif..."} ✅
```

❌ **Belum dites:** alur lengkap dengan signature **asli** dari MetaMask (`/connect` → dashboard sign → `/verify <signature>` → sukses → `/use` → `/buy`). Ini butuh komponen `SignMessage` di dashboard (bagian Frontend Team di dokumen hotfix), yang belum tersedia saat laporan ini ditulis. Saya sempat menawarkan untuk simulasikan signature via script `viem` (`signMessage()` pakai `PRIVATE_KEY` yang sudah ada di `.env`, tanpa perlu dashboard) untuk menuntaskan test end-to-end dari sisi bot, tapi user memutuskan tidak perlu — jadi ini dihentikan atas keputusan eksplisit, bukan blocker teknis yang tidak bisa diatasi.

**Belum dites juga:** skenario "attack" di dokumen (`chat lain /connect 0xABC... → /verify signature palsu → reject 403`) — secara desain seharusnya jalan (signature palsu sudah dikonfirmasi reject 403 lewat curl langsung ke backend), tapi belum dibuktikan lewat interaksi bot yang sebenarnya.

---

## Yang Perlu Dilanjutkan Sebelum Demo

1. **Frontend Team** menyelesaikan komponen `SignMessage` di dashboard (di luar scope saya).
2. Setelah itu, test end-to-end penuh: `/connect` → sign di dashboard → `/verify` → `/use` → `/buy`.
3. Uji skenario attack: chat B mencoba `/connect` dengan address milik chat A, lalu `/verify` pakai signature yang bukan miliknya → harus reject.
4. Perlu diperhatikan: nonce **expire 10 menit** (ditentukan Backend Team di `pendingNonces`) — kalau testing manual lambat (misal harus bolak-balik ke dashboard), sesi bisa expired dan harus `/connect` ulang. Ini bukan bug, tapi perlu diketahui saat demo supaya tidak bingung kalau `/verify` tiba-tiba bilang "Sesi expired."

---

## Constraints yang Diikuti

- Hanya mengerjakan bagian Bot Team sesuai pembagian kerja di dokumen hotfix.
- Tidak menyentuh `packages/backend/` atau `packages/dashboard/` sama sekali.
- Tidak menyimpan private key atau signature di bot lebih lama dari yang diperlukan (signature diteruskan langsung ke backend, tidak disimpan di state bot).
- Mengikuti kontrak endpoint (`/api/auth/nonce`, `/api/auth/verify`) persis seperti yang didefinisikan di dokumen, tanpa mengubah nama field atau path.

---

## Referensi

- Instruksi hotfix: `docs/agents/reports/hotfix-signature-verification.md`
- Laporan Bot Team sebelumnya (fitur inti + temuan keamanan awal yang memicu hotfix ini): `docs/agents/reports/03-bot-team-report.md`
- Jobdesk asli: `docs/agents/03-bot-team.md`
