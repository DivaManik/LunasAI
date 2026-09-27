# Hotfix Request: Signature-Based Wallet Verification

**Dari:** Orchestrator
**Tanggal:** 2026-09-25
**Priority:** HIGH — security improvement sebelum demo

---

## Masalah

`/connect <walletAddress>` di Telegram bot saat ini hanya validasi format address, tidak membuktikan bahwa user benar-benar pemilik wallet tersebut. Siapapun yang tahu address wallet orang lain bisa `/connect` pakai address itu dan mengambil alih notifikasi approval.

---

## Solusi: Challenge-Response Signature Verification

Alur baru:

```
1. User: /connect 0xABC...
   Bot → Backend: POST /api/auth/nonce { walletAddress, chatId }
   Backend: generate nonce, simpan sementara, return nonce
   Bot → User: "Tandatangani pesan ini di dashboard:
                AGENTPAY-VERIFY-<nonce>
                Lalu ketik /verify <signature>"

2. User buka dashboard → klik Sign Message → MetaMask minta konfirmasi
   Dashboard tampilkan signature hasil sign

3. User: /verify 0xSIG...
   Bot → Backend: POST /api/auth/verify { signature, chatId }
   Backend: recoverAddress(nonce, signature) → dapat walletAddress
   Jika match dengan walletAddress yang diklaim → simpan mapping
   Return: { success: true, walletAddress }
   Bot → User: "✅ Wallet 0xABC... berhasil diverifikasi!"
```

---

## Pembagian Kerja

### Backend Team
File: `agentpay/packages/backend/src/`

**Tambah store baru di db.ts:**
```typescript
export const pendingNonces = new Map<string, { walletAddress: string; nonce: string; expiresAt: number }>();
// key: chatId
```

**Tambah route baru: `src/routes/auth.ts`**

```typescript
import { Hono } from "hono";
import { createPublicClient, http } from "viem";
import { bscTestnet } from "viem/chains";
import { verifyMessage } from "viem";
import { pendingNonces, connectTelegram } from "../db";
import * as crypto from "crypto";

const auth = new Hono();

// Step 1: generate nonce
auth.post("/nonce", async (c) => {
  const { walletAddress, chatId } = await c.req.json();
  if (!walletAddress.match(/^0x[0-9a-fA-F]{40}$/)) {
    return c.json({ error: "Invalid wallet address" }, 400);
  }
  const nonce = crypto.randomBytes(16).toString("hex");
  const message = `AGENTPAY-VERIFY-${nonce}`;
  // simpan 10 menit
  pendingNonces.set(chatId, {
    walletAddress: walletAddress.toLowerCase(),
    nonce: message,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });
  return c.json({ message });
});

// Step 2: verify signature
auth.post("/verify", async (c) => {
  const { signature, chatId } = await c.req.json();
  const pending = pendingNonces.get(chatId);

  if (!pending) return c.json({ error: "Tidak ada sesi connect aktif. Mulai ulang dengan /connect" }, 400);
  if (Date.now() > pending.expiresAt) {
    pendingNonces.delete(chatId);
    return c.json({ error: "Sesi expired. Mulai ulang dengan /connect" }, 400);
  }

  try {
    const recovered = await verifyMessage({
      address: pending.walletAddress as `0x${string}`,
      message: pending.nonce,
      signature: signature as `0x${string}`,
    });

    if (!recovered) {
      return c.json({ error: "Signature tidak valid. Pastikan kamu sign dengan wallet yang benar." }, 403);
    }

    connectTelegram(pending.walletAddress, chatId);
    pendingNonces.delete(chatId);
    return c.json({ success: true, walletAddress: pending.walletAddress });
  } catch {
    return c.json({ error: "Signature tidak valid." }, 403);
  }
});

export default auth;
```

**Register route di index.ts:**
```typescript
import auth from "./routes/auth";
app.route("/api/auth", auth);
```

---

### Bot Team
File: `agentpay/packages/bot/src/commands/`

**Ubah `connect.ts` — jangan langsung simpan mapping, minta user sign dulu:**
```typescript
export async function handleConnect(ctx: Context) {
  const args = ctx.message?.text?.split(" ").slice(1);
  if (!args || args.length === 0) {
    return ctx.reply("Usage: /connect <wallet_address>\nContoh: /connect 0x1234...abcd");
  }

  const walletAddress = args[0];
  if (!walletAddress.match(/^0x[0-9a-fA-F]{40}$/)) {
    return ctx.reply("❌ Format wallet address tidak valid.");
  }

  const chatId = ctx.chat!.id.toString();

  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/nonce`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress, chatId }),
    });
    const { message } = await res.json() as any;

    await ctx.reply(
      `🔐 *Verifikasi Kepemilikan Wallet*\n\n` +
      `Untuk membuktikan kamu pemilik wallet ini, lakukan:\n\n` +
      `1. Buka dashboard AgentPay\n` +
      `2. Klik tombol *"Sign Message"*\n` +
      `3. MetaMask akan minta tanda tangan untuk pesan:\n\n` +
      `\`${message}\`\n\n` +
      `4. Setelah dapat signature, kirim ke sini:\n` +
      `/verify <signature>\n\n` +
      `⏰ Berlaku 10 menit.`,
      { parse_mode: "Markdown" }
    );
  } catch {
    await ctx.reply("❌ Gagal memulai verifikasi. Coba lagi.");
  }
}
```

**Tambah `verify.ts` (command baru):**
```typescript
import { Context } from "grammy";
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function handleVerify(ctx: Context) {
  const args = ctx.message?.text?.split(" ").slice(1);
  if (!args || args.length === 0) {
    return ctx.reply("Usage: /verify <signature>\nDapatkan signature dari dashboard AgentPay.");
  }

  const signature = args[0];
  const chatId = ctx.chat!.id.toString();

  await ctx.reply("🔍 Memverifikasi signature...");

  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signature, chatId }),
    });
    const result = await res.json() as any;

    if (!res.ok) {
      return ctx.reply(`❌ ${result.error}`);
    }

    const short = `${result.walletAddress.slice(0, 6)}...${result.walletAddress.slice(-4)}`;
    await ctx.reply(
      `✅ Wallet ${short} berhasil diverifikasi!\n\n` +
      `Sekarang gunakan /use <card_id> untuk mulai belanja.`
    );
  } catch {
    await ctx.reply("❌ Gagal verifikasi. Coba lagi.");
  }
}
```

**Register command di index.ts:**
```typescript
import { handleVerify } from "./commands/verify";
bot.command("verify", handleVerify);
```

**Update pesan /start — tambahkan /verify ke instruksi:**
```
1. /connect <wallet_address> — mulai verifikasi wallet
2. /verify <signature>       — selesaikan verifikasi (dari dashboard)
3. /use <card_id>            — set card aktif
4. /buy <nama_item>          — belanja!
```

---

### Frontend Team
File: `agentpay/packages/dashboard/`

**Tambah komponen `SignMessage.tsx`:**
```tsx
"use client";
import { useAccount, useSignMessage } from "wagmi";
import { useState } from "react";

export function SignMessage() {
  const { address, isConnected } = useAccount();
  const [message, setMessage] = useState("");
  const [signature, setSignature] = useState("");
  const { signMessage, isPending } = useSignMessage({
    mutation: {
      onSuccess: (sig) => setSignature(sig),
    }
  });

  if (!isConnected) return null;

  return (
    <div className="bg-white p-6 rounded-lg shadow space-y-4">
      <h2 className="text-xl font-bold">🔐 Verifikasi Wallet untuk Bot</h2>
      <p className="text-sm text-gray-600">
        Paste pesan dari bot Telegram, lalu sign dengan MetaMask.
      </p>

      <div>
        <label className="block text-sm font-medium mb-1">
          Pesan dari bot (contoh: AGENTPAY-VERIFY-abc123...)
        </label>
        <input
          type="text"
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="AGENTPAY-VERIFY-..."
          className="w-full border rounded px-3 py-2 font-mono text-sm"
        />
      </div>

      <button
        onClick={() => signMessage({ message })}
        disabled={!message || isPending}
        className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-300 text-black font-bold px-4 py-2 rounded"
      >
        {isPending ? "Menunggu MetaMask..." : "Sign Message"}
      </button>

      {signature && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-green-600">✅ Signature berhasil!</p>
          <p className="text-xs text-gray-500">Copy dan kirim ke bot dengan /verify:</p>
          <div className="bg-gray-100 rounded p-3 break-all font-mono text-xs">
            {signature}
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(signature)}
            className="text-sm text-blue-600 underline"
          >
            Copy Signature
          </button>
          <p className="text-xs text-gray-500 mt-2">
            Lalu kirim ke <a href="https://t.me/LunasPayBot" className="text-yellow-600 font-bold">@LunasPayBot</a>:
          </p>
          <div className="bg-gray-100 rounded p-2 font-mono text-xs break-all">
            /verify {signature}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Tambahkan `SignMessage` component di `app/page.tsx`** setelah `CreateCardForm`:
```tsx
import { SignMessage } from "../components/SignMessage";
// ...
<CreateCardForm />
<SignMessage />
```

---

## Urutan Eksekusi

1. **Backend Team** — tambah routes auth (nonce + verify)
2. **Bot Team** — update connect.ts + tambah verify.ts
3. **Frontend Team** — tambah SignMessage component

Ketiganya bisa dikerjakan **paralel** karena interface sudah didefinisikan di atas.

---

## Test End-to-End Setelah Fix

```
1. Telegram: /connect 0xABC...
   → Bot reply dengan pesan AGENTPAY-VERIFY-<nonce>

2. Dashboard: paste pesan → klik Sign Message → MetaMask confirm
   → Dapat signature 0xSIG...

3. Telegram: /verify 0xSIG...
   → Bot reply "✅ Wallet berhasil diverifikasi!"

4. Telegram: /use 1 → /buy hoodie
   → Berhasil (wallet match dengan card owner)

5. Coba attack: chat lain /connect 0xABC... → /verify signature palsu
   → Backend reject 403
```
