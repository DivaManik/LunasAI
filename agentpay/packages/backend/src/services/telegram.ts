import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = BOT_TOKEN ? `https://api.telegram.org/bot${BOT_TOKEN}` : undefined;

export async function sendApprovalRequest(
  chatId: string,
  spendId: string,
  productName: string,
  amountDisplay: string,
  autoApproveLimitDisplay: string
): Promise<void> {
  if (!TELEGRAM_API) {
    console.warn("[telegram] TELEGRAM_BOT_TOKEN not set, skipping notification");
    return;
  }

  const message =
    `💰 Permintaan Pembelian\n\n` +
    `Item: ${productName}\n` +
    `Harga: ${amountDisplay}\n` +
    `Auto-approve limit: ${autoApproveLimitDisplay}\n\n` +
    `Harga melebihi auto-approve limit. Setujui pembelian ini?`;

  try {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✅ Approve", callback_data: `approve_${spendId}` },
              { text: "❌ Tolak", callback_data: `reject_${spendId}` },
            ],
          ],
        },
      }),
    });
  } catch (err) {
    console.error("[telegram] failed to send approval request", err);
  }
}

export async function sendMessage(chatId: string, text: string): Promise<void> {
  if (!TELEGRAM_API) {
    console.warn("[telegram] TELEGRAM_BOT_TOKEN not set, skipping notification");
    return;
  }

  try {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (err) {
    console.error("[telegram] failed to send message", err);
  }
}
