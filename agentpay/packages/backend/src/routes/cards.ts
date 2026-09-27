import crypto from "node:crypto";
import { Hono } from "hono";
import { getCardFromChain, extractRevertReason } from "../services/contract";
import { cardSecretHashes, hashSecret } from "../db";

const cards = new Hono();

cards.get("/:id", async (c) => {
  const idParam = c.req.param("id");
  let cardId: bigint;
  try {
    cardId = BigInt(idParam);
  } catch {
    return c.json({ error: "Invalid card id" }, 400);
  }

  try {
    const card = await getCardFromChain(cardId);
    if (card.owner === "0x0000000000000000000000000000000000000000") {
      return c.json({ error: "Card not found" }, 404);
    }

    return c.json({
      cardId: cardId.toString(),
      owner: card.owner,
      totalBudget: card.totalBudget.toString(),
      spentAmount: card.spentAmount.toString(),
      autoApproveLimit: card.autoApproveLimit.toString(),
      expiryTimestamp: card.expiryTimestamp.toString(),
      isActive: card.isActive,
    });
  } catch (err) {
    return c.json({ error: extractRevertReason(err) }, 404);
  }
});

function revokeSecretsForCard(cardIdParam: string): void {
  for (const [hash, mappedCardId] of cardSecretHashes.entries()) {
    if (mappedCardId === cardIdParam) {
      cardSecretHashes.delete(hash);
    }
  }
}

cards.post("/:cardId/register-mcp", async (c) => {
  const cardIdParam = c.req.param("cardId");
  let cardId: bigint;
  try {
    cardId = BigInt(cardIdParam);
  } catch {
    return c.json({ error: "Invalid card id" }, 400);
  }

  try {
    const card = await getCardFromChain(cardId);
    if (card.owner === "0x0000000000000000000000000000000000000000") {
      return c.json({ error: "Card not found" }, 404);
    }
  } catch (err) {
    return c.json({ error: extractRevertReason(err) }, 404);
  }

  // Revoke any existing secret first so a card never has more than one
  // active secret at a time.
  revokeSecretsForCard(cardIdParam);

  const secret = `ap_${crypto.randomBytes(24).toString("base64url")}`;
  cardSecretHashes.set(hashSecret(secret), cardIdParam);

  const mcpBaseUrl = process.env.MCP_BASE_URL || "http://localhost:3001";

  return c.json({
    mcpUrl: `${mcpBaseUrl}/mcp/${secret}`,
    secret,
  });
});

cards.delete("/:cardId/mcp-secret", async (c) => {
  const cardIdParam = c.req.param("cardId");
  try {
    BigInt(cardIdParam);
  } catch {
    return c.json({ error: "Invalid card id" }, 400);
  }

  revokeSecretsForCard(cardIdParam);

  return c.json({
    success: true,
    message: "Secret revoked. Generate baru dengan POST register-mcp",
  });
});

export default cards;
