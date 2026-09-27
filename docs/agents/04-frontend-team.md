# Agent: Frontend Team

## Identitas
- **Nama:** Frontend Team
- **Peran:** Frontend Engineer
- **Laporan ke:** Orchestrator
- **Spesialisasi:** Next.js, React, Tailwind CSS, wagmi, Web3 UX

---

## Konteks Proyek

Kamu membangun web dashboard untuk **AgentPay**. Dashboard ini adalah antarmuka sederhana yang memungkinkan user:
1. Connect wallet MetaMask
2. Membuat spending card baru (on-chain transaction)
3. Melihat kartu yang sudah dibuat dan statusnya
4. Melihat riwayat transaksi

**Prioritas:** Fungsionalitas > desain. Dashboard ini dikerjakan terakhir — cukup sederhana tapi harus berjalan benar.

**Repo:** `E:\Hackaton\BNB\agentpay\`

---

## Skills & Context untuk Agent

Kamu adalah Claude Code agent. Sebelum mulai, pahami konteks ini:

- **Baca file yang relevan** sebelum menulis kode — cek apakah `packages/dashboard/` sudah ada
- **Semua komponen yang pakai wagmi hooks WAJIB `"use client"`** — Next.js App Router default ke server component
- **Cek network** — user harus di BNB Testnet (chain ID 97), tambahkan warning jika salah network
- **Amount selalu dalam wei** di contract — convert ke tBNB untuk display: `(Number(BigInt(wei)) / 1e18).toFixed(4)`
- **Jika `useWriteContract` tidak trigger MetaMask** — pastikan wagmi config sudah benar dan provider wrapping layout
- **Jika hydration error** — tambahkan `ssr: false` di wagmi config atau wrap dengan `dynamic` import
- **Prioritas: fungsionalitas > desain** — simple Tailwind sudah cukup, jangan habiskan waktu di styling
- **Jangan install UI library tambahan** — Tailwind saja

---

## Prerequisites dari Tim Lain

**Sudah tersedia dari Contract Team (POST-HOTFIX — gunakan ini):**
```
DELEGATION_CARD_ADDRESS=0xACDAc5d57dB7a97013D002a8d073578347C057AE
BNB_RPC_URL=https://bnb-testnet.g.alchemy.com/v2/alch_fJs5Yxe2OmAOq_F8HiyYg
ABI_PATH=agentpay/packages/contracts/out/DelegationCard.sol/DelegationCard.json
DEPLOYER_ADDRESS=0xBa4918Ff177C289F01fd362bc8a55B3e0469149f
```

⚠️ Address lama `0x0942C2ce...` sudah tidak valid.

**PENTING — ABI ada di Foundry output (bukan Hardhat):**
Copy ABI dari `agentpay/packages/contracts/out/DelegationCard.sol/DelegationCard.json`
Extract field `"abi"` dan simpan di `packages/dashboard/lib/abi.ts`

**PENTING — createCard sekarang 4 parameter (post-hotfix):**
```typescript
// Form harus kirim 4 args:
args: [
  parseEther(budget),        // totalBudget
  parseEther(autoLimit),     // autoApproveLimit
  BigInt(expiryDays),        // expiryDays
  "0xBa4918Ff177C289F01fd362bc8a55B3e0469149f"  // authorizedAgent (deployer wallet, hardcode)
],
value: parseEther(budget),
```

**Sudah tersedia dari Backend Team:**
```
BACKEND_URL=http://localhost:3001
```

---

## Scope Pekerjaan

Kamu HANYA mengerjakan `packages/dashboard/`. Jangan ubah package lain.

### File yang Harus Dibuat:
```
packages/dashboard/
├── package.json
├── next.config.ts
├── .env.local
├── app/
│   ├── layout.tsx        # Root layout dengan WagmiProvider
│   ├── page.tsx          # Home — form buat card + instruksi
│   ├── globals.css
│   └── cards/
│       └── page.tsx      # List semua card milik user
├── components/
│   ├── WalletConnect.tsx # Connect/disconnect MetaMask button
│   ├── CreateCardForm.tsx # Form buat spending card baru
│   ├── CardList.tsx      # List card dengan status
│   └── SpendHistory.tsx  # Riwayat transaksi per card
└── lib/
    ├── wagmi.ts          # wagmi config
    └── abi.ts            # Contract ABI (copy dari contracts package)
```

---

## Pages Spec

### `/` — Home Page

Layout:
```
[Header: AgentPay logo + WalletConnect button]

[Info box: cara pakai step-by-step]

[CreateCardForm]

[Link ke /cards → "Lihat kartu saya →"]
```

Info box content:
```
Cara Pakai:
1. Connect wallet MetaMask di atas
2. Isi form di bawah untuk buat Spending Card
3. Catat Card ID dari BscScan setelah transaksi berhasil
4. Buka Telegram bot @<nama_bot> dan ketik /use <card_id>
```

---

### `/cards` — My Cards

Tampilkan semua card milik wallet yang terconnect.

Fetch dari contract: `getOwnerCards(address)` → dapat array cardIds → fetch tiap card dengan `getCard(cardId)`.

Tampilan per card:
```
┌─────────────────────────────────┐
│ Card #1                 🟢 Aktif │
│                                 │
│ Budget:    0.05 tBNB            │
│ Terpakai:  0.005 tBNB           │
│ Sisa:      0.045 tBNB           │
│ Berlaku:   31 Des 2026          │
│                                 │
│ [Lihat History] [Revoke Card]   │
└─────────────────────────────────┘
```

Status badge:
- 🟢 Aktif — `isActive: true` dan belum expired
- 🔴 Expired — `expiryTimestamp` sudah lewat
- ⚫ Revoked — `isActive: false`

---

## Components Spec

### `WalletConnect.tsx`

- Gunakan `useAccount`, `useConnect`, `useDisconnect` dari wagmi
- Connector: `injected()` (MetaMask)
- Jika connected: tampilkan alamat singkat + tombol Disconnect
- Jika tidak connected: tampilkan tombol "Connect Wallet"
- Pastikan client-side only (`"use client"`)

### `CreateCardForm.tsx`

Fields:
| Field | Type | Default | Keterangan |
|---|---|---|---|
| Total Budget | number (tBNB) | 0.05 | Amount tBNB yang akan di-lock |
| Auto-Approve Limit | number (tBNB) | 0.01 | Transaksi di bawah ini langsung disetujui |
| Berlaku (hari) | number | 7 | Masa aktif card |

Validasi client-side:
- Auto-approve limit harus ≤ total budget
- Budget harus > 0
- Expiry harus ≥ 1 hari

On submit:
1. Panggil `writeContract` dengan fungsi `createCard(budget, autoApproveLimit, expiryDays)`
2. `value` = budget (dalam wei) — karena contract menerima native BNB
3. Tampilkan loading state saat menunggu
4. Saat confirmed: tampilkan sukses + link BscScan

Contract function signature:
```typescript
{
  name: "createCard",
  type: "function",
  inputs: [
    { name: "budget", type: "uint256" },
    { name: "autoApproveLimit", type: "uint256" },
    { name: "expiryDays", type: "uint256" },
  ],
  stateMutability: "payable",
}
```

### `CardList.tsx`

Gunakan `useReadContract` untuk baca data dari chain:
```typescript
// Pertama ambil list card IDs
useReadContract({
  functionName: "getOwnerCards",
  args: [address],
})

// Lalu per cardId:
useReadContract({
  functionName: "getCard",
  args: [cardId],
})
```

### `SpendHistory.tsx`

Fetch dari backend: `GET BACKEND_URL/api/history/:cardId`

Tampilan per record:
```
✅ Beli Hoodie Basic — 0.005 tBNB — auto_approved — 24 Sep 2026
⏳ Beli Laptop Gaming — 0.05 tBNB — pending — 24 Sep 2026
```

---

## wagmi Config

```typescript
// lib/wagmi.ts
import { createConfig, http } from "wagmi";
import { bscTestnet } from "wagmi/chains";

export const config = createConfig({
  chains: [bscTestnet],
  transports: {
    [bscTestnet.id]: http(),
  },
  ssr: true,
});
```

---

## Environment Variables (.env.local)

Buat file `packages/dashboard/.env.local`:
```env
NEXT_PUBLIC_DELEGATION_CARD_ADDRESS=0xACDAc5d57dB7a97013D002a8d073578347C057AE
NEXT_PUBLIC_BNB_RPC_URL=https://bnb-testnet.g.alchemy.com/v2/alch_fJs5Yxe2OmAOq_F8HiyYg
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_BOT_USERNAME=@LunasPayBot
NEXT_PUBLIC_AUTHORIZED_AGENT=0xBa4918Ff177C289F01fd362bc8a55B3e0469149f
```

---

## Tech Stack

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "wagmi": "^2.0.0",
    "viem": "^2.0.0",
    "@tanstack/react-query": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "tailwindcss": "^3.0.0",
    "autoprefixer": "^10.0.0",
    "postcss": "^8.0.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0"
  }
}
```

Setup:
```bash
cd packages/dashboard
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --yes
npm install wagmi viem @tanstack/react-query
```

---

## Styling Guidelines

Ini hackathon — simple is fine. Gunakan Tailwind utility classes saja.

**Color scheme (BNB branding):**
- Primary: `yellow-400` (#F0B90B — warna BNB Chain)
- Background: `gray-50`
- Card: `white` dengan shadow
- Success: `green-600`
- Error: `red-500`
- Text: `gray-900`

**Komponen yang boleh digunakan:**
- Tailwind CSS saja — jangan install UI library tambahan (shadcn, MUI, dll)
- Tombol: `bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-4 py-2 rounded`

---

## UX Requirements

- Loading state saat wallet belum connect: tampilkan prompt "Connect wallet untuk melanjutkan"
- Loading state saat transaksi pending: disable form + tampilkan spinner
- Setelah card berhasil dibuat: tampilkan link ke BscScan dengan tx hash
- Convert wei ke tBNB display: `(Number(bigint) / 1e18).toFixed(4)`
- Convert timestamp ke tanggal: `new Date(Number(timestamp) * 1000).toLocaleDateString("id-ID")`

---

## Network Check

Tambahkan check apakah user di BNB Testnet (chain ID 97). Jika tidak:
```
⚠️ Kamu terhubung ke jaringan yang salah.
Silakan ganti ke BNB Smart Chain Testnet di MetaMask.
```

---

## Output untuk Orchestrator

```
DASHBOARD_URL=http://localhost:3000
PAGES_READY:
  / (home + create card form)
  /cards (list cards)
WALLET_CONNECT=working
CREATE_CARD=working (sends on-chain tx)
```

---

## Constraints

- Jangan install UI library tambahan (shadcn, MUI, Chakra, dll)
- Jangan gunakan Edge runtime
- Port wajib 3000
- Gunakan App Router (bukan Pages Router)
- Semua komponen yang pakai wagmi hooks wajib `"use client"`

---

## Referensi

- Spec: `docs/superpowers/specs/2026-09-24-agentpay-design.md`
- Plan Task 6: `docs/superpowers/plans/2026-09-24-agentpay-implementation.md` (cari `## Task 6`)
- wagmi docs: https://wagmi.sh
- BNB Testnet explorer: https://testnet.bscscan.com
