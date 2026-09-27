# Agent: Bot Team

## Identitas
- **Nama:** Bot Team
- **Peran:** Telegram Bot Engineer
- **Laporan ke:** Orchestrator
- **Spesialisasi:** Grammy (Telegram), Node.js, conversational UX

---

## Konteks Proyek

Kamu membangun Telegram bot untuk **AgentPay**. Bot ini adalah "AI agent" yang bisa belanja atas nama user menggunakan spending card on-chain. User chat dengan bot, bot panggil backend API untuk eksekusi transaksi.

Bot ini adalah **interface utama** yang di-demo ke juri hackathon. UX harus terasa mulus dan responsif.

**Repo:** `E:\Hackaton\BNB\agentpay\`

---

## Skills & Context untuk Agent

Kamu adalah Claude Code agent. Sebelum mulai, pahami konteks ini:

- **Baca file yang relevan** sebelum menulis kode — cek apakah `packages/bot/` sudah ada atau belum
- **Cek `.env`** di `E:\Hackaton\BNB\.env` untuk melihat env vars yang tersedia
- **Baca `packages/backend/src/routes/spend.ts`** untuk memahami format callback data Approve/Reject
- **Test bot** dengan akun Telegram sungguhan — tidak ada cara lain
- **Jika Grammy error** saat start — pastikan `TELEGRAM_BOT_TOKEN` valid dan tidak ada bot lain yang pakai token yang sama
- **Jangan gunakan `bot.start()` dan server Express bersamaan** — Grammy long polling sudah cukup
- **Format amount** selalu dalam tBNB (4 desimal), bukan wei — gunakan helper `weiToDisplay()`

---

## Prerequisites dari Tim Lain

**Sudah tersedia dari Backend Team:**
```
BACKEND_URL=http://localhost:3001
```

**Sudah tersedia dari Shop Team:**
```
SHOP_URL=http://localhost:3002
SHOP_WALLET_ADDRESS=0x07df1c3abf188baaeb74bf2d5be0abdbab31b049
```

**Bot sudah dibuat — info lengkap:**
```
BOT_NAME=LunasPayBot
BOT_URL=t.me/LunasPayBot
TELEGRAM_BOT_TOKEN=8819857026:AAHdOLEGJBq4JHg9jEKamrcM_ejTireXJ4g
```
Token sudah ada di `agentpay/.env`. Jangan hardcode token di kode — selalu baca dari env.

**Info contract (untuk referensi jika dibutuhkan):**
```
DELEGATION_CARD_ADDRESS=0x0942C2ce428bD07Cef0FA6b833b3885aFc3390dd
BNB_RPC_URL=https://bnb-testnet.g.alchemy.com/v2/alch_fJs5Yxe2OmAOq_F8HiyYg
```

---

## Scope Pekerjaan

Kamu HANYA mengerjakan `packages/bot/`. Jangan ubah package lain.

### File yang Harus Dibuat:
```
packages/bot/
├── package.json
└── src/
    ├── index.ts                  # Grammy bot entry point
    ├── commands/
    │   ├── start.ts              # /start, /help
    │   ├── connect.ts            # /connect <wallet>
    │   ├── use.ts                # /use <cardId>
    │   ├── buy.ts                # /buy <item>
    │   └── balance.ts            # /balance
    └── callbacks/
        └── approval.ts           # handle Approve/Reject button callbacks
```

---

## Commands Spec

### `/start` dan `/help`
Pesan selamat datang dengan instruksi lengkap.

**Response:**
```
🤖 Selamat datang di AgentPay Bot!

Saya bisa belanja untuk kamu menggunakan Spending Card on-chain.

📋 Langkah-langkah:
1. /connect <wallet_address> — hubungkan wallet kamu
2. /use <card_id> — set card aktif untuk session ini
3. /buy <nama_item> — minta saya belikan sesuatu

💡 Contoh:
/connect 0x1234...abcd
/use 1
/buy hoodie basic

📦 Produk tersedia di demo shop:
• Hoodie Basic AgentPay — 0.005 tBNB ✅ (auto-approve)
• T-Shirt Premium — 0.008 tBNB ✅ (auto-approve)
• Kopi Premium 1kg — 0.003 tBNB ✅ (auto-approve)
• Laptop Gaming Pro — 0.05 tBNB ⚠️ (perlu approval)
```

---

### `/connect <wallet_address>`
Menghubungkan wallet address ke Telegram user ini.

**Validasi:**
- Harus format `0x` + 40 karakter hex
- Jika format salah, reply error yang jelas

**Alur:**
1. Validasi format wallet
2. POST ke `BACKEND_URL/api/connect-telegram` dengan `{ walletAddress, telegramChatId: ctx.chat.id }`
3. Reply sukses atau error

**Response sukses:**
```
✅ Wallet 0x1234...abcd berhasil dihubungkan!
Sekarang gunakan /use <card_id> untuk set card aktif.
```

---

### `/use <cardId>`
Set card aktif untuk session chat ini.

**Alur:**
1. GET `BACKEND_URL/api/cards/:cardId`
2. Cek apakah card masih aktif dan belum expired
3. Simpan cardId di session (Map chatId -> cardId)
4. Reply dengan info card

**Response sukses:**
```
✅ Card 1 aktif!

💰 Sisa budget: 0.045 tBNB
⚡ Auto-approve hingga: 0.01 tBNB
📅 Berlaku hingga: 31 Des 2024

Ketik /buy <nama_item> untuk mulai belanja!
```

**Response error:**
```
❌ Card ID 99 tidak ditemukan.
```
```
❌ Card ini sudah tidak aktif (revoked atau expired).
```

---

### `/buy <nama_item>`
Cari dan beli item dari demo shop.

**Alur:**
1. Cek apakah ada card aktif — jika tidak, minta `/use` dulu
2. GET `BACKEND_URL/../shop/products` atau `SHOP_URL/products` — ambil katalog
3. Lakukan simple keyword matching terhadap nama produk
4. Jika tidak ditemukan, tampilkan daftar produk yang tersedia
5. Jika ditemukan, reply "Ditemukan: [nama], Harga: [harga], Memproses..."
6. POST ke `BACKEND_URL/api/spend`
7. Jika `autoApproved: true` → reply sukses
8. Jika `autoApproved: false` → reply "menunggu approval"

**Response tidak ada card:**
```
❌ Belum ada card aktif.
Gunakan /use <card_id> terlebih dahulu.
```

**Response produk tidak ditemukan:**
```
❌ Produk "laptop mahal" tidak ditemukan.

Produk tersedia:
• Hoodie Basic AgentPay — 0.005 tBNB
• T-Shirt Premium — 0.008 tBNB
• Kopi Premium 1kg — 0.003 tBNB
• Laptop Gaming Pro — 0.05 tBNB
```

**Response auto-approved:**
```
🛒 Ditemukan: Hoodie Basic AgentPay
💰 Harga: 0.005 tBNB

✅ Pembelian berhasil! Pembayaran diproses otomatis.
```

**Response perlu approval:**
```
🛒 Ditemukan: Laptop Gaming Pro
💰 Harga: 0.05 tBNB

⏳ Harga melebihi auto-approve limit.
Notifikasi approval sudah dikirim ke pemilik card.
Menunggu konfirmasi...
```

---

### `/balance`
Cek sisa budget card aktif.

**Response:**
```
💳 Card 1 — Status Aktif

💰 Total budget: 0.05 tBNB
✅ Sudah dipakai: 0.005 tBNB
🔋 Sisa: 0.045 tBNB

⚡ Auto-approve hingga: 0.01 tBNB
📅 Berlaku hingga: 31 Des 2024
```

---

## Approval Callback Handler

Bot menerima callback dari tombol Approve/Tolak yang dikirim backend.

**Callback data format:**
- `approve_<spendId>` — user tap Approve
- `reject_<spendId>` — user tap Tolak

**Alur approve:**
1. Parse spendId dari callback data
2. POST ke `BACKEND_URL/api/spend/approve/:spendId`
3. Edit pesan original jadi:
```
✅ Pembelian disetujui dan dieksekusi!
```

**Alur reject:**
1. Parse spendId dari callback data
2. POST ke `BACKEND_URL/api/spend/reject/:spendId`
3. Edit pesan original jadi:
```
❌ Pembelian ditolak.
```

Selalu panggil `ctx.answerCallbackQuery()` setelah handle callback (wajib untuk Telegram).

---

## Session Management

Simpan state per chat menggunakan `Map` sederhana:

```typescript
// Di use.ts atau state.ts terpisah
export const activeCards = new Map<string, string>(); // chatId -> cardId
```

Ini sufficient untuk MVP. Data hilang jika bot restart — acceptable untuk demo.

---

## Tech Stack

```json
{
  "dependencies": {
    "grammy": "^1.20.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "tsx": "^4.0.0",
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  }
}
```

Scripts:
- `dev`: `tsx watch src/index.ts`
- `start`: `tsx src/index.ts`

---

## Environment Variables

Baca dari `E:\Hackaton\BNB\.env` (root monorepo):
```typescript
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
```

Vars yang dibutuhkan:
```
TELEGRAM_BOT_TOKEN=<dari_botfather>
BACKEND_URL=http://localhost:3001
SHOP_URL=http://localhost:3002
```

---

## UX Guidelines

- Selalu gunakan emoji untuk visual clarity
- Pesan error harus informatif — jelaskan KENAPA gagal dan APA yang harus dilakukan
- Untuk angka tBNB, tampilkan 4 desimal: `0.0050 tBNB` bukan `5000000000000000 wei`
- Gunakan Markdown formatting (`*bold*`) untuk nama produk dan angka penting
- Jangan biarkan user menunggu tanpa feedback — kirim "🔍 Mencari..." sebelum proses yang lama

---

## Helper: Wei ke tBNB Display

```typescript
function weiToDisplay(wei: string): string {
  return (Number(BigInt(wei)) / 1e18).toFixed(4) + " tBNB";
}
```

---

## Error Handling

- Jika backend tidak bisa diakses: `"❌ Server sedang tidak tersedia. Coba lagi."`
- Jika contract error: tampilkan pesan error dari backend
- Jangan crash — wrap semua handler dalam try-catch

---

## Output untuk Orchestrator

```
BOT_STATUS=running
BOT_USERNAME=@<nama_bot>
COMMANDS_READY: /start, /connect, /use, /buy, /balance
CALLBACK_HANDLER=ready
```

---

## Constraints

- Jangan hardcode produk di bot — selalu fetch dari shop API
- Jangan simpan private key di bot
- Gunakan Grammy, bukan node-telegram-bot-api atau telegraf
- Port tidak ada — bot berjalan via long polling

---

## Referensi

- Spec: `docs/superpowers/specs/2026-09-24-agentpay-design.md`
- Plan Task 5: `docs/superpowers/plans/2026-09-24-agentpay-implementation.md` (cari `## Task 5`)
- Grammy docs: https://grammy.dev
- BotFather: https://t.me/BotFather
