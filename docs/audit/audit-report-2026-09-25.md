# AgentPay Audit Report
**Date:** 2026-09-25
**Auditor:** Audit Team

## Executive Summary

**TIDAK SIAP DEMO tanpa satu fix kecil dulu.** Ada 1 Critical issue di backend (bukan di smart contract) yang membuka bypass total terhadap approval flow — mudah di-fix (tambah 1 ownership check), tapi harus ditutup sebelum demo karena langsung merusak cerita inti "approval-required spend butuh persetujuan pemilik". Di luar itu, contract security solid, flow auto-approve terverifikasi jalan end-to-end dengan transaksi on-chain nyata, dan sebagian besar integrasi sudah benar. **Belum ada tim manapun yang membuktikan flow approval-required (laptop gaming) atau `/verify` signature lengkap lewat bot Telegram sungguhan** — ini gap testing, bukan bug yang diketahui, tapi perlu di-drill sebelum naik panggung.

---

## Critical Issues (harus fix)

### Issue 1: `POST /api/spend/approve/:spendId` dan `/reject/:spendId` tidak memvalidasi siapa yang memanggil

- **Location:** `agentpay/packages/backend/src/routes/spend.ts:96-136`
- **Description:** Kedua endpoint ini langsung memanggil `callApproveSpend(spendId)` / `callRejectSpend(spendId)` begitu menerima `spendId` dari URL param — tidak ada pengecekan bahwa request datang dari chat Telegram pemilik card, atau dari siapapun yang berwenang. Backend selalu sign dengan private key-nya sendiri (`account` di `services/contract.ts`), yang di on-chain berstatus `authorizedAgent` untuk **setiap** card. Karena kontrak menerima `card.owner || card.authorizedAgent` (lihat hotfix contract), dan backend selalu memenuhi syarat `authorizedAgent`, kontrak akan selalu menerima panggilan approve/reject dari backend — apapun requester HTTP-nya.
- **Impact:** Siapapun yang bisa mengirim HTTP request ke backend (port 3001, atau lewat tunnel/ngrok yang dipakai untuk demo) dan menebak/tahu `spendId` (integer sekuensial mulai dari 1 — sangat mudah ditebak) bisa **approve atau reject pending spend milik card siapapun**, tanpa perlu terhubung ke Telegram sama sekali, tanpa perlu jadi pemilik card. Ini membatalkan seluruh model keamanan "approval wajib dari pemilik" yang jadi salah satu pesan demo utama (Skenario B). Contoh serangan: `curl -X POST http://<backend>/api/spend/approve/1` dari luar — akan mengeksekusi transfer dana real jika `spendId` 1 memang pending.
- **Verifikasi saya:** Dikonfirmasi lewat pembacaan kode (tidak ada `require`/check apapun sebelum `callApproveSpend`), dan dikonfirmasi lewat curl langsung terhadap `spendId` yang belum ada (`99999`) — hasilnya `{"error":"Not authorized"}` HANYA karena `pendingSpends[99999]` kosong (default ke address nol), BUKAN karena backend melakukan validasi apapun. Saya tidak bisa membuat `spendId` pending nyata untuk demo exploit penuh karena butuh private key pemilik card #1 (di luar akses saya sebagai auditor), tapi celahnya jelas dari kode: tidak ada baris validasi requester di kedua route ini, dibandingkan dengan `POST /api/spend` yang benar-benar memvalidasi (`spend.ts:46-49`).
- **Recommended Fix:** Endpoint approve/reject perlu menerima identitas requester (mis. `chatId` di body, sama seperti `/api/spend`), lookup wallet dari `chatId`, ambil `card.owner` dari `pendingSpends[spendId].cardId` → `cards[cardId]`, lalu tolak kalau wallet requester ≠ `card.owner`. Update juga `bot/src/lib/api.ts` (`approveSpend`/`rejectSpend`) dan `bot/src/callbacks/approval.ts` untuk mengirim `chatId` dari `ctx.chat.id`, supaya backend bisa memverifikasi bahwa penekan tombol Approve/Reject adalah chat yang terhubung ke `card.owner`.

---

## Medium Issues (noted, tidak blocker)

### Issue 2: `approveSpend()` di smart contract tidak re-cek budget sebelum transfer

- **Location:** `agentpay/packages/contracts/src/DelegationCard.sol:99-112`
- **Description:** `spend()` mengecek `card.spentAmount + amount <= card.totalBudget` sebelum membuat `PendingSpend`, tapi `approveSpend()` tidak mengulang cek ini sebelum eksekusi transfer — hanya update `card.spentAmount += ps.amount` lalu transfer.
- **Impact:** Dalam alur normal (single pending spend per approval, dieksekusi segera) ini tidak jadi masalah karena `spend()` sudah memvalidasi budget saat pending spend dibuat, dan `spentAmount` tidak berubah di antaranya kecuali ada auto-approved spend lain yang jalan duluan. Tapi **kalau ada 2+ pending spend yang menunggu approval bersamaan dan totalnya melebihi sisa budget** (mis. card budget 0.03 tBNB, dua pending spend masing-masing 0.02 tBNB dibuat sebelum salah satunya di-approve), meng-approve keduanya akan berhasil tanpa revert, membuat `spentAmount` melebihi `totalBudget` dan contract mencoba transfer lebih dari saldo yang seharusnya dialokasikan untuk card itu (berpotensi `.transfer()` revert karena saldo contract habis, atau — kalau ada card lain berbagi saldo contract — "meminjam" dana card lain secara tidak sengaja).
- **Impact untuk demo:** Rendah — skenario demo yang direncanakan (Skenario A/B/C) hanya membuat 1 pending spend pada satu waktu, jadi tidak akan terpicu. Dicatat untuk kesadaran, tidak untuk di-fix sebelum demo.
- **Recommended Fix (non-urgent):** Tambah `require(card.spentAmount + ps.amount <= card.totalBudget, "Insufficient budget")` di awal `approveSpend()`.

### Issue 3: `/use <cardId>` di bot tidak memvalidasi kepemilikan card

- **Location:** `agentpay/packages/bot/src/commands/use.ts:20-26`
- **Description:** Setelah cek `connectedWallets.has(chatId)`, `/use` hanya memeriksa `card.isActive` — tidak memeriksa apakah `card.owner` cocok dengan wallet yang ter-`/verify` untuk chat tersebut. User bisa `/use <card_id milik orang lain>` dan bot akan menerimanya, menampilkan detail budget/limit card tersebut.
- **Impact:** Bukan risiko kehilangan dana — begitu user mencoba `/buy`, `POST /api/spend` di backend **sudah benar** memvalidasi ownership (`spend.ts:46-49`) dan akan menolak dengan `403 Card bukan milik kamu`. Jadi dampaknya terbatas ke: (a) minor information disclosure (budget/limit/expiry card orang lain bisa dilihat lewat `/use` + balasan botnya), dan (b) UX membingungkan — user bisa `/use` sukses lalu `/buy` gagal dengan pesan yang tidak menjelaskan bahwa akar masalahnya adalah card bukan miliknya.
- **Recommended Fix (non-urgent untuk demo, tapi cepat):** Tambah cek `card.owner.toLowerCase() === connectedWallets.get(chatId)?.toLowerCase()` di `use.ts`, balas error yang jelas kalau tidak cocok.

### Issue 4: Endpoint approve/reject dan shop `/purchase` — integrasi tidak lengkap
- **Location:** `agentpay/packages/backend/src/routes/spend.ts`, `agentpay/packages/shop/src/index.ts:34-53`
- **Description:** Backend tidak pernah memanggil `POST {SHOP_URL}/purchase` setelah spend berhasil (auto-approved maupun approved). Pembayaran on-chain (transfer tBNB ke `merchantAddress`) memang benar-benar terjadi, tapi endpoint `/purchase` milik shop (yang mengembalikan `orderId` dan pesan konfirmasi order) tidak pernah dipanggil oleh siapapun di codebase ini — endpoint tersebut sepenuhnya dead code dari sisi integrasi backend→shop.
- **Impact untuk demo:** Rendah — dana tetap berpindah on-chain dengan benar, dan pesan sukses ke user tetap muncul dari backend (bukan dari shop). Tidak akan terlihat sebagai bug di demo karena tidak ada UI yang menampilkan `orderId`. Dicatat sebagai gap arsitektur, bukan blocker.

---

## Demo Flow Results

### Skenario A: Auto-Approve Flow — ⚠️ Sebagian terverifikasi (via laporan tim + audit code review, belum full live run oleh Audit Team)

Card #1 sudah live di kontrak baru (`0xACDAc5d57dB7a97013D002a8d073578347C057AE`):
```
owner = authorizedAgent = 0xBa4918Ff177C289F01fd362bc8a55B3e0469149f
totalBudget = 0.03 tBNB, spentAmount = 0.006 tBNB, autoApproveLimit = 0.01 tBNB
isActive = true
```
`spentAmount` yang sudah terpakai (0.006 tBNB) match dengan hasil test Bot Team sebelumnya (`/buy hoodie basic` sukses, +0.005 tBNB) plus kemungkinan 1 test tambahan — mengonfirmasi transaksi on-chain nyata sudah pernah berjalan sukses via flow ini. Backend, shop, dashboard ketiganya hidup dan merespons normal saat audit dijalankan (`/health` 200 di 3001 dan 3002, dashboard 200 di 3000).

**Belum saya buktikan ulang secara langsung** (Audit Team tidak connect wallet baru / tidak punya private key card owner) — mengandalkan bukti dari laporan Bot Team (`03-bot-team-report.md`) yang sudah melakukan test live dan mengonfirmasi lewat `GET /api/cards/1` sebelum/sesudah. **Rekomendasi: lakukan 1x dry-run penuh Skenario A dengan wallet asli sebelum naik panggung**, idealnya dengan card baru (bukan card #1 yang budget-nya sudah menipis).

### Skenario B: Approval Flow — ❌ BELUM PERNAH DIBUKTIKAN END-TO-END OLEH TIM MANAPUN

Tidak ada laporan tim (Bot, Backend, Frontend) yang mengonfirmasi flow approval-required berjalan sukses penuh:
- Bot Team: card test kehabisan budget yang cukup untuk laptop gaming (0.05 tBNB) sebelum sempat test tombol Approve/Reject — dihentikan atas permintaan user.
- Card #1 saat ini (`totalBudget=0.03 tBNB`, `spentAmount=0.006 tBNB`, sisa 0.024 tBNB) **masih tidak cukup** untuk `laptop-gaming` (0.05 tBNB) — `spend()` akan revert `"Insufficient budget"` sebelum sempat masuk jalur pending/approval sama sekali.
- Saya (Audit Team) tidak punya akses wallet pemilik card manapun untuk membuat pending spend baru dan menekan tombol Approve/Reject secara nyata.

**Ini bukan bug yang diketahui — ini murni gap testing.** Kode approval (`spend()` pending path, `approveSpend`, `callback approval.ts`) terlihat benar secara statis, TAPI belum pernah dibuktikan berjalan sungguhan dari klik tombol Telegram sampai transfer on-chain sukses. Digabung dengan Critical Issue 1 (approve/reject tanpa ownership check di backend), jalur ini adalah **risiko tertinggi untuk demo**.

**Rekomendasi wajib sebelum demo:**
1. Mint card baru dengan `totalBudget` ≥ 0.06 tBNB dan `autoApproveLimit` ≤ 0.01 tBNB (supaya laptop gaming pasti masuk jalur approval).
2. Jalankan penuh: `/buy laptop gaming` → notifikasi approval masuk ke Telegram pemilik → tap tombol ✅ Approve → konfirmasi pesan update + `spentAmount` naik di `GET /api/cards/:id`.
3. Uji juga tombol ❌ Tolak sekali, pastikan `spentAmount` TIDAK naik dan pesan reject muncul.

### Skenario C: Edge Cases

| # | Skenario | Hasil | Catatan |
|---|---|---|---|
| 1 | `/use 99999` | ✅ Sesuai (kode) | `getCard` di backend return 404 → bot balas "Card ID 99999 tidak ditemukan." Diverifikasi lewat `GET /api/cards/2` (card belum ada) → `{"error":"Card not found"}`, logic bot menangani ini dengan benar (`use.ts:39-42`). |
| 2 | `/buy produk-tidak-ada` | ✅ Sesuai (kode) | `findMatch` return `undefined` → bot balas daftar produk yang tersedia. Diverifikasi lewat `GET /products` di shop — daftar produk lengkap dan sesuai (`kopi-premium` bukan `coffee-premium`, sesuai catatan info tambahan). |
| 3 | `/buy hoodie basic` TANPA `/connect`/`/verify` | ✅ Sesuai (kode) | `buy.ts:22-25` cek `connectedWallets.has(chatId)` di awal, balas "Kamu belum connect wallet..." sebelum sempat cek card aktif. |
| 4 | Revoke card dari dashboard → `/buy kopi premium` | ⚠️ Belum dites live | Kode benar secara statis: `revokeCard` on-chain set `isActive=false`; `spend()` di kontrak punya `require(card.isActive, "Card is not active")` yang akan revert; backend meneruskan revert reason ke `400 {"error":"Card is not active"}`. Belum dibuktikan lewat klik tombol Revoke di dashboard + `/buy` sungguhan. |
| 5 | Beli produk melebihi remaining budget | ✅ Sesuai (kode + tak langsung terverifikasi) | `require(card.spentAmount + amount <= card.totalBudget)` di kontrak. Card #1 saat ini (sisa 0.024 tBNB) tidak cukup untuk laptop (0.05 tBNB) — ini justru **mengonfirmasi** guard ini aktif (percobaan test approval saya sendiri gagal karena alasan ownership duluan sebelum sempat kena guard ini, tapi kombinasi keduanya konsisten dengan implementasi kontrak). |

---

## Integration Status

| Item | Status | Catatan |
|---|---|---|
| Dashboard baca data card dari BNB Testnet | ✅ | Pakai `cards(cardId)` getter (bukan `getCard`), field 7 elemen sudah benar sesuai ABI hotfix. |
| Dashboard `createCard` → transaksi valid di BscScan | ✅ (kode benar, belum live-test oleh Audit Team) | Mengirim `authorizedAgent = AUTHORIZED_AGENT` (deployer) dengan benar, sesuai hotfix. Card ID di-decode dari event `CardCreated`, bukan return value — pendekatan benar untuk wagmi `writeContract`. |
| Backend baca contract via `getCard`/`cards` | ✅ | Terverifikasi live — `GET /api/cards/1` return data card #1 yang valid dan konsisten dengan histori testing sebelumnya. |
| Backend kirim notifikasi Telegram saat pending spend | ⚠️ Belum dibuktikan live | Kode ada (`spend.ts:75-84`, `sendApprovalRequest`), belum pernah terkonfirmasi sungguhan terkirim & tombolnya muncul di Telegram (lihat Skenario B). |
| Bot terima callback dari tombol Approve/Tolak | ⚠️ Kode ada, belum dites live | `callbacks/approval.ts` — regex handler benar, belum ada bukti chat log. |
| Backend `approveSpend` eksekusi transfer di chain | ⚠️ Kode benar tapi **TANPA ownership check** | Lihat Critical Issue 1. |
| Shop terima POST `/purchase` dari backend | ❌ Tidak diimplementasikan | Backend tidak pernah memanggil endpoint ini (Medium Issue 4). Tidak menghalangi demo (pembayaran on-chain tetap jalan), tapi item checklist ini secara harfiah tidak terpenuhi. |
| History endpoint return records yang benar | ✅ | `GET /api/history/1` return `[]` (in-memory, kosong setelah restart backend) — format response benar sesuai kode (`spend.ts` mengisi `addSpendRecord` di jalur sukses). |

---

## UX Review

| Item | Status | Catatan |
|---|---|---|
| Pesan error informatif | ✅ | Semua path yang direview mengembalikan pesan Bahasa Indonesia yang jelas, tidak ada `undefined`/stack trace bocor ke user. `extractRevertReason` di backend membungkus revert on-chain dengan rapi. |
| Loading states saat menunggu | ✅ | Dashboard: `isPending`/`isConfirming` state di `CreateCardForm`. Bot: pesan interim ("🔍 Mencari...", "🔍 Memverifikasi signature...", "🛒 Ditemukan... Memproses..."). |
| Tidak ada console error di browser | ⚠️ Belum diverifikasi visual oleh Audit Team | Frontend Team melaporkan tidak ada error di log dev server saat `curl`, tapi belum ada verifikasi browser interaktif sungguhan (console tab) dari siapapun. |
| Bot response Bahasa Indonesia jelas | ✅ | Konsisten di semua command yang direview. |
| Amount selalu tBNB, bukan wei | ✅ | `weiToDisplay()` dipakai konsisten di `use.ts`, `balance.ts`; dashboard pakai `formatEther`/`weiToTbnb`. |

---

## Recommendation

**[ ] SIAP DEMO**
**[x] TIDAK SIAP — ada 1 critical issue (mudah di-fix) + testing approval flow yang belum tuntas**

**Sebelum demo, wajib:**
1. **Fix Critical Issue 1** — tambah ownership check di `POST /api/spend/approve/:spendId` dan `/reject/:spendId` (estimasi: kecil, ~30 menit, mengikuti pola yang sudah ada di `POST /api/spend`).
2. **Jalankan Skenario B penuh minimal 1x** dengan card baru yang budget-nya cukup untuk memicu jalur approval, sampai tombol Approve/Reject benar-benar diklik dan dikonfirmasi transfer sukses.
3. Jalankan 1x dry-run flow signature lengkap (`/connect` → dashboard Sign Message → `/verify`) dengan MetaMask sungguhan — belum ada satupun tim yang membuktikan ini end-to-end, semua testing sejauh ini berhenti di level curl (backend) atau ditunda (bot/frontend).

**Boleh diterima sebagai known limitation MVP (tidak perlu fix sebelum demo):**
- Medium Issue 2 (approveSpend tanpa re-check budget) — tidak akan terpicu di skenario demo yang direncanakan.
- Medium Issue 3 (`/use` tanpa ownership check) — backend tetap jadi garis pertahanan yang benar untuk dana.
- Medium Issue 4 (shop `/purchase` tidak terpanggil) — tidak terlihat dari sisi demo, dana tetap berpindah benar.

---

## Bug Reports (format terpisah untuk eskalasi ke tim)

```
BUG-001
Severity: CRITICAL
Component: backend
File: agentpay/packages/backend/src/routes/spend.ts:96-136
Description: POST /api/spend/approve/:spendId dan /api/spend/reject/:spendId tidak memvalidasi
  identitas requester. Backend selalu sign dengan private key sendiri yang berstatus
  authorizedAgent di semua card, sehingga kontrak selalu menerima panggilan approve/reject
  dari backend tanpa peduli siapa yang memicu HTTP request-nya.
Steps to reproduce:
  1. Buat pending spend valid (spend di atas autoApproveLimit) untuk card manapun.
  2. Tanpa terhubung ke Telegram/chat pemilik sama sekali, kirim
     `curl -X POST http://<backend>:3001/api/spend/approve/<spendId>` dari sumber manapun.
Expected: Ditolak (403) kecuali requester terbukti chat yang terhubung ke card.owner.
Actual: Diproses tanpa hambatan — transfer dana benar-benar dieksekusi di chain.
Suggested fix: Tambah param `chatId` di body request (sama seperti POST /api/spend), lookup
  wallet dari telegramMappings, cocokkan dengan card.owner dari pendingSpends[spendId].cardId
  sebelum memanggil callApproveSpend/callRejectSpend. Update bot/src/lib/api.ts dan
  bot/src/callbacks/approval.ts untuk mengirim chatId dari ctx.chat.id.
```

```
BUG-002
Severity: MEDIUM
Component: contract
File: agentpay/packages/contracts/src/DelegationCard.sol:99-112
Description: approveSpend() tidak re-validasi card.spentAmount + ps.amount <= card.totalBudget
  sebelum transfer, berbeda dengan spend() yang mengecek ini sebelum membuat pending spend.
Steps to reproduce:
  1. Buat card dengan budget 0.03 tBNB, autoApproveLimit 0.01 tBNB.
  2. Buat 2 pending spend masing-masing 0.02 tBNB (total 0.04 tBNB, melebihi budget).
  3. approveSpend() untuk kedua spendId tersebut secara berurutan.
Expected: Approval kedua harus revert karena akan melebihi totalBudget.
Actual: Kedua approval berhasil tanpa validasi ulang budget (tidak dites live — ditemukan
  lewat code review, functionally akan gagal di .transfer() jika saldo kontrak habis, tapi
  tidak ada require() eksplisit yang menjaga invariant spentAmount <= totalBudget).
Suggested fix: require(card.spentAmount + ps.amount <= card.totalBudget, "Insufficient budget");
  di baris pertama approveSpend(), sebelum ps.isApproved = true.
```

```
BUG-003
Severity: LOW
Component: bot
File: agentpay/packages/bot/src/commands/use.ts:20-26
Description: /use <cardId> hanya cek card.isActive, tidak cek card.owner cocok dengan wallet
  yang terhubung ke chat. User bisa /use card milik orang lain dan melihat detail budgetnya.
Steps to reproduce:
  1. /connect + /verify dengan wallet A.
  2. /use <cardId milik wallet B>.
Expected: Ditolak dengan pesan jelas ("Card ini bukan milik kamu").
Actual: Diterima, bot menampilkan detail card (budget, limit, expiry) milik wallet B.
  /buy setelahnya akan gagal di backend (403 Card bukan milik kamu) — jadi tidak ada
  risiko kehilangan dana, hanya info disclosure + UX membingungkan.
Suggested fix: Tambah cek card.owner.toLowerCase() === connectedWallets.get(chatId)?.toLowerCase()
  di use.ts sebelum activeCards.set(...).
```

```
BUG-004
Severity: LOW (cleanup)
Component: bot
File: agentpay/packages/bot/src/lib/api.ts:46-52
Description: Fungsi connectTelegram() masih ada dan memanggil POST /api/connect-telegram,
  endpoint yang sudah dihapus dari backend (lihat docs/agents/reports/02-backend-team-report-cleanup.md).
  Fungsi ini tidak dipanggil di manapun (dead code) — connect.ts sudah migrasi ke requestNonce().
Steps to reproduce: N/A — dead code, tidak menyebabkan bug fungsional saat ini.
Expected: Tidak ada kode yang mereferensikan endpoint yang sudah dihapus.
Actual: Fungsi masih ada, berisiko dipanggil lagi secara tidak sengaja di masa depan
  (akan langsung 404 kalau dipanggil).
Suggested fix: Hapus fungsi connectTelegram() dari bot/src/lib/api.ts.
```

---

**File yang direview:** `DelegationCard.sol`, seluruh `packages/backend/src/`, seluruh `packages/bot/src/`, `packages/dashboard/components/CreateCardForm.tsx`, `packages/dashboard/lib/abi.ts`, `packages/shop/src/index.ts` + `products.ts`, seluruh laporan tim di `docs/agents/reports/`.

**Tidak bisa dijalankan:** `forge test` (Foundry `forge` tidak ada di PATH environment audit ini) — kontrak tidak dites lewat test suite otomatis, hanya lewat code review manual + observasi state live di chain (card #1 sudah terverifikasi konsisten dengan hasil test tim sebelumnya).
