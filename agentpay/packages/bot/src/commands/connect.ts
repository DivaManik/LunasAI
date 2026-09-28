import type { Bot } from "grammy";
import { requestNonce, ApiError } from "../lib/api";

const WALLET_REGEX = /^0x[a-fA-F0-9]{40}$/;

export function registerConnectCommand(bot: Bot): void {
  bot.command("connect", async (ctx) => {
    const walletAddress = ctx.match?.toString().trim();

    if (!walletAddress || !WALLET_REGEX.test(walletAddress)) {
      await ctx.reply(
        "❌ Invalid wallet format.\nUse: /connect 0x1234...abcd (must be 0x + 40 hex characters)"
      );
      return;
    }

    try {
      const { message } = await requestNonce(walletAddress, String(ctx.chat.id));
      await ctx.reply(
        `🔐 *Wallet Ownership Verification*\n\n` +
          `To prove you own this wallet:\n\n` +
          `1. Open the LunasAI dashboard\n` +
          `2. Click *"Sign Message"*\n` +
          `3. MetaMask will ask you to sign this message:\n\n` +
          `\`${message}\`\n\n` +
          `4. Once you have the signature, send it here:\n` +
          `/verify <signature>\n\n` +
          `⏰ Valid for 10 minutes.`,
        { parse_mode: "Markdown" }
      );
    } catch (err) {
      const errMessage = err instanceof ApiError ? err.message : "Server unavailable. Please try again.";
      await ctx.reply(`❌ ${errMessage}`);
    }
  });
}
