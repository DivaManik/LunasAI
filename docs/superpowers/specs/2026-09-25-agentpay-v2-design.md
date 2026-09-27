# AgentPay V2 Design Spec

**Date:** 2026-09-25
**Author:** DivaManik
**Version:** 2.0 — Maturity Upgrade
**Previous Spec:** `docs/superpowers/specs/2026-09-24-agentpay-design.md`

---

## 1. Tujuan Upgrade

AgentPay V1 sudah berjalan sebagai MVP. V2 mengupgrade 3 komponen utama untuk mencapai maturity setara Remit:

1. **Privy** — embedded wallet, user bisa login email/Google tanpa MetaMask
2. **ERC-4337** — account abstraction + gasless transaction via Pimlico Paymaster
3. **MCP Server** — AI agent manapun (Claude Web, dll) bisa connect via HTTP + OAuth 2.1

---

## 2. Arsitektur V2

```
┌─────────────────────────────────────────────────────────┐
│                    USER INTERFACES                       │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Web Dashboard │  │ Telegram Bot │  │  Claude Web   │  │
│  │ (Privy auth) │  │ (Grammy)     │  │  (MCP+OAuth)  │  │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘  │
│         └─────────────────┼──────────────────┘          │
└───────────────────────────┼─────────────────────────────┘
                            │
                   ┌────────▼────────┐
                   │   Hono Backend  │
                   │   port 3001     │
                   │  - REST API     │
                   │  - MCP Server   │
                   │  - OAuth 2.1    │
                   └────────┬────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
    ┌─────────▼──┐  ┌───────▼──┐  ┌──────▼──────┐
    │ DelegationCard│  │ Pimlico  │  │   Privy     │
    │ .sol (BNB)  │  │ Bundler  │  │   API       │
    │ (ERC-4337)  │  │ (gasless)│  │   (wallet)  │
    └────────────┘  └──────────┘  └─────────────┘
```

---

## 3. Komponen Baru

### 3.1 Privy Integration

**Tujuan:** User bisa login dengan email/Google, Privy generate embedded wallet otomatis. Tidak perlu MetaMask.

**Flow:**
```
1. User buka dashboard → klik "Login with Google"
2. Privy handle OAuth → generate embedded wallet untuk user
3. Wallet address tersimpan di Privy → dipakai untuk createCard
4. User tidak perlu tahu private key — Privy manage secara aman
```

**SDK:** `@privy-io/react-auth` untuk dashboard Next.js

**Yang berubah di dashboard:**
- Hapus `wagmi` connect button
- Ganti dengan `PrivyProvider` + `usePrivy()` hook
- `useWallets()` untuk akses embedded wallet address

**Tetap ada:** User yang mau pakai MetaMask tetap bisa (Privy support external wallet juga)

---

### 3.2 ERC-4337 Account Abstraction + Gasless

**Tujuan:** User tidak perlu punya BNB untuk bayar gas. Paymaster (Pimlico) sponsori gas di testnet gratis.

**Komponen:**
- **Smart Account:** setiap user punya Smart Account (ERC-4337) yang di-deploy otomatis
- **Bundler:** Pimlico BNB Testnet bundler — `https://api.pimlico.io/v2/97/rpc`
- **Paymaster:** Pimlico verifying paymaster — sponsori gas untuk testnet

**SDK:** `permissionless` (by Pimlico) — library ERC-4337 yang paling mature

**Flow createCard (gasless):**
```
1. User isi form di dashboard
2. Dashboard build UserOperation (ERC-4337)
3. Paymaster sign → sponsor gas
4. Bundler submit ke BNB Testnet
5. Card terbuat tanpa user bayar gas
```

**Catatan:** Budget card (tBNB) tetap harus dikirim user — hanya GAS yang gratis, bukan dana card.

---

### 3.3 MCP Server

**Tujuan:** AI agent manapun yang support MCP (Claude Web, Claude Desktop, Cursor, dll) bisa connect ke AgentPay dan melakukan transaksi.

**Endpoint:** `GET/POST /mcp/:cardId` (Streamable HTTP)

**Auth:** OAuth 2.1 flow
```
1. User paste URL ke Claude Web: http://localhost:3001/mcp/<cardId>
   (saat demo: https://<ngrok-url>/mcp/<cardId>)
2. Claude Web redirect ke OAuth consent page di dashboard
3. User login Privy → approve akses
4. Claude Web dapat access token → bisa panggil MCP tools
```

**MCP Tools yang diexpose:**

| Tool | Deskripsi |
|---|---|
| `get_card_info` | Lihat sisa budget, limit, status card |
| `get_products` | List produk tersedia di demo shop |
| `spend` | Beli produk dengan card |
| `get_history` | Lihat riwayat transaksi |

**Protocol:** MCP Streamable HTTP (JSON-RPC over HTTP, support SSE untuk streaming)

**Library:** `@modelcontextprotocol/sdk` server

---

## 4. Yang TIDAK Berubah dari V1

- Smart contract `DelegationCard.sol` — tidak perlu diubah
- Demo shop (`packages/shop/`) — tidak perlu diubah
- Telegram bot — tetap ada, tetap berfungsi
- Contract address: `0xACDAc5d57dB7a97013D002a8d073578347C057AE`
- Core spend/approve/reject logic di backend

---

## 5. Perubahan per Package

### `packages/backend/` — Tambahan
- `src/mcp/server.ts` — MCP server implementation
- `src/mcp/tools.ts` — tool definitions (get_card_info, get_products, spend, get_history)
- `src/routes/mcp.ts` — HTTP route handler untuk MCP endpoint
- `src/routes/oauth.ts` — OAuth 2.1 authorization server (authorize, token, consent)
- `src/db.ts` — tambah `oauthSessions` dan `oauthTokens` store

### `packages/dashboard/` — Perubahan
- Hapus wagmi, ganti dengan Privy
- `app/layout.tsx` — ganti WagmiProvider dengan PrivyProvider
- `components/WalletConnect.tsx` — ganti dengan `components/LoginButton.tsx`
- `components/CreateCardForm.tsx` — ganti writeContract dengan permissionless UserOperation
- `app/oauth/authorize/page.tsx` — halaman consent OAuth untuk MCP
- `lib/privy.ts` — Privy config
- `lib/smartAccount.ts` — permissionless smart account config

### `packages/bot/` — Tidak ada perubahan
### `packages/shop/` — Tidak ada perubahan
### `packages/contracts/` — Tidak ada perubahan

---

## 6. Tech Stack Tambahan

| Package | Versi | Kegunaan |
|---|---|---|
| `@privy-io/react-auth` | latest | Embedded wallet + auth di dashboard |
| `permissionless` | ^0.2.0 | ERC-4337 smart account + bundler |
| `@modelcontextprotocol/sdk` | ^1.0.0 | MCP server implementation |
| `viem` | sudah ada | UserOperation encoding |

**Pimlico BNB Testnet:**
- Bundler RPC: `https://api.pimlico.io/v2/97/rpc?apikey=<key>`
- Paymaster: `https://api.pimlico.io/v2/97/rpc?apikey=<key>`
- API Key: daftar gratis di https://dashboard.pimlico.io

**Privy:**
- App ID: daftar di https://privy.io
- Support BNB Chain: ✅

---

## 7. Environment Variables Baru

```
# Privy
NEXT_PUBLIC_PRIVY_APP_ID=<dari_privy_dashboard>
PRIVY_APP_SECRET=<dari_privy_dashboard>

# Pimlico (ERC-4337)
PIMLICO_API_KEY=<dari_pimlico_dashboard>
NEXT_PUBLIC_PIMLICO_API_KEY=<sama>

# MCP OAuth
OAUTH_SECRET=<random_string_32_chars>
MCP_BASE_URL=http://localhost:3001
DASHBOARD_URL=http://localhost:3000
```

---

## 8. Demo Flow V2

### Flow A: Login + Buat Card (Privy + ERC-4337)
```
1. User buka dashboard → klik "Login with Google"
2. Privy popup → user pilih Google account
3. Embedded wallet ter-generate otomatis
4. User isi form card → klik "Buat Card"
5. Tidak ada MetaMask popup — gasless!
6. Card terbuat, user dapat Card ID
```

### Flow B: Claude Web pakai Card
```
1. User copy Card URL: https://<ngrok>/mcp/<cardId>
2. Buka Claude Web → Settings → Connectors → Add
3. Paste URL → OAuth consent page muncul
4. Login Privy → approve akses
5. Claude Web sekarang punya tool AgentPay
6. User chat: "Belikan aku hoodie"
7. Claude call tool spend() → transaksi on-chain
8. Claude reply: "Berhasil beli Hoodie Basic, 0.005 tBNB"
```

### Flow C: Telegram (tetap seperti V1)
```
/connect → /verify → /use → /buy
```

---

## 9. Success Criteria V2

1. User bisa login dengan Google tanpa MetaMask
2. Buat card tanpa bayar gas (gasless via Pimlico)
3. Claude Web bisa connect via MCP dan melakukan transaksi
4. Telegram bot tetap berfungsi seperti sebelumnya
5. Semua flow berjalan di BNB Testnet

---

## 10. Risiko & Mitigasi

| Risiko | Kemungkinan | Mitigasi |
|---|---|---|
| Pimlico tidak support BNB Testnet dengan baik | Medium | Test dulu sebelum full implementation |
| Privy embedded wallet + ERC-4337 complex | Medium | Pakai permissionless SDK yang sudah handle complexity |
| MCP OAuth flow complex | Low | Ikuti spec MCP official, ada contoh di SDK |
| ngrok URL berubah saat demo | Low | Pakai ngrok static domain (gratis 1 domain) |
