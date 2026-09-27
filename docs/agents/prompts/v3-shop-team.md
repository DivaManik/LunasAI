# Prompt untuk Shop Team (V3 — x402 Protocol + Digital Products)

> Copy-paste prompt di bawah ini ke terminal baru (agent baru).
> JALANKAN SETELAH Contract Team selesai deploy MockIDRX + DelegationCardV2.

---

```
Kamu adalah Shop Team untuk proyek AgentPay — hackathon Indonesia Web3.

Tugasmu adalah:
1. Ganti produk fisik di demo shop menjadi produk digital dengan harga IDRX
2. Implementasi x402 protocol (HTTP 402 Payment Required) di shop
3. Tambah tool paid_fetch di MCP server agar AI agent bisa akses konten berbayar via x402
4. Update tool spend di MCP agar pakai IDRX (ERC-20) bukan tBNB

Working directory: E:\Hackaton\BNB

---

## Konteks Proyek

AgentPay adalah sistem spending delegation. AI agent punya spending card dengan budget IDRX.
Demo shop sekarang pakai produk fisik (hoodie, kopi, dll) dan harga tBNB.

Kita upgrade ke:
- Produk digital (lebih natural untuk AI yang belanja)
- Harga dalam IDRX (Rupiah-pegged stablecoin mock)
- x402 protocol: shop kirim HTTP 402 dulu, AI bayar, lalu dapat konten

---

## Konteks File yang Harus Dibaca Dulu

1. E:\Hackaton\BNB\agentpay\packages\shop\src\products.ts — produk saat ini
2. E:\Hackaton\BNB\agentpay\packages\shop\src\index.ts — server shop
3. E:\Hackaton\BNB\agentpay\packages\backend\src\mcp\tools.ts — MCP tools
4. E:\Hackaton\BNB\agentpay\packages\backend\src\mcp\server.ts — MCP server handler
5. E:\Hackaton\BNB\agentpay\packages\backend\src\services\contract.ts — callSpend function
6. E:\Hackaton\BNB\agentpay\.env — env vars

---

## Task 1 — Ganti Produk di Shop (products.ts)

Ganti semua produk lama dengan produk digital berikut.

PENTING: Sekarang harga dalam IDRX (bukan wei/tBNB).
- Decimals IDRX = 2, jadi 5000 IDRX = BigInt(500000) dalam unit terkecil

Produk baru (ganti isi products.ts):

```typescript
export const products: Product[] = [
  {
    id: "ai-premium",
    name: "Akses AI Premium",
    description: "Akses fitur AI premium selama 30 hari — unlimited query, priority response",
    priceIdrx: BigInt(500000),    // 5.000 IDRX (dalam unit terkecil, decimals=2)
    priceDisplay: "5.000 IDRX",
    category: "subscription",
    deliverable: "activation_code",
  },
  {
    id: "ebook-web3",
    name: "E-Book: Panduan Web3 Indonesia",
    description: "PDF 200+ halaman — DeFi, NFT, dan masa depan ekonomi digital Indonesia",
    priceIdrx: BigInt(1500000),   // 15.000 IDRX
    priceDisplay: "15.000 IDRX",
    category: "ebook",
    deliverable: "download_link",
  },
  {
    id: "newsletter-pro",
    name: "Newsletter Pro — 1 Tahun",
    description: "Analisis crypto mingguan + alpha Web3 Indonesia langsung ke email",
    priceIdrx: BigInt(2500000),   // 25.000 IDRX
    priceDisplay: "25.000 IDRX",
    category: "subscription",
    deliverable: "email_subscription",
  },
  {
    id: "kursus-blockchain",
    name: "Kursus Blockchain Developer",
    description: "Video course 40+ jam — Solidity, DeFi protocol, deploy smart contract di BNB Chain",
    priceIdrx: BigInt(15000000),  // 150.000 IDRX
    priceDisplay: "150.000 IDRX",
    category: "course",
    deliverable: "course_access_link",
  },
  {
    id: "software-license",
    name: "Software License — AgentPay SDK",
    description: "Lisensi komersial SDK AgentPay untuk integrasi di aplikasi bisnis",
    priceIdrx: BigInt(50000000),  // 500.000 IDRX
    priceDisplay: "500.000 IDRX",
    category: "license",
    deliverable: "license_key",
  },
];
```

Update interface Product:
```typescript
export interface Product {
  id: string;
  name: string;
  description: string;
  priceIdrx: bigint;    // ganti priceWei → priceIdrx
  priceDisplay: string;
  category: string;
  deliverable: string;
}
```

Update serializeProduct agar priceIdrx diconvert ke string.

---

## Task 2 — Implementasi x402 di Shop (index.ts)

x402 adalah protokol HTTP 402 Payment Required untuk micropayments.

Flow x402:
1. AI request GET /x402/products/:id/content
2. Shop reply 402 dengan payment info
3. AI bayar via MCP spend tool
4. AI request ulang dengan header X-Payment: <txHash>
5. Shop verifikasi txHash dan kirim konten

### Tambah endpoint x402 ke shop/src/index.ts:

```typescript
// GET /x402/products/:id/content
// Flow: cek header X-Payment → jika ada verifikasi → kirim konten
//       jika tidak ada → 402 dengan payment instructions
app.get("/x402/products/:id/content", async (req, res) => {
  const product = findProduct(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });

  const paymentHeader = req.headers["x-payment"] as string | undefined;

  if (!paymentHeader) {
    // Kirim 402 dengan instruksi pembayaran
    return res.status(402).json({
      error: "Payment Required",
      x402: {
        version: "1.0",
        scheme: "exact",
        network: "bnb-testnet",
        token: process.env.IDRX_TOKEN_ADDRESS || "IDRX_ADDRESS_PLACEHOLDER",
        amount: product.priceIdrx.toString(),
        amountDisplay: product.priceDisplay,
        recipient: SHOP_WALLET_ADDRESS,
        productId: product.id,
        productName: product.name,
        description: `Bayar ${product.priceDisplay} untuk akses ${product.name}`,
        instructions: "Gunakan tool 'spend' dengan productId ini, lalu ulangi request dengan header X-Payment: <txHash>",
      },
    });
  }

  // Ada payment header — verifikasi sederhana (cek format txHash)
  const txHash = paymentHeader.trim();
  if (!txHash.startsWith("0x") || txHash.length !== 66) {
    return res.status(400).json({ error: "Invalid payment txHash format" });
  }

  // Deliver konten digital
  const content = generateDigitalContent(product, txHash);
  return res.json({
    success: true,
    product: product.name,
    txHash,
    content,
  });
});
```

### Fungsi generateDigitalContent:

```typescript
function generateDigitalContent(product: Product, txHash: string) {
  const timestamp = new Date().toISOString();
  switch (product.deliverable) {
    case "activation_code":
      return {
        type: "activation_code",
        code: `AGENTPAY-AI-${txHash.slice(2, 10).toUpperCase()}`,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        message: "Aktifkan di app.agentpay.id/activate",
      };
    case "download_link":
      return {
        type: "download_link",
        url: `https://files.agentpay.id/ebooks/${txHash.slice(2, 16)}.pdf`,
        filename: "panduan-web3-indonesia.pdf",
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
    case "email_subscription":
      return {
        type: "email_subscription",
        message: "Subscription aktif! Kamu akan menerima newsletter setiap Senin.",
        subscriptionId: `SUB-${txHash.slice(2, 10).toUpperCase()}`,
      };
    case "course_access_link":
      return {
        type: "course_access",
        url: `https://learn.agentpay.id/courses/blockchain-dev?token=${txHash.slice(2, 20)}`,
        validUntil: "lifetime",
        message: "Akses seumur hidup. Mulai dari modul 1.",
      };
    case "license_key":
      return {
        type: "license_key",
        key: `AGPAY-SDK-${txHash.slice(2, 6).toUpperCase()}-${txHash.slice(6, 10).toUpperCase()}-${txHash.slice(10, 14).toUpperCase()}`,
        type_license: "commercial",
        seats: 1,
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      };
    default:
      return { message: "Konten tersedia. Hubungi support@agentpay.id" };
  }
}
```

---

## Task 3 — Tambah Tool paid_fetch di MCP

Tambah tool baru ke agentpay/packages/backend/src/mcp/tools.ts:

```typescript
{
  name: "paid_fetch",
  description: "Akses konten berbayar menggunakan x402 protocol. Coba fetch URL → jika dapat 402, otomatis bayar dengan spending card → fetch ulang dengan bukti pembayaran.",
  inputSchema: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "URL konten yang ingin diakses (endpoint x402)",
      },
      chatId: {
        type: "string",
        description: "Telegram chat ID untuk notifikasi approval jika diperlukan (opsional)",
      },
    },
    required: ["url"],
  },
},
```

Tambah handler di agentpay/packages/backend/src/mcp/server.ts (dalam switch/if yang handle tool calls):

```typescript
case "paid_fetch": {
  const url = String(args.url);
  const chatId = args.chatId ? String(args.chatId) : undefined;

  // Step 1: Coba fetch tanpa payment
  const firstResp = await fetch(url);

  if (firstResp.status !== 402) {
    // Bukan x402 endpoint, kembalikan konten langsung
    const body = await firstResp.text();
    return { content: [{ type: "text", text: body }] };
  }

  // Step 2: Parse 402 response
  const paymentInfo = await firstResp.json();
  const x402 = paymentInfo.x402;

  if (!x402 || !x402.productId) {
    return {
      content: [{
        type: "text",
        text: `Payment required tapi format x402 tidak dikenali: ${JSON.stringify(paymentInfo)}`,
      }],
    };
  }

  // Step 3: Bayar via spend tool (reuse logic yang sudah ada)
  const spendResult = await callSpend(cardId, x402.productId, chatId);

  if (!spendResult.success) {
    return {
      content: [{
        type: "text",
        text: `Pembayaran gagal: ${spendResult.error}`,
      }],
    };
  }

  // Step 4: Fetch ulang dengan X-Payment header
  const paidResp = await fetch(url, {
    headers: { "X-Payment": spendResult.txHash },
  });

  const content = await paidResp.json();
  return {
    content: [{
      type: "text",
      text: JSON.stringify(content, null, 2),
    }],
  };
}
```

PENTING: `callSpend` di sini harus memanggil logic yang sama dengan tool `spend` yang sudah ada.
Pastikan kamu REFACTOR tool `spend` menjadi fungsi `callSpend(cardId, productId, chatId?)` yang bisa dipanggil dari kedua tool.
cardId selalu dari resolved secret (bukan dari args), sudah dihandle di server.ts.

---

## Task 4 — Update Tool spend untuk IDRX

Cek file: agentpay/packages/backend/src/services/contract.ts

Lihat fungsi callSpend. Saat ini mungkin masih pakai native BNB transfer.
Setelah DelegationCardV2 di-deploy (yang pakai ERC-20 IDRX), update service ini untuk:
- Pakai ABI DelegationCardV2 (bukan DelegationCard lama)
- Ambil IDRX_TOKEN_ADDRESS dari env
- Cek: apakah IDRX sudah di-approve ke contract sebelum spend?
  (Untuk spending, kontrak transfer dari escrow internal — tidak perlu approve ulang, karena budget IDRX sudah di-lock di kontrak saat createCard)

Baca ABI baru dari: agentpay/packages/contracts/out/DelegationCardV2.sol/DelegationCardV2.json
(File ini akan dibuat oleh Contract Team. Jika belum ada, buat placeholder dulu.)

---

## Task 5 — Update get_products handler di MCP

Di mcp/server.ts, handler get_products memanggil shop GET /products.
Pastikan response-nya sekarang pakai priceIdrx bukan priceWei.
Update format display agar AI bisa baca: "5.000 IDRX (≈ Rp 5.000)".

---

## Output untuk Orchestrator

Buat laporan di: docs/agents/reports/06-shop-team-report-v3-x402.md

Isi laporan:
- Test x402 flow: curl GET /x402/products/ai-premium/content → dapat 402 ✓
- Test x402 with payment: curl dengan X-Payment header → dapat konten ✓
- Daftar produk baru dengan harga IDRX
- paid_fetch tool: test dengan MCP inspector
- Issues jika ada

---

## Env yang Perlu (setelah Contract Team selesai)

Dari .env:
- IDRX_TOKEN_ADDRESS=<isi setelah Contract Team deploy>
- DELEGATION_CARD_ADDRESS=<DelegationCardV2 address setelah di-update Contract Team>

Jika Contract Team belum selesai: gunakan placeholder string "IDRX_PLACEHOLDER"
untuk logic yang butuh address, dan catat di laporan.

---

## Aturan

- Jangan ubah packages/contracts/ — hanya baca ABI-nya
- Jangan ubah dashboard
- Jika ada perubahan di mcp/server.ts yang kompleks, baca dulu full file sebelum edit
- Gunakan TypeScript, bukan JavaScript
- Semua fetch ke shop pakai URL dari env SHOP_URL (http://localhost:3002)

Working directory: E:\Hackaton\BNB
```
