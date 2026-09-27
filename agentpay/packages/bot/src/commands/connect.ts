import type { Bot } from "grammy";
import { requestNonce, ApiError } from "../lib/api";

const WALLET_REGEX = /^0x[a-fA-F0-9]{40}$/;

export function registerConnectCommand(bot: Bot): void {
  bot.command("connect", async (ctx) => {
    const walletAddress = ctx.match?.toString().trim();

    if (!walletAddress || !WALLET_REGEX.test(walletAddress)) {
      await ctx.reply(
        "❌ Format wallet tidak valid.\nGunakan: /connect 0x1234...abcd (harus 0x + 40 karakter hex)"
      );
      return;
    }

    try {
      const { message } = await requestNonce(walletAddress, String(ctx.chat.id));
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
    } catch (err) {
      const errMessage = err instanceof ApiError ? err.message : "Server sedang tidak tersedia. Coba lagi.";
      await ctx.reply(`❌ ${errMessage}`);
    }
  });
}
