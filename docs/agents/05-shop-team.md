# Agent: Demo Shop Team

## Identitas
- **Nama:** Demo Shop Team
- **Peran:** Demo Infrastructure Engineer
- **Laporan ke:** Orchestrator
- **Spesialisasi:** Express.js, x402 protocol, mock e-commerce

---

## Konteks Proyek

Kamu membangun **demo shop** untuk AgentPay — sebuah toko online palsu yang digunakan selama demo hackathon. Shop ini berperan sebagai "merchant" yang menerima pembayaran dari AI agent via backend AgentPay.

Shop ini penting untuk demo karena tanpa merchant nyata, tidak ada yang bisa di-"beli". Juri hackathon akan melihat flow: bot minta beli → shop konfirmasi.

**Repo:** `E:\Hackaton\BNB\agentpay\`

---

## Prerequisites

Tidak ada dependency dari tim lain. Shop Team bisa mulai bersamaan dengan tim lain.

Yang perlu disiapkan:
- Wallet address untuk menerima pembayaran (bisa generate baru, tidak perlu saldo)
- Update `.env` di root: `SHOP_WALLET_ADDRESS=0x<address>`

---

## Scope Pekerjaan

Kamu HANYA mengerjakan `packages/shop/`. Jangan ubah package lain.

### File yang Harus Dibuat:
```
packages/shop/
├── package.json
└── src/
    ├── index.ts       # Express server, port 3002
    └── products.ts    # Katalog produk
```

---

## Products Catalog

**4 produk wajib ada** dengan harga yang mencerminkan dua skenario demo:

| ID | Nama | Harga (wei) | Harga (tBNB) | Skenario Demo |
|---|---|---|---|---|
| `hoodie-basic` | Hoodie Basic AgentPay | 5000000000000000 | 0.005 | Auto-approve ✅ |
| `tshirt-premium` | T-Shirt Premium | 8000000000000000 | 0.008 | Auto-approve ✅ |
| `kopi-premium` | Kopi Premium 1kg | 3000000000000000 | 0.003 | Auto-approve ✅ |
| `laptop-gaming` | Laptop Gaming Pro | 50000000000000000 | 0.05 | Perlu approval ⚠️ |

Skenario demo mengasumsikan card dengan auto-approve limit `0.01 tBNB` (10000000000000000 wei):
- 3 produk pertama di bawah limit → langsung dieksekusi
- Laptop di atas limit → membutuhkan approval dari user

---

## API Endpoints

### `GET /products`
Return semua produk dalam format JSON.

```json
[
  {
    "id": "hoodie-basic",
    "name": "Hoodie Basic AgentPay",
    "description": "Hoodie polos dengan logo AgentPay",
    "priceWei": "5000000000000000",
    "priceDisplay": "0.005 tBNB"
  }
]
```

**Catatan:** `priceWei` harus string (bukan number/bigint) karena JSON tidak support bigint.

---

### `GET /products/:id`
Return satu produk berdasarkan ID.

```json
{
  "id": "hoodie-basic",
  "name": "Hoodie Basic AgentPay",
  "description": "Hoodie polos dengan logo AgentPay",
  "priceWei": "5000000000000000",
  "priceDisplay": "0.005 tBNB"
}
```

Response 404 jika tidak ditemukan:
```json
{ "error": "Product not found" }
```

---

### `POST /purchase`
Dikonfirmasi setelah backend memverifikasi payment sudah berhasil di chain.

**Request:**
```json
{
  "productId": "hoodie-basic",
  "paymentTxHash": "0x..."
}
```

**Response sukses:**
```json
{
  "success": true,
  "message": "Pembelian Hoodie Basic AgentPay berhasil!",
  "item": "Hoodie Basic AgentPay",
  "txHash": "0x...",
  "orderId": "ORD-1234567890"
}
```

**Response error:**
```json
{ "error": "Product not found" }
```

**Catatan untuk MVP:** Backend memanggil endpoint ini setelah transaksi on-chain selesai. Shop trust backend sepenuhnya — tidak ada verifikasi on-chain di sisi shop. Ini cukup untuk demo.

---

## Server Setup

```typescript
import express from "express";
import cors from "cors";
const app = express();

app.use(cors()); // allow backend dan browser
app.use(express.json());

const PORT = process.env.SHOP_PORT || 3002;
```

---

## Environment Variables

Baca dari `../../.env`:
```
SHOP_WALLET_ADDRESS=0x<wallet_untuk_terima_payment>
SHOP_PORT=3002  # optional, default 3002
```

**SHOP_WALLET_ADDRESS ini penting** — ini adalah address yang dikirim ke backend sebagai `merchantAddress` saat transaksi. Backend akan melakukan `.transfer()` ke address ini di smart contract.

---

## Tech Stack

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.0",
    "@types/cors": "^2.8.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

Scripts:
- `dev`: `tsx watch src/index.ts`
- `start`: `tsx src/index.ts`

---

## Health Check

Tambahkan endpoint health check:
```
GET /health → { "status": "ok", "shop": "AgentPay Demo Shop", "wallet": "0x..." }
```

---

## Logging

Tambahkan simple console logging untuk setiap request purchase:
```
[SHOP] Purchase request: hoodie-basic
[SHOP] Order confirmed: ORD-1234567890, tx: 0x...
```

Ini berguna saat live demo untuk show proof transaksi terjadi.

---

## Output untuk Orchestrator dan Backend Team

```
SHOP_URL=http://localhost:3002
SHOP_WALLET_ADDRESS=0x<address>
ENDPOINTS_READY:
  GET  /health
  GET  /products
  GET  /products/:id
  POST /purchase
```

---

## Constraints

- Jangan gunakan database — produk hardcoded di `products.ts`, orders di-log saja
- Jangan verifikasi on-chain di sisi shop — trust backend
- Port wajib 3002
- CORS harus enabled — backend dan browser perlu akses

---

## Referensi

- Spec: `docs/superpowers/specs/2026-09-24-agentpay-design.md`
- Plan Task 3: `docs/superpowers/plans/2026-09-24-agentpay-implementation.md` (cari `## Task 3`)
