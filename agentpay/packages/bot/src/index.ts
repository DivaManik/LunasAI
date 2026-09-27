import "./lib/env";
import { Bot } from "grammy";
import { registerStartCommand } from "./commands/start";
import { registerConnectCommand } from "./commands/connect";
import { registerVerifyCommand } from "./commands/verify";
import { registerUseCommand } from "./commands/use";
import { registerBuyCommand } from "./commands/buy";
import { registerBalanceCommand } from "./commands/balance";
import { registerApprovalCallbacks } from "./callbacks/approval";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is not set");
}

const bot = new Bot(token);

registerStartCommand(bot);
registerConnectCommand(bot);
registerVerifyCommand(bot);
registerUseCommand(bot);
registerBuyCommand(bot);
registerBalanceCommand(bot);
registerApprovalCallbacks(bot);

bot.catch((err) => {
  console.error("[bot] unhandled error", err);
});

bot.start({
  onStart: (botInfo) => {
    console.log(`[bot] AgentPay bot running as @${botInfo.username}`);
  },
});
