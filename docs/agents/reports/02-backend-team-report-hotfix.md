# Laporan Tim Backend — HOTFIX Sync ABI

**Tanggal:** 2026-09-25
**Status:** SELESAI
**Konteks:** Lanjutan dari `02-backend-team-report.md` — Contract Team sudah fix Issue #2 (approveSpend/rejectSpend blocking) yang saya flag sebelumnya.

---

## Yang sudah selesai

- Update `src/services/contract.ts` untuk sinkron dengan ABI baru hasil hotfix Contract Team:
  - Tipe `OnChainCard` ditambah field `authorizedAgent`.
  - Decode tuple dari getter `cards(cardId)` diperbaiki dari 6 elemen → 7 elemen (field baru `authorizedAgent` ada di antara `owner` dan `totalBudget`). Tanpa fix ini, semua field setelah `owner` akan salah geser secara diam-diam (bukan error, tapi data korup).
- `callSpend`/`callApproveSpend`/`callRejectSpend` tidak perlu diubah — ABI dibaca langsung dari file JSON compile, otomatis sinkron.
- Test ulang manual dengan curl terhadap kontrak address baru (`0xACDAc5d57dB7a97013D002a8d073578347C057AE`):
  - `GET /api/cards/:id` — decode tuple 7-elemen sukses, tidak crash.
  - `POST /api/spend/approve/999` dan `reject/999` — pesan revert sekarang `"Not authorized"` (dulu `"Not card owner"`), diteruskan dengan bersih ke response API.
  - Server tetap hidup di semua skenario error.

## Yang belum / blocked

- Belum tes flow sukses penuh (`spend → autoApproved:false → approve → transfer benar-benar jalan`) karena belum ada card live di kontrak baru — itu butuh `createCard` yang scope-nya Frontend/Dashboard Team. `cast` CLI tidak tersedia di environment saya untuk bikin card manual sebagai workaround test.

## Output untuk tim lain

Tidak ada perubahan endpoint atau kontrak API — response shape semua endpoint tetap sama persis seperti laporan sebelumnya. Yang berubah cuma internal (cara decode data dari kontrak) dan pesan error revert (`"Not card owner"` → `"Not authorized"`).

**Untuk Frontend/Dashboard Team:** saat implementasi `createCard`, pastikan kirim param ke-4 `authorizedAgent = 0xBa4918Ff177C289F01fd362bc8a55B3e0469149f` (deployer address) — kalau tidak, backend tidak akan bisa approve/reject spend untuk card tersebut (balik ke masalah lama).

**Untuk Audit Team:** Issue #2 dari laporan sebelumnya ("approveSpend selalu gagal kecuali card dibuat deployer wallet") **sudah resolved** — tidak perlu workaround demo lagi, asalkan Frontend mengirim `authorizedAgent` yang benar saat create card.

## Issues yang perlu diketahui Orchestrator

Tidak ada issue baru. Hotfix ini murni sync teknis, tidak ada keputusan yang perlu diambil.

---

**Referensi teknis lengkap:** `agentpay/packages/backend/PROGRESS.md` (bagian "HOTFIX 2026-09-25")
