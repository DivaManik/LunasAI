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
  return products.map((p) => `• ${p.name} — ${p.priceDisplay}`).join("\n");
}

export function registerBuyCommand(bot: Bot): void {
  bot.command("buy", async (ctx) => {
    const query = ctx.match?.toString().trim();
    const chatId = String(ctx.chat.id);

    if (!connectedWallets.has(chatId)) {
      await ctx.reply("Kamu belum connect wallet. Ketik /connect <wallet_address> dulu.");
      return;
    }

    const cardId = activeCards.get(chatId);

    if (!cardId) {
      await ctx.reply("Belum ada card aktif. Ketik /use <card_id> dulu.");
      return;
    }

    if (!query) {
      await ctx.reply("❌ Gunakan: /buy <nama_item>\nContoh: /buy hoodie basic");
      return;
    }

    await ctx.reply("🔍 Mencari...");

    let products: Product[];
    try {
      products = await getProducts();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Server sedang tidak tersedia. Coba lagi.";
      await ctx.reply(`❌ ${message}`);
      return;
    }

    const product = findMatch(products, query);
    if (!product) {
      await ctx.reply(`❌ Produk "${query}" tidak ditemukan.\n\nProduk tersedia:\n${productList(products)}`);
      return;
    }

    await ctx.reply(`🛒 Ditemukan: *${product.name}*\n💰 Harga: ${product.priceDisplay}\n\nMemproses...`, {
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
        await ctx.reply(`✅ Pembelian berhasil! Pembayaran diproses otomatis.`);
      } else {
        await ctx.reply(
          `⏳ Harga melebihi auto-approve limit.\nNotifikasi approval sudah dikirim ke pemilik card.\nMenunggu konfirmasi...`
        );
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Server sedang tidak tersedia. Coba lagi.";
      await ctx.reply(`❌ ${message}`);
    }
  });
}
