# AgentPay Design Spec

**Date:** 2026-09-24
**Author:** DivaManik
**Hackathon:** Indonesia Web3 Hack (indonesiaweb3hack.xyz)

---

## 1. Problem Statement

AI agents (ChatGPT, Claude, Telegram bots, dll) saat ini hanya bisa memberikan rekomendasi — mereka tidak bisa *bertindak* atas nama user. Jika user ingin AI membelikan tiket atau barang, user tetap harus melakukan transaksi sendiri. Ini memutus alur otomasi.

Di sisi lain, memberi AI akses penuh ke dompet/rekening sangat berisiko. Jika agent diretas atau salah bertindak, seluruh aset bisa hilang.

---

## 2. Solution

AgentPay adalah sistem **spending delegation on-chain** di BNB Chain. User membuat "spending card" digital dengan aturan yang tersimpan di smart contract:
- Budget maksimum
- Auto-approve limit (transaksi di bawah nilai ini langsung dieksekusi)
- Tanggal kedaluwarsa
- Bisa dicabut kapan saja

AI agent mendapatkan Card ID dan bisa melakukan pembayaran dalam batas tersebut via **x402 protocol**. Jika transaksi melebihi auto-approve limit, agent meminta approval dari user via Telegram.

---

## 3. Target Users

- Developer/tech-savvy user yang ingin mengotomasi pengeluaran menggunakan AI agent
- Peserta hackathon sebagai demo use case

---

## 4. MVP Scope (1 Minggu)

### Included:
1. Smart contract DelegationCard di BNB Testnet
2. Web dashboard sederhana (buat card, lihat status, revoke)
3. Telegram bot sebagai AI agent interface
4. Demo shop yang menerima pembayaran x402
5. Approval flow via Telegram (notif + tombol approve/reject)
6. Spending history per card

### Excluded (post-hackathon):
- WhatsApp / Discord integration
- Connect ke ChatGPT/Claude milik user
- Real marketplace (Traveloka, Tokopedia)
- Multi-chain support
- Card templates

---

## 5. Architecture

```
┌─────────────────┐                    ┌──────────────────────┐
│   Web Dashboard  │ ──── createCard ─> │  DelegationCard.sol  │
│   (Next.js)      │ <─── cardId ────   │  BNB Testnet         │
└─────────────────┘                    └──────────────────────┘
         │                                        │
         │ cardId                                 │ validate
         ▼                                        ▼
┌─────────────────┐  ── spend(cardId) ──> ┌──────────────────┐
│  Telegram Bot   │                        │   Hono API       │
│  (Grammy)       │  <─ needsApproval ──   │   (Backend)      │
└─────────────────┘                        └──────────────────┘
         │                                        │
         │ notify user                            │ x402 payment
         ▼                                        ▼
┌─────────────────┐                    ┌──────────────────────┐
│   User Telegram │                    │     Demo Shop        │
│   (approve/rej) │                    │   (Express + x402)   │
└─────────────────┘                    └──────────────────────┘
```

---

## 6. Smart Contract: DelegationCard.sol

### Data Structures
```solidity
struct Card {
    address owner;
    uint256 totalBudget;
    uint256 spentAmount;
    uint256 autoApproveLimit;  // transaksi di bawah ini langsung approve
    uint256 expiryTimestamp;
    bool isActive;
}

struct PendingSpend {
    uint256 cardId;
    address merchant;
    uint256 amount;
    string description;
    bool isApproved;
    bool isExecuted;
    uint256 createdAt;
}
```

### Functions
- `createCard(budget, autoApproveLimit, expiryDays)` → returns cardId
- `spend(cardId, merchant, amount, description)` → executes if auto-approve, else creates PendingSpend
- `approveSpend(pendingSpendId)` → only card owner
- `rejectSpend(pendingSpendId)` → only card owner
- `revokeCard(cardId)` → only card owner
- `getCard(cardId)` → view card details
- `getPendingSpends(cardId)` → view pending approvals

### Token
Menggunakan tBNB (native token testnet) untuk simplicity MVP.

---

## 7. Backend API (Hono)

### Endpoints
- `POST /api/cards` — create card (relay ke contract)
- `GET /api/cards/:id` — get card details
- `POST /api/spend` — agent request spend
- `POST /api/approve/:spendId` — user approve
- `POST /api/reject/:spendId` — user reject
- `GET /api/history/:cardId` — spending history

### Responsibilities
- Interface antara Telegram bot dan smart contract
- Menyimpan Telegram chat ID per card owner (di-map ke wallet address)
- Trigger notifikasi Telegram saat ada pending approval

---

## 8. Telegram Bot

### Commands
- `/start` — welcome + instruksi
- `/connect <walletAddress>` — link wallet ke Telegram user
- `/use <cardId>` — set active card untuk session
- `/buy <item>` — minta agent cari dan beli item dari demo shop
- `/balance` — cek sisa budget card aktif
- `/history` — lihat riwayat transaksi

### Approval Flow
Bot mengirim pesan dengan inline keyboard:
```
💰 Permintaan Pembelian
Item: Hoodie Premium
Harga: 0.02 tBNB
Melebihi auto-approve limit (0.01 tBNB)

[✅ Approve] [❌ Tolak]
```

---

## 9. Demo Shop

Simple Express server yang:
- Menampilkan katalog produk dummy (3-5 item)
- Menerima pembayaran via x402 protocol
- Endpoint: `GET /products` dan `POST /purchase`

---

## 10. Web Dashboard

Simple Next.js app (fokus terakhir, UI sederhana):
- Connect wallet (MetaMask via wagmi)
- Form buat card baru
- List card milik user + status (active/expired/revoked)
- Spending history per card
- Tombol revoke card

---

## 11. Tech Stack

| Layer | Technology |
|---|---|
| Smart Contract | Solidity ^0.8.20, Hardhat, OpenZeppelin |
| Backend | Hono, Node.js 20, viem |
| Telegram Bot | Grammy |
| Frontend | Next.js 14, Tailwind CSS, wagmi, viem |
| Demo Shop | Express, x402-node |
| Testnet | BNB Testnet (Chain ID: 97) |
| Package Manager | npm |
| Monorepo | npm workspaces |

---

## 12. Success Criteria (Demo)

Demo berhasil jika bisa menunjukkan end-to-end flow:
1. User buat card di web dashboard
2. User set card di Telegram bot
3. User minta bot beli item murah → bot auto-beli tanpa approval
4. User minta bot beli item mahal → bot minta approval → user approve di Telegram → transaksi berhasil
5. User lihat history di dashboard
