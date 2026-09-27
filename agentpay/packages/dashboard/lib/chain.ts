import { defineChain } from "viem";

export const bnbTestnet = defineChain({
  id: 97,
  name: "BNB Smart Chain Testnet",
  network: "bnb-testnet",
  nativeCurrency: { name: "BNB", symbol: "tBNB", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_BNB_RPC_URL ||
          "https://data-seed-prebsc-1-s1.binance.org:8545",
      ],
    },
  },
  blockExplorers: {
    default: { name: "BscScan", url: "https://testnet.bscscan.com" },
  },
  testnet: true,
});
