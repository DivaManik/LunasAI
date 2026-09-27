import type { Bot } from "grammy";
import { getCard, ApiError } from "../lib/api";
import { weiToDisplay, formatDate } from "../lib/format";
import { activeCards, connectedWallets } from "../state";

export function registerUseCommand(bot: Bot): void {
  bot.command("use", async (ctx) => {
    const cardId = ctx.match?.toString().trim();

    if (!connectedWallets.has(String(ctx.chat.id))) {
      await ctx.reply("Kamu belum connect wallet. Ketik /connect <wallet_address> dulu.");
      return;
    }

    if (!cardId) {
      await ctx.reply("❌ Gunakan: /use <card_id>\nContoh: /use 1");
      return;
    }

    try {
      const card = await getCard(cardId);

      if (!card.isActive) {
        await ctx.reply("❌ Card ini sudah tidak aktif (revoked atau expired).");
        return;
      }

      activeCards.set(String(ctx.chat.id), cardId);

      const remaining = BigInt(card.totalBudget) - BigInt(card.spentAmount);
      await ctx.reply(
        `✅ Card ${cardId} aktif!\n\n` +
          `💰 Sisa budget: ${weiToDisplay(remaining.toString())}\n` +
          `⚡ Auto-approve hingga: ${weiToDisplay(card.autoApproveLimit)}\n` +
          `📅 Berlaku hingga: ${formatDate(card.expiryTimestamp)}\n\n` +
          `Ketik /buy <nama_item> untuk mulai belanja!`
      );
    } catch (err) {
      if (err instanceof ApiError && /not found/i.test(err.message)) {
        await ctx.reply(`❌ Card ID ${cardId} tidak ditemukan.`);
        return;
      }
      const message = err instanceof ApiError ? err.message : "Server sedang tidak tersedia. Coba lagi.";
      await ctx.reply(`❌ ${message}`);
    }
  });
}
