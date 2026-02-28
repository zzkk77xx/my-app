import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { UnlinkProvider } from "@unlink-xyz/react";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <UnlinkProvider
      gatewayUrl="https://api.unlink.xyz"
      poolAddress="0x0813da0a10328e5ed617d37e514ac2f6fa49a254"
      // chainId={10143}
      // @ts-ignore
      chain="monad-testnet"
    >
      <App />
    </UnlinkProvider>
  </StrictMode>,
);
