// import { useAdapter, useTxStatus } from "@unlink-xyz/react";
// import { buildApproveCall, buildCall } from "@unlink-xyz/core";
// import { useState } from "react";

// const TOKEN_IN = "0x..."; // Token to sell
// const TOKEN_OUT = "0x..."; // Token to buy
// const DEX_ROUTER = "0x..."; // DEX router address
// const ADAPTER_ADDRESS = "0x..."; // UnlinkAdapter contract address

// function SwapForm() {
//   const { execute, isPending, error } = useAdapter();
//   const [relayId, setRelayId] = useState<string | null>(null);
//   const txStatus = useTxStatus(relayId);

//   async function handleSwap() {
//     const amountIn = 1000000n;
//     const minAmountOut = 990000n;

//     const approveCall = buildApproveCall(TOKEN_IN, DEX_ROUTER, amountIn);
//     const swapCall = buildCall({
//       to: DEX_ROUTER,
//       abi: "function exactInputSingle((address,address,uint24,address,uint256,uint256,uint160))",
//       functionName: "exactInputSingle",
//       args: [
//         [TOKEN_IN, TOKEN_OUT, 3000, ADAPTER_ADDRESS, amountIn, minAmountOut, 0],
//       ],
//     });

//     const result = await execute({
//       adapterAddress: ADAPTER_ADDRESS,
//       inputs: [{ token: TOKEN_IN, amount: amountIn }],
//       calls: [approveCall, swapCall],
//       reshields: [{ token: TOKEN_OUT, minAmount: minAmountOut }],
//     });

//     setRelayId(result.relayId);
//   }

//   return (
//     <div className="flex flex-col gap-3">
//       <button
//         className="bg-[#646cff] border-none rounded-md text-white px-5 py-2.5 text-sm cursor-pointer disabled:opacity-50"
//         onClick={handleSwap}
//         disabled={isPending}
//       >
//         {isPending ? "Swapping..." : "Swap"}
//       </button>

//       {error && (
//         <p className="bg-[#3a1a1a] border border-[#c0392b] rounded-md px-3.5 py-2.5 text-[#ff8080] text-sm m-0">
//           Error: {error.message}
//         </p>
//       )}

//       {txStatus.state && (
//         <p className="bg-[#1a2a3a] border border-[#3a6a9a] rounded-md px-3.5 py-2.5 text-[#80c0ff] text-sm m-0">
//           Status: {txStatus.state}
//           {txStatus.txHash && ` (${txStatus.txHash})`}
//         </p>
//       )}
//     </div>
//   );
// }

// export default SwapForm;
