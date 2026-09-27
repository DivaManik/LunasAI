# AgentPay V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade AgentPay V1 dengan Privy embedded wallet, ERC-4337 gasless transactions, dan MCP server untuk Claude Web integration.

**Architecture:** Upgrade bertahap di atas V1 yang sudah berjalan. Contract dan Shop tidak diubah. Backend ditambah MCP + OAuth routes. Dashboard diganti dari wagmi ke Privy + permissionless.

**Tech Stack:** Privy react-auth, permissionless (ERC-4337), @modelcontextprotocol/sdk, Pimlico bundler/paymaster, ngrok

**Spec:** `docs/superpowers/specs/2026-09-25-agentpay-v2-design.md`

## Global Constraints

- Node.js >= 20
- BNB Testnet Chain ID: 97
- Contract address tetap: `0xACDAc5d57dB7a97013D002a8d073578347C057AE`
- ABI tetap: `agentpay/packages/contracts/out/DelegationCard.sol/DelegationCard.json`
- Jangan ubah `packages/contracts/`, `packages/shop/`, `packages/bot/`
- Backend tetap port 3001, Dashboard tetap port 3000
- Semua env vars di `agentpay/.env`
- Pimlico API key dari https://dashboard.pimlico.io (gratis)
- Privy App ID dari https://privy.io (gratis)

## Review Focus

- **Privy embedded wallet address berbeda dengan EOA MetaMask** — pastikan address yang dipakai createCard adalah Privy embedded wallet, bukan external wallet
- **UserOperation gasless gagal jika Paymaster tidak cover** — test Pimlico paymaster aktif sebelum demo
- **MCP OAuth token expired saat demo** — token harus punya TTL yang cukup panjang (minimal 24 jam)
- **ngrok URL berubah setiap restart** — pakai ngrok static domain atau restart ngrok sebelum demo
- **Telegram bot tidak terpengaruh upgrade** — verifikasi bot masih berjalan normal setelah backend update

---

## Task 1: Setup Prerequisites (Privy + Pimlico API Keys)

**Files:**
- Modify: `agentpay/.env`

**Interfaces:**
- Produces: env vars `NEXT_PUBLIC_PRIVY_APP_ID`, `PRIVY_APP_SECRET`, `PIMLICO_API_KEY`

- [ ] **Step 1: Daftar Privy**

1. Buka https://privy.io → Sign up
2. Buat app baru → nama: "AgentPay"
3. Di settings → Networks → tambahkan "BNB Smart Chain Testnet" (Chain ID 97)
4. Di settings → Login Methods → aktifkan: Email, Google
5. Catat: `App ID` dan `App Secret`

- [ ] **Step 2: Daftar Pimlico**

1. Buka https://dashboard.pimlico.io → Sign up
2. Buat API key baru
3. Verifikasi BNB Testnet (chain 97) tersedia
4. Catat API key

- [ ] **Step 3: Update agentpay/.env**

```env
# Privy
NEXT_PUBLIC_PRIVY_APP_ID=clxxxxxxxxxxxxxxxx
PRIVY_APP_SECRET=<privy_app_secret>

# Pimlico (ERC-4337)
PIMLICO_API_KEY=pim_xxxxxxxxxxxxxxxx
NEXT_PUBLIC_PIMLICO_API_KEY=pim_xxxxxxxxxxxxxxxx

# MCP OAuth
OAUTH_SECRET=<random_32_chars_string>
MCP_BASE_URL=http://localhost:3001
DASHBOARD_URL=http://localhost:3000
```

- [ ] **Step 4: Test Pimlico endpoint**

```bash
curl https://api.pimlico.io/v2/97/rpc?apikey=<PIMLICO_API_KEY> \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_supportedEntryPoints","params":[],"id":1}'
```

Expected: response dengan array entry points

- [ ] **Step 5: Commit**

```bash
git add agentpay/.env.example
git commit -m "chore: add v2 env vars template

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: MCP Server di Backend

**Files:**
- Create: `agentpay/packages/backend/src/mcp/tools.ts`
- Create: `agentpay/packages/backend/src/mcp/server.ts`
- Create: `agentpay/packages/backend/src/routes/mcp.ts`
- Modify: `agentpay/packages/backend/src/index.ts`

**Interfaces:**
- Consumes: existing `contract.ts`, `db.ts`, Shop API
- Produces: `POST /mcp/:cardId` — MCP Streamable HTTP endpoint

- [ ] **Step 1: Install MCP SDK**

```bash
cd agentpay/packages/backend
npm install @modelcontextprotocol/sdk
```

- [ ] **Step 2: Buat MCP tools definition**

```typescript
// src/mcp/tools.ts
import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const agentPayTools: Tool[] = [
  {
    name: "get_card_info",
    description: "Lihat informasi spending card: sisa budget, auto-approve limit, status aktif/expired",
    inputSchema: {
      type: "object",
      properties: {
        cardId: { type: "string", description: "ID card yang ingin dilihat" }
      },
      required: ["cardId"]
    }
  },
  {
    name: "get_products",
    description: "Lihat daftar produk yang tersedia di demo shop beserta harganya",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "spend",
    description: "Beli produk menggunakan spending card. Jika harga melebihi auto-approve limit, akan membutuhkan approval dari pemilik card.",
    inputSchema: {
      type: "object",
      properties: {
        cardId: { type: "string", description: "ID card yang digunakan" },
        productId: { type: "string", description: "ID produk yang ingin dibeli" },
        chatId: { type: "string", description: "Telegram chat ID untuk notifikasi approval (opsional)" }
      },
      required: ["cardId", "productId"]
    }
  },
  {
    name: "get_history",
    description: "Lihat riwayat transaksi dari sebuah spending card",
    inputSchema: {
      type: "object",
      properties: {
        cardId: { type: "string", description: "ID card yang ingin dilihat historinya" }
      },
      required: ["cardId"]
    }
  }
];
```

- [ ] **Step 3: Buat MCP server**

```typescript
// src/mcp/server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { agentPayTools } from "./tools.js";
import { getCardFromChain, callSpend } from "../services/contract.js";
import { addSpendRecord, getSpendHistory } from "../db.js";
import { sendApprovalRequest } from "../services/telegram.js";
import { formatEther } from "viem";
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

const SHOP_URL = process.env.SHOP_URL || "http://localhost:3002";
const SHOP_WALLET = process.env.SHOP_WALLET_ADDRESS!;

export function createMcpServer(cardId: string) {
  const server = new Server(
    { name: "agentpay", version: "2.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: agentPayTools,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "get_card_info": {
          const card = await getCardFromChain(BigInt(cardId));
          const remaining = BigInt(card[1]) - BigInt(card[2]);
          const expiry = new Date(Number(card[4]) * 1000).toLocaleDateString("id-ID");
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                cardId,
                owner: card[0],
                totalBudget: formatEther(BigInt(card[1])) + " tBNB",
                spentAmount: formatEther(BigInt(card[2])) + " tBNB",
                remainingBudget: formatEther(remaining) + " tBNB",
                autoApproveLimit: formatEther(BigInt(card[3])) + " tBNB",
                expiryDate: expiry,
                isActive: card[5],
              }, null, 2)
            }]
          };
        }

        case "get_products": {
          const res = await fetch(`${SHOP_URL}/products`);
          const products = await res.json();
          return {
            content: [{
              type: "text",
              text: JSON.stringify(products, null, 2)
            }]
          };
        }

        case "spend": {
          const { productId, chatId } = args as { productId: string; chatId?: string };
          const productRes = await fetch(`${SHOP_URL}/products/${productId}`);
          if (!productRes.ok) {
            return { content: [{ type: "text", text: `Produk '${productId}' tidak ditemukan.` }], isError: true };
          }
          const product = await productRes.json() as any;
          const card = await getCardFromChain(BigInt(cardId));

          const result = await callSpend(
            BigInt(cardId),
            SHOP_WALLET as `0x${string}`,
            BigInt(product.priceWei),
            `Beli ${product.name}`
          );

          addSpendRecord(cardId, {
            id: Date.now().toString(),
            cardId,
            merchant: SHOP_WALLET,
            amount: product.priceWei,
            description: `Beli ${product.name}`,
            status: result.autoApproved ? "auto_approved" : "pending",
            createdAt: Date.now(),
            pendingSpendId: result.autoApproved ? undefined : result.pendingSpendId.toString(),
          });

          if (!result.autoApproved && chatId) {
            await sendApprovalRequest(
              chatId,
              result.pendingSpendId.toString(),
              product.name,
              formatEther(BigInt(product.priceWei)) + " tBNB",
              formatEther(BigInt(card[3])) + " tBNB"
            );
          }

          return {
            content: [{
              type: "text",
              text: result.autoApproved
                ? `✅ Pembelian ${product.name} berhasil! Harga: ${product.priceDisplay}`
                : `⏳ Pembelian ${product.name} membutuhkan approval. Notifikasi sudah dikirim ke pemilik card.`
            }]
          };
        }

        case "get_history": {
          const history = getSpendHistory(cardId);
          return {
            content: [{
              type: "text",
              text: history.length === 0
                ? "Belum ada transaksi."
                : JSON.stringify(history, null, 2)
            }]
          };
        }

        default:
          return { content: [{ type: "text", text: `Tool '${name}' tidak dikenal.` }], isError: true };
      }
    } catch (err: any) {
      return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
    }
  });

  return server;
}
```

- [ ] **Step 4: Buat MCP HTTP route**

```typescript
// src/routes/mcp.ts
import { Hono } from "hono";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "../mcp/server.js";

const mcp = new Hono();

// MCP Streamable HTTP endpoint
mcp.all("/:cardId", async (c) => {
  const cardId = c.req.param("cardId");

  const server = createMcpServer(cardId);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
  });

  await server.connect(transport);

  // Handle request
  const req = c.req.raw;
  const res = await transport.handleRequest(req);
  return new Response(res.body, {
    status: res.status,
    headers: res.headers,
  });
});

export default mcp;
```

- [ ] **Step 5: Register route di index.ts**

```typescript
import mcp from "./routes/mcp.js";
app.route("/mcp", mcp);
```

- [ ] **Step 6: Test MCP endpoint**

Jalankan backend, lalu test dengan MCP Inspector:
```bash
npx @modelcontextprotocol/inspector http://localhost:3001/mcp/1
```

Expected: bisa list tools dan call `get_card_info`

- [ ] **Step 7: Commit**

```bash
git add agentpay/packages/backend/
git commit -m "feat: add MCP server with spending card tools

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: OAuth 2.1 untuk MCP

**Files:**
- Create: `agentpay/packages/backend/src/routes/oauth.ts`
- Modify: `agentpay/packages/backend/src/db.ts`
- Modify: `agentpay/packages/backend/src/index.ts`

**Interfaces:**
- Produces: OAuth 2.1 endpoints untuk Claude Web
  - `GET /oauth/authorize` — redirect ke consent page
  - `POST /oauth/token` — exchange code untuk token
  - `GET /.well-known/oauth-authorization-server` — metadata

- [ ] **Step 1: Tambah OAuth stores di db.ts**

```typescript
// Tambahkan di db.ts
export interface OAuthSession {
  cardId: string;
  redirectUri: string;
  state: string;
  codeChallenge?: string;
  code?: string;
  expiresAt: number;
}

export interface OAuthToken {
  cardId: string;
  accessToken: string;
  expiresAt: number;
}

export const oauthSessions = new Map<string, OAuthSession>(); // sessionId -> session
export const oauthTokens = new Map<string, OAuthToken>();     // accessToken -> token
```

- [ ] **Step 2: Buat OAuth routes**

```typescript
// src/routes/oauth.ts
import { Hono } from "hono";
import * as crypto from "crypto";
import { oauthSessions, oauthTokens } from "../db.js";
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

const DASHBOARD_URL = process.env.DASHBOARD_URL || "http://localhost:3000";
const oauth = new Hono();

// OAuth metadata endpoint (dibutuhkan Claude Web)
oauth.get("/.well-known/oauth-authorization-server", (c) => {
  const base = process.env.MCP_BASE_URL || "http://localhost:3001";
  return c.json({
    issuer: base,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/oauth/token`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
  });
});

// Step 1: Authorization request → redirect ke consent page di dashboard
oauth.get("/authorize", (c) => {
  const { client_id, redirect_uri, state, code_challenge } = c.req.query();
  const cardId = client_id; // card ID sebagai client ID

  const sessionId = crypto.randomBytes(16).toString("hex");
  oauthSessions.set(sessionId, {
    cardId,
    redirectUri: redirect_uri,
    state,
    codeChallenge: code_challenge,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 menit
  });

  // Redirect ke consent page di dashboard
  const consentUrl = `${DASHBOARD_URL}/oauth/authorize?session=${sessionId}&cardId=${cardId}`;
  return c.redirect(consentUrl);
});

// Step 2: User approve di dashboard → dashboard POST ke sini
oauth.post("/consent", async (c) => {
  const { sessionId, approved } = await c.req.json();
  const session = oauthSessions.get(sessionId);

  if (!session || Date.now() > session.expiresAt) {
    return c.json({ error: "Session invalid atau expired" }, 400);
  }

  if (!approved) {
    const url = new URL(session.redirectUri);
    url.searchParams.set("error", "access_denied");
    url.searchParams.set("state", session.state);
    return c.json({ redirectTo: url.toString() });
  }

  const code = crypto.randomBytes(16).toString("hex");
  session.code = code;
  oauthSessions.set(sessionId, session);

  const url = new URL(session.redirectUri);
  url.searchParams.set("code", code);
  url.searchParams.set("state", session.state);
  return c.json({ redirectTo: url.toString() });
});

// Step 3: Exchange code → access token
oauth.post("/token", async (c) => {
  const body = await c.req.parseBody();
  const { code, redirect_uri } = body;

  // Cari session dengan code ini
  let foundSession: ReturnType<typeof oauthSessions.get> = undefined;
  let foundSessionId = "";
  for (const [id, session] of oauthSessions.entries()) {
    if (session.code === code) {
      foundSession = session;
      foundSessionId = id;
      break;
    }
  }

  if (!foundSession || Date.now() > foundSession.expiresAt) {
    return c.json({ error: "invalid_grant" }, 400);
  }

  const accessToken = crypto.randomBytes(32).toString("hex");
  oauthTokens.set(accessToken, {
    cardId: foundSession.cardId,
    accessToken,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 jam
  });

  oauthSessions.delete(foundSessionId);

  return c.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 86400,
  });
});

export default oauth;
```

- [ ] **Step 3: Register di index.ts**

```typescript
import oauth from "./routes/oauth.js";
app.route("/oauth", oauth);
app.route("/", oauth); // untuk /.well-known/oauth-authorization-server
```

- [ ] **Step 4: Update MCP route untuk validasi token**

Di `routes/mcp.ts`, tambahkan token validation:
```typescript
mcp.all("/:cardId", async (c) => {
  // Cek Authorization header
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const tokenData = oauthTokens.get(token);
    if (!tokenData || Date.now() > tokenData.expiresAt) {
      return c.json({ error: "Unauthorized" }, 401);
    }
  }
  // ... rest of handler
});
```

- [ ] **Step 5: Commit**

```bash
git add agentpay/packages/backend/
git commit -m "feat: add OAuth 2.1 server for MCP Claude Web integration

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Privy Integration di Dashboard

**Files:**
- Modify: `agentpay/packages/dashboard/package.json`
- Create: `agentpay/packages/dashboard/lib/privy.ts`
- Modify: `agentpay/packages/dashboard/app/layout.tsx`
- Create: `agentpay/packages/dashboard/components/LoginButton.tsx`
- Modify: `agentpay/packages/dashboard/app/page.tsx`

**Interfaces:**
- Consumes: `NEXT_PUBLIC_PRIVY_APP_ID` env var
- Produces: Dashboard dengan Privy login, embedded wallet address untuk createCard

- [ ] **Step 1: Install Privy**

```bash
cd agentpay/packages/dashboard
npm install @privy-io/react-auth
```

- [ ] **Step 2: Buat Privy config**

```typescript
// lib/privy.ts
import { PrivyClientConfig } from "@privy-io/react-auth";

export const privyConfig: PrivyClientConfig = {
  loginMethods: ["email", "google", "wallet"],
  appearance: {
    theme: "light",
    accentColor: "#F0B90B", // BNB yellow
    logo: "/logo.png",
  },
  embeddedWallets: {
    createOnLogin: "users-without-wallets",
  },
  defaultChain: {
    id: 97,
    name: "BNB Smart Chain Testnet",
    network: "bnb-testnet",
    nativeCurrency: { name: "BNB", symbol: "tBNB", decimals: 18 },
    rpcUrls: {
      default: { http: [process.env.NEXT_PUBLIC_BNB_RPC_URL!] },
    },
    blockExplorers: {
      default: { name: "BscScan", url: "https://testnet.bscscan.com" },
    },
    testnet: true,
  },
  supportedChains: [
    {
      id: 97,
      name: "BNB Smart Chain Testnet",
      network: "bnb-testnet",
      nativeCurrency: { name: "BNB", symbol: "tBNB", decimals: 18 },
      rpcUrls: {
        default: { http: [process.env.NEXT_PUBLIC_BNB_RPC_URL!] },
      },
      blockExplorers: {
        default: { name: "BscScan", url: "https://testnet.bscscan.com" },
      },
      testnet: true,
    }
  ],
};
```

- [ ] **Step 3: Update layout.tsx — ganti WagmiProvider dengan PrivyProvider**

```tsx
// app/layout.tsx
"use client";
import { PrivyProvider } from "@privy-io/react-auth";
import { privyConfig } from "../lib/privy";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <PrivyProvider
          appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
          config={privyConfig}
        >
          {children}
        </PrivyProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Buat LoginButton component**

```tsx
// components/LoginButton.tsx
"use client";
import { usePrivy, useWallets } from "@privy-io/react-auth";

export function LoginButton() {
  const { login, logout, authenticated, user } = usePrivy();
  const { wallets } = useWallets();

  const embeddedWallet = wallets.find(w => w.walletClientType === "privy");
  const address = embeddedWallet?.address;

  if (authenticated && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-sm">
          <div className="text-gray-500 text-xs">Wallet</div>
          <div className="font-mono">{address.slice(0, 6)}...{address.slice(-4)}</div>
        </div>
        <button
          onClick={logout}
          className="text-sm text-red-500 underline"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={login}
      className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-4 py-2 rounded"
    >
      Login / Connect Wallet
    </button>
  );
}
```

- [ ] **Step 5: Update CreateCardForm — pakai Privy wallet**

Ganti `useAccount` + `useWriteContract` dengan Privy + viem direct call:

```tsx
// components/CreateCardForm.tsx
"use client";
import { useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { createWalletClient, custom, parseEther } from "viem";
import { bscTestnet } from "viem/chains";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_DELEGATION_CARD_ADDRESS as `0x${string}`;
const AUTHORIZED_AGENT = process.env.NEXT_PUBLIC_AUTHORIZED_AGENT as `0x${string}`;
const ABI = [
  {
    name: "createCard",
    type: "function",
    inputs: [
      { name: "budget", type: "uint256" },
      { name: "autoApproveLimit", type: "uint256" },
      { name: "expiryDays", type: "uint256" },
      { name: "authorizedAgent", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "payable",
  },
] as const;

export function CreateCardForm() {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const [budget, setBudget] = useState("0.05");
  const [autoLimit, setAutoLimit] = useState("0.01");
  const [expiryDays, setExpiryDays] = useState("7");
  const [isPending, setIsPending] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authenticated) return alert("Login dulu!");

    const embeddedWallet = wallets.find(w => w.walletClientType === "privy");
    if (!embeddedWallet) return alert("Wallet belum siap, coba lagi.");

    setIsPending(true);
    setError("");
    try {
      const provider = await embeddedWallet.getEthereumProvider();
      const walletClient = createWalletClient({
        chain: bscTestnet,
        transport: custom(provider),
      });

      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        functionName: "createCard",
        args: [parseEther(budget), parseEther(autoLimit), BigInt(expiryDays), AUTHORIZED_AGENT],
        value: parseEther(budget),
        account: embeddedWallet.address as `0x${string}`,
      });

      setTxHash(hash);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
      <h2 className="text-xl font-bold">Buat Spending Card Baru</h2>

      <div>
        <label className="block text-sm font-medium mb-1">Total Budget (tBNB)</label>
        <input type="number" step="0.001" value={budget}
          onChange={e => setBudget(e.target.value)}
          className="w-full border rounded px-3 py-2" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Auto-Approve Limit (tBNB)</label>
        <input type="number" step="0.001" value={autoLimit}
          onChange={e => setAutoLimit(e.target.value)}
          className="w-full border rounded px-3 py-2" />
        <p className="text-xs text-gray-500 mt-1">Transaksi di bawah nilai ini langsung disetujui otomatis</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Berlaku (hari)</label>
        <input type="number" value={expiryDays}
          onChange={e => setExpiryDays(e.target.value)}
          className="w-full border rounded px-3 py-2" />
      </div>

      <button type="submit" disabled={isPending || !authenticated}
        className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-300 text-black font-bold px-4 py-2 rounded">
        {isPending ? "Memproses..." : "Buat Card"}
      </button>

      {txHash && (
        <div className="text-green-600 text-sm space-y-1">
          <p>✅ Card berhasil dibuat!</p>
          <a href={`https://testnet.bscscan.com/tx/${txHash}`} target="_blank"
            className="text-blue-600 underline text-xs break-all">
            Lihat di BscScan →
          </a>
        </div>
      )}
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </form>
  );
}
```

- [ ] **Step 6: Tambah env vars ke .env.local**

```env
NEXT_PUBLIC_PRIVY_APP_ID=clxxxxxxxxxxxxxxxx
NEXT_PUBLIC_PIMLICO_API_KEY=pim_xxxxxxxxxxxxxxxx
```

- [ ] **Step 7: Test dashboard**

```bash
npm run dev
```

Buka http://localhost:3000 → Login dengan Google → pastikan embedded wallet address muncul

- [ ] **Step 8: Commit**

```bash
git add agentpay/packages/dashboard/
git commit -m "feat: replace wagmi with Privy embedded wallet

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: OAuth Consent Page di Dashboard

**Files:**
- Create: `agentpay/packages/dashboard/app/oauth/authorize/page.tsx`

**Interfaces:**
- Consumes: `?session=<id>&cardId=<id>` query params dari backend OAuth
- Produces: Consent page yang POST ke backend `/oauth/consent`

- [ ] **Step 1: Buat consent page**

```tsx
// app/oauth/authorize/page.tsx
"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export default function OAuthAuthorizePage() {
  const params = useSearchParams();
  const sessionId = params.get("session");
  const cardId = params.get("cardId");
  const [loading, setLoading] = useState(false);
  const { authenticated, login } = usePrivy();

  const handleConsent = async (approved: boolean) => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/oauth/consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, approved }),
      });
      const { redirectTo } = await res.json();
      window.location.href = redirectTo;
    } catch {
      alert("Error saat proses consent. Coba lagi.");
      setLoading(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow max-w-md w-full text-center space-y-4">
          <h1 className="text-2xl font-black">AgentPay</h1>
          <p className="text-gray-600">Login dulu untuk melanjutkan</p>
          <button onClick={login}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-4 py-2 rounded">
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-black">AgentPay</h1>
          <p className="text-gray-500 text-sm mt-1">Permintaan Akses</p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
          <p className="text-sm font-medium">AI Agent meminta akses ke:</p>
          <p className="text-lg font-bold mt-1">Spending Card #{cardId}</p>
        </div>

        <div className="space-y-2 text-sm text-gray-600">
          <p>✅ Melihat info dan sisa budget card</p>
          <p>✅ Melakukan pembelian dalam batas budget</p>
          <p>✅ Melihat riwayat transaksi</p>
          <p>❌ Tidak bisa revoke atau transfer card</p>
        </div>

        <div className="flex gap-3">
          <button onClick={() => handleConsent(false)} disabled={loading}
            className="flex-1 border border-gray-300 text-gray-700 font-medium px-4 py-2 rounded hover:bg-gray-50">
            Tolak
          </button>
          <button onClick={() => handleConsent(true)} disabled={loading}
            className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-4 py-2 rounded">
            {loading ? "Memproses..." : "Izinkan"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Test OAuth flow**

1. Jalankan backend + dashboard
2. Buka: `http://localhost:3001/oauth/authorize?client_id=1&redirect_uri=http://localhost:3000&state=test`
3. Expected: redirect ke consent page di dashboard
4. Klik "Izinkan" → expected: redirect ke localhost:3000 dengan `?code=xxx`

- [ ] **Step 3: Commit**

```bash
git add agentpay/packages/dashboard/app/oauth/
git commit -m "feat: add OAuth consent page for MCP Claude Web

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Setup ngrok + Test Claude Web

**Files:**
- Create: `docs/demo/ngrok-setup.md` — instruksi untuk demo

**Interfaces:**
- Produces: public URL untuk MCP endpoint yang bisa diakses Claude Web

- [ ] **Step 1: Install ngrok**

Download dari https://ngrok.com → install → auth:
```bash
ngrok config add-authtoken <token>
```

- [ ] **Step 2: Expose backend**

```bash
ngrok http 3001
```

Catat URL seperti: `https://abc123.ngrok-free.app`

Untuk domain static (gratis 1 domain di ngrok):
```bash
ngrok http --domain=agentpay.ngrok-free.app 3001
```

- [ ] **Step 3: Update MCP_BASE_URL di .env**

```env
MCP_BASE_URL=https://abc123.ngrok-free.app
```

Restart backend.

- [ ] **Step 4: Test dengan MCP Inspector**

```bash
npx @modelcontextprotocol/inspector https://abc123.ngrok-free.app/mcp/1
```

Expected: bisa list tools dan call get_card_info

- [ ] **Step 5: Test di Claude Web**

1. Buka claude.ai → Settings → Connectors
2. Add connector: `https://abc123.ngrok-free.app/mcp/1`
3. OAuth flow → consent page → approve
4. Chat: "Lihat info card saya"
5. Expected: Claude reply dengan info card dari blockchain

- [ ] **Step 6: Buat demo guide**

Buat `docs/demo/ngrok-setup.md` dengan instruksi lengkap untuk demo hari H.

- [ ] **Step 7: Commit**

```bash
git add docs/demo/
git commit -m "docs: add ngrok setup guide for demo

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 7: End-to-End Testing V2

- [ ] **Step 1: Test Flow A — Privy Login + Buat Card**
```
1. Buka http://localhost:3000
2. Klik "Login with Google" → login
3. Embedded wallet address muncul
4. Isi form → Buat Card → konfirmasi di Privy popup
5. Card berhasil dibuat → catat Card ID
```

- [ ] **Step 2: Test Flow B — Claude Web + MCP**
```
1. Pastikan ngrok running
2. Claude Web → Connectors → tambah URL ngrok/mcp/<cardId>
3. OAuth consent → approve
4. Chat: "Produk apa yang tersedia?"
5. Chat: "Belikan aku kopi premium"
6. Expected: Claude beli otomatis (auto-approve)
7. Chat: "Belikan aku laptop gaming"
8. Expected: Claude informasikan butuh approval → notif Telegram muncul
```

- [ ] **Step 3: Test Flow C — Telegram (regression)**
```
Pastikan bot masih berjalan normal seperti V1
/use <cardId> → /buy hoodie → berhasil
```

- [ ] **Step 4: Dispatch Audit Team**

Jalankan Audit Team untuk final check semua 3 flow.

---

## Jadwal 1 Minggu

| Hari | Tasks | Target |
|---|---|---|
| **Hari 1** | Task 1 (API keys setup) + Task 2 (MCP server) | MCP endpoint jalan lokal |
| **Hari 2** | Task 3 (OAuth 2.1) | Claude Web bisa connect |
| **Hari 3** | Task 4 (Privy dashboard) | Login Google berfungsi |
| **Hari 4** | Task 5 (OAuth consent page) | Full OAuth flow selesai |
| **Hari 5** | Task 6 (ngrok + Claude Web test) | Demo flow lengkap |
| **Hari 6** | Task 7 (E2E testing) | Semua 3 flow berjalan |
| **Hari 7** | Buffer + polish + demo prep | Siap presentasi |
