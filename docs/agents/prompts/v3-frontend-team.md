# Prompt untuk Frontend Team (V3 — Dashboard Polish)

> Copy-paste prompt di bawah ini ke terminal baru (agent baru).
> Track ini INDEPENDEN — bisa jalan paralel dengan Contract Team dan Shop Team.

---

```
Kamu adalah Frontend Team untuk proyek AgentPay — hackathon Indonesia Web3.

Tugasmu adalah polish dashboard agar lebih user-friendly:
1. Halaman "Get MCP URL" — user dapat URL tanpa perlu curl
2. Fix network warning yang muncul salah
3. Copy wallet address dengan 1x klik
4. Tampilkan saldo IDRX di header/card info
5. Update instruksi agar tidak ada referensi MetaMask lagi

Working directory: E:\Hackaton\BNB

---

## Konteks Proyek

AgentPay dashboard sudah pakai Privy (embedded wallet, Google login).
User login → buat spending card → dapat MCP URL → paste ke Claude Web.
Saat ini untuk dapat MCP URL, user harus curl manual. Kita buat UI-nya.

---

## File yang Harus Dibaca Dulu

1. E:\Hackaton\BNB\agentpay\packages\dashboard\app\page.tsx — home page
2. E:\Hackaton\BNB\agentpay\packages\dashboard\app\cards\page.tsx — daftar cards
3. E:\Hackaton\BNB\agentpay\packages\dashboard\components\CardList.tsx — card list component
4. E:\Hackaton\BNB\agentpay\packages\dashboard\components\LoginButton.tsx — header login
5. E:\Hackaton\BNB\agentpay\packages\dashboard\components\NetworkWarning.tsx — warning component
6. E:\Hackaton\BNB\agentpay\packages\dashboard\.env.local — env vars

---

## Task 1 — Copy Wallet Address dengan 1x Klik

File: agentpay/packages/dashboard/components/LoginButton.tsx

Saat ini address ditampilkan sebagai text biasa: "0xBa4...149f"
Ubah agar saat diklik, address di-copy ke clipboard dan ada feedback visual.

```tsx
// Contoh implementasi:
const [copied, setCopied] = useState(false);

const handleCopy = async () => {
  await navigator.clipboard.writeText(address);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
};

// Di JSX:
<button
  onClick={handleCopy}
  className="font-mono text-xs hover:bg-gray-100 px-2 py-1 rounded transition-colors cursor-pointer"
  title="Klik untuk copy address"
>
  {copied ? "✓ Copied!" : `${address.slice(0, 6)}...${address.slice(-4)}`}
</button>
```

---

## Task 2 — Halaman MCP URL (Paling Penting!)

Buat komponen baru: agentpay/packages/dashboard/components/McpUrlManager.tsx

Komponen ini muncul di halaman cards (app/cards/page.tsx) untuk setiap card aktif.

### UI yang dibutuhkan per card:

**Jika belum punya MCP URL:**
```
┌─────────────────────────────────────────────────┐
│ Card #1 — 0.029 tBNB remaining                  │
│                                                 │
│ [Generate MCP URL]                              │
│                                                 │
│ Setelah generate, paste URL ini ke Claude Web   │
│ Settings → Connectors → Add MCP Server          │
└─────────────────────────────────────────────────┘
```

**Setelah generate (tampilkan URL):**
```
┌─────────────────────────────────────────────────┐
│ MCP URL (rahasia — jangan bagikan!)             │
│ ┌─────────────────────────────────────────────┐ │
│ │ https://twilight-pro...ngrok-free.dev/mcp/ap│ │
│ └─────────────────────────────────────────────┘ │
│ [Copy URL] [Revoke & Generate Baru]             │
│                                                 │
│ Cara pakai:                                     │
│ 1. Buka Claude Web (claude.ai)                  │
│ 2. Settings → Connectors → Add MCP Server       │
│ 3. Paste URL di atas                            │
│ 4. Tanya Claude: "cek info card saya"           │
└─────────────────────────────────────────────────┘
```

### API call yang dibutuhkan:

**Generate MCP URL:**
```typescript
const res = await fetch(`/api/cards/${cardId}/register-mcp`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
});
const { mcpUrl } = await res.json();
// Tampilkan mcpUrl ke user — INI SATU-SATUNYA KESEMPATAN LIHAT URL!
// Simpan di localStorage sementara agar tidak hilang saat refresh
localStorage.setItem(`mcp-url-${cardId}`, mcpUrl);
```

**Revoke MCP:**
```typescript
await fetch(`/api/cards/${cardId}/mcp-secret`, { method: "DELETE" });
localStorage.removeItem(`mcp-url-${cardId}`);
```

PENTING: Backend tidak menyimpan secret (hanya hash). Jadi URL yang sudah digenerate
TIDAK BISA diambil ulang dari server. Simpan di localStorage saat pertama muncul.
Jika user refresh sebelum copy, URL hilang dan harus generate ulang.

Tambahkan warning ini di UI: "⚠️ Simpan URL ini sekarang! URL tidak bisa dilihat lagi setelah halaman di-refresh."

### Integrasi ke halaman cards:

Di app/cards/page.tsx, tambahkan <McpUrlManager cardId={card.id} /> di bawah setiap card info.

Atau jika CardList.tsx sudah ada dan render tiap card, tambahkan McpUrlManager di sana.

---

## Task 3 — Fix Network Warning

File: agentpay/packages/dashboard/components/NetworkWarning.tsx

Baca file ini dulu, lalu:
- Jika warning muncul padahal user sudah di BNB Testnet (chain ID 97) → fix kondisi pengecekan
- Warning seharusnya hanya muncul jika network BUKAN 97
- Jika pakai wagmi useNetwork → ganti dengan Privy: `const { wallets } = useWallets(); wallet.chainId`
- Jika fix tidak bisa dilakukan karena kompleks, hide saja komponen ini sementara

---

## Task 4 — Tampilkan Saldo IDRX

Di CardList.tsx atau komponen card, tambahkan display saldo IDRX.

Cara baca saldo IDRX:
```typescript
// Baca dari env
const IDRX_ADDRESS = process.env.NEXT_PUBLIC_IDRX_TOKEN_ADDRESS;

// Panggil balanceOf lewat RPC (tidak perlu wallet, ini read-only)
import { createPublicClient, http } from "viem";

const client = createPublicClient({
  chain: bnbTestnet, // dari lib/chain.ts yang sudah ada
  transport: http(process.env.NEXT_PUBLIC_BNB_RPC_URL),
});

const balance = await client.readContract({
  address: IDRX_ADDRESS as `0x${string}`,
  abi: [{ name: "balanceOf", type: "function", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" }],
  functionName: "balanceOf",
  args: [walletAddress as `0x${string}`],
});

// Format: balance / 100 untuk IDRX (decimals=2)
const idrxBalance = Number(balance) / 100;
// Display: "10.000 IDRX"
```

Tampilkan di header atau di atas daftar cards: "Saldo: 10.000 IDRX"

Jika NEXT_PUBLIC_IDRX_TOKEN_ADDRESS belum ada di .env.local (menunggu Contract Team),
buat placeholder yang tidak crash: if (!IDRX_ADDRESS) return null;

---

## Task 5 — Update Instruksi/Teks

Cari dan ganti semua referensi MetaMask di dashboard dengan teks yang lebih generik.

Grep untuk: "MetaMask", "metamask", "connect wallet"

Ganti dengan:
- "MetaMask" → "Wallet" atau "Privy Wallet"
- "Connect Wallet" → "Login / Connect Wallet" (LoginButton.tsx sudah benar)
- Instruksi install MetaMask → hapus (Privy sudah handle embedded wallet)

Juga update teks di home page (app/page.tsx) jika ada instruksi lama.

---

## Task 6 — Tambah .env.local vars baru

Tambah ke agentpay/packages/dashboard/.env.local:
```
NEXT_PUBLIC_IDRX_TOKEN_ADDRESS=PLACEHOLDER_TUNGGU_CONTRACT_TEAM
```

Ini akan diupdate setelah Contract Team selesai deploy MockIDRX.

---

## Testing Checklist

1. Login dengan Google → address muncul di header
2. Klik address → "✓ Copied!" muncul 2 detik
3. Buka /cards → tidak ada network warning yang salah
4. Klik "Generate MCP URL" di salah satu card → URL muncul
5. Klik "Copy URL" → URL ter-copy
6. Warning "simpan URL ini" muncul jelas
7. Tidak ada teks "MetaMask" yang tersisa di UI
8. Saldo IDRX muncul (meski placeholder jika contract belum deploy)

---

## Output untuk Orchestrator

Buat laporan di: docs/agents/reports/07-frontend-team-report-v3-polish.md

Isi laporan:
- Screenshot atau deskripsi setiap task yang selesai
- McpUrlManager: apakah generate + copy berfungsi?
- Network warning: sudah hilang/fixed?
- Copy address: berfungsi?
- Issues yang ditemukan

---

## Aturan

- Jangan ubah backend, shop, contracts
- Semua component dengan Privy hooks wajib "use client"
- Jangan buat file baru di luar packages/dashboard/
- Jika ada TypeScript error yang tidak krusial (misal type any), gunakan as any daripada memblokir task
- Untuk localStorage: selalu wrap dalam try/catch karena bisa gagal di private mode

Working directory: E:\Hackaton\BNB
```
