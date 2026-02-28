import { useUnlink } from "@unlink-xyz/react";

function Wallet() {
  const {
    ready,
    walletExists,
    activeAccount,
    createWallet,
    createAccount,
    balances,
    send,
  } = useUnlink();

  if (!ready) return <div>Loading...</div>;

  // First visit: create wallet + account
  if (!walletExists)
    return <button onClick={() => createWallet()}>Create Wallet</button>;
  if (!activeAccount)
    return <button onClick={() => createAccount()}>Create Account</button>;

  return (
    <div>
      <p>
        Balance: {balances["0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"] || "0"}
      </p>
      <button
        onClick={() =>
          send([
            {
              token: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
              recipient:
                "0zk1qyh9ryyus33e07ngvyjsjcmflnhn6hu0hyhdsx7asnyswmgfd392lz53jwtfr9y2j944vtc4z4ngdcjhrdv9zcghsng74ldj5avlpajssr09jkzte658sr9s7zp",
              amount: 1000n,
            },
          ])
        }
      >
        Send
      </button>
    </div>
  );
}

export default Wallet;
