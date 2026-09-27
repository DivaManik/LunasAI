# AgentPay — Multi-Agent Team Structure

## Overview

Proyek AgentPay dibangun oleh 6 tim agent yang bekerja secara paralel dengan koordinasi Orchestrator.

---

## Tim & Jobdesk

| File | Tim | Scope | Hari |
|---|---|---|---|
| [00-orchestrator.md](./00-orchestrator.md) | Orchestrator | Koordinasi, dependency management | Sepanjang proyek |
| [01-contract-team.md](./01-contract-team.md) | Smart Contract Team | DelegationCard.sol, Hardhat, deploy BNB Testnet | Hari 1-2 |
| [02-backend-team.md](./02-backend-team.md) | Backend Team | Hono API, viem contract integration, Telegram notif | Hari 3 |
| [03-bot-team.md](./03-bot-team.md) | Bot Team | Grammy Telegram bot, commands, approval callbacks | Hari 4 |
| [04-frontend-team.md](./04-frontend-team.md) | Frontend Team | Next.js dashboard, wagmi, card management UI | Hari 5 |
| [05-shop-team.md](./05-shop-team.md) | Demo Shop Team | Express demo seller, product catalog | Hari 2 (paralel) |
| [06-audit-team.md](./06-audit-team.md) | Audit Team | E2E testing, contract security, demo flow | Hari 6-7 |

---

## Dependency Graph

```
Hari 1:  [Monorepo Setup] ──────────────────────────────────┐
                                                             ▼
Hari 1-2:                              [Contract Team] ──────┤
                                                             │
Hari 2:   [Shop Team] ──── (paralel, independen) ────────────┤
                                                             │
Hari 3:                               [Backend Team] ◄───────┤ (butuh contract address)
                                            │
Hari 4:          [Bot Team] ◄───────────────┤ (butuh backend URL)
                 [Frontend Team] ◄──────────┘ (butuh contract address)
                 (keduanya paralel)

Hari 6-7:                              [Audit Team] ◄──── semua selesai
```

---

## Info Penting per Tim

### Yang Disebarkan Contract Team → tim lain:
```
DELEGATION_CARD_ADDRESS=0x...
ABI: packages/contracts/artifacts/contracts/DelegationCard.sol/DelegationCard.json
```

### Yang Disebarkan Shop Team → Backend Team:
```
SHOP_URL=http://localhost:3002
SHOP_WALLET_ADDRESS=0x...
```

### Yang Disebarkan Backend Team → Bot Team & Frontend Team:
```
BACKEND_URL=http://localhost:3001
```

---

## Port Map

| Service | Port |
|---|---|
| Dashboard (Next.js) | 3000 |
| Backend (Hono) | 3001 |
| Demo Shop (Express) | 3002 |
| Telegram Bot | N/A (long polling) |

---

## File Referensi

- **Spec:** `docs/superpowers/specs/2026-09-24-agentpay-design.md`
- **Plan:** `docs/superpowers/plans/2026-09-24-agentpay-implementation.md`
- **Audit Report:** `docs/audit/` (dibuat oleh Audit Team)
