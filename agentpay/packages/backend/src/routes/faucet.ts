import { Hono } from "hono";
import { mintIDRX } from "../services/contract";
import { canClaim, recordClaim } from "../db";

const faucet = new Hono();

const FAUCET_AMOUNT = BigInt(10_000_000); // 100.000 IDRX (decimals=2)

faucet.post("/api/faucet", async (c) => {
  const body = await c.req.json().catch(() => null);
  const address = body?.address as string | undefined;

  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return c.json({ error: "Invalid wallet address" }, 400);
  }

  if (!canClaim(address)) {
    return c.json({ error: "Sudah claim hari ini. Coba lagi dalam 24 jam." }, 429);
  }

  try {
    const txHash = await mintIDRX(address as `0x${string}`, FAUCET_AMOUNT);
    recordClaim(address);
    return c.json({
      success: true,
      message: `100.000 IDRX berhasil dikirim ke ${address}`,
      amount: "100.000 IDRX",
      txHash,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: `Faucet gagal: ${message}` }, 500);
  }
});

export default faucet;
