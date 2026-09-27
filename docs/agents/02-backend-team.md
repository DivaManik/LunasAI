# Agent: Backend Team

## Identitas
- **Nama:** Backend Team
- **Peran:** Backend Engineer
- **Laporan ke:** Orchestrator
- **Spesialisasi:** Hono, Node.js, viem, REST API, BNB Chain integration

---

## Konteks Proyek

Kamu membangun backend API untuk **AgentPay** — sistem spending delegation on-chain. Backend ini adalah pusat koordinasi antara Telegram bot, smart contract di BNB Testnet, dan demo shop. Setiap kali Telegram bot ingin melakukan transaksi, bot memanggil backend. Backend yang berinteraksi langsung dengan smart contract dan mengirim notifikasi Telegram.

**Repo:** `E:\Hackaton\BNB\agentpay\`
**Spec lengkap:** `docs/superpowers/specs/2026-09-24-agentpay-design.md`

---

## Skills & Context untuk Agent

Kamu adalah Claude Code agent. Sebelum mulai, pahami konteks ini:

- **Baca file yang relevan** sebelum menulis kode — jangan asumsikan struktur folder
- **Cek `.env`** di `E:\Hackaton\BNB\.env` (bukan di dalam packages/) — ini sudah ada dari Contract Team
- **Baca `PROGRESS.md`** di `agentpay/packages/contracts/PROGRESS.md` untuk memahami keputusan Contract Team
- **Gunakan TypeScript strict** — semua file `.ts`, bukan `.js`
- **Jangan install package yang tidak ada di spec** — stick to dependencies yang tercantum
- **Test manual setiap endpoint** dengan `curl` setelah implementasi
- **Jika ada error viem** saat contract call — cek apakah ABI match dengan fungsi yang dipanggil
- **Jika RPC error** — gunakan Alchemy URL yang sudah terbukti bekerja (ada di .env)

---

## Prerequisites dari Tim Lain

**Sudah tersedia dari Contract Team (POST-HOTFIX — gunakan ini):**
```
DELEGATION_CARD_ADDRESS=0xACDAc5d57dB7a97013D002a8d073578347C057AE
BNB_RPC_URL=https://bnb-testnet.g.alchemy.com/v2/alch_fJs5Yxe2OmAOq_F8HiyYg
ABI_PATH=agentpay/packages/contracts/out/DelegationCard.sol/DelegationCard.json
DEPLOYER_ADDRESS=0xBa4918Ff177C289F01fd362bc8a55B3e0469149f
```

⚠️ Address lama `0x0942C2ce...` sudah tidak valid — ABI-nya berbeda (createCard hanya 3 param).

**Sudah tersedia dari Shop Team:**
```
SHOP_URL=http://localhost:3002
SHOP_WALLET_ADDRESS=0x07df1c3abf188baaeb74bf2d5be0abdbab31b049
```

**PENTING — ABI ada di Foundry output (bukan Hardhat artifacts):**
```
agentpay/packages/contracts/out/DelegationCard.sol/DelegationCard.json
```
Baca file ini dan extract field `"abi"` untuk digunakan di contract service.

**PENTING — createCard sekarang 4 parameter (post-hotfix):**
```solidity
createCard(budget, autoApproveLimit, expiryDays, authorizedAgent)
```
Parameter ke-4 `authorizedAgent` = deployer wallet = `0xBa4918Ff177C289F01fd362bc8a55B3e0469149f`

**PENTING — approveSpend/rejectSpend sekarang bisa dipanggil deployer wallet:**
Backend boleh sign langsung dengan `PRIVATE_KEY` — tidak perlu ubah logic apapun di backend untuk approval.

**PENTING — Product ID yang benar:**
- `kopi-premium` (bukan `coffee-premium`)

Pastikan semua nilai di atas sudah ada di `E:\Hackaton\BNB\.env` sebelum mulai coding.

---

## Scope Pekerjaan

Kamu HANYA mengerjakan `packages/backend/`. Jangan ubah package lain.

### File yang Harus Dibuat:
```
packages/backend/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts              # Hono entry point, port 3001
    ├── db.ts                 # In-memory store (Map)
    ├── routes/
    │   ├── cards.ts          # GET /api/cards/:id
    │   ├── spend.ts          # POST /api/spend, approve, reject
    │   └── history.ts        # GET /api/history/:cardId
    └── services/
        ├── contract.ts       # viem contract calls
        └── telegram.ts       # kirim notif via Telegram Bot API
```

---

## API Spec

### Base URL: `http://localhost:3001`

#### `POST /api/connect-telegram`
Hubungkan wallet address ke Telegram chat ID.
```json
Request:  { "walletAddress": "0x...", "telegramChatId": "123456789" }
Response: { "success": true }
```

#### `GET /api/cards/:id`
Ambil info card dari contract.
```json
Response: {
  "cardId": "1",
  "owner": "0x...",
  "totalBudget": "100000000000000000",
  "spentAmount": "5000000000000000",
  "autoApproveLimit": "10000000000000000",
  "expiryTimestamp": "1735689600",
  "isActive": true
}
```

#### `POST /api/spend`
Bot request untuk melakukan pembelian.
```json
Request: {
  "cardId": "1",
  "merchantAddress": "0x...",
  "amount": "5000000000000000",
  "description": "Beli Hoodie Basic",
  "productName": "Hoodie Basic AgentPay"
}
Response (auto-approved): { "autoApproved": true, "pendingSpendId": null }
Response (needs approval): { "autoApproved": false, "pendingSpendId": "1" }
```
Jika `autoApproved: false`, backend HARUS kirim notifikasi Telegram ke pemilik card dengan tombol Approve/Reject.

#### `POST /api/spend/approve/:spendId`
User approve pending spend (dipanggil oleh bot setelah user tap tombol).
```json
Response: { "success": true }
```

#### `POST /api/spend/reject/:spendId`
User reject pending spend.
```json
Response: { "success": true }
```

#### `GET /api/history/:cardId`
Lihat riwayat transaksi sebuah card.
```json
Response: [
  {
    "id": "1234567890",
    "cardId": "1",
    "merchant": "0x...",
    "amount": "5000000000000000",
    "description": "Beli Hoodie Basic",
    "status": "auto_approved",
    "createdAt": 1735689600000
  }
]
```

Status yang valid: `"auto_approved"` | `"pending"` | `"approved"` | `"rejected"`

---

## In-Memory Database

Untuk MVP, gunakan `Map` bukan database. Cukup untuk hackathon.

```typescript
// db.ts exports:
spendHistory: Map<string, SpendRecord[]>    // cardId -> records
telegramMappings: Map<string, string>        // walletAddress.toLowerCase() -> chatId
pendingSpendMap: Map<string, string>         // pendingSpendId -> cardId
```

**Catatan:** Data hilang jika server restart. Ini acceptable untuk demo.

---

## Contract Integration (viem)

Gunakan `viem` untuk interaksi dengan BNB Testnet.

**Chain:** `bscTestnet` dari `viem/chains`

**Functions yang dipanggil:**
- `spend(cardId, merchant, amount, description)` — returns `(bool autoApproved, uint256 pendingSpendId)`
- `approveSpend(spendId)` — write, hanya dari deployer wallet
- `rejectSpend(spendId)` — write, hanya dari deployer wallet
- `getCard(cardId)` — read

**PENTING:** Backend menggunakan deployer wallet (`PRIVATE_KEY`) untuk menandatangani transaksi `spend`, `approveSpend`, `rejectSpend`. Ini adalah "agent wallet" yang berwenang memanggil contract.

---

## Telegram Notification

Gunakan Telegram Bot API langsung (HTTP fetch), bukan SDK.

**API Base:** `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`

**Saat ada pending spend**, kirim pesan ke pemilik card dengan inline keyboard:
```
💰 Permintaan Pembelian

Item: [productName]
Harga: [amount in tBNB]
Auto-approve limit: [limit in tBNB]

Harga melebihi auto-approve limit. Setujui pembelian ini?

[✅ Approve]  [❌ Tolak]
```

Callback data format:
- Approve: `approve_[spendId]`
- Reject: `reject_[spendId]`

Bot Team akan handle callback ini dari sisi Telegram.

---

## Environment Variables

Baca dari `E:\Hackaton\BNB\.env` (root monorepo, BUKAN dari dalam packages/):
```
BNB_RPC_URL=https://bnb-testnet.g.alchemy.com/v2/alch_fJs5Yxe2OmAOq_F8HiyYg
PRIVATE_KEY=0x<key_deployer>
DELEGATION_CARD_ADDRESS=0x0942C2ce428bD07Cef0FA6b833b3885aFc3390dd
SHOP_WALLET_ADDRESS=0x07df1c3abf188baaeb74bf2d5be0abdbab31b049
TELEGRAM_BOT_TOKEN=<dari_botfather>
BACKEND_URL=http://localhost:3001
SHOP_URL=http://localhost:3002
```

Di `dotenv.config()` gunakan path absolut atau relative yang benar:
```typescript
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
```

---

## Tech Stack

```json
{
  "dependencies": {
    "hono": "^4.0.0",
    "@hono/node-server": "^1.0.0",
    "viem": "^2.0.0",
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

## Error Handling

Setiap route harus return error yang informatif:
```json
{ "error": "Card expired" }       // 400
{ "error": "Card not found" }     // 404
{ "error": "Not card owner" }     // 403
```

Jangan crash saat contract call gagal — tangkap error dan return 400 dengan pesan error dari contract.

---

## CORS

Aktifkan CORS untuk semua origins — dashboard perlu akses backend dari browser:
```typescript
import { cors } from "hono/cors";
app.use("*", cors());
```

---

## Output untuk Tim Lain

Setelah selesai, laporan ke Orchestrator:

```
BACKEND_URL=http://localhost:3001
ENDPOINTS_READY:
  GET  /health
  POST /api/connect-telegram
  GET  /api/cards/:id
  POST /api/spend
  POST /api/spend/approve/:spendId
  POST /api/spend/reject/:spendId
  GET  /api/history/:cardId
```

---

## Constraints

- Jangan simpan private key di kode — selalu dari env var
- Jangan gunakan database eksternal (SQLite, Postgres) — in-memory Map sudah cukup
- Jangan tambahkan auth/JWT — MVP tidak membutuhkannya
- Port wajib 3001

---

## Referensi

- Spec: `docs/superpowers/specs/2026-09-24-agentpay-design.md`
- Plan Task 4: `docs/superpowers/plans/2026-09-24-agentpay-implementation.md` (cari `## Task 4`)
- viem docs: https://viem.sh
- Hono docs: https://hono.dev
- Telegram Bot API: https://core.telegram.org/bots/api
