import { createHash } from "node:crypto";

export interface SpendRecord {
  id: string;
  cardId: string;
  merchant: string;
  amount: string; // wei as string
  description: string;
  status: "auto_approved" | "pending" | "approved" | "rejected";
  txHash?: string;
  createdAt: number;
  pendingSpendId?: string;
}

export interface PendingNonce {
  walletAddress: string;
  nonce: string;
  expiresAt: number;
}

export const spendHistory = new Map<string, SpendRecord[]>(); // cardId -> records
export const telegramMappings = new Map<string, string>(); // walletAddress.toLowerCase() -> chatId
export const pendingSpendMap = new Map<string, string>(); // pendingSpendId -> cardId
export const pendingNonces = new Map<string, PendingNonce>(); // chatId -> pending nonce

export function addSpendRecord(cardId: string, record: SpendRecord): void {
  const existing = spendHistory.get(cardId) || [];
  existing.push(record);
  spendHistory.set(cardId, existing);
}

export function getSpendHistory(cardId: string): SpendRecord[] {
  return spendHistory.get(cardId) || [];
}

export function findSpendRecordByPendingId(
  cardId: string,
  pendingSpendId: string
): SpendRecord | undefined {
  return spendHistory.get(cardId)?.find((r) => r.pendingSpendId === pendingSpendId);
}

export function connectTelegram(walletAddress: string, telegramChatId: string): void {
  telegramMappings.set(walletAddress.toLowerCase(), telegramChatId);
}

export function getTelegramChatId(walletAddress: string): string | undefined {
  return telegramMappings.get(walletAddress.toLowerCase());
}

export interface OAuthSession {
  cardId: string;
  redirectUri: string;
  state: string;
  codeChallenge?: string;
  code?: string;
  expiresAt: number;
}

export interface OAuthToken {
  cardId: string;
  accessToken: string;
  expiresAt: number;
}

export const oauthSessions = new Map<string, OAuthSession>();
export const oauthTokens = new Map<string, OAuthToken>();

export const cardSecretHashes = new Map<string, string>(); // SHA-256 hash of secret -> cardId

export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

// Faucet rate limit: wallet address -> last claim timestamp
export const faucetClaims = new Map<string, number>();

export function canClaim(address: string): boolean {
  const last = faucetClaims.get(address.toLowerCase());
  if (!last) return true;
  const cooldownMs = 24 * 60 * 60 * 1000; // 24 jam
  return Date.now() - last > cooldownMs;
}

export function recordClaim(address: string): void {
  faucetClaims.set(address.toLowerCase(), Date.now());
}
