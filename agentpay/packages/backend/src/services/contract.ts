import path from "node:path";
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

const abi: Abi = [{"type":"constructor","inputs":[{"name":"_idrxToken","type":"address","internalType":"address"}],"stateMutability":"nonpayable"},{"type":"function","name":"approveSpend","inputs":[{"name":"spendId","type":"uint256","internalType":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"cards","inputs":[{"name":"","type":"uint256","internalType":"uint256"}],"outputs":[{"name":"owner","type":"address","internalType":"address"},{"name":"authorizedAgent","type":"address","internalType":"address"},{"name":"totalBudget","type":"uint256","internalType":"uint256"},{"name":"spentAmount","type":"uint256","internalType":"uint256"},{"name":"autoApproveLimit","type":"uint256","internalType":"uint256"},{"name":"expiryTimestamp","type":"uint256","internalType":"uint256"},{"name":"isActive","type":"bool","internalType":"bool"}],"stateMutability":"view"},{"type":"function","name":"createCard","inputs":[{"name":"budget","type":"uint256","internalType":"uint256"},{"name":"autoApproveLimit","type":"uint256","internalType":"uint256"},{"name":"expiryDays","type":"uint256","internalType":"uint256"},{"name":"authorizedAgent","type":"address","internalType":"address"}],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"nonpayable"},{"type":"function","name":"getCard","inputs":[{"name":"cardId","type":"uint256","internalType":"uint256"}],"outputs":[{"name":"","type":"tuple","internalType":"struct DelegationCardV2.Card","components":[{"name":"owner","type":"address","internalType":"address"},{"name":"authorizedAgent","type":"address","internalType":"address"},{"name":"totalBudget","type":"uint256","internalType":"uint256"},{"name":"spentAmount","type":"uint256","internalType":"uint256"},{"name":"autoApproveLimit","type":"uint256","internalType":"uint256"},{"name":"expiryTimestamp","type":"uint256","internalType":"uint256"},{"name":"isActive","type":"bool","internalType":"bool"}]}],"stateMutability":"view"},{"type":"function","name":"getOwnerCards","inputs":[{"name":"owner","type":"address","internalType":"address"}],"outputs":[{"name":"","type":"uint256[]","internalType":"uint256[]"}],"stateMutability":"view"},{"type":"function","name":"idrxToken","inputs":[],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},{"type":"function","name":"ownerCards","inputs":[{"name":"","type":"address","internalType":"address"},{"name":"","type":"uint256","internalType":"uint256"}],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"pendingSpends","inputs":[{"name":"","type":"uint256","internalType":"uint256"}],"outputs":[{"name":"cardId","type":"uint256","internalType":"uint256"},{"name":"merchant","type":"address","internalType":"address"},{"name":"amount","type":"uint256","internalType":"uint256"},{"name":"description","type":"string","internalType":"string"},{"name":"isApproved","type":"bool","internalType":"bool"},{"name":"isRejected","type":"bool","internalType":"bool"},{"name":"isExecuted","type":"bool","internalType":"bool"},{"name":"createdAt","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"rejectSpend","inputs":[{"name":"spendId","type":"uint256","internalType":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"revokeCard","inputs":[{"name":"cardId","type":"uint256","internalType":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"spend","inputs":[{"name":"cardId","type":"uint256","internalType":"uint256"},{"name":"merchant","type":"address","internalType":"address payable"},{"name":"amount","type":"uint256","internalType":"uint256"},{"name":"description","type":"string","internalType":"string"}],"outputs":[{"name":"autoApproved","type":"bool","internalType":"bool"},{"name":"pendingSpendId","type":"uint256","internalType":"uint256"}],"stateMutability":"nonpayable"},{"type":"event","name":"CardCreated","inputs":[{"name":"cardId","type":"uint256","indexed":true,"internalType":"uint256"},{"name":"owner","type":"address","indexed":true,"internalType":"address"},{"name":"budget","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},{"type":"event","name":"CardRevoked","inputs":[{"name":"cardId","type":"uint256","indexed":true,"internalType":"uint256"}],"anonymous":false},{"type":"event","name":"SpendApproved","inputs":[{"name":"spendId","type":"uint256","indexed":true,"internalType":"uint256"}],"anonymous":false},{"type":"event","name":"SpendExecuted","inputs":[{"name":"cardId","type":"uint256","indexed":true,"internalType":"uint256"},{"name":"merchant","type":"address","indexed":true,"internalType":"address"},{"name":"amount","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},{"type":"event","name":"SpendPending","inputs":[{"name":"spendId","type":"uint256","indexed":true,"internalType":"uint256"},{"name":"cardId","type":"uint256","indexed":true,"internalType":"uint256"},{"name":"amount","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},{"type":"event","name":"SpendRejected","inputs":[{"name":"spendId","type":"uint256","indexed":true,"internalType":"uint256"}],"anonymous":false}];

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
