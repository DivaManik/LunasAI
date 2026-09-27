import { http } from "wagmi";
import { createConfig } from "@privy-io/wagmi";
import { bnbTestnet } from "./chain";

export const config = createConfig({
  chains: [bnbTestnet],
  transports: {
    [bnbTestnet.id]: http(
      process.env.NEXT_PUBLIC_BNB_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545"
    ),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
