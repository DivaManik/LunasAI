import type { Bot } from "grammy";
import "../lib/env";
import { getProducts, createSpend, ApiError, type Product } from "../lib/api";
import { activeCards, connectedWallets } from "../state";

const SHOP_WALLET_ADDRESS = process.env.SHOP_WALLET_ADDRESS || "";

function findMatch(products: Product[], query: string): Product | undefined {
  const lower = query.toLowerCase();
  return products.find((p) => p.name.toLowerCase().includes(lower));
}

function productList(products: Product[]): string {
  return products.map((p) => `• ${p.name}: ${p.priceDisplay}`).join("\n");
}

export function registerBuyCommand(bot: Bot): void {
  bot.command("buy", async (ctx) => {
    const query = ctx.match?.toString().trim();
    const chatId = String(ctx.chat.id);

    if (!connectedWallets.has(chatId)) {
      await ctx.reply("You haven't connected a wallet yet. Type /connect <wallet_address> first.");
      return;
    }

    const cardId = activeCards.get(chatId);

    if (!cardId) {
      await ctx.reply("No active card. Type /use <card_id> first.");
      return;
    }

    if (!query) {
      await ctx.reply("❌ Use: /buy <item_name>\nExample: /buy ai premium");
      return;
    }

    await ctx.reply("🔍 Searching...");

    let products: Product[];
    try {
      products = await getProducts();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Server unavailable. Please try again.";
      await ctx.reply(`❌ ${message}`);
      return;
    }

    const product = findMatch(products, query);
    if (!product) {
      await ctx.reply(`❌ Product "${query}" not found.\n\nAvailable products:\n${productList(products)}`);
      return;
    }

    await ctx.reply(`🛒 Found: *${product.name}*\n💰 Price: ${product.priceDisplay}\n\nProcessing...`, {
      parse_mode: "Markdown",
    });

    try {
      const result = await createSpend({
        cardId,
        merchantAddress: SHOP_WALLET_ADDRESS,
        amount: product.priceWei,
        description: product.name,
        productName: product.name,
        chatId: ctx.chat!.id.toString(),
      });

      if (result.autoApproved) {
        await ctx.reply(`✅ Purchase successful! Payment processed automatically.`);
      } else {
        await ctx.reply(
          `⏳ Price exceeds auto-approve limit.\nApproval notification sent to the card owner.\nWaiting for confirmation...`
        );
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Server unavailable. Please try again.";
      await ctx.reply(`❌ ${message}`);
    }
  });
}
