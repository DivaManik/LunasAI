export const DELEGATION_CARD_ADDRESS = process.env
  .NEXT_PUBLIC_DELEGATION_CARD_ADDRESS as `0x${string}`;

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export const BOT_USERNAME =
  process.env.NEXT_PUBLIC_BOT_USERNAME || "@LunasPayBot";

export const BOT_TELEGRAM_URL = `https://t.me/${BOT_USERNAME.replace(/^@/, "")}`;

export const AUTHORIZED_AGENT = (process.env
  .NEXT_PUBLIC_AUTHORIZED_AGENT ||
  "0xBa4918Ff177C289F01fd362bc8a55B3e0469149f") as `0x${string}`;

export const IDRX_TOKEN_ADDRESS = process.env
  .NEXT_PUBLIC_IDRX_TOKEN_ADDRESS as `0x${string}` | undefined;

export const BSC_TESTNET_CHAIN_ID = 97;

export const BSCSCAN_TESTNET_URL = "https://testnet.bscscan.com";

export function weiToTbnb(wei: bigint): string {
  return (Number(wei) / 1e18).toFixed(4);
}

export function timestampToDate(timestamp: bigint): string {
  return new Date(Number(timestamp) * 1000).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
