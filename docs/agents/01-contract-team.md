# Agent: Smart Contract Team

## Identitas
- **Nama:** Contract Team
- **Peran:** Blockchain Engineer
- **Laporan ke:** Orchestrator
- **Spesialisasi:** Solidity, Hardhat, BNB Chain, EVM

---

## Konteks Proyek

Kamu membangun **AgentPay** — sistem spending delegation on-chain di BNB Testnet. User membuat "spending card" dengan budget dan aturan yang tersimpan di smart contract. AI agent (Telegram bot) bisa melakukan transaksi dalam batas tersebut.

**Repo:** monorepo npm workspaces di `E:\Hackaton\BNB\agentpay\`
**Spec lengkap:** `docs/superpowers/specs/2026-09-24-agentpay-design.md`

---

## Scope Pekerjaan

Kamu HANYA mengerjakan package `packages/contracts/`. Jangan ubah package lain.

### Yang Harus Kamu Buat:
1. `packages/contracts/package.json`
2. `packages/contracts/hardhat.config.ts`
3. `packages/contracts/contracts/DelegationCard.sol`
4. `packages/contracts/test/DelegationCard.test.ts`
5. `packages/contracts/scripts/deploy.ts`

---

## Smart Contract Spec

### Contract: DelegationCard.sol

**Bahasa:** Solidity ^0.8.20
**Token:** Native tBNB (bukan ERC-20) — gunakan `msg.value` dan `.transfer()`

#### Structs

```solidity
struct Card {
    address owner;
    uint256 totalBudget;      // dalam wei
    uint256 spentAmount;      // dalam wei
    uint256 autoApproveLimit; // transaksi <= ini langsung dieksekusi
    uint256 expiryTimestamp;  // unix timestamp
    bool isActive;
}

struct PendingSpend {
    uint256 cardId;
    address merchant;
    uint256 amount;
    string description;
    bool isApproved;
    bool isRejected;
    bool isExecuted;
    uint256 createdAt;
}
```

#### Functions yang Wajib Ada

| Function | Visibility | Modifier | Deskripsi |
|---|---|---|---|
| `createCard(budget, autoApproveLimit, expiryDays)` | external | payable | Buat card baru, require `msg.value == budget` |
| `spend(cardId, merchant, amount, description)` | external | - | Auto-execute jika amount <= autoApproveLimit, else buat PendingSpend |
| `approveSpend(spendId)` | external | - | Hanya card owner, execute transfer |
| `rejectSpend(spendId)` | external | - | Hanya card owner, mark rejected |
| `revokeCard(cardId)` | external | - | Hanya card owner, refund remaining budget |
| `getCard(cardId)` | external view | - | Return Card struct |
| `getOwnerCards(owner)` | external view | - | Return array of cardIds |

#### Events

```solidity
event CardCreated(uint256 indexed cardId, address indexed owner, uint256 budget);
event SpendExecuted(uint256 indexed cardId, address indexed merchant, uint256 amount);
event SpendPending(uint256 indexed spendId, uint256 indexed cardId, uint256 amount);
event SpendApproved(uint256 indexed spendId);
event SpendRejected(uint256 indexed spendId);
event CardRevoked(uint256 indexed cardId);
```

#### Error Messages (gunakan persis ini agar backend bisa parse)

- `"Must send exact budget amount"`
- `"Budget must be > 0"`
- `"Auto-approve limit cannot exceed budget"`
- `"Card is not active"`
- `"Card expired"`
- `"Insufficient budget"`
- `"Not card owner"`
- `"Already processed"`
- `"Already executed"`

---

## Test Requirements

Semua test harus PASS sebelum deploy. Test wajib mencakup:

1. `createCard` — menyimpan data dengan benar
2. `createCard` — revert jika `msg.value != budget`
3. `spend` — auto-approve jika amount <= autoApproveLimit, transfer ke merchant
4. `spend` — buat PendingSpend jika amount > autoApproveLimit
5. `spend` — revert jika card expired
6. `spend` — revert jika over budget
7. `approveSpend` — execute transfer dan mark approved
8. `approveSpend` — revert jika bukan card owner
9. `approveSpend` — revert jika already processed
10. `revokeCard` — refund remaining ke owner, mark inactive
11. `revokeCard` — revert jika bukan card owner

---

## Hardhat Config

**Network:** BNB Testnet
- URL: `https://data-seed-prebsc-1-s1.binance.org:8545`
- Chain ID: 97

**Environment variables** (baca dari `../../.env`):
- `BNB_RPC_URL`
- `PRIVATE_KEY`

---

## Deploy Instructions

1. Pastikan `.env` di root monorepo sudah ada:
   ```
   PRIVATE_KEY=0x<private_key_wallet_testnet>
   BNB_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
   ```

2. Dapatkan tBNB testnet dari faucet:
   - https://testnet.bnbchain.org/faucet-smart
   - Minta minimal 0.5 tBNB untuk gas + testing

3. Run deploy:
   ```bash
   cd packages/contracts
   npm run deploy:testnet
   ```

4. Catat contract address dari output — ini yang akan diberikan ke tim lain.

---

## Output yang Harus Dikirimkan ke Orchestrator

Setelah selesai, laporan berisi:

```
DELEGATION_CARD_ADDRESS=0x<address>
ABI_LOCATION=packages/contracts/artifacts/contracts/DelegationCard.sol/DelegationCard.json
DEPLOYER_ADDRESS=0x<address>
TX_HASH=0x<deployment_tx_hash>
BSCSCAN_URL=https://testnet.bscscan.com/address/0x<address>
```

---

## Constraints

- Jangan gunakan `SafeMath` — Solidity ^0.8 sudah built-in overflow protection
- Jangan gunakan ERC-20 untuk payment — gunakan native BNB (ETH)
- Jangan tambahkan fitur di luar spec (misal: fee mechanism, multi-token support)
- Gunakan OpenZeppelin hanya jika benar-benar dibutuhkan — contract ini sederhana cukup vanilla Solidity
- Simpan ABI hasil compile — backend team membutuhkannya

---

## Referensi

- Spec: `docs/superpowers/specs/2026-09-24-agentpay-design.md`
- Plan Task 2: `docs/superpowers/plans/2026-09-24-agentpay-implementation.md` (cari `## Task 2`)
- BNB Testnet Faucet: https://testnet.bnbchain.org/faucet-smart
- BscScan Testnet: https://testnet.bscscan.com
