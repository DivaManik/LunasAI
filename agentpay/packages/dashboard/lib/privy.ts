import type { PrivyClientConfig } from "@privy-io/react-auth";
import { bnbTestnet } from "./chain";

export const privyConfig: PrivyClientConfig = {
  loginMethods: ["email", "google", "wallet"],
  appearance: {
    theme: "light",
    accentColor: "#F0B90B",
  },
  embeddedWallets: {
    ethereum: {
      createOnLogin: "users-without-wallets",
    },
  },
  defaultChain: bnbTestnet,
  supportedChains: [bnbTestnet],
};
