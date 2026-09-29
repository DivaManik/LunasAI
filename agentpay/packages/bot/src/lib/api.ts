import "./env";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";
const SHOP_URL = process.env.SHOP_URL || "http://localhost:3002";

export interface Card {
  cardId: string;
  owner: string;
  totalBudget: string;
  spentAmount: string;
  autoApproveLimit: string;
  expiryTimestamp: string;
  isActive: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  priceIdrx: string;
  priceDisplay: string;
}

export interface SpendResult {
  autoApproved: boolean;
  pendingSpendId: string | null;
}

export class ApiError extends Error {}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiError("Server sedang tidak tersedia. Coba lagi.");
  }

  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) {
    throw new ApiError(body?.error || "Server sedang tidak tersedia. Coba lagi.");
  }
  return body as T;
}

export function connectTelegram(walletAddress: string, telegramChatId: string): Promise<{ success: boolean }> {
  return request(`${BACKEND_URL}/api/connect-telegram`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress, telegramChatId }),
  });
}

export function requestNonce(walletAddress: string, chatId: string): Promise<{ message: string }> {
  return request(`${BACKEND_URL}/api/auth/nonce`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress, chatId }),
  });
}

export function verifySignature(
  signature: string,
  chatId: string
): Promise<{ success: boolean; walletAddress: string }> {
  return request(`${BACKEND_URL}/api/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ signature, chatId }),
  });
}

export function getCard(cardId: string): Promise<Card> {
  return request(`${BACKEND_URL}/api/cards/${cardId}`);
}

export function getProducts(): Promise<Product[]> {
  return request(`${SHOP_URL}/products`);
}

export function createSpend(params: {
  cardId: string;
  merchantAddress: string;
  amount: string;
  description: string;
  productName: string;
  chatId: string;
}): Promise<SpendResult> {
  return request(`${BACKEND_URL}/api/spend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
}

export function approveSpend(spendId: string, chatId: string): Promise<{ success: boolean }> {
  return request(`${BACKEND_URL}/api/spend/approve/${spendId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId }),
  });
}

export function rejectSpend(spendId: string, chatId: string): Promise<{ success: boolean }> {
  return request(`${BACKEND_URL}/api/spend/reject/${spendId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId }),
  });
}
