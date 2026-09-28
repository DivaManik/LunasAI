import type { Bot } from "grammy";

const WELCOME_MESSAGE = `🤖 Welcome to LunasAI Bot!

I can shop on your behalf using your on-chain Delegation Card.

📋 How to use LunasAI:
1. Open dashboard → connect MetaMask → create a Delegation Card
2. /connect <wallet_address> — start wallet verification
3. /verify <signature>       — complete verification (from dashboard)
4. /use <card_id>            — set active card
5. /buy <item_name>          — start shopping!

💡 Example:
/connect 0x1234...abcd
/verify 0xSIGNATURE...
/use 1
/buy ai premium`;

export function registerStartCommand(bot: Bot): void {
  bot.command(["start", "help"], async (ctx) => {
    await ctx.reply(WELCOME_MESSAGE);
  });
}
