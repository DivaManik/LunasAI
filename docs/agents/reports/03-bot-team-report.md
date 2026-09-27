# Agent: Bot Team — Laporan Akhir

**Update:** 2026-09-25 (revisi 2 — breaking change `chatId` di `/api/spend` + pesan flow connect-first)
**Scope:** `packages/bot/` saja (sesuai `docs/agents/03-bot-team.md`)

## Status: Kode selesai, typecheck bersih. Testing live via Telegram sebagian besar sukses; jalur approval-required (card butuh approval) belum sempat diverifikasi tuntas — dihentikan atas permintaan user untuk dilanjutkan nanti, bukan karena bug yang belum diperbaiki.

---

## Revisi 2 — Update dari Backend & UX Flow (2026-09-25)

Dua perubahan diminta setelah laporan awal:

### Update 1 — `chatId` wajib di `POST /api/spend` (breaking change dari Backend)
`src/lib/api.ts`: `createSpend()` sekarang menerima parameter `chatId` tambahan. `src/commands/buy.ts` mengirim `chatId: ctx.chat!.id.toString()` di body request.

**Verifikasi:** ✅ **fully tested live.** Setelah backend dinyalakan ulang, user coba `/connect` → `/use 1` → `/buy hoodie basic` lengkap dan dapat balasan `✅ Pembelian berhasil!`. Dikonfirmasi juga via `GET /api/cards/1`: `spentAmount` naik persis +0.005 tBNB (harga hoodie) setelah request — bukti request dengan `chatId` baru diterima backend dan transaksi on-chain benar-benar tereksekusi, bukan cuma UI yang menampilkan sukses palsu.

### Update 2 — Pesan `/start`/`/help` dan error flow connect-first
- `src/commands/start.ts`: pesan welcome diganti ke format "Cara Pakai AgentPay" (dashboard → connect MetaMask → buat Card → `/connect` → `/use` → `/buy`) sesuai teks yang diberikan.
- **State baru:** `src/state.ts` menambah `connectedWallets: Map<chatId, walletAddress>` — diperlukan karena sebelumnya bot tidak melacak status "sudah connect atau belum" sama sekali, hanya melacak card aktif. Ini konsekuensi teknis langsung dari instruksi (butuh cara membedakan "belum connect" vs "belum `/use`"), bukan penambahan fitur di luar permintaan.
- `src/commands/connect.ts`: mengisi `connectedWallets` setelah `connectTelegram()` sukses.
- `src/commands/use.ts`: cek `connectedWallets` di awal handler → reply persis `"Kamu belum connect wallet. Ketik /connect <wallet_address> dulu."` jika belum connect.
- `src/commands/buy.ts`: cek yang sama di awal handler (pesan sama), dan pesan "belum ada card aktif" diubah dari `"❌ Belum ada card aktif.\nGunakan /use <card_id> terlebih dahulu."` jadi persis `"Belum ada card aktif. Ketik /use <card_id> dulu."` sesuai teks yang diminta.
- **Tidak diubah:** `src/commands/balance.ts` — instruksi hanya menyebut `/use` dan `/buy` secara eksplisit untuk pesan error connect-first, jadi `balance.ts` dibiarkan seperti semula untuk menghindari mengubah logic yang tidak diminta.

**Verifikasi:**
- ✅ **`/use` sebelum `/connect`** — fully tested live, hasil persis: `"Kamu belum connect wallet. Ketik /connect <wallet_address> dulu."`
- ⚠️ **`/buy` sebelum `/connect`** — **belum dibuktikan dengan chat log**, user belum sempat coba urutan ini. Logic di `buy.ts` identik dengan `use.ts` (cek `connectedWallets.has(chatId)` di baris pertama handler, sebelum cek lainnya), jadi confidence tinggi perilakunya sama — tapi ini estimasi berdasarkan pembacaan kode, bukan hasil test yang sudah dikonfirmasi. Perlu di-test eksplisit sebelum demo final.
- ✅ Pesan `/start` baru — belum ada laporan chat eksplisit dari user untuk revisi 2 ini (hanya dicek visual lewat pembacaan kode + typecheck), tapi format sudah persis sesuai teks yang diminta.

---

## Yang Dikerjakan

### File yang dibuat (semua di `packages/bot/`)
```
packages/bot/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                  # entry point, Grammy long polling
    ├── state.ts                  # Map<chatId, cardId> in-memory
    ├── lib/
    │   ├── env.ts                # dotenv.config() terpusat, di-import di setiap file yang baca process.env
    │   ├── api.ts                 # semua panggilan HTTP ke backend & shop
    │   └── format.ts              # weiToDisplay(), formatDate()
    ├── commands/
    │   ├── start.ts               # /start, /help
    │   ├── connect.ts             # /connect <wallet>
    │   ├── use.ts                 # /use <cardId>
    │   ├── buy.ts                 # /buy <item>
    │   └── balance.ts             # /balance
    └── callbacks/
        └── approval.ts            # handle tombol Approve/Tolak
```

Struktur file mengikuti persis daftar di jobdesk, ditambah `lib/env.ts`, `lib/api.ts`, `lib/format.ts`, dan `state.ts` sebagai helper (tidak diatur eksplisit di jobdesk, tapi perlu supaya tidak duplikasi kode antar command).

### Perbaikan di luar `packages/bot/`
- **`agentpay/.env`**: mengisi `TELEGRAM_BOT_TOKEN` yang sebelumnya kosong dengan token dari jobdesk (`8819857026:AAHdOLEGJBq4JHg9jEKamrcM_ejTireXJ4g`). Ini env root shared, bukan kode backend — dan sesuai catatan Backend Team di `PROGRESS.md` mereka memang menunggu Bot Team mengisi field ini. Tidak ada kode backend yang saya ubah.

---

## Bug yang Ditemukan & Diperbaiki (di dalam scope bot)

**Env loading order dengan `tsx`.** Sama seperti temuan Backend Team (`02-backend-team-report.md` koreksi #4): `tsx` mentranspile `import` sebagai ESM yang di-hoist, jadi kalau `dotenv.config()` cuma dipanggil sekali di `index.ts`, semua module lain yang baca `process.env` di top-level (misalnya `SHOP_WALLET_ADDRESS` di `buy.ts`) sudah dieksekusi duluan dengan `process.env` kosong.

Gejala nyata saat testing: `/buy laptop gaming` mengembalikan `❌ Missing required fields: cardId, merchantAddress, amount, description` — padahal semua field sudah dikirim, karena `merchantAddress` jadi string kosong (`SHOP_WALLET_ADDRESS` belum ke-load).

**Fix:** pusatkan `dotenv.config()` ke `src/lib/env.ts`, lalu `import "./env"` / `import "../lib/env"` di baris pertama setiap file yang baca `process.env` di top-level (`index.ts`, `lib/api.ts`, `commands/buy.ts`). Setelah fix, dikonfirmasi lewat testing live bahwa error tersebut hilang.

---

## Testing yang Sudah Dilakukan (live, via akun Telegram nyata ke @LunasPayBot — sesuai instruksi jobdesk, tidak ada cara lain untuk test Grammy long polling)

Karena belum ada card on-chain sama sekali saat pekerjaan ini dimulai (`createCard` adalah scope Frontend/Dashboard Team, dan baik Backend maupun Frontend Team mencatat di laporan masing-masing belum sempat test dengan card nyata), saya mint **1 card test on-chain** via script sekali-pakai (pakai `viem` + `PRIVATE_KEY` yang sudah ada di `.env`, dihapus setelah dipakai, tidak masuk ke `packages/bot/`) — atas persetujuan eksplisit user sebelum transaksi dikirim:

```
Card #1 — tx: 0xdb578cfc86db1c5f47ce50f5c24c05a666a43c92b361c08b23e411cefad918f7
owner = authorizedAgent = 0xBa4918Ff177C289F01fd362bc8a55B3e0469149f (deployer wallet)
totalBudget = 0.03 tBNB, autoApproveLimit = 0.01 tBNB, expiry = 30 hari
```

### Hasil test:
| Command | Hasil |
|---|---|
| `/start` | ✅ Pesan welcome lengkap muncul sesuai spec |
| `/connect 0xBa49...149f` | ✅ (diasumsikan sukses — user lanjut ke `/use` tanpa lapor error) |
| `/use 1` | ✅ Info card muncul |
| `/buy laptop gaming` (sebelum fix env) | ❌ Ditemukan bug — lihat bagian bug di atas |
| `/buy laptop gaming` (setelah fix env, dgn card #1 budget 0.03 tBNB) | ⚠️ Backend menolak dengan alasan benar: dana card tidak cukup (laptop 0.05 tBNB > total budget 0.03 tBNB). Ini **bukan bug** — pesan error diteruskan dengan jelas ke user, bot tidak crash. Tapi berarti jalur "approval-required" (tombol Approve/Reject) **belum tuntas divalidasi** karena card test kehabisan budget yang cukup. |
| `/buy hoodie basic`, `/balance`, tombol Approve/Reject | **Belum sempat/tidak sempat dikonfirmasi ulang** — testing dihentikan atas permintaan user ("sabar nanti saja testing lagi") sebelum sempat mint card #2 dengan budget lebih besar. |

**Catatan penting:** setelah sesi testing, backend instance yang tadinya melayani request (bukan punya saya — diasumsikan milik Backend Team/environment lain) menjadi tidak bisa diakses (`Connection refused` di port 3001). Bot tetap jalan normal (long polling tidak bergantung backend saat idle), tapi command apapun yang butuh backend akan gagal sampai backend dinyalakan lagi.

### Yang perlu dilanjutkan sebelum demo final:
1. Mint card baru dengan budget lebih besar (mis. 0.1 tBNB) untuk test tuntas jalur auto-approve DAN approval-required dalam satu card.
2. Konfirmasi tombol Approve/Reject benar-benar mengedit pesan dan memanggil `/api/spend/approve|reject/:spendId` dengan sukses.
3. Pastikan backend & shop service jalan sebelum demo (keduanya sempat saya jalankan manual di background untuk testing sesi ini, statusnya tidak persisten).

---

## Temuan Keamanan (di luar scope untuk saya perbaiki — perlu keputusan Orchestrator/Contract/Backend Team)

### Akar masalah: `/connect <wallet_address>` tidak membuktikan kepemilikan wallet sama sekali

`src/commands/connect.ts` hanya validasi **format** string (`0x` + 40 hex, lihat `WALLET_REGEX`). Tidak ada pembuktian kriptografis (mis. sign message via MetaMask lalu verifikasi signature) bahwa pengirim chat benar-benar mengontrol private key address tersebut. User bisa ketik address siapa saja — termasuk address orang lain yang dilihat dari BSCScan Testnet (public, gampang diakses dari histori transaksi `createCard`) — dan bot akan menerimanya begitu saja.

Backend (`POST /api/connect-telegram`, `packages/backend/src/index.ts`) juga tidak menambah validasi apa pun di sisi server — cuma cek field ada isinya, lalu langsung simpan mapping `walletAddress → chatId` (dikonfirmasi dengan membaca kode backend, bukan diubah).

**Ini akar dari 2 celah yang saling berkaitan:**

1. **`/connect` sendiri** — siapa saja bisa mengklaim wallet address orang lain sebagai miliknya, lalu mulai menerima notifikasi approval yang seharusnya cuma sampai ke pemilik asli (kalau dia connect duluan/ulang dengan address yang sama).
2. **`/use <cardId>` tanpa cek ownership** (temuan sebelumnya) — bot hanya cek `isActive`, tidak cek apakah `cardId` itu benar milik wallet yang ter-`/connect`. `cardId` cuma angka urut (0, 1, 2, ...), mudah ditebak.

**Dampak gabungan:** siapa saja yang tahu (atau menebak) `cardId` dan address pemilik card asli bisa: (a) `/connect` pakai address itu untuk "mencuri" jalur notifikasi approval, dan/atau (b) langsung `/use` + `/buy` pakai card itu tanpa perlu `/connect` sama sekali (karena `/use` juga tidak cek ownership). Untuk transaksi **di bawah** auto-approve limit, dana bisa langsung terpakai tanpa sepengetahuan pemilik. Untuk transaksi **di atas** limit, permintaan approval terkirim ke chat manapun yang **terakhir** `/connect` dengan address itu — kalau penyerang connect duluan, notifikasi approval bisa salah kirim ke penyerang, bukan pemilik asli.

**Ini sesuai scope spec MVP** (jobdesk bot cuma minta validasi format di `/connect`, tidak minta verifikasi signature; jobdesk `/use` juga cuma minta cek `isActive`), jadi saya tidak menambahkannya sendiri di bot (menghindari over-engineering di luar spec) apalagi mengubah backend/contract (di luar scope saya). Perbaikan yang mungkin, kalau diputuskan perlu sebelum demo:
- **Bot/Backend:** ganti `/connect` jadi alur signature-based (challenge-response: backend generate nonce, user sign via wallet, backend verifikasi signature cocok dengan address sebelum simpan mapping). Ini perubahan cukup besar, bukan one-liner.
- **Kontrak** (Contract Team): tambah `require` ownership check di `spend()`.
- **Backend** (Backend Team): validasi `cardId` yang di-passing ke `/api/spend` memang milik `walletAddress` yang terhubung ke `chatId` pengirim, sebelum lanjut ke on-chain call.

Direkomendasikan Orchestrator/Audit Team menilai apakah ini blocker untuk demo atau bisa diterima sebagai known limitation MVP (kemungkinan besar bisa diterima untuk demo hackathon dengan skop kecil, tapi **tidak aman untuk production**).

---

## Output untuk Orchestrator

```
BOT_STATUS=running (long polling aktif, tested via @LunasPayBot)
BOT_USERNAME=@LunasPayBot
COMMANDS_READY: /start, /connect, /use, /buy, /balance
CALLBACK_HANDLER=ready (kode selesai, tombol Approve/Reject belum sempat dikonfirmasi visual di chat)
TESTING_STATUS=partial — auto-approve path (hoodie) fully verified end-to-end termasuk chatId di /api/spend (revisi 2); approval-required path (laptop) & tombol Approve/Reject belum tuntas; /buy pre-connect belum dibuktikan chat log (high-confidence, sama logic dgn /use yg sudah terverifikasi)
KNOWN_ISSUE=tidak ada validasi ownership card di /use — lihat bagian "Temuan Keamanan"
```

---

## Constraints yang Diikuti

- Hanya mengerjakan `packages/bot/` (plus mengisi `TELEGRAM_BOT_TOKEN` kosong di `.env` root, bukan kode).
- Tidak hardcode produk — `/buy` selalu fetch dari `SHOP_URL/products`.
- Tidak menyimpan private key di bot.
- Pakai Grammy (bukan node-telegram-bot-api/telegraf).
- Tidak pakai `bot.start()` bersamaan dengan server Express — bot jalan murni long polling.
- Tidak mengubah `packages/backend/` atau `packages/contracts/` sama sekali.

---

## Referensi

- Spec: `docs/superpowers/specs/2026-09-24-agentpay-design.md`
- Plan Task 5: `docs/superpowers/plans/2026-09-24-agentpay-implementation.md`
- Jobdesk: `docs/agents/03-bot-team.md`
- Backend Team report (env loading bug, known limitations terkait): `docs/agents/reports/02-backend-team-report.md`, `docs/agents/reports/02-backend-team-report-hotfix.md`
