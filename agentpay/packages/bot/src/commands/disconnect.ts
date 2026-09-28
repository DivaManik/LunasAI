import type { Bot } from "grammy";
import { activeCards, connectedWallets } from "../state";

export function registerDisconnectCommand(bot: Bot): void {
  bot.command("disconnect", async (ctx) => {
    const chatId = String(ctx.chat.id);

    if (!connectedWallets.has(chatId)) {
      await ctx.reply("❌ No wallet connected. Nothing to disconnect.");
      return;
    }

    connectedWallets.delete(chatId);
    activeCards.delete(chatId);

    await ctx.reply(
      "✅ Disconnected successfully.\n\n" +
        "Your wallet and active card have been removed.\n" +
        "Use /connect <wallet_address> to start again."
    );
  });
}
