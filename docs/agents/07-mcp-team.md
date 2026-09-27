# Agent: MCP Team

## Identitas
- **Nama:** MCP Team
- **Peran:** Backend Engineer — MCP Server + OAuth 2.1
- **Laporan ke:** Orchestrator
- **Spesialisasi:** MCP SDK, Hono, OAuth 2.1, Node.js

---

## Konteks Proyek

Kamu melanjutkan pengembangan **AgentPay V2** — sistem spending delegation on-chain. V1 sudah selesai dan berjalan (backend, bot Telegram, dashboard, smart contract, demo shop). Tugasmu adalah **menambahkan MCP Server** ke backend yang sudah ada, sehingga AI agent seperti Claude Web bisa connect dan melakukan transaksi spending card.

**Repo:** `E:\Hackaton\BNB\agentpay\`

**PENTING:** Jangan ubah file yang sudah ada kecuali untuk menambah route baru. Contract, shop, dan bot tidak perlu diubah sama sekali.

---

## Skills & Context untuk Agent

Kamu adalah Claude Code agent. Gunakan skill-skill berikut sesuai kebutuhan:

| Skill | Kapan Digunakan |
|---|---|
| `superpowers:executing-plans` | Untuk mengeksekusi task satu per satu dari implementation plan |
| `superpowers:systematic-debugging` | Jika ada error saat install SDK, runtime error MCP transport, atau OAuth flow gagal |
| `mcp__plugin_context7_context7__resolve-library-id` + `query-docs` | Untuk cek dokumentasi terbaru `@modelcontextprotocol/sdk` sebelum implementasi |

**Cara pakai context7 untuk cek MCP SDK docs:**
```
1. Panggil resolve-library-id dengan query "@modelcontextprotocol/sdk"
2. Pakai library ID hasilnya untuk query-docs dengan topik yang dibutuhkan
   contoh: "StreamableHTTPServerTransport", "Server ListToolsRequestSchema"
```

Sebelum mulai, baca file-file ini terlebih dahulu:

1. `agentpay/packages/backend/src/index.ts` — entry point Hono, pahami struktur route yang sudah ada
2. `agentpay/packages/backend/src/db.ts` — in-memory stores yang sudah ada
3. `agentpay/packages/backend/src/services/contract.ts` — fungsi untuk baca contract
4. `agentpay/packages/backend/src/routes/spend.ts` — cara callSpend sudah dilakukan
5. `agentpay/packages/backend/src/services/telegram.ts` — fungsi kirim notifikasi
6. `agentpay/.env` — env vars yang tersedia

---

## Prerequisites

**Backend V1 sudah berjalan di port 3001 dengan routes:**
- `POST /api/auth/nonce` — generate nonce untuk wallet verification
- `POST /api/auth/verify` — verify signature
- `POST /api/spend` — spend dari card
- `POST /api/spend/approve/:spendId` — approve spend
- `POST /api/spend/reject/:spendId` — reject spend
- `GET /api/history/:cardId` — riwayat transaksi

**Contract:**
```
DELEGATION_CARD_ADDRESS=0xACDAc5d57dB7a97013D002a8d073578347C057AE
BNB_RPC_URL=https://bnb-testnet.g.alchemy.com/v2/alch_fJs5Yxe2OmAOq_F8HiyYg
ABI: agentpay/packages/contracts/out/DelegationCard.sol/DelegationCard.json
```

**Demo Shop:**
```
SHOP_URL=http://localhost:3002
SHOP_WALLET_ADDRESS=0x07df1c3abf188baaeb74bf2d5be0abdbab31b049
```

---

## Scope Pekerjaan

Kamu HANYA mengerjakan `packages/backend/src/`. Tambah file baru, jangan ubah file yang sudah ada kecuali `index.ts` (untuk register routes baru) dan `db.ts` (untuk tambah stores baru).

### File yang Harus Dibuat:
```
packages/backend/src/
├── mcp/
│   ├── tools.ts          # Tool definitions (4 tools)
│   └── server.ts         # MCP server implementation
└── routes/
    ├── mcp.ts            # HTTP route handler MCP endpoint
    └── oauth.ts          # OAuth 2.1 endpoints
```

### File yang Harus Dimodifikasi:
```
packages/backend/src/
├── db.ts                 # Tambah oauthSessions dan oauthTokens stores
└── index.ts              # Register routes /mcp dan /oauth
```

---

## Task A: MCP Server

### Install dependency

```bash
cd agentpay/packages/backend
npm install @modelcontextprotocol/sdk
```

### Buat `src/mcp/tools.ts`

```typescript
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

### Buat `src/mcp/server.ts`

Lihat interface yang sudah ada di codebase untuk `getCardFromChain`, `callSpend`, `addSpendRecord`, `getSpendHistory`, `sendApprovalRequest` — gunakan fungsi yang sudah ada, jangan buat ulang.

Server harus:
1. Handle `ListToolsRequestSchema` → return `agentPayTools`
2. Handle `CallToolRequestSchema` → dispatch ke handler per tool name
3. Tiap tool handler baca dari chain/shop/db sesuai tool:
   - `get_card_info`: panggil `getCardFromChain(BigInt(cardId))` → format ke JSON
   - `get_products`: fetch `${SHOP_URL}/products` → return JSON
   - `spend`: ambil product, panggil `callSpend`, simpan ke history, kirim notif Telegram jika perlu
   - `get_history`: panggil `getSpendHistory(cardId)` → return JSON

**Format return selalu:**
```typescript
{ content: [{ type: "text", text: "..." }] }
// atau untuk error:
{ content: [{ type: "text", text: "Error: ..." }], isError: true }
```

### Buat `src/routes/mcp.ts`

```typescript
import { Hono } from "hono";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "../mcp/server.js";

const mcp = new Hono();

mcp.all("/:cardId", async (c) => {
  const cardId = c.req.param("cardId");
  const server = createMcpServer(cardId);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
  });
  await server.connect(transport);
  const req = c.req.raw;
  const res = await transport.handleRequest(req);
  return new Response(res.body, {
    status: res.status,
    headers: res.headers,
  });
});

export default mcp;
```

---

## Task B: OAuth 2.1

### Tambah stores di `src/db.ts`

Tambahkan di akhir file (jangan ubah yang sudah ada):

```typescript
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

export const oauthSessions = new Map<string, OAuthSession>();
export const oauthTokens = new Map<string, OAuthToken>();
```

### Buat `src/routes/oauth.ts`

4 endpoints:

**1. `GET /.well-known/oauth-authorization-server`** — metadata untuk Claude Web

```json
{
  "issuer": "<MCP_BASE_URL>",
  "authorization_endpoint": "<MCP_BASE_URL>/oauth/authorize",
  "token_endpoint": "<MCP_BASE_URL>/oauth/token",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code"],
  "code_challenge_methods_supported": ["S256"]
}
```

**2. `GET /oauth/authorize`** — terima `client_id, redirect_uri, state, code_challenge` dari Claude Web

- Simpan ke `oauthSessions` dengan `sessionId` random (16 byte hex), TTL 10 menit
- Redirect ke: `${DASHBOARD_URL}/oauth/authorize?session=<sessionId>&cardId=<client_id>`

**3. `POST /oauth/consent`** — terima `{ sessionId, approved }` dari consent page dashboard

- Jika `approved: false` → redirect ke `redirect_uri?error=access_denied&state=<state>`
- Jika `approved: true` → generate `code` random, simpan di session, redirect ke `redirect_uri?code=<code>&state=<state>`
- Return JSON `{ redirectTo: "..." }` (dashboard yang handle redirect ke sana)

**4. `POST /oauth/token`** — exchange code → access token

- Parse body (form-encoded), cari session dengan `code` yang cocok
- Generate access token 32 byte hex, simpan ke `oauthTokens`, TTL 24 jam
- Return: `{ access_token, token_type: "Bearer", expires_in: 86400 }`

### Register routes di `src/index.ts`

Tambahkan di bagian routes (setelah import yang sudah ada):

```typescript
import mcp from "./routes/mcp.js";
import oauth from "./routes/oauth.js";

// tambahkan sebelum app.notFound atau app.onError
app.route("/mcp", mcp);
app.route("/oauth", oauth);
app.route("/", oauth); // untuk /.well-known/oauth-authorization-server
```

---

## Environment Variables yang Dibutuhkan

Tambahkan ke `agentpay/.env` jika belum ada:
```env
MCP_BASE_URL=http://localhost:3001
DASHBOARD_URL=http://localhost:3000
OAUTH_SECRET=agentpay-oauth-secret-2026
```

---

## Testing

### Test MCP endpoint

```bash
# 1. Install MCP inspector (sekali saja)
npx @modelcontextprotocol/inspector --help

# 2. Jalankan backend
cd agentpay/packages/backend && npm run dev

# 3. Test di terminal lain
npx @modelcontextprotocol/inspector http://localhost:3001/mcp/1
```

Expected: bisa list 4 tools dan call `get_card_info`

### Test OAuth flow manual

```bash
# Step 1: authorize
# Buka browser:
# http://localhost:3001/oauth/authorize?client_id=1&redirect_uri=http://localhost:3000&state=test&response_type=code

# Expected: redirect ke http://localhost:3000/oauth/authorize?session=xxx&cardId=1

# Step 2: consent (simulasi dashboard approve)
curl -X POST http://localhost:3001/oauth/consent \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "<session_id_dari_step1>", "approved": true}'

# Expected: { "redirectTo": "http://localhost:3000?code=xxx&state=test" }

# Step 3: exchange token
curl -X POST http://localhost:3001/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=xxx&redirect_uri=http://localhost:3000"

# Expected: { "access_token": "xxx", "token_type": "Bearer", "expires_in": 86400 }
```

---

## Catatan Penting

- **ESM import**: backend menggunakan TypeScript ESM. Import harus pakai `.js` di akhir: `import { foo } from "./foo.js"`
- **dotenv**: jika file baru membaca env vars di module level, panggil `dotenv.config({ path: path.resolve(__dirname, "../../../../.env") })` di awal file
- **SHOP_URL dan SHOP_WALLET_ADDRESS** tersedia di env — baca dari sana, jangan hardcode
- **Jangan crash** jika shop tidak bisa diakses — return error message yang jelas ke MCP client
- **`callSpend` bisa throw** — wrap dalam try-catch, return `isError: true`

---

## Output untuk Orchestrator

```
MCP_ENDPOINT=http://localhost:3001/mcp/:cardId
TOOLS_READY: get_card_info, get_products, spend, get_history
OAUTH_ENDPOINTS_READY: /oauth/authorize, /oauth/token, /oauth/consent
WELL_KNOWN_READY: /.well-known/oauth-authorization-server
TEST_RESULT: [hasil test MCP inspector dan OAuth manual]
```

---

## Referensi

- Implementation Plan: `docs/superpowers/plans/2026-09-25-agentpay-v2-implementation.md` (Task 2 dan Task 3)
- V2 Design Spec: `docs/superpowers/specs/2026-09-25-agentpay-v2-design.md`
- MCP SDK: `@modelcontextprotocol/sdk` (sudah di npm)
- BNB Testnet explorer: https://testnet.bscscan.com
