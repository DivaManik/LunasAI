import type { Bot } from "grammy";
import { getProducts, ApiError } from "../lib/api";

export function registerProductsCommand(bot: Bot): void {
  bot.command("products", async (ctx) => {
    try {
      const products = await getProducts();

      if (products.length === 0) {
        await ctx.reply("No products available right now.");
        return;
      }

      const list = products
        .map((p) => `• *${p.name}* — ${p.priceDisplay}\n  ${p.description}`)
        .join("\n\n");

      await ctx.reply(`📦 Available products:\n\n${list}`, { parse_mode: "Markdown" });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Server unavailable. Please try again.";
      await ctx.reply(`❌ ${message}`);
    }
  });
}
