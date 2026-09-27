import type { Bot } from "grammy";
import { verifySignature, ApiError } from "../lib/api";
import { connectedWallets } from "../state";

export function registerVerifyCommand(bot: Bot): void {
  bot.command("verify", async (ctx) => {
    const signature = ctx.match?.toString().trim();

    if (!signature) {
      await ctx.reply("❌ Gunakan: /verify <signature>\nDapatkan signature dari dashboard AgentPay.");
      return;
    }

    await ctx.reply("🔍 Memverifikasi signature...");

    try {
      const result = await verifySignature(signature, String(ctx.chat.id));
      connectedWallets.set(String(ctx.chat.id), result.walletAddress);

      const short = `${result.walletAddress.slice(0, 6)}...${result.walletAddress.slice(-4)}`;
      await ctx.reply(`✅ Wallet ${short} berhasil diverifikasi!\n\nSekarang gunakan /use <card_id> untuk mulai belanja.`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Server sedang tidak tersedia. Coba lagi.";
      await ctx.reply(`❌ ${message}`);
    }
  });
}
