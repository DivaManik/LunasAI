import type { Bot } from "grammy";
import { getCard, ApiError } from "../lib/api";
import { weiToDisplay, formatDate } from "../lib/format";
import { activeCards } from "../state";

export function registerBalanceCommand(bot: Bot): void {
  bot.command("balance", async (ctx) => {
    const cardId = activeCards.get(String(ctx.chat.id));

    if (!cardId) {
      await ctx.reply("❌ Belum ada card aktif.\nGunakan /use <card_id> terlebih dahulu.");
      return;
    }

    try {
      const card = await getCard(cardId);
      const remaining = BigInt(card.totalBudget) - BigInt(card.spentAmount);

      await ctx.reply(
        `💳 Card ${cardId} — Status ${card.isActive ? "Aktif" : "Tidak Aktif"}\n\n` +
          `💰 Total budget: ${weiToDisplay(card.totalBudget)}\n` +
          `✅ Sudah dipakai: ${weiToDisplay(card.spentAmount)}\n` +
          `🔋 Sisa: ${weiToDisplay(remaining.toString())}\n\n` +
          `⚡ Auto-approve hingga: ${weiToDisplay(card.autoApproveLimit)}\n` +
          `📅 Berlaku hingga: ${formatDate(card.expiryTimestamp)}`
      );
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Server sedang tidak tersedia. Coba lagi.";
      await ctx.reply(`❌ ${message}`);
    }
  });
}
