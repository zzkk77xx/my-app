import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { UnlinkProvider } from "@unlink-xyz/react";
import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { monadTestnet } from "viem/chains";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <PrivyProvider
        appId={import.meta.env.VITE_PRIVY_APP_ID}
        config={{
          defaultChain: monadTestnet,
          supportedChains: [monadTestnet],
        }}
      >
        <UnlinkProvider
          gatewayUrl="https://api.unlink.xyz"
          poolAddress="0x0813da0a10328e5ed617d37e514ac2f6fa49a254"
          // chainId={10143}
          // @ts-ignore
          chain="monad-testnet"
        >
          <App />
        </UnlinkProvider>
      </PrivyProvider>
    </QueryClientProvider>
  </StrictMode>,
);
