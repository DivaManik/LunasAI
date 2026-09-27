# Laporan Tim Backend — Cleanup: Nonaktifkan Endpoint Lama `connect-telegram`

**Tanggal:** 2026-09-25
**Status:** SELESAI
**Konteks:** Menutup celah bypass yang dilaporkan di `docs/agents/reports/02-backend-team-report-signature.md` — endpoint lama `POST /api/connect-telegram` memungkinkan skip signature verification yang baru diimplementasikan.

---

## Perubahan

File: `agentpay/packages/backend/src/index.ts`

- **Dihapus** (bukan comment-out) route handler `POST /api/connect-telegram` beserta import `connectTelegram` dari `./db` yang jadi tidak terpakai setelah itu — supaya tidak ada dead code/unused import.
- Tidak ada file lain yang diubah.

## Test setelah perubahan

```
GET  /health                          → 200 {"status":"ok"}
POST /api/connect-telegram (lama)     → 404 Not Found   ✅ endpoint mati, bypass tertutup
POST /api/auth/nonce (baru)           → 200 {"message":"AGENTPAY-VERIFY-..."}   ✅ tetap jalan
GET  /api/cards/1                     → 200 (data card normal)                  ✅ tetap jalan
GET  /api/history/1                   → 200 []                                  ✅ tetap jalan
POST /api/spend (validasi field)      → 400 (pesan error normal)                ✅ tetap jalan
GET  /health (setelah semua test)     → 200 {"status":"ok"}                     ✅ server tidak crash
```

Server start bersih tanpa error/warning apapun setelah penghapusan.

## Dampak

Satu-satunya jalur untuk menghubungkan wallet ke Telegram chat sekarang **wajib** lewat flow signature verification (`POST /api/auth/nonce` → sign → `POST /api/auth/verify`). Exploit "connect wallet orang lain tanpa bukti kepemilikan" yang dilaporkan sebelumnya sudah tertutup sepenuhnya — tidak ada lagi jalur alternatif yang bypass validasi.

## Dampak ke tim lain

**Bot Team:** kalau ada kode bot yang masih memanggil `POST /api/connect-telegram` (versi lama, command `/connect` yang langsung simpan mapping tanpa verifikasi), request itu sekarang akan gagal `404`. Pastikan bot sudah migrasi penuh ke flow baru (`/connect` → nonce → `/verify` → signature) sesuai `docs/agents/reports/hotfix-signature-verification.md`.

## Issues untuk Orchestrator

Tidak ada isu baru. Ini menyelesaikan isu kritis yang saya flag di laporan sebelumnya — status sekarang CLEAN, tidak ada jalur bypass yang tersisa dari sisi backend.

---

**File yang diubah:** `agentpay/packages/backend/src/index.ts`
