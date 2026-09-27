import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";
import {
  createPublicClient,
  createWalletClient,
  http,
  BaseError,
  ContractFunctionRevertedError,
  type Abi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bscTestnet } from "viem/chains";

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

const CONTRACT_ADDRESS = process.env.DELEGATION_CARD_ADDRESS as `0x${string}`;
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;
const RPC_URL = process.env.BNB_RPC_URL as string;

if (!CONTRACT_ADDRESS) throw new Error("DELEGATION_CARD_ADDRESS is not set in .env");
if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is not set in .env");
if (!RPC_URL) throw new Error("BNB_RPC_URL is not set in .env");

const abiPath = path.resolve(
  __dirname,
  "../../../contracts/out/DelegationCardV2.sol/DelegationCardV2.json"
);
const artifact = JSON.parse(fs.readFileSync(abiPath, "utf-8"));
const abi = artifact.abi as Abi;

const account = privateKeyToAccount(PRIVATE_KEY);

export const publicClient = createPublicClient({
  chain: bscTestnet,
  transport: http(RPC_URL),
});

export const walletClient = createWalletClient({
  chain: bscTestnet,
  transport: http(RPC_URL),
  account,
});

export function extractRevertReason(err: unknown): string {
  if (err instanceof BaseError) {
    const revertError = err.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revertError instanceof ContractFunctionRevertedError) {
      return revertError.reason ?? revertError.shortMessage;
    }
    return err.shortMessage ?? err.message;
  }
  return err instanceof Error ? err.message : "Unknown contract error";
}

export interface OnChainCard {
  owner: `0x${string}`;
  authorizedAgent: `0x${string}`;
  totalBudget: bigint;
  spentAmount: bigint;
  autoApproveLimit: bigint;
  expiryTimestamp: bigint;
  isActive: boolean;
}

export async function getCardFromChain(cardId: bigint): Promise<OnChainCard> {
  const result = (await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: "cards",
    args: [cardId],
  })) as readonly [`0x${string}`, `0x${string}`, bigint, bigint, bigint, bigint, boolean];

  return {
    owner: result[0],
    authorizedAgent: result[1],
    totalBudget: result[2],
    spentAmount: result[3],
    autoApproveLimit: result[4],
    expiryTimestamp: result[5],
    isActive: result[6],
  };
}

export async function callSpend(
  cardId: bigint,
  merchant: `0x${string}`,
  amount: bigint,
  description: string
): Promise<{ autoApproved: boolean; pendingSpendId: bigint; txHash: `0x${string}` }> {
  const { request, result } = await publicClient.simulateContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: "spend",
    args: [cardId, merchant, amount, description],
    account,
  });

  const txHash = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  const [autoApproved, pendingSpendId] = result as readonly [boolean, bigint];
  return { autoApproved, pendingSpendId, txHash };
}

export async function callApproveSpend(spendId: bigint): Promise<`0x${string}`> {
  const { request } = await publicClient.simulateContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: "approveSpend",
    args: [spendId],
    account,
  });
  const txHash = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

export async function callRejectSpend(spendId: bigint): Promise<`0x${string}`> {
  const { request } = await publicClient.simulateContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: "rejectSpend",
    args: [spendId],
    account,
  });
  const txHash = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

const IDRX_ABI = [
  {
    name: "mint",
    type: "function",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export async function mintIDRX(to: `0x${string}`, amount: bigint): Promise<`0x${string}`> {
  const idrxAddress = process.env.IDRX_TOKEN_ADDRESS as `0x${string}`;
  if (!idrxAddress) throw new Error("IDRX_TOKEN_ADDRESS is not set in .env");

  const { request } = await publicClient.simulateContract({
    address: idrxAddress,
    abi: IDRX_ABI,
    functionName: "mint",
    args: [to, amount],
    account,
  });

  const txHash = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}
