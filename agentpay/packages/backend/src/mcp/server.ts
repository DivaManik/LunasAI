import path from "node:path";
import dotenv from "dotenv";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  type CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import { agentPayTools } from "./tools";
import { getCardFromChain, callSpend, extractRevertReason } from "../services/contract";
import { addSpendRecord, getSpendHistory, getTelegramChatId, pendingSpendMap } from "../db";
import { sendApprovalRequest } from "../services/telegram";

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

const SHOP_URL = process.env.SHOP_URL || "http://localhost:3002";

// IDRX pakai 2 decimals (mis. 500000 unit = 5.000 IDRX), bukan 18 seperti native tBNB.
const IDRX_DECIMALS = 2;
function formatIdrx(amount: bigint): string {
  return (Number(amount) / 10 ** IDRX_DECIMALS).toLocaleString("id-ID");
}

function textResult(text: string): CallToolResult {
  return { content: [{ type: "text", text }] };
}

function errorResult(text: string): CallToolResult {
  return { content: [{ type: "text", text: `Error: ${text}` }], isError: true };
}

interface ShopProduct {
  id: string;
  name: string;
  description: string;
  priceIdrx: string;
  priceDisplay: string;
}

interface SpendToolResult {
  success: boolean;
  txHash?: string;
  message?: string;
  error?: string;
}

async function handleGetCardInfo(cardId: string): Promise<CallToolResult> {
  try {
    const card = await getCardFromChain(BigInt(cardId));
    if (card.owner === "0x0000000000000000000000000000000000000000") {
      return errorResult("Card not found");
    }

    const remaining = card.totalBudget - card.spentAmount;
    const expiry = new Date(Number(card.expiryTimestamp) * 1000);
    const isExpired = Date.now() > expiry.getTime();

    return textResult(
      JSON.stringify(
        {
          cardId,
          owner: card.owner,
          totalBudget: formatIdrx(card.totalBudget) + " IDRX",
          spentAmount: formatIdrx(card.spentAmount) + " IDRX",
          remainingBudget: formatIdrx(remaining) + " IDRX",
          autoApproveLimit: formatIdrx(card.autoApproveLimit) + " IDRX",
          expiryTimestamp: expiry.toISOString(),
          isActive: card.isActive,
          isExpired,
        },
        null,
        2
      )
    );
  } catch (err) {
    return errorResult(extractRevertReason(err));
  }
}

async function handleGetProducts(): Promise<CallToolResult> {
  try {
    const res = await fetch(`${SHOP_URL}/products`);
    if (!res.ok) {
      return errorResult(`Shop returned status ${res.status}`);
    }
    const products = (await res.json()) as ShopProduct[];
    return textResult(JSON.stringify(products, null, 2));
  } catch {
    return errorResult("Tidak bisa menghubungi demo shop. Pastikan shop service berjalan.");
  }
}

// Logic inti pembelian, dipakai oleh tool "spend" dan tool "paid_fetch".
// cardId selalu berasal dari secret/token yang sudah di-resolve di routes/mcp.ts.
async function callSpendTool(
  cardId: string,
  productId: string,
  chatId?: string
): Promise<SpendToolResult> {
  try {
    const productRes = await fetch(`${SHOP_URL}/products/${encodeURIComponent(productId)}`);
    if (!productRes.ok) {
      return { success: false, error: "Product not found" };
    }
    const product = (await productRes.json()) as ShopProduct;

    const shopWalletAddress = process.env.SHOP_WALLET_ADDRESS as `0x${string}` | undefined;
    if (!shopWalletAddress) {
      return { success: false, error: "SHOP_WALLET_ADDRESS is not configured" };
    }

    const card = await getCardFromChain(BigInt(cardId));
    if (card.owner === "0x0000000000000000000000000000000000000000") {
      return { success: false, error: "Card not found" };
    }

    const result = await callSpend(
      BigInt(cardId),
      shopWalletAddress,
      BigInt(product.priceIdrx),
      product.name
    );

    const cardIdStr = String(cardId);
    addSpendRecord(cardIdStr, {
      id: Date.now().toString(),
      cardId: cardIdStr,
      merchant: shopWalletAddress,
      amount: product.priceIdrx,
      description: product.name,
      status: result.autoApproved ? "auto_approved" : "pending",
      createdAt: Date.now(),
      pendingSpendId: result.autoApproved ? undefined : result.pendingSpendId.toString(),
    });

    if (!result.autoApproved) {
      const spendId = result.pendingSpendId.toString();
      pendingSpendMap.set(spendId, cardIdStr);

      const notifyChatId = chatId || getTelegramChatId(card.owner);
      if (notifyChatId) {
        await sendApprovalRequest(
          notifyChatId,
          spendId,
          product.name,
          formatIdrx(BigInt(product.priceIdrx)) + " IDRX",
          formatIdrx(card.autoApproveLimit) + " IDRX"
        );
      }

      return {
        success: false,
        error: `Pembelian "${product.name}" melebihi auto-approve limit. Menunggu approval dari pemilik card via Telegram (pendingSpendId: ${spendId}).`,
      };
    }

    return {
      success: true,
      txHash: result.txHash,
      message: `Berhasil membeli "${product.name}" seharga ${product.priceDisplay}.`,
    };
  } catch (err) {
    return { success: false, error: extractRevertReason(err) };
  }
}

async function handleSpend(
  cardId: string,
  args: { productId?: unknown; chatId?: unknown }
): Promise<CallToolResult> {
  const { productId, chatId } = args;
  if (!productId || typeof productId !== "string") return errorResult("productId is required");

  const result = await callSpendTool(
    cardId,
    productId,
    typeof chatId === "string" ? chatId : undefined
  );

  if (!result.success) {
    return textResult(
      JSON.stringify(
        {
          autoApproved: false,
          message: result.error,
        },
        null,
        2
      )
    );
  }

  return textResult(
    JSON.stringify(
      {
        autoApproved: true,
        txHash: result.txHash,
        message: result.message,
      },
      null,
      2
    )
  );
}

async function handlePaidFetch(
  cardId: string,
  args: { url?: unknown; chatId?: unknown }
): Promise<CallToolResult> {
  const { url, chatId } = args;
  if (!url || typeof url !== "string") return errorResult("url is required");

  // Step 1: Fetch tanpa payment
  const firstResp = await fetch(url);

  if (firstResp.status !== 402) {
    const body = await firstResp.text();
    return { content: [{ type: "text", text: body }] };
  }

  // Step 2: Parse 402 response
  const paymentInfo = (await firstResp.json()) as any;
  const x402 = paymentInfo.x402;

  if (!x402?.productId) {
    return {
      content: [
        {
          type: "text",
          text: `Payment required tapi format x402 tidak dikenali:\n${JSON.stringify(paymentInfo, null, 2)}`,
        },
      ],
    };
  }

  // Step 3: Bayar via callSpendTool
  const spendResult = await callSpendTool(
    cardId,
    x402.productId,
    typeof chatId === "string" ? chatId : undefined
  );

  if (!spendResult.success) {
    return {
      content: [{ type: "text", text: `Pembayaran gagal: ${spendResult.error}` }],
    };
  }

  // Step 4: Fetch ulang dengan X-Payment header
  const paidResp = await fetch(url, {
    headers: { "X-Payment": spendResult.txHash! },
  });

  const content = await paidResp.json();
  return {
    content: [
      {
        type: "text",
        text: `✅ Pembayaran berhasil! Konten:\n\n${JSON.stringify(content, null, 2)}`,
      },
    ],
  };
}

async function handleGetHistory(cardId: string): Promise<CallToolResult> {
  const records = getSpendHistory(cardId);
  return textResult(JSON.stringify(records, null, 2));
}

export function createMcpServer(cardId: string): Server {
  const server = new Server(
    { name: "agentpay-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: agentPayTools,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    switch (name) {
      // cardId always comes from the secret/token resolved in routes/mcp.ts,
      // never from tool call arguments — an args.cardId would let one card's
      // secret operate on a different card just by naming it in the call.
      case "get_card_info":
        return handleGetCardInfo(cardId);
      case "get_products":
        return handleGetProducts();
      case "spend":
        return handleSpend(cardId, { productId: args.productId, chatId: args.chatId });
      case "paid_fetch":
        return handlePaidFetch(cardId, { url: args.url, chatId: args.chatId });
      case "get_history":
        return handleGetHistory(cardId);
      default:
        return errorResult(`Unknown tool: ${name}`);
    }
  });

  return server;
}
