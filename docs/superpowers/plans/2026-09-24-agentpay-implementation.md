# AgentPay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bangun AgentPay — sistem spending delegation on-chain di BNB Testnet yang memungkinkan AI agent (Telegram bot) belanja dalam batas yang ditentukan user via smart contract.

**Architecture:** Monorepo npm workspaces dengan 4 packages: `contracts` (Hardhat), `backend` (Hono API), `bot` (Grammy Telegram), dan `shop` (Express demo). Frontend Next.js dikerjakan terakhir sebagai package `dashboard`. Backend menjadi pusat koordinasi antara bot, contract, dan shop.

**Tech Stack:** Solidity ^0.8.20, Hardhat, Hono, Grammy, Next.js 14, Tailwind, wagmi, viem, x402-node, BNB Testnet (Chain ID 97)

**Spec:** `docs/superpowers/specs/2026-09-24-agentpay-design.md`

## Global Constraints

- Node.js >= 20
- BNB Testnet Chain ID: 97, RPC: `https://data-seed-prebsc-1-s1.binance.org:8545`
- Native token: tBNB (bukan ERC-20, gunakan native ETH transfer)
- Semua amount dalam wei (bigint), bukan ether
- Semua package menggunakan npm, bukan yarn/pnpm
- Port: backend=3001, shop=3002, dashboard=3000
- Environment variables disimpan di `.env` di root monorepo, di-copy ke masing-masing package saat dev
- Jangan commit `.env`, private key, atau mnemonic

## Review Focus

- **Card sudah expired tapi agent masih coba spend** — contract harus revert dengan pesan "Card expired"
- **Agent spend melebihi sisa budget** — contract harus revert dengan pesan "Insufficient budget"
- **User bukan owner card tapi coba approve/revoke** — contract harus revert dengan pesan "Not card owner"
- **PendingSpend sudah di-approve/reject tapi di-execute lagi** — contract harus revert dengan pesan "Already processed"
- **Bot menerima /use dengan cardId yang tidak ada** — bot harus reply error yang informatif, bukan crash

---

## Monorepo Structure

```
agentpay/
├── package.json              # root workspaces config
├── .env                      # semua env vars
├── packages/
│   ├── contracts/            # Hardhat project
│   │   ├── contracts/DelegationCard.sol
│   │   ├── scripts/deploy.ts
│   │   ├── test/DelegationCard.test.ts
│   │   └── hardhat.config.ts
│   ├── backend/              # Hono API
│   │   ├── src/
│   │   │   ├── index.ts      # entry point
│   │   │   ├── routes/
│   │   │   │   ├── cards.ts
│   │   │   │   ├── spend.ts
│   │   │   │   └── history.ts
│   │   │   ├── services/
│   │   │   │   ├── contract.ts   # viem contract calls
│   │   │   │   └── telegram.ts   # kirim notif ke bot
│   │   │   └── db.ts         # in-memory store (Map)
│   │   └── package.json
│   ├── bot/                  # Grammy Telegram bot
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── commands/
│   │   │   │   ├── start.ts
│   │   │   │   ├── connect.ts
│   │   │   │   ├── use.ts
│   │   │   │   └── buy.ts
│   │   │   └── callbacks/
│   │   │       └── approval.ts
│   │   └── package.json
│   ├── shop/                 # Demo shop
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── products.ts
│   │   │   └── x402.ts
│   │   └── package.json
│   └── dashboard/            # Next.js (dikerjakan terakhir)
│       ├── app/
│       │   ├── page.tsx
│       │   ├── cards/page.tsx
│       │   └── history/[cardId]/page.tsx
│       ├── components/
│       │   ├── CreateCardForm.tsx
│       │   ├── CardList.tsx
│       │   └── WalletConnect.tsx
│       └── package.json
```

---

## Task 1: Monorepo Setup

**Files:**
- Create: `package.json` (root)
- Create: `.env.example`
- Create: `.gitignore`

**Interfaces:**
- Produces: workspace structure yang bisa di-`npm install` dari root

- [ ] **Step 1: Buat root directory dan masuk ke dalamnya**

```powershell
mkdir agentpay
cd agentpay
```

- [ ] **Step 2: Buat root package.json**

```json
{
  "name": "agentpay",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev:backend": "npm run dev --workspace=packages/backend",
    "dev:bot": "npm run dev --workspace=packages/bot",
    "dev:shop": "npm run dev --workspace=packages/shop",
    "dev:dashboard": "npm run dev --workspace=packages/dashboard",
    "test:contracts": "npm run test --workspace=packages/contracts"
  }
}
```

- [ ] **Step 3: Buat .env.example**

```env
# BNB Testnet
BNB_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
CHAIN_ID=97

# Deployer wallet (JANGAN PAKAI WALLET ASLI)
PRIVATE_KEY=0x...

# Contract (diisi setelah deploy)
DELEGATION_CARD_ADDRESS=0x...

# Telegram
TELEGRAM_BOT_TOKEN=...

# Backend
BACKEND_URL=http://localhost:3001
SHOP_URL=http://localhost:3002
```

- [ ] **Step 4: Buat .gitignore**

```
node_modules/
.env
packages/contracts/artifacts/
packages/contracts/cache/
packages/contracts/ignition/
dist/
.next/
```

- [ ] **Step 5: Buat directory struktur packages**

```powershell
mkdir packages/contracts, packages/backend, packages/bot, packages/shop, packages/dashboard
```

- [ ] **Step 6: Commit**

```bash
git init
git add package.json .env.example .gitignore
git commit -m "chore: init monorepo structure

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Smart Contract — DelegationCard.sol

**Files:**
- Create: `packages/contracts/package.json`
- Create: `packages/contracts/hardhat.config.ts`
- Create: `packages/contracts/contracts/DelegationCard.sol`
- Create: `packages/contracts/test/DelegationCard.test.ts`
- Create: `packages/contracts/scripts/deploy.ts`

**Interfaces:**
- Produces: ABI dan contract address untuk dipakai backend (Task 4)
- Produces: `packages/contracts/artifacts/contracts/DelegationCard.sol/DelegationCard.json`

- [ ] **Step 1: Setup Hardhat package**

```powershell
cd packages/contracts
```

Buat `packages/contracts/package.json`:
```json
{
  "name": "@agentpay/contracts",
  "version": "1.0.0",
  "scripts": {
    "compile": "hardhat compile",
    "test": "hardhat test",
    "deploy:testnet": "hardhat run scripts/deploy.ts --network bnbTestnet"
  },
  "devDependencies": {
    "@nomicfoundation/hardhat-toolbox": "^5.0.0",
    "hardhat": "^2.22.0"
  },
  "dependencies": {
    "@openzeppelin/contracts": "^5.0.0"
  }
}
```

```bash
npm install
```

- [ ] **Step 2: Buat hardhat.config.ts**

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    bnbTestnet: {
      url: process.env.BNB_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};

export default config;
```

- [ ] **Step 3: Tulis DelegationCard.sol**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DelegationCard {
    struct Card {
        address owner;
        uint256 totalBudget;
        uint256 spentAmount;
        uint256 autoApproveLimit;
        uint256 expiryTimestamp;
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

    uint256 private _nextCardId = 1;
    uint256 private _nextSpendId = 1;

    mapping(uint256 => Card) public cards;
    mapping(uint256 => PendingSpend) public pendingSpends;
    mapping(address => uint256[]) public ownerCards;

    event CardCreated(uint256 indexed cardId, address indexed owner, uint256 budget);
    event SpendExecuted(uint256 indexed cardId, address indexed merchant, uint256 amount);
    event SpendPending(uint256 indexed spendId, uint256 indexed cardId, uint256 amount);
    event SpendApproved(uint256 indexed spendId);
    event SpendRejected(uint256 indexed spendId);
    event CardRevoked(uint256 indexed cardId);

    function createCard(
        uint256 budget,
        uint256 autoApproveLimit,
        uint256 expiryDays
    ) external payable returns (uint256) {
        require(msg.value == budget, "Must send exact budget amount");
        require(budget > 0, "Budget must be > 0");
        require(autoApproveLimit <= budget, "Auto-approve limit cannot exceed budget");

        uint256 cardId = _nextCardId++;
        cards[cardId] = Card({
            owner: msg.sender,
            totalBudget: budget,
            spentAmount: 0,
            autoApproveLimit: autoApproveLimit,
            expiryTimestamp: block.timestamp + (expiryDays * 1 days),
            isActive: true
        });
        ownerCards[msg.sender].push(cardId);

        emit CardCreated(cardId, msg.sender, budget);
        return cardId;
    }

    function spend(
        uint256 cardId,
        address payable merchant,
        uint256 amount,
        string calldata description
    ) external returns (bool autoApproved, uint256 pendingSpendId) {
        Card storage card = cards[cardId];
        require(card.isActive, "Card is not active");
        require(block.timestamp < card.expiryTimestamp, "Card expired");
        require(card.spentAmount + amount <= card.totalBudget, "Insufficient budget");

        if (amount <= card.autoApproveLimit) {
            card.spentAmount += amount;
            merchant.transfer(amount);
            emit SpendExecuted(cardId, merchant, amount);
            return (true, 0);
        } else {
            uint256 spendId = _nextSpendId++;
            pendingSpends[spendId] = PendingSpend({
                cardId: cardId,
                merchant: merchant,
                amount: amount,
                description: description,
                isApproved: false,
                isRejected: false,
                isExecuted: false,
                createdAt: block.timestamp
            });
            emit SpendPending(spendId, cardId, amount);
            return (false, spendId);
        }
    }

    function approveSpend(uint256 spendId) external {
        PendingSpend storage ps = pendingSpends[spendId];
        Card storage card = cards[ps.cardId];
        require(card.owner == msg.sender, "Not card owner");
        require(!ps.isApproved && !ps.isRejected, "Already processed");
        require(!ps.isExecuted, "Already executed");

        ps.isApproved = true;
        ps.isExecuted = true;
        card.spentAmount += ps.amount;
        payable(ps.merchant).transfer(ps.amount);
        emit SpendApproved(spendId);
        emit SpendExecuted(ps.cardId, ps.merchant, ps.amount);
    }

    function rejectSpend(uint256 spendId) external {
        PendingSpend storage ps = pendingSpends[spendId];
        Card storage card = cards[ps.cardId];
        require(card.owner == msg.sender, "Not card owner");
        require(!ps.isApproved && !ps.isRejected, "Already processed");

        ps.isRejected = true;
        emit SpendRejected(spendId);
    }

    function revokeCard(uint256 cardId) external {
        Card storage card = cards[cardId];
        require(card.owner == msg.sender, "Not card owner");
        require(card.isActive, "Card already inactive");

        card.isActive = false;
        uint256 remaining = card.totalBudget - card.spentAmount;
        if (remaining > 0) {
            payable(msg.sender).transfer(remaining);
        }
        emit CardRevoked(cardId);
    }

    function getCard(uint256 cardId) external view returns (Card memory) {
        return cards[cardId];
    }

    function getOwnerCards(address owner) external view returns (uint256[] memory) {
        return ownerCards[owner];
    }
}
```

- [ ] **Step 4: Tulis test DelegationCard.test.ts**

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";
import { DelegationCard } from "../typechain-types";

describe("DelegationCard", () => {
  let contract: DelegationCard;
  let owner: any;
  let agent: any;
  let merchant: any;

  const budget = ethers.parseEther("0.1");
  const autoLimit = ethers.parseEther("0.01");
  const expiryDays = 7n;

  beforeEach(async () => {
    [owner, agent, merchant] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DelegationCard");
    contract = await Factory.deploy();
  });

  it("createCard: stores card with correct values", async () => {
    await contract.connect(owner).createCard(budget, autoLimit, expiryDays, { value: budget });
    const card = await contract.getCard(1n);
    expect(card.owner).to.equal(owner.address);
    expect(card.totalBudget).to.equal(budget);
    expect(card.autoApproveLimit).to.equal(autoLimit);
    expect(card.isActive).to.be.true;
  });

  it("createCard: reverts if msg.value != budget", async () => {
    await expect(
      contract.connect(owner).createCard(budget, autoLimit, expiryDays, { value: ethers.parseEther("0.05") })
    ).to.be.revertedWith("Must send exact budget amount");
  });

  it("spend: auto-approves if amount <= autoApproveLimit", async () => {
    await contract.connect(owner).createCard(budget, autoLimit, expiryDays, { value: budget });
    const smallAmount = ethers.parseEther("0.005");
    const balanceBefore = await ethers.provider.getBalance(merchant.address);
    const tx = await contract.connect(agent).spend(1n, merchant.address, smallAmount, "small item");
    const [autoApproved] = await tx.wait().then(() => contract.getCard(1n)).then(c => [c.spentAmount === smallAmount]);
    const balanceAfter = await ethers.provider.getBalance(merchant.address);
    expect(balanceAfter - balanceBefore).to.equal(smallAmount);
  });

  it("spend: creates pending if amount > autoApproveLimit", async () => {
    await contract.connect(owner).createCard(budget, autoLimit, expiryDays, { value: budget });
    const bigAmount = ethers.parseEther("0.05");
    await contract.connect(agent).spend(1n, merchant.address, bigAmount, "big item");
    const ps = await contract.pendingSpends(1n);
    expect(ps.amount).to.equal(bigAmount);
    expect(ps.isApproved).to.be.false;
    expect(ps.isExecuted).to.be.false;
  });

  it("spend: reverts if card expired", async () => {
    await contract.connect(owner).createCard(budget, autoLimit, 0n, { value: budget });
    await ethers.provider.send("evm_increaseTime", [86401]);
    await ethers.provider.send("evm_mine", []);
    await expect(
      contract.connect(agent).spend(1n, merchant.address, autoLimit, "item")
    ).to.be.revertedWith("Card expired");
  });

  it("spend: reverts if over budget", async () => {
    await contract.connect(owner).createCard(budget, autoLimit, expiryDays, { value: budget });
    await expect(
      contract.connect(agent).spend(1n, merchant.address, ethers.parseEther("0.2"), "expensive")
    ).to.be.revertedWith("Insufficient budget");
  });

  it("approveSpend: executes transfer and marks approved", async () => {
    await contract.connect(owner).createCard(budget, autoLimit, expiryDays, { value: budget });
    const bigAmount = ethers.parseEther("0.05");
    await contract.connect(agent).spend(1n, merchant.address, bigAmount, "big item");
    const balanceBefore = await ethers.provider.getBalance(merchant.address);
    await contract.connect(owner).approveSpend(1n);
    const balanceAfter = await ethers.provider.getBalance(merchant.address);
    expect(balanceAfter - balanceBefore).to.equal(bigAmount);
    const ps = await contract.pendingSpends(1n);
    expect(ps.isApproved).to.be.true;
  });

  it("approveSpend: reverts if not card owner", async () => {
    await contract.connect(owner).createCard(budget, autoLimit, expiryDays, { value: budget });
    await contract.connect(agent).spend(1n, merchant.address, ethers.parseEther("0.05"), "item");
    await expect(contract.connect(agent).approveSpend(1n)).to.be.revertedWith("Not card owner");
  });

  it("approveSpend: reverts if already processed", async () => {
    await contract.connect(owner).createCard(budget, autoLimit, expiryDays, { value: budget });
    await contract.connect(agent).spend(1n, merchant.address, ethers.parseEther("0.05"), "item");
    await contract.connect(owner).approveSpend(1n);
    await expect(contract.connect(owner).approveSpend(1n)).to.be.revertedWith("Already processed");
  });

  it("revokeCard: refunds remaining budget to owner", async () => {
    await contract.connect(owner).createCard(budget, autoLimit, expiryDays, { value: budget });
    const balanceBefore = await ethers.provider.getBalance(owner.address);
    const tx = await contract.connect(owner).revokeCard(1n);
    const receipt = await tx.wait();
    const gasUsed = receipt!.gasUsed * tx.gasPrice!;
    const balanceAfter = await ethers.provider.getBalance(owner.address);
    expect(balanceAfter + gasUsed - balanceBefore).to.be.closeTo(budget, ethers.parseEther("0.001"));
    const card = await contract.getCard(1n);
    expect(card.isActive).to.be.false;
  });

  it("revokeCard: reverts if not owner", async () => {
    await contract.connect(owner).createCard(budget, autoLimit, expiryDays, { value: budget });
    await expect(contract.connect(agent).revokeCard(1n)).to.be.revertedWith("Not card owner");
  });
});
```

- [ ] **Step 5: Jalankan test**

```bash
cd packages/contracts
npx hardhat test
```

Expected: semua 9 test PASS

- [ ] **Step 6: Buat deploy script**

```typescript
// packages/contracts/scripts/deploy.ts
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "tBNB");

  const Factory = await ethers.getContractFactory("DelegationCard");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("DelegationCard deployed to:", address);
  console.log("Update .env: DELEGATION_CARD_ADDRESS=" + address);
}

main().catch(console.error);
```

- [ ] **Step 7: Deploy ke BNB Testnet**

Pastikan `.env` sudah ada `PRIVATE_KEY` dan wallet punya tBNB testnet (dari faucet: https://testnet.bnbchain.org/faucet-smart).

```bash
npm run deploy:testnet
```

Catat contract address dan update `.env` → `DELEGATION_CARD_ADDRESS=0x...`

- [ ] **Step 8: Commit**

```bash
git add packages/contracts/
git commit -m "feat: add DelegationCard smart contract with tests

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Demo Shop (x402 payment receiver)

**Files:**
- Create: `packages/shop/package.json`
- Create: `packages/shop/src/index.ts`
- Create: `packages/shop/src/products.ts`

**Interfaces:**
- Produces: `GET http://localhost:3002/products` → `Product[]`
- Produces: `POST http://localhost:3002/purchase` dengan x402 payment header → `{ success, item }`
- Consumes: x402 payment dari backend (Task 4)

- [ ] **Step 1: Setup shop package**

Buat `packages/shop/package.json`:
```json
{
  "name": "@agentpay/shop",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts"
  },
  "dependencies": {
    "express": "^4.18.0",
    "x402-express": "^0.1.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

```bash
cd packages/shop && npm install
```

- [ ] **Step 2: Buat products catalog**

```typescript
// packages/shop/src/products.ts
export interface Product {
  id: string;
  name: string;
  description: string;
  priceWei: bigint;
  priceDisplay: string;
}

export const products: Product[] = [
  {
    id: "hoodie-basic",
    name: "Hoodie Basic AgentPay",
    description: "Hoodie polos dengan logo AgentPay",
    priceWei: BigInt("5000000000000000"), // 0.005 tBNB
    priceDisplay: "0.005 tBNB",
  },
  {
    id: "tshirt-premium",
    name: "T-Shirt Premium",
    description: "T-shirt premium limited edition",
    priceWei: BigInt("8000000000000000"), // 0.008 tBNB
    priceDisplay: "0.008 tBNB",
  },
  {
    id: "laptop-gaming",
    name: "Laptop Gaming Pro",
    description: "Laptop gaming high-end untuk developer",
    priceWei: BigInt("50000000000000000"), // 0.05 tBNB (di atas auto-approve)
    priceDisplay: "0.05 tBNB",
  },
  {
    id: "coffee-premium",
    name: "Kopi Premium 1kg",
    description: "Kopi arabika premium dari Aceh",
    priceWei: BigInt("3000000000000000"), // 0.003 tBNB
    priceDisplay: "0.003 tBNB",
  },
];
```

- [ ] **Step 3: Buat Express server dengan x402**

```typescript
// packages/shop/src/index.ts
import express from "express";
import { products } from "./products";

const app = express();
app.use(express.json());

const PORT = process.env.SHOP_PORT || 3002;
// Alamat wallet shop (menerima pembayaran)
const SHOP_WALLET = process.env.SHOP_WALLET_ADDRESS || "0x0000000000000000000000000000000000000001";

app.get("/products", (_req, res) => {
  res.json(products.map(p => ({
    ...p,
    priceWei: p.priceWei.toString(), // JSON tidak support bigint
  })));
});

app.get("/products/:id", (req, res) => {
  const product = products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json({ ...product, priceWei: product.priceWei.toString() });
});

// Endpoint purchase — diakses setelah payment diverifikasi backend
app.post("/purchase", (req, res) => {
  const { productId, paymentTxHash } = req.body;
  const product = products.find(p => p.id === productId);
  if (!product) return res.status(404).json({ error: "Product not found" });

  // Di MVP: trust backend sudah verifikasi payment sebelum call endpoint ini
  res.json({
    success: true,
    message: `Pembelian ${product.name} berhasil!`,
    item: product.name,
    txHash: paymentTxHash,
  });
});

app.listen(PORT, () => {
  console.log(`Demo shop running on port ${PORT}`);
  console.log(`Shop wallet: ${SHOP_WALLET}`);
});
```

- [ ] **Step 4: Test manual**

```bash
npm run dev
# Di terminal lain:
curl http://localhost:3002/products
```

Expected: JSON array 4 produk

- [ ] **Step 5: Commit**

```bash
git add packages/shop/
git commit -m "feat: add demo shop with product catalog

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Backend API (Hono)

**Files:**
- Create: `packages/backend/package.json`
- Create: `packages/backend/src/index.ts`
- Create: `packages/backend/src/db.ts`
- Create: `packages/backend/src/services/contract.ts`
- Create: `packages/backend/src/services/telegram.ts`
- Create: `packages/backend/src/routes/cards.ts`
- Create: `packages/backend/src/routes/spend.ts`
- Create: `packages/backend/src/routes/history.ts`

**Interfaces:**
- Consumes: DelegationCard ABI dari `packages/contracts/artifacts/...`
- Consumes: env vars `BNB_RPC_URL`, `DELEGATION_CARD_ADDRESS`, `PRIVATE_KEY`, `TELEGRAM_BOT_TOKEN`
- Produces: REST API di port 3001
  - `POST /api/cards` → `{ cardId: string }`
  - `GET /api/cards/:id` → Card object
  - `POST /api/spend` → `{ autoApproved: boolean, pendingSpendId?: string }`
  - `POST /api/approve/:spendId` → `{ success: boolean }`
  - `POST /api/reject/:spendId` → `{ success: boolean }`
  - `GET /api/history/:cardId` → `SpendRecord[]`
  - `POST /api/connect-telegram` → `{ success: boolean }`

- [ ] **Step 1: Setup backend package**

Buat `packages/backend/package.json`:
```json
{
  "name": "@agentpay/backend",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts"
  },
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

```bash
cd packages/backend && npm install
```

- [ ] **Step 2: Buat in-memory database**

```typescript
// packages/backend/src/db.ts
export interface SpendRecord {
  id: string;
  cardId: string;
  merchant: string;
  amount: string; // dalam wei sebagai string
  description: string;
  status: "auto_approved" | "pending" | "approved" | "rejected";
  txHash?: string;
  createdAt: number;
  pendingSpendId?: string;
}

export interface TelegramMapping {
  walletAddress: string;
  telegramChatId: string;
}

// In-memory stores — cukup untuk MVP hackathon
export const spendHistory = new Map<string, SpendRecord[]>(); // cardId -> records
export const telegramMappings = new Map<string, TelegramMapping>(); // walletAddress -> mapping
export const pendingSpendMap = new Map<string, string>(); // pendingSpendId (contract) -> cardId

export function addSpendRecord(cardId: string, record: SpendRecord) {
  const existing = spendHistory.get(cardId) || [];
  existing.push(record);
  spendHistory.set(cardId, existing);
}

export function getSpendHistory(cardId: string): SpendRecord[] {
  return spendHistory.get(cardId) || [];
}

export function connectTelegram(walletAddress: string, telegramChatId: string) {
  telegramMappings.set(walletAddress.toLowerCase(), { walletAddress, telegramChatId });
}

export function getTelegramChatId(walletAddress: string): string | undefined {
  return telegramMappings.get(walletAddress.toLowerCase())?.telegramChatId;
}
```

- [ ] **Step 3: Buat contract service**

```typescript
// packages/backend/src/services/contract.ts
import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bscTestnet } from "viem/chains";
import * as dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

const CONTRACT_ADDRESS = process.env.DELEGATION_CARD_ADDRESS as `0x${string}`;
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;

const abi = parseAbi([
  "function spend(uint256 cardId, address merchant, uint256 amount, string description) returns (bool autoApproved, uint256 pendingSpendId)",
  "function approveSpend(uint256 spendId)",
  "function rejectSpend(uint256 spendId)",
  "function getCard(uint256 cardId) view returns (address owner, uint256 totalBudget, uint256 spentAmount, uint256 autoApproveLimit, uint256 expiryTimestamp, bool isActive)",
]);

export const publicClient = createPublicClient({
  chain: bscTestnet,
  transport: http(process.env.BNB_RPC_URL),
});

export const walletClient = createWalletClient({
  chain: bscTestnet,
  transport: http(process.env.BNB_RPC_URL),
  account: privateKeyToAccount(PRIVATE_KEY),
});

export async function callSpend(
  cardId: bigint,
  merchant: `0x${string}`,
  amount: bigint,
  description: string
): Promise<{ autoApproved: boolean; pendingSpendId: bigint }> {
  const { result } = await publicClient.simulateContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: "spend",
    args: [cardId, merchant, amount, description],
    account: walletClient.account,
  });
  await walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: "spend",
    args: [cardId, merchant, amount, description],
  });
  return { autoApproved: result[0], pendingSpendId: result[1] };
}

export async function callApproveSpend(spendId: bigint): Promise<void> {
  await walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: "approveSpend",
    args: [spendId],
  });
}

export async function callRejectSpend(spendId: bigint): Promise<void> {
  await walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: "rejectSpend",
    args: [spendId],
  });
}

export async function getCardFromChain(cardId: bigint) {
  return publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: "getCard",
    args: [cardId],
  });
}
```

- [ ] **Step 4: Buat Telegram notification service**

```typescript
// packages/backend/src/services/telegram.ts
import * as dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

export async function sendApprovalRequest(
  chatId: string,
  spendId: string,
  productName: string,
  amountDisplay: string,
  autoApproveLimitDisplay: string
): Promise<void> {
  const message =
    `💰 *Permintaan Pembelian*\n\n` +
    `Item: ${productName}\n` +
    `Harga: ${amountDisplay}\n` +
    `Auto-approve limit: ${autoApproveLimitDisplay}\n\n` +
    `Harga melebihi auto-approve limit. Setujui pembelian ini?`;

  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[
          { text: "✅ Approve", callback_data: `approve_${spendId}` },
          { text: "❌ Tolak", callback_data: `reject_${spendId}` },
        ]],
      },
    }),
  });
}

export async function sendMessage(chatId: string, text: string): Promise<void> {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}
```

- [ ] **Step 5: Buat routes**

```typescript
// packages/backend/src/routes/cards.ts
import { Hono } from "hono";
import { getCardFromChain } from "../services/contract";

const cards = new Hono();

cards.get("/:id", async (c) => {
  const cardId = BigInt(c.req.param("id"));
  try {
    const card = await getCardFromChain(cardId);
    return c.json({
      cardId: cardId.toString(),
      owner: card[0],
      totalBudget: card[1].toString(),
      spentAmount: card[2].toString(),
      autoApproveLimit: card[3].toString(),
      expiryTimestamp: card[4].toString(),
      isActive: card[5],
    });
  } catch {
    return c.json({ error: "Card not found" }, 404);
  }
});

export default cards;
```

```typescript
// packages/backend/src/routes/spend.ts
import { Hono } from "hono";
import { callSpend, callApproveSpend, callRejectSpend, getCardFromChain } from "../services/contract";
import { sendApprovalRequest, sendMessage } from "../services/telegram";
import { addSpendRecord, getTelegramChatId, pendingSpendMap } from "../db";
import { formatEther } from "viem";

const spend = new Hono();

spend.post("/", async (c) => {
  const { cardId, merchantAddress, amount, description, productName } = await c.req.json();

  try {
    const card = await getCardFromChain(BigInt(cardId));
    const result = await callSpend(
      BigInt(cardId),
      merchantAddress as `0x${string}`,
      BigInt(amount),
      description
    );

    addSpendRecord(cardId, {
      id: Date.now().toString(),
      cardId,
      merchant: merchantAddress,
      amount,
      description,
      status: result.autoApproved ? "auto_approved" : "pending",
      createdAt: Date.now(),
      pendingSpendId: result.autoApproved ? undefined : result.pendingSpendId.toString(),
    });

    if (!result.autoApproved) {
      const spendId = result.pendingSpendId.toString();
      pendingSpendMap.set(spendId, cardId);

      const chatId = getTelegramChatId(card[0]);
      if (chatId) {
        await sendApprovalRequest(
          chatId,
          spendId,
          productName || description,
          formatEther(BigInt(amount)) + " tBNB",
          formatEther(card[3]) + " tBNB"
        );
      }
    }

    return c.json({
      autoApproved: result.autoApproved,
      pendingSpendId: result.autoApproved ? null : result.pendingSpendId.toString(),
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

spend.post("/approve/:spendId", async (c) => {
  const spendId = c.req.param("spendId");
  try {
    await callApproveSpend(BigInt(spendId));
    const cardId = pendingSpendMap.get(spendId);
    if (cardId) {
      const history = (await import("../db")).spendHistory.get(cardId) || [];
      const record = history.find(r => r.pendingSpendId === spendId);
      if (record) record.status = "approved";
      const chatId = getTelegramChatId((await getCardFromChain(BigInt(cardId)))[0]);
      if (chatId) await sendMessage(chatId, `✅ Pembelian disetujui dan dieksekusi!`);
    }
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

spend.post("/reject/:spendId", async (c) => {
  const spendId = c.req.param("spendId");
  try {
    await callRejectSpend(BigInt(spendId));
    const cardId = pendingSpendMap.get(spendId);
    if (cardId) {
      const history = (await import("../db")).spendHistory.get(cardId) || [];
      const record = history.find(r => r.pendingSpendId === spendId);
      if (record) record.status = "rejected";
    }
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

export default spend;
```

```typescript
// packages/backend/src/routes/history.ts
import { Hono } from "hono";
import { getSpendHistory } from "../db";

const history = new Hono();

history.get("/:cardId", (c) => {
  const records = getSpendHistory(c.req.param("cardId"));
  return c.json(records);
});

export default history;
```

- [ ] **Step 6: Buat main entry point**

```typescript
// packages/backend/src/index.ts
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import * as dotenv from "dotenv";
import cards from "./routes/cards";
import spendRoutes from "./routes/spend";
import history from "./routes/history";
import { connectTelegram } from "./db";

dotenv.config({ path: "../../.env" });

const app = new Hono();
app.use("*", cors());

app.get("/health", (c) => c.json({ status: "ok" }));

app.post("/api/connect-telegram", async (c) => {
  const { walletAddress, telegramChatId } = await c.req.json();
  connectTelegram(walletAddress, telegramChatId);
  return c.json({ success: true });
});

app.route("/api/cards", cards);
app.route("/api/spend", spendRoutes);
app.route("/api/history", history);

serve({ fetch: app.fetch, port: 3001 }, () => {
  console.log("Backend running on port 3001");
});
```

- [ ] **Step 7: Test manual**

```bash
npm run dev
curl http://localhost:3001/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 8: Commit**

```bash
git add packages/backend/
git commit -m "feat: add Hono backend with contract integration and Telegram notifications

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Telegram Bot

**Files:**
- Create: `packages/bot/package.json`
- Create: `packages/bot/src/index.ts`
- Create: `packages/bot/src/commands/start.ts`
- Create: `packages/bot/src/commands/connect.ts`
- Create: `packages/bot/src/commands/use.ts`
- Create: `packages/bot/src/commands/buy.ts`
- Create: `packages/bot/src/callbacks/approval.ts`

**Interfaces:**
- Consumes: Backend API di `BACKEND_URL` (Task 4)
- Consumes: Shop API di `SHOP_URL` (Task 3)
- Consumes: `TELEGRAM_BOT_TOKEN` env var
- Produces: Telegram bot yang bisa menerima commands dan callback buttons

- [ ] **Step 1: Setup bot package**

Buat `packages/bot/package.json`:
```json
{
  "name": "@agentpay/bot",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts"
  },
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

```bash
cd packages/bot && npm install
```

- [ ] **Step 2: Buat commands**

```typescript
// packages/bot/src/commands/start.ts
import { Context } from "grammy";

export async function handleStart(ctx: Context) {
  await ctx.reply(
    `🤖 Selamat datang di AgentPay Bot!\n\n` +
    `Saya bisa belanja untuk kamu menggunakan Spending Card on-chain.\n\n` +
    `Langkah-langkah:\n` +
    `1. /connect <wallet_address> — hubungkan wallet kamu\n` +
    `2. /use <card_id> — set card aktif\n` +
    `3. /buy <nama_item> — minta saya belikan sesuatu\n\n` +
    `Contoh:\n` +
    `/connect 0x1234...abcd\n` +
    `/use 1\n` +
    `/buy hoodie basic`
  );
}
```

```typescript
// packages/bot/src/commands/connect.ts
import { Context } from "grammy";
import * as dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function handleConnect(ctx: Context) {
  const args = ctx.message?.text?.split(" ").slice(1);
  if (!args || args.length === 0) {
    return ctx.reply("Usage: /connect <wallet_address>\nContoh: /connect 0x1234...abcd");
  }

  const walletAddress = args[0];
  if (!walletAddress.match(/^0x[0-9a-fA-F]{40}$/)) {
    return ctx.reply("❌ Wallet address tidak valid. Pastikan format: 0x + 40 karakter hex");
  }

  const chatId = ctx.chat!.id.toString();
  try {
    await fetch(`${BACKEND_URL}/api/connect-telegram`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress, telegramChatId: chatId }),
    });
    await ctx.reply(`✅ Wallet ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)} berhasil dihubungkan!`);
  } catch {
    await ctx.reply("❌ Gagal menghubungkan wallet. Coba lagi.");
  }
}
```

```typescript
// packages/bot/src/commands/use.ts
import { Context } from "grammy";
import * as dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";
export const activeCards = new Map<string, string>(); // chatId -> cardId

export async function handleUse(ctx: Context) {
  const args = ctx.message?.text?.split(" ").slice(1);
  if (!args || args.length === 0) {
    return ctx.reply("Usage: /use <card_id>\nContoh: /use 1");
  }

  const cardId = args[0];
  const chatId = ctx.chat!.id.toString();

  try {
    const res = await fetch(`${BACKEND_URL}/api/cards/${cardId}`);
    if (!res.ok) return ctx.reply(`❌ Card ID ${cardId} tidak ditemukan.`);

    const card = await res.json() as any;
    if (!card.isActive) return ctx.reply("❌ Card ini sudah tidak aktif (revoked atau expired).");

    activeCards.set(chatId, cardId);
    const remaining = (BigInt(card.totalBudget) - BigInt(card.spentAmount));
    const remainingEth = Number(remaining) / 1e18;
    await ctx.reply(
      `✅ Card ${cardId} aktif!\n` +
      `Sisa budget: ${remainingEth.toFixed(4)} tBNB\n` +
      `Auto-approve hingga: ${(Number(card.autoApproveLimit) / 1e18).toFixed(4)} tBNB`
    );
  } catch {
    await ctx.reply("❌ Gagal mengambil info card. Coba lagi.");
  }
}
```

```typescript
// packages/bot/src/commands/buy.ts
import { Context } from "grammy";
import { activeCards } from "./use";
import * as dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";
const SHOP_URL = process.env.SHOP_URL || "http://localhost:3002";
const SHOP_WALLET = process.env.SHOP_WALLET_ADDRESS || "0x0000000000000000000000000000000000000001";

export async function handleBuy(ctx: Context) {
  const chatId = ctx.chat!.id.toString();
  const cardId = activeCards.get(chatId);

  if (!cardId) {
    return ctx.reply("❌ Belum ada card aktif. Gunakan /use <card_id> terlebih dahulu.");
  }

  const query = ctx.message?.text?.split(" ").slice(1).join(" ").toLowerCase();
  if (!query) return ctx.reply("Usage: /buy <nama_item>\nContoh: /buy hoodie basic");

  await ctx.reply(`🔍 Mencari "${query}" di demo shop...`);

  try {
    const res = await fetch(`${SHOP_URL}/products`);
    const products = await res.json() as any[];

    // Simple keyword matching
    const matched = products.find((p: any) =>
      p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query)
    );

    if (!matched) {
      const list = products.map((p: any) => `• ${p.name} (${p.priceDisplay})`).join("\n");
      return ctx.reply(`❌ Produk tidak ditemukan.\n\nProduk tersedia:\n${list}`);
    }

    await ctx.reply(
      `🛒 Ditemukan: *${matched.name}*\nHarga: ${matched.priceDisplay}\n\nMemproses pembayaran...`,
      { parse_mode: "Markdown" }
    );

    const spendRes = await fetch(`${BACKEND_URL}/api/spend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cardId,
        merchantAddress: SHOP_WALLET,
        amount: matched.priceWei,
        description: `Beli ${matched.name}`,
        productName: matched.name,
      }),
    });

    const spendResult = await spendRes.json() as any;

    if (!spendRes.ok) {
      return ctx.reply(`❌ Gagal: ${spendResult.error}`);
    }

    if (spendResult.autoApproved) {
      // Konfirmasi ke demo shop
      await fetch(`${SHOP_URL}/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: matched.id, paymentTxHash: "auto" }),
      });
      await ctx.reply(`✅ Pembelian *${matched.name}* berhasil!\nPembayaran otomatis diproses.`, { parse_mode: "Markdown" });
    } else {
      await ctx.reply(
        `⏳ Harga melebihi auto-approve limit.\nPermintaan approval sudah dikirim ke pemilik card.\nTunggu konfirmasi...`
      );
    }
  } catch (err: any) {
    await ctx.reply(`❌ Error: ${err.message}`);
  }
}
```

```typescript
// packages/bot/src/callbacks/approval.ts
import { Context } from "grammy";
import * as dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function handleApprovalCallback(ctx: Context) {
  const data = ctx.callbackQuery?.data;
  if (!data) return;

  const [action, spendId] = data.split("_");

  try {
    if (action === "approve") {
      const res = await fetch(`${BACKEND_URL}/api/spend/approve/${spendId}`, { method: "POST" });
      const result = await res.json() as any;
      if (result.success) {
        await ctx.editMessageText(`✅ Pembelian disetujui dan dieksekusi!`);
      } else {
        await ctx.editMessageText(`❌ Gagal approve: ${result.error}`);
      }
    } else if (action === "reject") {
      const res = await fetch(`${BACKEND_URL}/api/spend/reject/${spendId}`, { method: "POST" });
      const result = await res.json() as any;
      if (result.success) {
        await ctx.editMessageText(`❌ Pembelian ditolak.`);
      } else {
        await ctx.editMessageText(`❌ Gagal reject: ${result.error}`);
      }
    }
  } catch (err: any) {
    await ctx.editMessageText(`❌ Error: ${err.message}`);
  }

  await ctx.answerCallbackQuery();
}
```

- [ ] **Step 3: Buat main bot entry**

```typescript
// packages/bot/src/index.ts
import { Bot } from "grammy";
import * as dotenv from "dotenv";
dotenv.config({ path: "../../.env" });
import { handleStart } from "./commands/start";
import { handleConnect } from "./commands/connect";
import { handleUse } from "./commands/use";
import { handleBuy } from "./commands/buy";
import { handleApprovalCallback } from "./callbacks/approval";

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

bot.command("start", handleStart);
bot.command("help", handleStart);
bot.command("connect", handleConnect);
bot.command("use", handleUse);
bot.command("buy", handleBuy);

bot.on("callback_query:data", handleApprovalCallback);

bot.catch(console.error);
bot.start();

console.log("AgentPay bot started!");
```

- [ ] **Step 4: Buat Telegram bot di BotFather**

1. Buka Telegram, cari @BotFather
2. Kirim `/newbot`
3. Ikuti instruksi, dapatkan token
4. Tambahkan ke `.env`: `TELEGRAM_BOT_TOKEN=...`

- [ ] **Step 5: Test manual bot**

```bash
npm run dev
```

Buka Telegram, cari bot kamu, kirim `/start`. Expected: pesan welcome muncul.

- [ ] **Step 6: Commit**

```bash
git add packages/bot/
git commit -m "feat: add Telegram bot with buy/connect/use commands and approval callbacks

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Web Dashboard (Next.js — dikerjakan terakhir)

**Files:**
- Create: `packages/dashboard/package.json`
- Create: `packages/dashboard/app/page.tsx`
- Create: `packages/dashboard/app/layout.tsx`
- Create: `packages/dashboard/app/cards/page.tsx`
- Create: `packages/dashboard/components/CreateCardForm.tsx`
- Create: `packages/dashboard/components/CardList.tsx`
- Create: `packages/dashboard/components/WalletConnect.tsx`
- Create: `packages/dashboard/lib/wagmi.ts`

**Interfaces:**
- Consumes: DelegationCard contract address + ABI
- Consumes: Backend API di `NEXT_PUBLIC_BACKEND_URL`
- Produces: Web app di port 3000

- [ ] **Step 1: Setup Next.js**

```bash
cd packages/dashboard
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --no-import-alias --yes
npm install wagmi viem @tanstack/react-query
```

- [ ] **Step 2: Buat wagmi config**

```typescript
// packages/dashboard/lib/wagmi.ts
import { createConfig, http } from "wagmi";
import { bscTestnet } from "wagmi/chains";

export const config = createConfig({
  chains: [bscTestnet],
  transports: {
    [bscTestnet.id]: http(process.env.NEXT_PUBLIC_BNB_RPC_URL),
  },
});
```

- [ ] **Step 3: Buat layout dengan providers**

```tsx
// packages/dashboard/app/layout.tsx
"use client";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "../lib/wagmi";
import "./globals.css";

const queryClient = new QueryClient();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Buat WalletConnect component**

```tsx
// packages/dashboard/components/WalletConnect.tsx
"use client";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
        <button
          onClick={() => disconnect()}
          className="text-sm text-red-500 underline"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => connect({ connector: injected() })}
      className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-4 py-2 rounded"
    >
      Connect Wallet
    </button>
  );
}
```

- [ ] **Step 5: Buat CreateCardForm**

```tsx
// packages/dashboard/components/CreateCardForm.tsx
"use client";
import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_DELEGATION_CARD_ADDRESS as `0x${string}`;
const ABI = [
  {
    name: "createCard",
    type: "function",
    inputs: [
      { name: "budget", type: "uint256" },
      { name: "autoApproveLimit", type: "uint256" },
      { name: "expiryDays", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "payable",
  },
] as const;

export function CreateCardForm() {
  const { isConnected } = useAccount();
  const [budget, setBudget] = useState("0.05");
  const [autoLimit, setAutoLimit] = useState("0.01");
  const [expiryDays, setExpiryDays] = useState("7");

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) return alert("Connect wallet dulu!");

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: "createCard",
      args: [parseEther(budget), parseEther(autoLimit), BigInt(expiryDays)],
      value: parseEther(budget),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
      <h2 className="text-xl font-bold">Buat Spending Card Baru</h2>

      <div>
        <label className="block text-sm font-medium mb-1">Total Budget (tBNB)</label>
        <input
          type="number"
          step="0.001"
          value={budget}
          onChange={e => setBudget(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Auto-Approve Limit (tBNB)</label>
        <input
          type="number"
          step="0.001"
          value={autoLimit}
          onChange={e => setAutoLimit(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
        <p className="text-xs text-gray-500 mt-1">Transaksi di bawah nilai ini langsung disetujui otomatis</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Berlaku (hari)</label>
        <input
          type="number"
          value={expiryDays}
          onChange={e => setExpiryDays(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <button
        type="submit"
        disabled={isPending || isConfirming}
        className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-300 text-black font-bold px-4 py-2 rounded"
      >
        {isPending ? "Menunggu konfirmasi wallet..." : isConfirming ? "Memproses..." : "Buat Card"}
      </button>

      {isSuccess && (
        <p className="text-green-600 text-sm">✅ Card berhasil dibuat! Cek BscScan untuk Card ID.</p>
      )}
    </form>
  );
}
```

- [ ] **Step 6: Buat halaman utama**

```tsx
// packages/dashboard/app/page.tsx
import { WalletConnect } from "../components/WalletConnect";
import { CreateCardForm } from "../components/CreateCardForm";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-yellow-400 px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-black">AgentPay</h1>
        <WalletConnect />
      </header>

      <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded p-4">
          <p className="text-sm text-blue-800">
            <strong>Cara pakai:</strong> Buat spending card → salin Card ID → gunakan di Telegram bot dengan <code>/use &lt;card_id&gt;</code>
          </p>
        </div>

        <CreateCardForm />
      </div>
    </main>
  );
}
```

- [ ] **Step 7: Tambahkan .env.local**

```env
NEXT_PUBLIC_BNB_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
NEXT_PUBLIC_DELEGATION_CARD_ADDRESS=0x... # isi setelah deploy contract
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

- [ ] **Step 8: Test dashboard**

```bash
npm run dev
```

Buka http://localhost:3000, pastikan form muncul dan wallet bisa di-connect.

- [ ] **Step 9: Commit**

```bash
git add packages/dashboard/
git commit -m "feat: add Next.js dashboard with wallet connect and card creation

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 7: End-to-End Testing & Demo Polish

**Files:**
- Modify: semua packages (bug fixes dari testing)
- Create: `README.md` — instruksi demo

- [ ] **Step 1: Jalankan semua services**

Terminal 1: `npm run dev:backend`
Terminal 2: `npm run dev:bot`
Terminal 3: `npm run dev:shop`
Terminal 4: `npm run dev:dashboard`

- [ ] **Step 2: Test flow auto-approve**

1. Buka dashboard, connect MetaMask (BNB Testnet)
2. Buat card: budget=0.05 tBNB, auto-limit=0.01 tBNB, expiry=7 hari
3. Catat Card ID dari BscScan (lihat event CardCreated)
4. Di Telegram: `/connect <wallet_address>`
5. Di Telegram: `/use <card_id>`
6. Di Telegram: `/buy kopi premium`
7. Expected: bot langsung reply "✅ Pembelian berhasil!" (harga 0.003 tBNB < 0.01 limit)

- [ ] **Step 3: Test flow approval**

1. Di Telegram: `/buy laptop gaming`
2. Expected: bot kirim pesan "⏳ Harga melebihi auto-approve limit"
3. Pemilik card terima notif Telegram dengan tombol Approve/Tolak
4. Tap ✅ Approve
5. Expected: pesan update jadi "✅ Pembelian disetujui!"

- [ ] **Step 4: Test revoke card**

1. Di dashboard (tambahkan tombol revoke jika belum ada)
2. Revoke card
3. Di Telegram: `/buy kopi premium`
4. Expected: bot reply "❌ Gagal: Card is not active"

- [ ] **Step 5: Buat README.md**

```markdown
# AgentPay

> Give your AI a wallet, not your wallet.

Spending delegation on-chain untuk AI agents di BNB Testnet.

## Demo Flow

1. Buka dashboard → connect wallet → buat spending card
2. Copy Card ID
3. Di Telegram bot: `/connect <wallet>` → `/use <cardId>` → `/buy <item>`

## Local Development

cp .env.example .env
# isi PRIVATE_KEY, TELEGRAM_BOT_TOKEN, dll

npm install
npm run dev:backend  # port 3001
npm run dev:bot      # Telegram bot
npm run dev:shop     # port 3002
npm run dev:dashboard # port 3000

## Contract

Deployed di BNB Testnet: `<address>`
```

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "chore: end-to-end testing done, add README

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Jadwal 1 Minggu

| Hari | Tasks | Target |
|---|---|---|
| Hari 1 | Task 1 + Task 2 | Monorepo setup + smart contract selesai & tested |
| Hari 2 | Task 2 (deploy) + Task 3 | Contract di testnet + demo shop jalan |
| Hari 3 | Task 4 | Backend API + integrasi contract |
| Hari 4 | Task 5 | Telegram bot + approval flow |
| Hari 5 | Task 6 | Web dashboard |
| Hari 6 | Task 7 | End-to-end testing + polish |
| Hari 7 | Buffer | Fix bugs, prepare demo, latihan presentasi |
