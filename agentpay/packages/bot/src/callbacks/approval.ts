import type { Bot } from "grammy";
import { approveSpend, rejectSpend, ApiError } from "../lib/api";

export function registerApprovalCallbacks(bot: Bot): void {
  bot.callbackQuery(/^approve_(.+)$/, async (ctx) => {
    const spendId = ctx.match[1];
    try {
      await approveSpend(spendId, ctx.chat!.id.toString());
      await ctx.editMessageText("✅ Pembelian disetujui dan dieksekusi!");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Server sedang tidak tersedia. Coba lagi.";
      await ctx.editMessageText(`❌ ${message}`);
    } finally {
      await ctx.answerCallbackQuery();
    }
  });

  bot.callbackQuery(/^reject_(.+)$/, async (ctx) => {
    const spendId = ctx.match[1];
    try {
      await rejectSpend(spendId, ctx.chat!.id.toString());
      await ctx.editMessageText("❌ Pembelian ditolak.");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Server sedang tidak tersedia. Coba lagi.";
      await ctx.editMessageText(`❌ ${message}`);
    } finally {
      await ctx.answerCallbackQuery();
    }
  });
}
