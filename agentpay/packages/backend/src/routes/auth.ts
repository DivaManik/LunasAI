import { Hono } from "hono";
import { verifyMessage } from "viem";
import crypto from "node:crypto";
import { pendingNonces, connectTelegram } from "../db";

const auth = new Hono();

const NONCE_TTL_MS = 10 * 60 * 1000;
const WALLET_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

auth.post("/nonce", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: "Invalid JSON body" }, 400);

  const { walletAddress, chatId } = body;
  if (!walletAddress || !chatId) {
    return c.json({ error: "Missing required fields: walletAddress, chatId" }, 400);
  }
  if (!WALLET_ADDRESS_RE.test(walletAddress)) {
    return c.json({ error: "Invalid wallet address" }, 400);
  }

  const nonce = crypto.randomBytes(16).toString("hex");
  const message = `AGENTPAY-VERIFY-${nonce}`;

  pendingNonces.set(String(chatId), {
    walletAddress: walletAddress.toLowerCase(),
    nonce: message,
    expiresAt: Date.now() + NONCE_TTL_MS,
  });

  return c.json({ message });
});

auth.post("/verify", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: "Invalid JSON body" }, 400);

  const { signature, chatId } = body;
  if (!signature || !chatId) {
    return c.json({ error: "Missing required fields: signature, chatId" }, 400);
  }

  const chatIdStr = String(chatId);
  const pending = pendingNonces.get(chatIdStr);

  if (!pending) {
    return c.json(
      { error: "Tidak ada sesi connect aktif. Mulai ulang dengan /connect" },
      400
    );
  }
  if (Date.now() > pending.expiresAt) {
    pendingNonces.delete(chatIdStr);
    return c.json({ error: "Sesi expired. Mulai ulang dengan /connect" }, 400);
  }

  try {
    const isValid = await verifyMessage({
      address: pending.walletAddress as `0x${string}`,
      message: pending.nonce,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      return c.json(
        { error: "Signature tidak valid. Pastikan kamu sign dengan wallet yang benar." },
        403
      );
    }

    connectTelegram(pending.walletAddress, chatIdStr);
    pendingNonces.delete(chatIdStr);

    return c.json({ success: true, walletAddress: pending.walletAddress });
  } catch {
    return c.json({ error: "Signature tidak valid." }, 403);
  }
});

export default auth;
