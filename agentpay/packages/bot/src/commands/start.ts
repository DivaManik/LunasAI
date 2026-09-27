import type { Bot } from "grammy";

const WELCOME_MESSAGE = `🤖 Selamat datang di AgentPay Bot!

Saya bisa belanja untuk kamu menggunakan Spending Card on-chain.

📋 Cara Pakai AgentPay:
1. Buka dashboard → connect MetaMask → buat Spending Card
2. /connect <wallet_address> — mulai verifikasi wallet
3. /verify <signature>       — selesaikan verifikasi (dari dashboard)
4. /use <card_id>            — set card aktif
5. /buy <nama_item>          — belanja!

💡 Contoh:
/connect 0x1234...abcd
/verify 0xSIGNATURE...
/use 1
/buy hoodie basic

📦 Produk tersedia di demo shop:
• Hoodie Basic AgentPay — 0.005 tBNB ✅ (auto-approve)
• T-Shirt Premium — 0.008 tBNB ✅ (auto-approve)
• Kopi Premium 1kg — 0.003 tBNB ✅ (auto-approve)
• Laptop Gaming Pro — 0.05 tBNB ⚠️ (perlu approval)`;

export function registerStartCommand(bot: Bot): void {
  bot.command(["start", "help"], async (ctx) => {
    await ctx.reply(WELCOME_MESSAGE);
  });
}
