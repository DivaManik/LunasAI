import type { Bot } from "grammy";
import { verifySignature, ApiError } from "../lib/api";
import { connectedWallets } from "../state";

export function registerVerifyCommand(bot: Bot): void {
  bot.command("verify", async (ctx) => {
    const signature = ctx.match?.toString().trim();

    if (!signature) {
      await ctx.reply("❌ Use: /verify <signature>\nGet the signature from the LunasAI dashboard.");
      return;
    }

    await ctx.reply("🔍 Verifying signature...");

    try {
      const result = await verifySignature(signature, String(ctx.chat.id));
      connectedWallets.set(String(ctx.chat.id), result.walletAddress);

      const short = `${result.walletAddress.slice(0, 6)}...${result.walletAddress.slice(-4)}`;
      await ctx.reply(`✅ Wallet ${short} verified!\n\nNow use /use <card_id> to start shopping.`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Server unavailable. Please try again.";
      await ctx.reply(`❌ ${message}`);
    }
  });
}
