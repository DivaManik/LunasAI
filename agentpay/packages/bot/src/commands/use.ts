import type { Bot } from "grammy";
import { getCard, ApiError } from "../lib/api";
import { weiToDisplay, formatDate } from "../lib/format";
import { activeCards, connectedWallets } from "../state";

export function registerUseCommand(bot: Bot): void {
  bot.command("use", async (ctx) => {
    const cardId = ctx.match?.toString().trim();

    if (!connectedWallets.has(String(ctx.chat.id))) {
      await ctx.reply("You haven't connected a wallet yet. Type /connect <wallet_address> first.");
      return;
    }

    if (!cardId) {
      await ctx.reply("❌ Use: /use <card_id>\nExample: /use 1");
      return;
    }

    try {
      const card = await getCard(cardId);

      if (!card.isActive) {
        await ctx.reply("❌ This card is no longer active (revoked or expired).");
        return;
      }

      activeCards.set(String(ctx.chat.id), cardId);

      const remaining = BigInt(card.totalBudget) - BigInt(card.spentAmount);
      await ctx.reply(
        `✅ Card ${cardId} is now active!\n\n` +
          `💰 Remaining budget: ${weiToDisplay(remaining.toString())}\n` +
          `⚡ Auto-approve up to: ${weiToDisplay(card.autoApproveLimit)}\n` +
          `📅 Valid until: ${formatDate(card.expiryTimestamp)}\n\n` +
          `Type /buy <item_name> to start shopping!`
      );
    } catch (err) {
      if (err instanceof ApiError && /not found/i.test(err.message)) {
        await ctx.reply(`❌ Card ID ${cardId} not found.`);
        return;
      }
      const message = err instanceof ApiError ? err.message : "Server unavailable. Please try again.";
      await ctx.reply(`❌ ${message}`);
    }
  });
}
