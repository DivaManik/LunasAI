# Agent: Privy Team

## Identitas
- **Nama:** Privy Team
- **Peran:** Frontend Engineer — Privy Wallet + OAuth Consent Page
- **Laporan ke:** Orchestrator
- **Spesialisasi:** Next.js, Privy, React, Web3 UX

---

## Konteks Proyek

Kamu melanjutkan pengembangan **AgentPay V2**. Dashboard V1 sudah ada di `packages/dashboard/` menggunakan wagmi + MetaMask. Tugasmu adalah **mengganti wagmi dengan Privy** sehingga user bisa login dengan email/Google tanpa MetaMask, dan menambahkan **halaman OAuth consent** untuk MCP server.

**Repo:** `E:\Hackaton\BNB\agentpay\`

**PENTING:** Jangan ubah `packages/backend/`, `packages/bot/`, `packages/shop/`, atau `packages/contracts/`.

---

## Skills & Context untuk Agent

Kamu adalah Claude Code agent. Gunakan skill-skill berikut sesuai kebutuhan:

| Skill | Kapan Digunakan |
|---|---|
| `superpowers:executing-plans` | Untuk mengeksekusi task satu per satu dari implementation plan |
| `superpowers:systematic-debugging` | Jika ada hydration error, wagmi/Privy conflict, atau Privy modal tidak muncul |
| `mcp__plugin_context7_context7__resolve-library-id` + `query-docs` | Untuk cek dokumentasi terbaru `@privy-io/react-auth` sebelum implementasi |

**Cara pakai context7 untuk cek Privy docs:**
```
1. Panggil resolve-library-id dengan query "@privy-io/react-auth"
2. Pakai library ID hasilnya untuk query-docs dengan topik yang dibutuhkan
   contoh: "useWallets embedded wallet", "getEthereumProvider viem walletClient"
```

**Tips debugging umum:**
- Hydration error → tambah `suppressHydrationWarning` di `<html>` tag di layout.tsx
- Privy modal tidak muncul → pastikan `NEXT_PUBLIC_PRIVY_APP_ID` sudah diisi (bukan kosong)
- `writeContract` gagal → cek chain ID sudah 97, bukan 56 (mainnet)
- MetaMask dan Privy conflict → Privy handle external wallet otomatis, tidak perlu wagmi

Sebelum mulai, baca file-file ini:

1. `agentpay/packages/dashboard/app/layout.tsx` — struktur layout saat ini (pakai WagmiProvider)
2. `agentpay/packages/dashboard/app/page.tsx` — home page
3. `agentpay/packages/dashboard/components/CreateCardForm.tsx` — form buat card (pakai wagmi hooks)
4. `agentpay/packages/dashboard/components/SignMessage.tsx` — sign message untuk Telegram verify
5. `agentpay/packages/dashboard/.env.local` — env vars yang ada
6. `agentpay/packages/contracts/out/DelegationCard.sol/DelegationCard.json` — ABI contract

---

## Prerequisites

**Dashboard V1 sudah berjalan di port 3000 dengan:**
- Login MetaMask via wagmi
- Form buat spending card (createCard on-chain)
- SignMessage component untuk Telegram verification

**Contract info:**
```
CONTRACT_ADDRESS=0xACDAc5d57dB7a97013D002a8d073578347C057AE
AUTHORIZED_AGENT=0xBa4918Ff177C289F01fd362bc8a55B3e0469149f
BNB_RPC_URL=https://bnb-testnet.g.alchemy.com/v2/alch_fJs5Yxe2OmAOq_F8HiyYg
```

**Backend OAuth endpoints (sudah dibuat oleh MCP Team, asumsi sudah jalan):**
```
POST http://localhost:3001/oauth/consent
  Body: { sessionId: string, approved: boolean }
  Response: { redirectTo: string }
```

---

## Scope Pekerjaan

Kamu HANYA mengerjakan `packages/dashboard/`. File yang perlu diubah dan dibuat:

```
packages/dashboard/
├── lib/
│   └── privy.ts              # BUAT BARU: Privy config
├── app/
│   ├── layout.tsx            # UBAH: ganti WagmiProvider → PrivyProvider
│   └── oauth/
│       └── authorize/
│           └── page.tsx      # BUAT BARU: consent page untuk MCP
├── components/
│   ├── LoginButton.tsx       # BUAT BARU: ganti WalletConnect.tsx
│   ├── CreateCardForm.tsx    # UBAH: ganti wagmi hooks → Privy
│   └── SignMessage.tsx       # UBAH: ganti useSignMessage wagmi → Privy
└── .env.local                # UBAH: tambah NEXT_PUBLIC_PRIVY_APP_ID
```

---

## Task A: Setup Privy

### Install dependency

```bash
cd agentpay/packages/dashboard
npm install @privy-io/react-auth
```

### Buat `lib/privy.ts`

```typescript
import { PrivyClientConfig } from "@privy-io/react-auth";

export const privyConfig: PrivyClientConfig = {
  loginMethods: ["email", "google", "wallet"],
  appearance: {
    theme: "light",
    accentColor: "#F0B90B",
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
      default: { http: [process.env.NEXT_PUBLIC_BNB_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545"] },
    },
    blockExplorers: {
      default: { name: "BscScan", url: "https://testnet.bscscan.com" },
    },
    testnet: true,
  },
};
```

### Update `app/layout.tsx`

Ganti WagmiProvider dengan PrivyProvider. Kalau ada QueryClientProvider untuk tanstack, bisa dihapus juga karena Privy sudah include-nya. Struktur baru:

```tsx
"use client";
import { PrivyProvider } from "@privy-io/react-auth";
import { privyConfig } from "../lib/privy";
// import globals.css tetap ada

export default function RootLayout({ children }) {
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

**PERHATIAN:** Jika ada `metadata` export di layout.tsx, pindahkan ke file terpisah atau hapus `"use client"` — Next.js tidak bisa export metadata dari client component. Solusinya: buat `app/metadata.ts` untuk metadata, dan layout.tsx murni client.

---

## Task B: LoginButton Component

### Buat `components/LoginButton.tsx`

```tsx
"use client";
import { usePrivy, useWallets } from "@privy-io/react-auth";

export function LoginButton() {
  const { login, logout, authenticated } = usePrivy();
  const { wallets } = useWallets();

  const embeddedWallet = wallets.find(w => w.walletClientType === "privy");
  const externalWallet = wallets.find(w => w.walletClientType !== "privy");
  const address = embeddedWallet?.address || externalWallet?.address;

  if (authenticated && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-sm">
          <div className="text-gray-500 text-xs">Wallet</div>
          <div className="font-mono text-xs">
            {address.slice(0, 6)}...{address.slice(-4)}
          </div>
        </div>
        <button
          onClick={logout}
          className="text-sm text-red-500 underline hover:text-red-700"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={login}
      className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-4 py-2 rounded transition-colors"
    >
      Login / Connect Wallet
    </button>
  );
}
```

---

## Task C: Update CreateCardForm

Ganti semua wagmi hooks (`useAccount`, `useWriteContract`, dll) dengan Privy + viem direct call.

**ABI yang dibutuhkan (hanya fungsi createCard):**
```typescript
const CREATE_CARD_ABI = [
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
```

**Cara kirim transaksi dengan Privy:**
```typescript
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { createWalletClient, custom, parseEther } from "viem";

const { authenticated } = usePrivy();
const { wallets } = useWallets();

const sendTx = async () => {
  const wallet = wallets.find(w => w.walletClientType === "privy") || wallets[0];
  if (!wallet) throw new Error("No wallet");

  const provider = await wallet.getEthereumProvider();
  const walletClient = createWalletClient({
    chain: {
      id: 97,
      name: "BNB Smart Chain Testnet",
      network: "bnb-testnet",
      nativeCurrency: { name: "BNB", symbol: "tBNB", decimals: 18 },
      rpcUrls: {
        default: { http: [process.env.NEXT_PUBLIC_BNB_RPC_URL!] },
      },
    },
    transport: custom(provider),
  });

  const hash = await walletClient.writeContract({
    address: process.env.NEXT_PUBLIC_DELEGATION_CARD_ADDRESS as `0x${string}`,
    abi: CREATE_CARD_ABI,
    functionName: "createCard",
    args: [
      parseEther(budget),
      parseEther(autoLimit),
      BigInt(expiryDays),
      process.env.NEXT_PUBLIC_AUTHORIZED_AGENT as `0x${string}`,
    ],
    value: parseEther(budget),
    account: wallet.address as `0x${string}`,
  });

  return hash;
};
```

Form fields tetap sama (Budget, Auto-Approve Limit, Berlaku), hanya cara submit yang berubah.

---

## Task D: Update SignMessage

SignMessage.tsx dipakai untuk Telegram wallet verification. Saat ini pakai `useSignMessage` dari wagmi. Ganti dengan Privy:

```typescript
import { useWallets } from "@privy-io/react-auth";
import { createWalletClient, custom } from "viem";

const { wallets } = useWallets();

const handleSign = async () => {
  const wallet = wallets.find(w => w.walletClientType === "privy") || wallets[0];
  if (!wallet) throw new Error("No wallet");

  const provider = await wallet.getEthereumProvider();
  const walletClient = createWalletClient({
    chain: { id: 97, ... },
    transport: custom(provider),
  });

  const sig = await walletClient.signMessage({
    account: wallet.address as `0x${string}`,
    message,
  });

  setSignature(sig);
};
```

---

## Task E: OAuth Consent Page

### Buat `app/oauth/authorize/page.tsx`

Halaman ini muncul saat Claude Web redirect user untuk approve akses MCP.

Query params yang diterima: `?session=<sessionId>&cardId=<cardId>`

**UI yang harus ada:**
1. Jika user belum login → tampilkan "Login dulu" + tombol login Privy
2. Jika sudah login → tampilkan card info + 2 tombol: "Izinkan" dan "Tolak"

**Saat "Izinkan" diklik:**
```typescript
const res = await fetch(`${BACKEND_URL}/oauth/consent`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ sessionId, approved: true }),
});
const { redirectTo } = await res.json();
window.location.href = redirectTo;
```

**Saat "Tolak" diklik:** sama tapi `approved: false`

**Tampilan consent info (apa yang AI bisa lakukan):**
```
✅ Melihat info dan sisa budget card
✅ Melakukan pembelian dalam batas budget
✅ Melihat riwayat transaksi
❌ Tidak bisa revoke atau transfer card
```

---

## Environment Variables

Tambahkan ke `packages/dashboard/.env.local`:
```env
NEXT_PUBLIC_PRIVY_APP_ID=clxxxxxxxxxxxxxxxx
```

**PERHATIAN:** `NEXT_PUBLIC_PRIVY_APP_ID` harus diisi dengan App ID nyata dari privy.io sebelum dashboard bisa login. Jika belum ada, tambahkan placeholder dan catat di laporan.

---

## Testing

```bash
cd agentpay/packages/dashboard
npm run dev
```

**Test checklist:**
1. Buka http://localhost:3000
2. Klik "Login / Connect Wallet" → Privy modal muncul
3. Login dengan Google → embedded wallet ter-generate
4. Alamat wallet tampil di header
5. Isi form "Buat Card" → klik submit → Privy konfirmasi transaksi
6. Transaksi berhasil → txHash muncul + link BscScan

**Test consent page:**
1. Buka http://localhost:3000/oauth/authorize?session=test123&cardId=1
2. Jika belum login → tampil "Login dulu"
3. Setelah login → tampil consent info + 2 tombol

---

## Catatan Penting

- **`"use client"`** wajib di semua component yang pakai Privy hooks
- **BNB chain config** harus konsisten di semua file yang pakai viem — chain ID 97
- **Jangan hapus** `SignMessage.tsx` meski menggantinya — hanya update imports
- **Jika `NEXT_PUBLIC_PRIVY_APP_ID` kosong**, dashboard akan error saat load. Tambahkan dummy value untuk development: `clxxxxxxxxxxxxxxxx` dan catat di laporan bahwa perlu diisi dengan App ID nyata
- **Hydration error** bisa terjadi karena Privy adalah client-side library. Jika terjadi, tambahkan `suppressHydrationWarning` di `<html>` tag
- **viem chain type**: Daripada hardcode chain object di setiap file, buat helper `lib/chain.ts` yang export `bnbTestnet` chain config

---

## Output untuk Orchestrator

```
DASHBOARD_URL=http://localhost:3000
LOGIN_METHOD=Privy (Google, Email, MetaMask)
EMBEDDED_WALLET=working
CREATE_CARD=working (Privy transaction)
SIGN_MESSAGE=working (Privy sign)
OAUTH_CONSENT_PAGE=working (/oauth/authorize?session=&cardId=)
PRIVY_APP_ID_NEEDED=true/false
```

---

## Referensi

- Implementation Plan: `docs/superpowers/plans/2026-09-25-agentpay-v2-implementation.md` (Task 4 dan Task 5)
- V2 Design Spec: `docs/superpowers/specs/2026-09-25-agentpay-v2-design.md`
- Privy docs: https://docs.privy.io
- BNB Testnet: https://testnet.bscscan.com
