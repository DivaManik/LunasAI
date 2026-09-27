import { Hono } from "hono";
import { formatEther } from "viem";
import {
  callSpend,
  callApproveSpend,
  callRejectSpend,
  getCardFromChain,
  extractRevertReason,
} from "../services/contract";
import { sendApprovalRequest, sendMessage } from "../services/telegram";
import {
  addSpendRecord,
  findSpendRecordByPendingId,
  getTelegramChatId,
  pendingSpendMap,
  telegramMappings,
} from "../db";

function getWalletByChatId(chatId: string): `0x${string}` | undefined {
  for (const [walletAddress, mappedChatId] of telegramMappings.entries()) {
    if (mappedChatId === chatId) return walletAddress as `0x${string}`;
  }
  return undefined;
}

const spend = new Hono();

spend.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: "Invalid JSON body" }, 400);

  const { cardId, merchantAddress, amount, description, productName, chatId: requesterChatId } = body;
  if (!cardId || !merchantAddress || !amount || !description || !requesterChatId) {
    return c.json(
      { error: "Missing required fields: cardId, merchantAddress, amount, description, chatId" },
      400
    );
  }

  try {
    const card = await getCardFromChain(BigInt(cardId));
    if (card.owner === "0x0000000000000000000000000000000000000000") {
      return c.json({ error: "Card not found" }, 404);
    }

    const requesterWallet = getWalletByChatId(String(requesterChatId));
    if (!requesterWallet || requesterWallet.toLowerCase() !== card.owner.toLowerCase()) {
      return c.json({ error: "Card bukan milik kamu" }, 403);
    }

    const result = await callSpend(
      BigInt(cardId),
      merchantAddress as `0x${string}`,
      BigInt(amount),
      description
    );

    const cardIdStr = String(cardId);
    const record = {
      id: Date.now().toString(),
      cardId: cardIdStr,
      merchant: merchantAddress,
      amount: String(amount),
      description,
      status: result.autoApproved ? ("auto_approved" as const) : ("pending" as const),
      createdAt: Date.now(),
      pendingSpendId: result.autoApproved ? undefined : result.pendingSpendId.toString(),
    };
    addSpendRecord(cardIdStr, record);

    if (!result.autoApproved) {
      const spendId = result.pendingSpendId.toString();
      pendingSpendMap.set(spendId, cardIdStr);

      const chatId = getTelegramChatId(card.owner);
      if (chatId) {
        await sendApprovalRequest(
          chatId,
          spendId,
          productName || description,
          `${formatEther(BigInt(amount))} tBNB`,
          `${formatEther(card.autoApproveLimit)} tBNB`
        );
      }
    }

    return c.json({
      autoApproved: result.autoApproved,
      pendingSpendId: result.autoApproved ? null : result.pendingSpendId.toString(),
    });
  } catch (err) {
    return c.json({ error: extractRevertReason(err) }, 400);
  }
});

async function authorizeSpendAction(
  spendId: string,
  chatId: unknown
): Promise<{ ok: true; cardId: string } | { ok: false; error: string; status: 400 | 403 | 404 }> {
  if (!chatId) {
    return { ok: false, error: "Missing required field: chatId", status: 400 };
  }

  const cardId = pendingSpendMap.get(spendId);
  if (!cardId) {
    return { ok: false, error: "Pending spend not found", status: 404 };
  }

  const card = await getCardFromChain(BigInt(cardId));
  const requesterWallet = getWalletByChatId(String(chatId));
  if (!requesterWallet || requesterWallet.toLowerCase() !== card.owner.toLowerCase()) {
    return { ok: false, error: "Bukan pemilik card", status: 403 };
  }

  return { ok: true, cardId };
}

spend.post("/approve/:spendId", async (c) => {
  const spendId = c.req.param("spendId");
  const body = await c.req.json().catch(() => null);

  const auth = await authorizeSpendAction(spendId, body?.chatId);
  if (!auth.ok) return c.json({ error: auth.error }, auth.status);

  try {
    await callApproveSpend(BigInt(spendId));

    const record = findSpendRecordByPendingId(auth.cardId, spendId);
    if (record) record.status = "approved";

    const card = await getCardFromChain(BigInt(auth.cardId));
    const chatId = getTelegramChatId(card.owner);
    if (chatId) await sendMessage(chatId, "✅ Pembelian disetujui dan dieksekusi!");

    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: extractRevertReason(err) }, 400);
  }
});

spend.post("/reject/:spendId", async (c) => {
  const spendId = c.req.param("spendId");
  const body = await c.req.json().catch(() => null);

  const auth = await authorizeSpendAction(spendId, body?.chatId);
  if (!auth.ok) return c.json({ error: auth.error }, auth.status);

  try {
    await callRejectSpend(BigInt(spendId));

    const record = findSpendRecordByPendingId(auth.cardId, spendId);
    if (record) record.status = "rejected";

    const card = await getCardFromChain(BigInt(auth.cardId));
    const chatId = getTelegramChatId(card.owner);
    if (chatId) await sendMessage(chatId, "❌ Pembelian ditolak.");

    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: extractRevertReason(err) }, 400);
  }
});

export default spend;
