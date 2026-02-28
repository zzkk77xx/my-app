import { useAdapter, useTxStatus } from "@unlink-xyz/react";
import { buildApproveCall, buildCall } from "@unlink-xyz/core";
import { useState } from "react";

const TOKEN_IN = "0x..."; // Token to sell
const TOKEN_OUT = "0x..."; // Token to buy
const DEX_ROUTER = "0x..."; // DEX router address
const ADAPTER_ADDRESS = "0x..."; // UnlinkAdapter contract address

function SwapForm() {
  const { execute, isPending, error } = useAdapter();
  const [relayId, setRelayId] = useState<string | null>(null);
  const txStatus = useTxStatus(relayId);

  async function handleSwap() {
    const amountIn = 1000000n;
    const minAmountOut = 990000n;

    const approveCall = buildApproveCall(TOKEN_IN, DEX_ROUTER, amountIn);
    const swapCall = buildCall({
      to: DEX_ROUTER,
      abi: "function exactInputSingle((address,address,uint24,address,uint256,uint256,uint160))",
      functionName: "exactInputSingle",
      args: [
        [TOKEN_IN, TOKEN_OUT, 3000, ADAPTER_ADDRESS, amountIn, minAmountOut, 0],
      ],
    });

    const result = await execute({
      adapterAddress: ADAPTER_ADDRESS,
      inputs: [{ token: TOKEN_IN, amount: amountIn }],
      calls: [approveCall, swapCall],
      reshields: [{ token: TOKEN_OUT, minAmount: minAmountOut }],
    });

    setRelayId(result.relayId);
  }

  return (
    <div>
      <button onClick={handleSwap} disabled={isPending}>
        {isPending ? "Swapping..." : "Swap"}
      </button>

      {error && <p>Error: {error.message}</p>}

      {txStatus.state && (
        <p>
          Status: {txStatus.state}
          {txStatus.txHash && ` (${txStatus.txHash})`}
        </p>
      )}
    </div>
  );
}

export default SwapForm;
