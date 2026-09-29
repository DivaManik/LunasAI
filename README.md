# LunasAI

**The spending delegation card for AI agents.**

Issue a delegation card from your wallet. Your AI agent uses it to purchase digital goods within the limits you set — no manual approval for every transaction, no handing over your private key.

Built on BNB Testnet smart contracts, paid via the x402 protocol, plugs into any AI agent over MCP.

**Live:**

| Service | URL |
|---|---|
| Dashboard (issue & manage cards) | https://lunas-ai-zeta.vercel.app |
| DigiStore (demo x402 merchant) | https://lunasai-production.up.railway.app |
| Telegram Bot | [@LunasPayBot](https://t.me/LunasPayBot) |
| Source | https://github.com/DivaManik/LunasAI |

---

## The Idea

AI agents need to spend money. Handing an AI your private key is insane — no spending limits, no control. LunasAI applies the model the card industry has used for decades and brings it to AI agents:

- **Your wallet stays yours.** Funds never move until a valid transaction happens.
- **The card is a delegation.** A smart contract holding an IDRX budget, a per-transaction limit, and an expiry — all set by you at card creation.
- **The agent holds the card, not the money.** What the agent gets is an MCP URL. Behind it, the card can only spend within the terms you set.
- **Revoke kills it instantly.** Deactivate a card from the dashboard at any time — all payments from it stop immediately.

```
Your wallet (MetaMask / Privy)
   └── Delegation Card  (50,000 IDRX budget, 5,000 IDRX auto-approve/tx)
        └── AI Agent connected via MCP URL
             └── Purchases at DigiStore → spend() called on-chain
```

## How a Payment Works

1. You sign in to the dashboard (Privy — email / Google / wallet) and create a **Delegation Card** with a budget, per-transaction limit, and duration.
2. The dashboard mints the card: you approve an IDRX transfer to the smart contract, and the backend wallet is registered as `authorizedAgent`.
3. You copy the MCP URL from the dashboard and paste it into Claude Desktop / Cursor / Windsurf / VS Code.
4. The AI agent calls the `paid_fetch` tool against a merchant (DigiStore).
5. The merchant responds with **HTTP 402** — price, token address, merchant wallet.
6. The backend MCP server calls `spend()` on DelegationCardV2 — IDRX is transferred on-chain.
7. The AI re-fetches with an `X-Payment: txHash` header — content delivered, no user intervention.

The agent never sees a private key. The agent never holds a balance.

## What an Agent Can Do with a Card

MCP tools available after connecting a card:

| Tool | Purpose |
|---|---|
| `paid_fetch` | Fetch a URL; on HTTP 402, pay automatically and return the content |
| `get_card_info` | Live card state: remaining budget, limits, expiry |
| `get_products` | List available products at DigiStore |

## Connecting a Card to an Agent

```jsonc
// Claude Desktop — claude_desktop_config.json
{
  "mcpServers": {
    "lunasai": {
      "type": "http",
      "url": "https://divine-rebirth-production.up.railway.app/mcp/<card-id>"
    }
  }
}
```

Cursor, Windsurf, and VS Code: see the full guide at [Dashboard → MCP Connect](https://lunas-ai-zeta.vercel.app/dashboard/mcp).

## Telegram Bot

Access LunasAI directly from Telegram via [@LunasPayBot](https://t.me/LunasPayBot):

| Command | Purpose |
|---|---|
| `/start` | Welcome & overview |
| `/connect <wallet>` | Connect your wallet |
| `/verify <signature>` | Verify wallet ownership |
| `/use <card_id>` | Set active delegation card |
| `/buy <item_name>` | Purchase a product via AI |
| `/balance` | Check remaining card budget |
| `/disconnect` | Disconnect wallet |

## Smart Contracts (BNB Testnet)

| Contract | Address |
|---|---|
| DelegationCardV2 | [`0x9c8729f98bd42206d8a390360bd2326ffbf53837`](https://testnet.bscscan.com/address/0x9c8729f98bd42206d8a390360bd2326ffbf53837) |
| MockIDRX (ERC-20) | [`0x4E45AABeED9b9BF1D15C09C538b63d9a32Bae996`](https://testnet.bscscan.com/address/0x4E45AABeED9b9BF1D15C09C538b63d9a32Bae996) |
| Authorized Agent | [`0xBa4918Ff177C289F01fd362bc8a55B3e0469149f`](https://testnet.bscscan.com/address/0xBa4918Ff177C289F01fd362bc8a55B3e0469149f) |

## Architecture

```
User (MetaMask / Privy)
    │
    ▼
Dashboard (Next.js :3000) ──── Backend API + MCP (Express :3001)
                                        │
                              ┌─────────┴──────────┐
                              │                    │
                       DelegationCardV2        paid_fetch tool
                       (BNB Testnet)               │
                       MockIDRX ERC-20         AI Agent
                                              (Claude / Cursor /
                                               Windsurf / VS Code)
                                                    │
                                                    ▼
                                          DigiStore (Express :3002)
                                          x402 HTTP 402 merchant
```

## Running Locally

```bash
# Prerequisites
Node.js >= 18, pnpm >= 8, MetaMask browser extension

# Install
pnpm install

# Run all services
pnpm dev
# Dashboard  → http://localhost:3000
# Backend    → http://localhost:3001
# DigiStore  → http://localhost:3002
# Bot        → Telegram long polling
```

### Environment Variables

```env
PRIVATE_KEY=                          # Backend agent wallet private key
SHOP_WALLET_ADDRESS=0xBa4918Ff177C289F01fd362bc8a55B3e0469149f
ALCHEMY_API_KEY=                      # BNB Testnet RPC
TELEGRAM_BOT_TOKEN=                   # From BotFather
DELEGATION_CARD_ADDRESS=0x9c8729f98bd42206d8a390360bd2326ffbf53837
IDRX_TOKEN_ADDRESS=0x4E45AABeED9b9BF1D15C09C538b63d9a32Bae996
NEXT_PUBLIC_PRIVY_APP_ID=             # From dashboard.privy.io
```

## Security Model

- **Custody:** your funds stay in your wallet. The smart contract only holds the budget you delegated — never your private key.
- **Limits enforced on-chain:** `autoApproveLimit` per transaction and `totalBudget` overall are both enforced by the smart contract, not just the server. The backend cannot exceed them.
- **Instant revocation:** deactivate a card from the dashboard at any time — the contract's `isActive` field is set to false and all subsequent `spend()` calls are rejected immediately.
- **Agent holds no assets:** the backend wallet (`authorizedAgent`) can only call `spend()` within the card's limits — it cannot withdraw funds or access your wallet.
- **Secrets never committed:** `.env` is gitignored and excluded from the repository.
- **Hackathon scope:** this project uses MockIDRX on BNB Testnet — no real money moves.

## Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | BNB Testnet (Chain ID 97) |
| Smart Contract | Solidity + Foundry |
| Token | MockIDRX (decimals=2, 1 IDRX = 1 IDR) |
| Frontend | Next.js 14 (App Router) |
| Auth | Privy (email / Google / wallet) |
| Backend | Express.js + Hono |
| AI Protocol | MCP (Model Context Protocol) |
| Payment Protocol | x402 (HTTP 402) |
| Bot | Grammy (Telegram) |
| Deploy | Vercel (dashboard) · Railway (backend, shop, bot) |

## Built for Indonesia Web3 Hackathon 2026 — BNB Chain

| Track | What LunasAI does |
|---|---|
| x402 Protocol | `paid_fetch` answers HTTP 402 by paying through DelegationCardV2 on-chain |
| MCP Integration | AI agent connects via one MCP URL and can immediately spend within card limits |
| On-chain Spending | Every transaction is recorded on BNB Testnet, verifiable on BSCScan |
| Bilingual | Full Indonesian / English support across the entire platform |

---

**Diva Manik** — [github.com/DivaManik](https://github.com/DivaManik)
