import type { Bot } from "grammy";
import { getCard, ApiError } from "../lib/api";
import { weiToDisplay, formatDate } from "../lib/format";
import { activeCards } from "../state";

export function registerBalanceCommand(bot: Bot): void {
  bot.command("balance", async (ctx) => {
    const cardId = activeCards.get(String(ctx.chat.id));

    if (!cardId) {
      await ctx.reply("❌ No active card.\nUse /use <card_id> first.");
      return;
    }

    try {
      const card = await getCard(cardId);
      const remaining = BigInt(card.totalBudget) - BigInt(card.spentAmount);

      await ctx.reply(
        `💳 Card ${cardId}, status: ${card.isActive ? "Active" : "Inactive"}\n\n` +
          `💰 Total budget: ${weiToDisplay(card.totalBudget)}\n` +
          `✅ Spent: ${weiToDisplay(card.spentAmount)}\n` +
          `🔋 Remaining: ${weiToDisplay(remaining.toString())}\n\n` +
          `⚡ Auto-approve up to: ${weiToDisplay(card.autoApproveLimit)}\n` +
          `📅 Valid until: ${formatDate(card.expiryTimestamp)}`
      );
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Server unavailable. Please try again.";
      await ctx.reply(`❌ ${message}`);
    }
  });
}
