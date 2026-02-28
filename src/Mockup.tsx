import { useState, useEffect } from "react";
import {
  usePrivy,
  useWallets,
  useMfaEnrollment,
  useCreateWallet,
  getEmbeddedConnectedWallet,
} from "@privy-io/react-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { encodeFunctionData, keccak256, encodePacked } from "viem";

const NATIVE_TOKEN = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const AAVE_LOGO = "https://cryptologos.cc/logos/aave-aave-logo.svg";
const UNI_LOGO = "https://cryptologos.cc/logos/uniswap-uni-logo.svg";
const TOKEN_DECIMALS = 18;

const AUTHORIZE_SPEND_ABI = [
  {
    type: "function",
    name: "authorizeSpend",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "recipientHash", type: "bytes32" },
      { name: "transferType", type: "uint8" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

// --- Color tokens ---
const C = {
  bg: "#F4F6FA",
  card: "#FFFFFF",
  border: "#E4E8F0",
  accent: "#6C5CE7",
  accentSoft: "rgba(108,92,231,0.09)",
  green: "#00A86B",
  greenSoft: "rgba(0,168,107,0.10)",
  red: "#E5334A",
  redSoft: "rgba(229,51,74,0.10)",
  textPrimary: "#0D1117",
  textSecondary: "#5A6478",
  textTertiary: "#9AA3B0",
  yellow: "#E09B00",
  yellowSoft: "rgba(224,155,0,0.10)",
};

// --- Icons ---
const Icon = {
  Home: () => (
    <svg
      width="22"
      height="22"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Cards: () => (
    <svg
      width="22"
      height="22"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="2" y="5" width="20" height="14" rx="2" strokeLinecap="round" />
      <path d="M2 10h20" strokeLinecap="round" />
    </svg>
  ),
  Transfer: () => (
    <svg
      width="22"
      height="22"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M7 11l5-5m0 0l5 5m-5-5v12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  DeFi: () => (
    <svg
      width="22"
      height="22"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="9" />
      <path
        d="M12 3c4 4 4 14 0 18M12 3c-4 4-4 14 0 18M3 12h18"
        strokeLinecap="round"
      />
    </svg>
  ),
  Settings: () => (
    <svg
      width="22"
      height="22"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="3" />
      <path
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Plus: () => (
    <svg
      width="20"
      height="20"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 5v14m-7-7h14" strokeLinecap="round" />
    </svg>
  ),
  ArrowRight: () => (
    <svg
      width="16"
      height="16"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Send: () => (
    <svg
      width="18"
      height="18"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Download: () => (
    <svg
      width="18"
      height="18"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M12 5v14m0 0l-6-6m6 6l6-6M5 19h14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Lock: () => (
    <svg
      width="14"
      height="14"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round" />
    </svg>
  ),
  Eye: () => (
    <svg
      width="18"
      height="18"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  EyeOff: () => (
    <svg
      width="18"
      height="18"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 01-4.24-4.24"
        strokeLinecap="round"
      />
      <path d="M1 1l22 22" strokeLinecap="round" />
    </svg>
  ),
  TrendUp: () => (
    <svg
      width="14"
      height="14"
      fill="none"
      viewBox="0 0 24 24"
      stroke="#00A86B"
      strokeWidth="2.5"
    >
      <path
        d="M23 6l-9.5 9.5-5-5L1 18"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M17 6h6v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

// --- Card metadata for EOA theming ---
const CARD_META = [
  { name: "Daily Spending", emoji: "💳", color: "#6C5CE7" },
  { name: "Online Shopping", emoji: "🛒", color: "#00D68F" },
  { name: "Subscriptions", emoji: "🔄", color: "#FECA57" },
  { name: "Travel", emoji: "✈️", color: "#FF6B6B" },
  { name: "Savings", emoji: "🌟", color: "#74B9FF" },
];

// --- Phone frame styles ---
const phoneFrame: React.CSSProperties = {
  width: 390,
  minHeight: 844,
  background: C.bg,
  borderRadius: 44,
  border: `2px solid ${C.border}`,
  position: "relative",
  overflow: "hidden",
  fontFamily: "'SF Pro Display', 'Helvetica Neue', -apple-system, sans-serif",
  boxShadow:
    "0 25px 80px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06) inset",
};

// --- Helpers ---
function shortenAddr(addr: string, chars = 6): string {
  if (!addr) return "";
  return `${addr.slice(0, chars + 2)}…${addr.slice(-chars)}`;
}

function fmtWei(wei: string | undefined, decimals = TOKEN_DECIMALS): string {
  if (!wei) return "0";
  try {
    const n = BigInt(wei);
    const divisor = BigInt(10 ** decimals);
    const whole = n / divisor;
    const frac = n % divisor;
    const fracStr = frac.toString().padStart(decimals, "0").slice(0, 4);
    return `${whole}.${fracStr}`;
  } catch {
    return "0";
  }
}

function parseWei(amount: string, decimals = TOKEN_DECIMALS): string {
  try {
    const [whole, frac = ""] = amount.split(".");
    const fracPadded = frac.padEnd(decimals, "0").slice(0, decimals);
    return (
      BigInt(whole || "0") * BigInt(10 ** decimals) +
      BigInt(fracPadded || "0")
    ).toString();
  } catch {
    return "0";
  }
}


// --- Transfer Modal ---
function TransferModal({
  onClose,
  nativeBalance,
  spendInteractorAddress,
  userAddress,
}: {
  onClose: () => void;
  nativeBalance: string;
  spendInteractorAddress: string | null;
  userAddress: string;
}) {
  const { wallets } = useWallets();
  const wallet = wallets[0];

  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");

  async function handleSend() {
    if (!amount || !recipient || sending) return;
    if (!spendInteractorAddress) { setErr("Account setup not yet complete."); return; }
    if (!wallet) { setErr("No wallet connected."); return; }

    setSending(true);
    setErr("");
    setTxHash(null);
    try {
      // 1. Pre-register recipient mapping so the watcher can resolve the hash
      fetch(`${API_URL}/recipients/by-address`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: recipient }),
      }).catch(() => {});

      // 2. recipientHash = keccak256(abi.encodePacked(address)) — matches Solidity
      const recipientHash = keccak256(
        encodePacked(["address"], [recipient as `0x${string}`])
      );

      // 3. Encode authorizeSpend(amount, recipientHash, transferType=1)
      const calldata = encodeFunctionData({
        abi: AUTHORIZE_SPEND_ABI,
        functionName: "authorizeSpend",
        args: [BigInt(parseWei(amount)), recipientHash, 1],
      });

      // 4. EOA signs & submits the tx — msg.sender must be the registered EOA
      const provider = await wallet.getEthereumProvider();
      const hash = await provider.request({
        method: "eth_sendTransaction",
        params: [{ from: userAddress, to: spendInteractorAddress, data: calldata }],
      });

      setTxHash(hash as string);
      setAmount("");
      setRecipient("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(10px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      <div
        style={{
          background: C.card,
          borderRadius: "24px 24px 0 0",
          padding: "28px 24px 40px",
          borderTop: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <span style={{ color: C.textPrimary, fontSize: 20, fontWeight: 600 }}>
            Send Money
          </span>
          <button
            onClick={onClose}
            style={{
              background: "rgba(0,0,0,0.06)",
              border: "none",
              color: C.textSecondary,
              width: 32,
              height: 32,
              borderRadius: 16,
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            background: C.accentSoft,
            borderRadius: 14,
            padding: "12px 16px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div>
            <div style={{ color: C.accent, fontSize: 13, fontWeight: 600 }}>
              From: Checking Account
            </div>
            <div style={{ color: C.textSecondary, fontSize: 12, marginTop: 1 }}>
              {nativeBalance} MON available
            </div>
          </div>
        </div>

        <label
          style={{
            color: C.textSecondary,
            fontSize: 12,
            letterSpacing: 1,
            textTransform: "uppercase",
            marginBottom: 6,
            display: "block",
          }}
        >
          Recipient
        </label>
        <input
          placeholder="IBAN or wallet address"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          style={{
            width: "100%",
            padding: "14px 16px",
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            color: C.textPrimary,
            fontSize: 15,
            marginBottom: 16,
            outline: "none",
            boxSizing: "border-box",
          }}
        />

        <label
          style={{
            color: C.textSecondary,
            fontSize: 12,
            letterSpacing: 1,
            textTransform: "uppercase",
            marginBottom: 6,
            display: "block",
          }}
        >
          Amount
        </label>
        <div style={{ position: "relative", marginBottom: 16 }}>
          <input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0"
            style={{
              width: "100%",
              padding: "14px 16px",
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: 14,
              color: C.textPrimary,
              fontSize: 22,
              fontWeight: 600,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 16, padding: "8px 12px", background: C.yellowSoft, border: `1px solid rgba(224,155,0,0.18)`, borderRadius: 10 }}>
          <span style={{ color: C.yellow, fontSize: 13, marginTop: 1 }}>ⓘ</span>
          <span style={{ color: C.yellow, fontSize: 12, lineHeight: 1.5 }}>
            Transfers above <strong>10,000 MON</strong> require bank compliance verification before processing.
          </span>
        </div>

        {err && (
          <div
            style={{
              background: C.redSoft,
              border: `1px solid rgba(229,51,74,0.2)`,
              borderRadius: 12,
              padding: "10px 14px",
              marginBottom: 16,
              color: C.red,
              fontSize: 13,
            }}
          >
            {err}
          </div>
        )}

        {txHash && (
          <div style={{ background: C.greenSoft, border: `1px solid rgba(0,168,107,0.2)`, borderRadius: 12, padding: "10px 14px", marginBottom: 16, fontSize: 13 }}>
            <div style={{ color: C.green, fontWeight: 600, marginBottom: 4 }}>Transfer authorized on-chain</div>
            <div style={{ color: C.textSecondary, fontSize: 12 }}>
              Tx: {shortenAddr(txHash, 10)}
            </div>
            <div style={{ color: C.textTertiary, fontSize: 11, marginTop: 4 }}>
              The backend is processing the transfer — funds will move shortly.
            </div>
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={sending || !amount || !recipient}
          style={{
            width: "100%",
            padding: "16px",
            background: C.accent,
            border: "none",
            borderRadius: 16,
            color: "#fff",
            fontSize: 16,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            opacity: sending || !amount || !recipient ? 0.5 : 1,
          }}
        >
          <Icon.Send /> {sending ? "Sending…" : "Confirm Transfer"}
        </button>
      </div>
    </div>
  );
}

// --- Deposit Modal ---
function DepositModal({
  onClose,
  depositorAddress,
}: {
  onClose: () => void;
  depositorAddress: string | null;
}) {
  const { wallets } = useWallets();
  const { login } = usePrivy();
  const [amount, setAmount] = useState("");
  const [phase, setPhase] = useState<
    "idle" | "preparing" | "sending" | "confirming" | "done" | "error"
  >("idle");
  const [err, setErr] = useState("");
  const wallet = wallets[0];

  async function handleDeposit() {
    if (!amount || !depositorAddress || !wallet) return;
    setErr("");
    try {
      setPhase("preparing");
      const prepRes = await fetch(`${API_URL}/deposit/prepare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          depositor: depositorAddress,
          token: NATIVE_TOKEN,
          amount: parseWei(amount),
        }),
      });
      if (!prepRes.ok) throw new Error(await prepRes.text());
      const { to, calldata, value, relayId } = await prepRes.json();

      setPhase("sending");
      const provider = await wallet.getEthereumProvider();
      await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: depositorAddress,
            to,
            data: calldata,
            value: `0x${BigInt(value || 0).toString(16)}`,
          },
        ],
      });

      setPhase("confirming");
      await fetch(`${API_URL}/deposit/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relayId }),
      });
      setPhase("done");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  }

  const phaseLabel: Record<string, string> = {
    idle: "Confirm Deposit",
    preparing: "Preparing…",
    sending: "Waiting for wallet…",
    confirming: "Confirming…",
    done: "Deposit submitted!",
    error: "Try again",
  };
  const canSubmit = (phase === "idle" || phase === "error") && !!amount;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(10px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      <div
        style={{
          background: C.card,
          borderRadius: "24px 24px 0 0",
          padding: "28px 24px 40px",
          borderTop: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <span style={{ color: C.textPrimary, fontSize: 20, fontWeight: 600 }}>
            Deposit Funds
          </span>
          <button
            onClick={onClose}
            style={{
              background: "rgba(0,0,0,0.06)",
              border: "none",
              color: C.textSecondary,
              width: 32,
              height: 32,
              borderRadius: 16,
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            ✕
          </button>
        </div>

        {!depositorAddress ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div
              style={{ color: C.textSecondary, fontSize: 14, marginBottom: 16 }}
            >
              Connect an external wallet to deposit funds.
            </div>
            <button
              onClick={login}
              style={{
                padding: "14px 24px",
                background: C.accent,
                border: "none",
                borderRadius: 14,
                color: "#fff",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Connect Wallet
            </button>
          </div>
        ) : (
          <>
            <div
              style={{
                background: C.accentSoft,
                borderRadius: 14,
                padding: "14px 16px",
                marginBottom: 20,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div>
                <div style={{ color: C.accent, fontSize: 13, fontWeight: 600 }}>
                  Bank Transfer (SEPA / on-chain)
                </div>
                <div
                  style={{ color: C.textSecondary, fontSize: 12, marginTop: 2 }}
                >
                  From: {shortenAddr(depositorAddress, 8)}
                </div>
              </div>
            </div>

            <label
              style={{
                color: C.textSecondary,
                fontSize: 12,
                letterSpacing: 1,
                textTransform: "uppercase",
                marginBottom: 6,
                display: "block",
              }}
            >
              Amount to deposit
            </label>
            <div style={{ position: "relative", marginBottom: 20 }}>
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={!canSubmit}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 14,
                  color: C.textPrimary,
                  fontSize: 22,
                  fontWeight: 600,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {err && (
              <div
                style={{
                  background: C.redSoft,
                  border: `1px solid rgba(229,51,74,0.2)`,
                  borderRadius: 12,
                  padding: "10px 14px",
                  marginBottom: 16,
                  color: C.red,
                  fontSize: 13,
                }}
              >
                {err}
              </div>
            )}
            {phase === "done" && (
              <div
                style={{
                  background: C.greenSoft,
                  border: `1px solid rgba(0,168,107,0.2)`,
                  borderRadius: 12,
                  padding: "10px 14px",
                  marginBottom: 16,
                  color: C.green,
                  fontSize: 13,
                }}
              >
                Deposit submitted successfully.
              </div>
            )}

            <button
              onClick={handleDeposit}
              disabled={!canSubmit}
              style={{
                width: "100%",
                padding: "16px",
                background: C.green,
                border: "none",
                borderRadius: 16,
                color: "#fff",
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                opacity: !canSubmit ? 0.5 : 1,
              }}
            >
              <Icon.Download /> {phaseLabel[phase]}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// --- Add New Card Modal ---
function AddCardModal({
  onClose,
  onAdd,
  registering,
  error,
}: {
  onClose: () => void;
  onAdd: (eoa: string, dailyLimit: string) => void;
  registering: boolean;
  error: string;
}) {
  const [eoa, setEoa] = useState("");
  const [limit, setLimit] = useState(1000);
  const [validationErr, setValidationErr] = useState("");

  function handleSubmit() {
    if (!/^0x[0-9a-fA-F]{40}$/.test(eoa.trim())) {
      setValidationErr("Enter a valid 0x wallet address (42 chars).");
      return;
    }
    setValidationErr("");
    onAdd(eoa.trim(), parseWei(limit.toString()));
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      setEoa(text.trim());
    } catch {
      /* ignore */
    }
  }

  const displayErr = validationErr || error;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(10px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      <div
        style={{
          background: C.card,
          borderRadius: "24px 24px 0 0",
          padding: "28px 24px 40px",
          borderTop: `1px solid ${C.border}`,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{ color: C.textPrimary, fontSize: 20, fontWeight: 600 }}
            >
              Add New Card
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(0,0,0,0.06)",
              border: "none",
              color: C.textSecondary,
              width: 32,
              height: 32,
              borderRadius: 16,
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            ✕
          </button>
        </div>

        {/* EOA address input */}
        <label
          style={{
            color: C.textSecondary,
            fontSize: 12,
            letterSpacing: 1,
            textTransform: "uppercase",
            marginBottom: 6,
            display: "block",
          }}
        >
          Wallet / EOA Address
        </label>
        <div style={{ position: "relative", marginBottom: 20 }}>
          <input
            placeholder="0x..."
            value={eoa}
            onChange={(e) => {
              setEoa(e.target.value);
              setValidationErr("");
            }}
            style={{
              width: "100%",
              padding: "14px 52px 14px 16px",
              background: C.bg,
              border: `1px solid ${displayErr ? C.red : C.border}`,
              borderRadius: 14,
              color: C.textPrimary,
              fontSize: 13,
              fontFamily: "monospace",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          <button
            onClick={handlePaste}
            title="Paste"
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              background: C.accentSoft,
              border: "none",
              borderRadius: 8,
              color: C.accent,
              fontSize: 11,
              fontWeight: 600,
              padding: "4px 10px",
              cursor: "pointer",
            }}
          >
            Paste
          </button>
        </div>

        {/* Daily limit presets */}
        <label
          style={{
            color: C.textSecondary,
            fontSize: 12,
            letterSpacing: 1,
            textTransform: "uppercase",
            marginBottom: 8,
            display: "block",
          }}
        >
          Daily spending limit (MON)
        </label>
        <div
          style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}
        >
          {[500, 1000, 1500, 2000, 3000, 5000].map((v) => (
            <button
              key={v}
              onClick={() => setLimit(v)}
              style={{
                flex: "1 1 auto",
                padding: "10px 0",
                background: limit === v ? C.accent : C.bg,
                border: `1px solid ${limit === v ? C.accent : C.border}`,
                borderRadius: 10,
                color: limit === v ? "#fff" : C.textSecondary,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {v >= 1000 ? `${v / 1000}k` : v}
            </button>
          ))}
        </div>
        <div
          style={{
            color: C.textTertiary,
            fontSize: 11,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Icon.Lock /> Enforced on-chain via SpendInteractor
        </div>

        {/* Error */}
        {displayErr && (
          <div
            style={{
              background: C.redSoft,
              border: `1px solid rgba(229,51,74,0.2)`,
              borderRadius: 12,
              padding: "10px 14px",
              marginBottom: 16,
              color: C.red,
              fontSize: 13,
            }}
          >
            {displayErr}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={handleSubmit}
            disabled={registering}
            style={{
              flex: 1,
              padding: "14px",
              background: C.accent,
              border: "none",
              borderRadius: 14,
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              opacity: registering ? 0.5 : 1,
            }}
          >
            {registering ? "Registering…" : "Register Card"}
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "14px",
              background: C.redSoft,
              border: `1px solid rgba(229,51,74,0.2)`,
              borderRadius: 14,
              color: C.red,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Sub-account / Card Detail Modal ---
function CardModal({
  card,
  isActive,
  onClose,
  onRegister,
  registering,
}: {
  card: {
    name: string;
    emoji: string;
    color: string;
    address: string;
    dailyLimit: string;
    remaining: string;
  };
  isActive: boolean;
  onClose: () => void;
  onRegister: (eoa: string, dailyLimit: string) => void;
  registering: boolean;
}) {
  const [limit, setLimit] = useState(1000);
  const daily = parseFloat(fmtWei(card.dailyLimit)) || 0;
  const rem = parseFloat(fmtWei(card.remaining)) || 0;
  const spent = Math.max(0, daily - rem);
  const pct = daily > 0 ? (spent / daily) * 100 : 0;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(10px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      <div
        style={{
          background: C.card,
          borderRadius: "24px 24px 0 0",
          padding: "28px 24px 40px",
          borderTop: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div>
              <span
                style={{ color: C.textPrimary, fontSize: 20, fontWeight: 600 }}
              >
                {card.name}
              </span>
              {isActive && (
                <div
                  style={{
                    color: C.green,
                    fontSize: 11,
                    fontWeight: 600,
                    marginTop: 2,
                  }}
                >
                  ACTIVE CARD
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(0,0,0,0.06)",
              border: "none",
              color: C.textSecondary,
              width: 32,
              height: 32,
              borderRadius: 16,
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            background: C.bg,
            borderRadius: 14,
            padding: 16,
            marginBottom: 16,
            border: `1px solid ${C.border}`,
          }}
        >
          <div
            style={{
              color: C.textTertiary,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 4,
            }}
          >
            EOA Address
          </div>
          <div
            style={{
              color: C.textPrimary,
              fontSize: 13,
              fontFamily: "monospace",
              wordBreak: "break-all",
            }}
          >
            {card.address}
          </div>
        </div>

        {daily > 0 && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <span style={{ color: C.textSecondary, fontSize: 13 }}>
                Spent today
              </span>
              <span
                style={{ color: C.textPrimary, fontSize: 13, fontWeight: 600 }}
              >
                {spent.toFixed(4)} / {daily.toFixed(4)} MON
              </span>
            </div>
            <div
              style={{
                background: C.bg,
                borderRadius: 6,
                height: 8,
                marginBottom: 20,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  borderRadius: 6,
                  width: `${Math.min(pct, 100)}%`,
                  background: pct > 80 ? C.red : card.color,
                  transition: "width 0.6s ease",
                }}
              />
            </div>
          </>
        )}

        <label
          style={{
            color: C.textSecondary,
            fontSize: 12,
            letterSpacing: 1,
            textTransform: "uppercase",
            marginBottom: 8,
            display: "block",
          }}
        >
          Register daily spending limit
        </label>
        <div
          style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}
        >
          {[500, 1000, 1500, 2000, 3000, 5000].map((v) => (
            <button
              key={v}
              onClick={() => setLimit(v)}
              style={{
                flex: "1 1 auto",
                padding: "10px 0",
                background: limit === v ? card.color : C.bg,
                border: `1px solid ${limit === v ? card.color : C.border}`,
                borderRadius: 10,
                color: limit === v ? "#fff" : C.textSecondary,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {v >= 1000 ? `${v / 1000}k` : v}
            </button>
          ))}
        </div>
        <div
          style={{
            color: C.textTertiary,
            fontSize: 11,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Icon.Lock /> Enforced on-chain via SpendInteractor
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => onRegister(card.address, parseWei(limit.toString()))}
            disabled={registering}
            style={{
              flex: 1,
              padding: "14px",
              background: card.color,
              border: "none",
              borderRadius: 14,
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              opacity: registering ? 0.5 : 1,
            }}
          >
            {registering ? "Registering…" : "Save & Register"}
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "14px",
              background: C.redSoft,
              border: `1px solid rgba(229,51,74,0.2)`,
              borderRadius: 14,
              color: C.red,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ===================== MAIN APP =====================
export default function S4bMobileApp() {
  // ── Privy
  const {
    ready: privyReady,
    authenticated,
    login,
    logout,
    getAccessToken,
  } = usePrivy();
  const { showMfaEnrollmentModal } = useMfaEnrollment();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  // Prefer external wallet; fall back to embedded wallet
  const embeddedWallet = getEmbeddedConnectedWallet(wallets);
  const userAddress: string | null =
    (wallets.find((w) => w.walletClientType !== "privy") ?? embeddedWallet)
      ?.address ?? null;

  // Auto-create embedded wallet for email/social logins that don't have one yet
  const [creatingWallet, setCreatingWallet] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  useEffect(() => {
    if (authenticated && wallets.length === 0 && !creatingWallet) {
      setCreatingWallet(true);
      createWallet()
        .catch((e: unknown) =>
          setWalletError(e instanceof Error ? e.message : String(e)),
        )
        .finally(() => setCreatingWallet(false));
    }
  }, [authenticated, wallets.length]);

  // ── TanStack Query
  const qc = useQueryClient();

  const { data: registrationData } = useQuery({
    queryKey: ["registration", userAddress],
    queryFn: async () => {
      const token = await getAccessToken();
      const res = await fetch(`${API_URL}/users/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ address: userAddress }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(b?.error ?? res.statusText);
      }
      return res.json() as Promise<{ safeAddress: string; created: boolean }>;
    },
    enabled: authenticated && !!userAddress,
    staleTime: Infinity,
    retry: 3,
  });

  const {
    data: balancesData,
    isLoading: balancesLoading,
  } = useQuery({
    queryKey: ["balances"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/balances`);
      if (!res.ok) {
        const b = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(b?.error ?? res.statusText);
      }
      return res.json() as Promise<Record<string, string>>;
    },
    enabled: authenticated,
    refetchInterval: 30_000,
  });

  const {
    data: eoasData,
    isLoading: eoasLoading,
  } = useQuery({
    queryKey: ["eoas", userAddress],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/users/${userAddress}/eoas`);
      if (!res.ok) {
        const b = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(b?.error ?? res.statusText);
      }
      return res.json() as Promise<{
        eoas: string[];
        spendInteractorAddress: string;
      }>;
    },
    enabled: authenticated && !!userAddress,
  });

  const spendInteractorAddress = eoasData?.spendInteractorAddress ?? null;

  const {
    data: eventsData,
    isLoading: eventsLoading,
  } = useQuery({
    queryKey: ["events", spendInteractorAddress],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}/events?contract=${spendInteractorAddress}&limit=50`,
      );
      if (!res.ok) {
        const b = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(b?.error ?? res.statusText);
      }
      return res.json() as Promise<any[]>;
    },
    enabled: !!spendInteractorAddress,
  });

  const registerEoaMutation = useMutation({
    mutationFn: async ({
      eoa,
      dailyLimit,
    }: {
      eoa: string;
      dailyLimit: string;
    }) => {
      const token = await getAccessToken();
      const res = await fetch(`${API_URL}/users/${userAddress}/eoas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ eoa, dailyLimit, allowedTypes: [0, 1] }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body?.error ?? res.statusText);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["eoas", userAddress] });
      setSelectedCardIdx(null);
      setShowAddCard(false);
    },
  });

  // ── Derived
  const safeAddress = registrationData?.safeAddress ?? null;
  const balances = balancesData ?? {};
  const eoas = eoasData?.eoas ?? [];
  const events = eventsData ?? [];
  const dataLoading = balancesLoading || eoasLoading || eventsLoading;
  const dataError = registerEoaMutation.error
    ? String(registerEoaMutation.error)
    : "";

  // ── UI state
  const [tab, setTab] = useState("home");
  const [showTransfer, setShowTransfer] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);
  const [balanceVisible, setBalanceVisible] = useState(true);

  // ── Gate: Privy not ready
  if (!privyReady) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "'SF Pro Display', 'Helvetica Neue', -apple-system, sans-serif",
        }}
      >
        <div style={{ color: C.textSecondary, fontSize: 14 }}>
          Initializing…
        </div>
      </div>
    );
  }

  // ── Gate: not authenticated
  if (!authenticated) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          fontFamily:
            "'SF Pro Display', 'Helvetica Neue', -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            color: C.textPrimary,
            fontSize: 36,
            fontWeight: 800,
            marginBottom: 4,
            letterSpacing: -1,
          }}
        >
          S4b
        </div>
        <div style={{ color: C.textSecondary, fontSize: 15, marginBottom: 48 }}>
          Crypto Banking
        </div>
        <div style={{ width: "100%", maxWidth: 340 }}>
          <button
            onClick={login}
            style={{
              width: "100%",
              padding: "18px",
              background: C.accent,
              border: "none",
              borderRadius: 18,
              color: "#fff",
              fontSize: 17,
              fontWeight: 700,
              cursor: "pointer",
              marginBottom: 12,
            }}
          >
            Connect Wallet
          </button>
          <div
            style={{
              color: C.textTertiary,
              fontSize: 12,
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            Connect your wallet to access your S4b account.
            <br />
            Your keys, your funds. Powered by Privy.
          </div>
        </div>
      </div>
    );
  }

  // ── Gate: authenticated but wallets not yet resolved
  if (!userAddress) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          fontFamily:
            "'SF Pro Display', 'Helvetica Neue', -apple-system, sans-serif",
          padding: 24,
        }}
      >
        <div style={{ color: C.textSecondary, fontSize: 14 }}>
          {creatingWallet ? "Creating wallet…" : "Setting up wallet…"}
        </div>
        {walletError && (
          <>
            <div
              style={{
                color: C.red,
                fontSize: 13,
                textAlign: "center",
                maxWidth: 280,
              }}
            >
              {walletError}
            </div>
            <button
              onClick={() => {
                setWalletError(null);
                setCreatingWallet(true);
                createWallet()
                  .catch((e: unknown) =>
                    setWalletError(e instanceof Error ? e.message : String(e)),
                  )
                  .finally(() => setCreatingWallet(false));
              }}
              style={{
                padding: "12px 28px",
                background: C.accent,
                border: "none",
                borderRadius: 14,
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </>
        )}
        <button
          onClick={logout}
          style={{
            background: "none",
            border: "none",
            color: C.textTertiary,
            fontSize: 12,
            cursor: "pointer",
            marginTop: 8,
          }}
        >
          Sign out
        </button>
      </div>
    );
  }

  // ── Derived data
  const nativeBalance = fmtWei(balances[NATIVE_TOKEN]);

  // Cards: user address first, then EOAs
  const allCardAddresses = [
    userAddress,
    ...eoas.filter((e) => e.toLowerCase() !== userAddress.toLowerCase()),
  ];
  const cards = allCardAddresses.map((addr, i) => {
    const meta = CARD_META[i % CARD_META.length];
    const limits = { dailyLimit: "0", remaining: "0" };
    return {
      id: i,
      name: i === 0 ? "Main Account" : meta.name,
      emoji: i === 0 ? "🏦" : meta.emoji,
      color: i === 0 ? C.accent : meta.color,
      address: addr,
      isMain: i === 0,
      dailyLimit: limits.dailyLimit,
      remaining: limits.remaining,
    };
  });

  // Events as transaction rows
  const txRows = events.map((ev: any) => ({
    name: "SpendAuthorized",
    amount: ev.amount ? parseFloat(fmtWei(ev.amount)) : 0,
    date: ev.blockNumber ? `Block ${ev.blockNumber}` : "",
    icon: "",
    recipient: ev.recipient ? shortenAddr(ev.recipient, 6) : "",
    nonce: ev.nonce ?? "",
    txHash: ev.transactionHash ?? ev.txHash ?? "",
  }));

  // Monthly stats
  const monthlySpent = txRows.reduce((s, t) => s + t.amount, 0);
  const monthName = new Date().toLocaleString("en", { month: "long" });

  const selectedCard =
    selectedCardIdx !== null ? (cards[selectedCardIdx] ?? null) : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        fontFamily:
          "'SF Pro Display', 'Helvetica Neue', -apple-system, sans-serif",
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: "fixed",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${C.accentSoft} 0%, transparent 70%)`,
          filter: "blur(80px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Phone frame */}
        <div style={phoneFrame}>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
              width: 160,
              height: 34,
              background: C.bg,
              borderRadius: "0 0 20px 20px",
              zIndex: 50,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 10,
              left: "50%",
              transform: "translateX(-50%)",
              width: 126,
              height: 36,
              background: "#000",
              borderRadius: 22,
              zIndex: 51,
            }}
          />

          {/* Scrollable content */}
          <div
            style={{
              height: 844,
              overflowY: "auto",
              paddingBottom: 90,
              scrollbarWidth: "none",
            }}
          >
            {/* ===== HOME TAB ===== */}
            {tab === "home" && (
              <div style={{ padding: "68px 20px 20px" }}>
                {/* Greeting */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 28,
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: C.textSecondary,
                        fontSize: 14,
                        marginBottom: 2,
                      }}
                    >
                      Good day,
                    </div>
                    <div
                      style={{
                        color: C.textPrimary,
                        fontSize: 22,
                        fontWeight: 700,
                      }}
                    >
                      {shortenAddr(userAddress, 4)}
                    </div>
                  </div>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      background: C.accentSoft,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: `1.5px solid ${C.accent}`,
                      fontSize: 18,
                      color: C.accent,
                      fontWeight: 700,
                    }}
                  >
                    {userAddress[2]?.toUpperCase()}
                  </div>
                </div>

                {/* Error banner */}
                {dataError && (
                  <div
                    style={{
                      background: C.redSoft,
                      border: `1px solid rgba(229,51,74,0.2)`,
                      borderRadius: 12,
                      padding: "10px 14px",
                      marginBottom: 16,
                      color: C.red,
                      fontSize: 13,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    {dataError}
                    <button
                      onClick={() => registerEoaMutation.reset()}
                      style={{
                        background: "none",
                        border: "none",
                        color: C.red,
                        cursor: "pointer",
                        marginLeft: 8,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Balance card */}
                <div
                  style={{
                    background: `linear-gradient(135deg, ${C.card} 0%, rgba(108,92,231,0.08) 100%)`,
                    borderRadius: 22,
                    padding: "24px",
                    marginBottom: 8,
                    border: `1px solid ${C.border}`,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: -40,
                      right: -40,
                      width: 140,
                      height: 140,
                      borderRadius: 70,
                      background: "rgba(108,92,231,0.06)",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        color: C.textSecondary,
                        fontSize: 13,
                        letterSpacing: 0.5,
                      }}
                    >
                      Total Balance
                    </span>
                    <button
                      onClick={() => setBalanceVisible(!balanceVisible)}
                      style={{
                        background: "none",
                        border: "none",
                        color: C.textSecondary,
                        cursor: "pointer",
                        padding: 4,
                      }}
                    >
                      {balanceVisible ? <Icon.Eye /> : <Icon.EyeOff />}
                    </button>
                  </div>
                  <div
                    style={{
                      color: C.textPrimary,
                      fontSize: 38,
                      fontWeight: 800,
                      letterSpacing: -1,
                      marginBottom: 4,
                    }}
                  >
                    {balanceVisible
                      ? dataLoading
                        ? "···"
                        : `${nativeBalance} MON`
                      : "•••••"}
                  </div>
                  {safeAddress && (
                    <div
                      style={{
                        color: C.textTertiary,
                        fontSize: 11,
                        marginBottom: 6,
                      }}
                    >
                      Safe: {shortenAddr(safeAddress, 6)}
                    </div>
                  )}
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: C.greenSoft,
                      borderRadius: 20,
                      padding: "5px 12px",
                    }}
                  >
                    <Icon.TrendUp />
                    <span
                      style={{ color: C.green, fontSize: 13, fontWeight: 600 }}
                    >
                      S4b Pool
                    </span>
                    <span style={{ color: C.textTertiary, fontSize: 12 }}>
                      native yield
                    </span>
                  </div>
                </div>

                {/* Quick actions */}
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    marginBottom: 24,
                    marginTop: 16,
                  }}
                >
                  {[
                    {
                      label: "Deposit",
                      icon: <Icon.Download />,
                      color: C.green,
                      action: () => setShowDeposit(true),
                    },
                    {
                      label: "Send",
                      icon: <Icon.Send />,
                      color: C.accent,
                      action: () => setShowTransfer(true),
                    },
                  ].map((a, i) => (
                    <button
                      key={i}
                      onClick={a.action}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 8,
                        background: C.card,
                        border: `1px solid ${C.border}`,
                        borderRadius: 16,
                        padding: "16px 8px",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 14,
                          background: `${a.color}15`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: a.color,
                        }}
                      >
                        {a.icon}
                      </div>
                      <span
                        style={{
                          color: C.textSecondary,
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                      >
                        {a.label}
                      </span>
                    </button>
                  ))}
                </div>

                {/* My Cards */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 14,
                  }}
                >
                  <span
                    style={{
                      color: C.textPrimary,
                      fontSize: 16,
                      fontWeight: 600,
                    }}
                  >
                    My Cards
                  </span>
                  <span
                    style={{
                      color: C.accent,
                      fontSize: 13,
                      cursor: "pointer",
                      fontWeight: 500,
                    }}
                    onClick={() => setTab("cards")}
                  >
                    Manage
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    overflowX: "auto",
                    paddingBottom: 4,
                    marginBottom: 24,
                    scrollbarWidth: "none",
                  }}
                >
                  {cards.map((card) => {
                    const daily = parseFloat(fmtWei(card.dailyLimit)) || 0;
                    const rem = parseFloat(fmtWei(card.remaining)) || 0;
                    const spent = Math.max(0, daily - rem);
                    const pct = daily > 0 ? (spent / daily) * 100 : 0;
                    return (
                      <div
                        key={card.id}
                        onClick={() => setSelectedCardIdx(card.id)}
                        style={{
                          minWidth: 165,
                          background: C.card,
                          borderRadius: 18,
                          padding: "16px",
                          border: `1px solid ${card.isMain ? card.color : C.border}`,
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 12,
                          }}
                        >
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 4,
                              background: card.color,
                            }}
                          />
                        </div>
                        <div
                          style={{
                            color: C.textPrimary,
                            fontSize: 17,
                            fontWeight: 700,
                            marginBottom: 2,
                          }}
                        >
                          {card.isMain ? `${nativeBalance}` : "—"}
                        </div>
                        <div
                          style={{
                            color: C.textSecondary,
                            fontSize: 11,
                            marginBottom: 10,
                          }}
                        >
                          {card.name}
                        </div>
                        <div
                          style={{
                            background: C.bg,
                            borderRadius: 3,
                            height: 4,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              borderRadius: 3,
                              width: `${Math.min(pct, 100)}%`,
                              background: pct > 80 ? C.red : card.color,
                            }}
                          />
                        </div>
                        <div
                          style={{
                            color: C.textTertiary,
                            fontSize: 10,
                            marginTop: 4,
                          }}
                        >
                          {shortenAddr(card.address, 4)}
                        </div>
                      </div>
                    );
                  })}
                  <div
                    onClick={() => {
                      /* add card flow */
                    }}
                    style={{
                      minWidth: 80,
                      background: C.card,
                      borderRadius: 18,
                      padding: "16px",
                      border: `1px dashed ${C.border}`,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      flexShrink: 0,
                      gap: 6,
                    }}
                  >
                    <div style={{ color: C.textTertiary }}>
                      <Icon.Plus />
                    </div>
                    <span style={{ color: C.textTertiary, fontSize: 10 }}>
                      New Card
                    </span>
                  </div>
                </div>

                {/* DeFi Section */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 14,
                  }}
                >
                  <span
                    style={{
                      color: C.textPrimary,
                      fontSize: 16,
                      fontWeight: 600,
                    }}
                  >
                    DeFi
                  </span>
                </div>
                <div
                  style={{
                    background: C.card,
                    borderRadius: 18,
                    padding: "20px",
                    border: `1px solid ${C.border}`,
                    marginBottom: 24,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 14,
                      right: 14,
                      background: C.yellowSoft,
                      borderRadius: 8,
                      padding: "4px 10px",
                      color: C.yellow,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                      textTransform: "uppercase",
                    }}
                  >
                    Coming Soon
                  </div>
                  <div
                    style={{
                      color: C.textSecondary,
                      fontSize: 13,
                      marginBottom: 16,
                      maxWidth: "70%",
                    }}
                  >
                    Interact directly with DeFi protocols from your S4b account
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    {[
                      {
                        src: AAVE_LOGO,
                        alt: "Aave",
                        label: "Aave",
                        sub: "Lend & Borrow",
                      },
                      {
                        src: UNI_LOGO,
                        alt: "Uniswap",
                        label: "Uniswap",
                        sub: "Swap & LP",
                      },
                    ].map((p) => (
                      <div
                        key={p.alt}
                        style={{
                          flex: 1,
                          background: C.bg,
                          borderRadius: 14,
                          padding: "16px",
                          border: `1px solid ${C.border}`,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 8,
                          opacity: 0.6,
                        }}
                      >
                        <img
                          src={p.src}
                          alt={p.alt}
                          style={{ width: 36, height: 36 }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                        <span
                          style={{
                            color: C.textPrimary,
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          {p.label}
                        </span>
                        <span style={{ color: C.textTertiary, fontSize: 11 }}>
                          {p.sub}
                        </span>
                      </div>
                    ))}
                    <div
                      style={{
                        flex: 1,
                        background: C.bg,
                        borderRadius: 14,
                        padding: "16px",
                        border: `1px dashed ${C.border}`,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                        opacity: 0.4,
                      }}
                    >
                      <span style={{ color: C.textTertiary, fontSize: 22 }}>
                        +
                      </span>
                      <span style={{ color: C.textTertiary, fontSize: 10 }}>
                        More
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 14,
                  }}
                >
                  <span
                    style={{
                      color: C.textPrimary,
                      fontSize: 16,
                      fontWeight: 600,
                    }}
                  >
                    Recent Activity
                  </span>
                  <span
                    style={{
                      color: C.accent,
                      fontSize: 13,
                      cursor: "pointer",
                      fontWeight: 500,
                    }}
                    onClick={() => setTab("history")}
                  >
                    See all
                  </span>
                </div>

                {dataLoading ? (
                  <div
                    style={{
                      color: C.textTertiary,
                      fontSize: 14,
                      textAlign: "center",
                      padding: "20px 0",
                    }}
                  >
                    Loading…
                  </div>
                ) : txRows.length === 0 ? (
                  <div
                    style={{
                      color: C.textTertiary,
                      fontSize: 14,
                      textAlign: "center",
                      padding: "20px 0",
                    }}
                  >
                    No transactions yet.
                  </div>
                ) : (
                  <div
                    style={{
                      background: C.card,
                      borderRadius: 18,
                      overflow: "hidden",
                      border: `1px solid ${C.border}`,
                      marginBottom: 24,
                    }}
                  >
                    {txRows.slice(0, 5).map((tx, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "14px 16px",
                          borderBottom:
                            i < Math.min(txRows.length, 5) - 1
                              ? `1px solid ${C.border}`
                              : "none",
                        }}
                      >
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 12,
                            background: C.bg,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 18,
                            marginRight: 12,
                            flexShrink: 0,
                          }}
                        >
                          {tx.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              color: C.textPrimary,
                              fontSize: 14,
                              fontWeight: 500,
                            }}
                          >
                            {tx.name}
                          </div>
                          <div
                            style={{
                              color: C.textTertiary,
                              fontSize: 11,
                              marginTop: 1,
                            }}
                          >
                            {tx.date}
                            {tx.recipient ? ` → ${tx.recipient}` : ""}
                          </div>
                        </div>
                        <div
                          style={{
                            color: C.textPrimary,
                            fontSize: 14,
                            fontWeight: 600,
                          }}
                        >
                          {tx.amount.toFixed(4)} MON
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Monthly Summary */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 14,
                  }}
                >
                  <span
                    style={{
                      color: C.textPrimary,
                      fontSize: 16,
                      fontWeight: 600,
                    }}
                  >
                    {monthName} Summary
                  </span>
                </div>
                <div
                  style={{
                    background: C.card,
                    borderRadius: 18,
                    padding: "20px",
                    border: `1px solid ${C.border}`,
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <span style={{ color: C.textSecondary, fontSize: 13 }}>
                        Authorized spends
                      </span>
                    </div>
                    <span
                      style={{ color: C.red, fontSize: 15, fontWeight: 700 }}
                    >
                      -{monthlySpent.toFixed(4)} MON
                    </span>
                  </div>
                  <div
                    style={{
                      background: C.bg,
                      borderRadius: 4,
                      height: 6,
                      overflow: "hidden",
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 4,
                        width: `${Math.min((monthlySpent / Math.max(parseFloat(nativeBalance) || 1, 0.001)) * 100, 100)}%`,
                        background: C.red,
                        transition: "width 0.8s ease",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      paddingTop: 12,
                      borderTop: `1px solid ${C.border}`,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ color: C.textSecondary, fontSize: 13 }}>
                      Events this month
                    </span>
                    <span
                      style={{ color: C.accent, fontSize: 16, fontWeight: 700 }}
                    >
                      {txRows.length}
                    </span>
                  </div>
                  <div
                    style={{
                      marginTop: 12,
                      background: C.greenSoft,
                      borderRadius: 12,
                      padding: "12px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div style={{ color: C.green, fontSize: 12 }}>
                      Your balance is held in the shared S4b spending pool —
                      earning native yield on every MON.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ===== CARDS TAB ===== */}
            {tab === "cards" && (
              <div style={{ padding: "68px 20px 20px" }}>
                <div
                  style={{
                    color: C.textPrimary,
                    fontSize: 22,
                    fontWeight: 700,
                    marginBottom: 20,
                  }}
                >
                  My Cards
                </div>
                {cards.map((card) => {
                  const daily = parseFloat(fmtWei(card.dailyLimit)) || 0;
                  const rem = parseFloat(fmtWei(card.remaining)) || 0;
                  const spent = Math.max(0, daily - rem);
                  const pct = daily > 0 ? (spent / daily) * 100 : 0;
                  return (
                    <div
                      key={card.id}
                      onClick={() => setSelectedCardIdx(card.id)}
                      style={{
                        background: C.card,
                        borderRadius: 20,
                        padding: "20px",
                        border: `1px solid ${card.isMain ? card.color : C.border}`,
                        marginBottom: 14,
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 16,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <div>
                            <div
                              style={{
                                color: C.textPrimary,
                                fontSize: 15,
                                fontWeight: 600,
                              }}
                            >
                              {card.name}
                            </div>
                            <div
                              style={{ color: C.textTertiary, fontSize: 11 }}
                            >
                              {shortenAddr(card.address, 6)}
                            </div>
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          {card.isMain && (
                            <div
                              style={{
                                background: C.greenSoft,
                                color: C.green,
                                fontSize: 10,
                                fontWeight: 600,
                                padding: "2px 8px",
                                borderRadius: 6,
                              }}
                            >
                              MAIN
                            </div>
                          )}
                          <div style={{ color: C.textSecondary }}>
                            <Icon.ArrowRight />
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          color: C.textPrimary,
                          fontSize: 24,
                          fontWeight: 700,
                          marginBottom: 12,
                        }}
                      >
                        {card.isMain ? `${nativeBalance} MON` : "—"}
                      </div>
                      {daily > 0 && (
                        <>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 6,
                            }}
                          >
                            <span
                              style={{ color: C.textTertiary, fontSize: 11 }}
                            >
                              Spent: {spent.toFixed(4)}
                            </span>
                            <span
                              style={{ color: C.textTertiary, fontSize: 11 }}
                            >
                              Daily limit: {daily.toFixed(4)} MON
                            </span>
                          </div>
                          <div
                            style={{
                              background: C.bg,
                              borderRadius: 4,
                              height: 6,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                borderRadius: 4,
                                width: `${Math.min(pct, 100)}%`,
                                background: pct > 80 ? C.red : card.color,
                              }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
                <button
                  onClick={() => {
                    registerEoaMutation.reset();
                    setShowAddCard(true);
                  }}
                  disabled={!safeAddress}
                  title={
                    !safeAddress ? "Account setup in progress…" : undefined
                  }
                  style={{
                    width: "100%",
                    padding: 16,
                    background: C.card,
                    border: `1px dashed ${C.border}`,
                    borderRadius: 18,
                    color: safeAddress ? C.textSecondary : C.textTertiary,
                    fontSize: 14,
                    cursor: safeAddress ? "pointer" : "not-allowed",
                    opacity: safeAddress ? 1 : 0.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <Icon.Plus />{" "}
                  {safeAddress ? "Add New Card" : "Setting up account…"}
                </button>
              </div>
            )}

            {/* ===== HISTORY TAB ===== */}
            {tab === "history" && (
              <div style={{ padding: "68px 20px 20px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      color: C.textPrimary,
                      fontSize: 22,
                      fontWeight: 700,
                    }}
                  >
                    History
                  </div>
                </div>

                {dataLoading && (
                  <div
                    style={{
                      color: C.textTertiary,
                      textAlign: "center",
                      padding: "20px 0",
                      fontSize: 14,
                    }}
                  >
                    Loading…
                  </div>
                )}

                {!dataLoading && txRows.length === 0 && (
                  <div
                    style={{
                      color: C.textTertiary,
                      textAlign: "center",
                      padding: "40px 0",
                      fontSize: 14,
                    }}
                  >
                    No SpendAuthorized events yet.
                    {!spendInteractorAddress && (
                      <div style={{ marginTop: 8, fontSize: 12 }}>
                        Register an EOA to start tracking on-chain
                        authorizations.
                      </div>
                    )}
                  </div>
                )}

                {txRows.length > 0 && (
                  <div
                    style={{
                      background: C.card,
                      borderRadius: 18,
                      overflow: "hidden",
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    {txRows.map((tx, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "14px 16px",
                          borderBottom:
                            i < txRows.length - 1
                              ? `1px solid ${C.border}`
                              : "none",
                        }}
                      >
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 12,
                            background: C.bg,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 18,
                            marginRight: 12,
                            flexShrink: 0,
                          }}
                        >
                          {tx.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              color: C.textPrimary,
                              fontSize: 14,
                              fontWeight: 500,
                            }}
                          >
                            {tx.name}
                          </div>
                          <div
                            style={{
                              color: C.textTertiary,
                              fontSize: 11,
                              marginTop: 2,
                            }}
                          >
                            {tx.date}
                            {tx.recipient && ` → ${tx.recipient}`}
                            {tx.txHash && ` · ${shortenAddr(tx.txHash, 6)}`}
                          </div>
                        </div>
                        <div
                          style={{
                            color: C.textPrimary,
                            fontSize: 14,
                            fontWeight: 600,
                          }}
                        >
                          {tx.amount.toFixed(4)} MON
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ===== DEFI TAB ===== */}
            {tab === "defi" && (
              <div style={{ padding: "68px 20px 20px" }}>
                <div
                  style={{
                    color: C.textPrimary,
                    fontSize: 22,
                    fontWeight: 700,
                    marginBottom: 6,
                  }}
                >
                  DeFi
                </div>
                <div
                  style={{
                    color: C.textSecondary,
                    fontSize: 13,
                    marginBottom: 24,
                  }}
                >
                  Access DeFi protocols directly from your S4b account
                </div>

                {[
                  {
                    src: AAVE_LOGO,
                    alt: "Aave",
                    label: "Aave",
                    sub: "Lending & Borrowing Protocol",
                    desc: "Supply assets to earn additional yield or borrow against your deposits.",
                    stats: [
                      { label: "Supply APY", value: "~4.2%", color: C.green },
                      { label: "Borrow APY", value: "~5.8%", color: C.yellow },
                    ],
                  },
                  {
                    src: UNI_LOGO,
                    alt: "Uniswap",
                    label: "Uniswap",
                    sub: "Decentralized Exchange",
                    desc: "Swap tokens and provide liquidity to earn trading fees.",
                    stats: [
                      { label: "Pools", value: "500+", color: C.accent },
                      {
                        label: "LP APY range",
                        value: "2-15%",
                        color: C.accent,
                      },
                    ],
                  },
                ].map((p) => (
                  <div
                    key={p.alt}
                    style={{
                      background: C.card,
                      borderRadius: 20,
                      padding: "20px",
                      marginBottom: 14,
                      border: `1px solid ${C.border}`,
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: 14,
                        right: 14,
                        background: C.yellowSoft,
                        borderRadius: 8,
                        padding: "4px 10px",
                        color: C.yellow,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: 0.5,
                        textTransform: "uppercase",
                      }}
                    >
                      Coming Soon
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        marginBottom: 14,
                      }}
                    >
                      <img
                        src={p.src}
                        alt={p.alt}
                        style={{ width: 44, height: 44 }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <div>
                        <div
                          style={{
                            color: C.textPrimary,
                            fontSize: 17,
                            fontWeight: 600,
                          }}
                        >
                          {p.label}
                        </div>
                        <div style={{ color: C.textTertiary, fontSize: 12 }}>
                          {p.sub}
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        color: C.textSecondary,
                        fontSize: 13,
                        lineHeight: 1.5,
                        marginBottom: 14,
                      }}
                    >
                      {p.desc}
                    </div>
                    <div style={{ display: "flex", gap: 20 }}>
                      {p.stats.map((s) => (
                        <div key={s.label}>
                          <div style={{ color: C.textTertiary, fontSize: 11 }}>
                            {s.label}
                          </div>
                          <div
                            style={{
                              color: s.color,
                              fontSize: 16,
                              fontWeight: 700,
                            }}
                          >
                            {s.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div
                  style={{
                    background: C.card,
                    borderRadius: 20,
                    padding: "20px",
                    border: `1px dashed ${C.border}`,
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      color: C.textTertiary,
                      fontSize: 13,
                      marginBottom: 8,
                    }}
                  >
                    Want another protocol?
                  </div>
                  <button
                    style={{
                      background: C.accentSoft,
                      border: `1px solid rgba(108,92,231,0.2)`,
                      borderRadius: 12,
                      padding: "10px 20px",
                      color: C.accent,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Request Integration
                  </button>
                </div>
              </div>
            )}

            {/* ===== SETTINGS TAB ===== */}
            {tab === "settings" && (
              <div style={{ padding: "68px 20px 20px" }}>
                <div
                  style={{
                    color: C.textPrimary,
                    fontSize: 22,
                    fontWeight: 700,
                    marginBottom: 24,
                  }}
                >
                  Settings
                </div>

                {/* Connected wallet info */}
                <div
                  style={{
                    background: C.card,
                    borderRadius: 16,
                    padding: "16px",
                    marginBottom: 16,
                    border: `1px solid ${C.border}`,
                  }}
                >
                  <div
                    style={{
                      color: C.textTertiary,
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      marginBottom: 8,
                    }}
                  >
                    Connected Wallet
                  </div>
                  <div
                    style={{
                      color: C.textPrimary,
                      fontSize: 13,
                      fontFamily: "monospace",
                      marginBottom: 10,
                      wordBreak: "break-all",
                    }}
                  >
                    {userAddress}
                  </div>
                  {safeAddress && (
                    <div
                      style={{
                        color: C.textTertiary,
                        fontSize: 12,
                        fontFamily: "monospace",
                        marginBottom: 10,
                      }}
                    >
                      Safe: {safeAddress}
                    </div>
                  )}
                  <button
                    onClick={logout}
                    style={{
                      padding: "8px 16px",
                      background: C.redSoft,
                      border: `1px solid rgba(229,51,74,0.2)`,
                      borderRadius: 10,
                      color: C.red,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Disconnect
                  </button>
                </div>

                {/* SpendInteractor info */}
                {spendInteractorAddress && (
                  <div
                    style={{
                      background: C.card,
                      borderRadius: 16,
                      padding: "16px",
                      marginBottom: 16,
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    <div
                      style={{
                        color: C.textTertiary,
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        marginBottom: 8,
                      }}
                    >
                      SpendInteractor
                    </div>
                    <div
                      style={{
                        color: C.textPrimary,
                        fontSize: 12,
                        fontFamily: "monospace",
                        wordBreak: "break-all",
                      }}
                    >
                      {spendInteractorAddress}
                    </div>
                    <div
                      style={{
                        color: C.textTertiary,
                        fontSize: 12,
                        marginTop: 6,
                      }}
                    >
                      {eoas.length} registered EOA(s)
                    </div>
                  </div>
                )}

                {/* Account Security — MFA enrollment */}
                <div
                  onClick={showMfaEnrollmentModal}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "16px",
                    background: C.card,
                    borderRadius: 16,
                    marginBottom: 8,
                    border: `1px solid ${C.border}`,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        color: C.textPrimary,
                        fontSize: 14,
                        fontWeight: 500,
                      }}
                    >
                      Account Security
                    </div>
                    <div
                      style={{
                        color: C.textTertiary,
                        fontSize: 11,
                        marginTop: 1,
                      }}
                    >
                      Enroll or manage MFA
                    </div>
                  </div>
                  <div style={{ color: C.textTertiary }}>
                    <Icon.ArrowRight />
                  </div>
                </div>

                {[
                  {
                    label: "Notifications",
                    sub: "Push, Email, SMS",
                  },
                  {
                    label: "Payment Methods",
                    sub: "SEPA, Wire Transfer",
                  },
                  {
                    label: "Documents & Statements",
                    sub: "Monthly reports, Tax docs",
                  },
                  {
                    label: "Help & Support",
                    sub: "FAQ, Live chat",
                  },
                  {
                    label: "Legal",
                    sub: "Terms, Privacy, Licenses",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "16px",
                      background: C.card,
                      borderRadius: 16,
                      marginBottom: 8,
                      border: `1px solid ${C.border}`,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          color: C.textPrimary,
                          fontSize: 14,
                          fontWeight: 500,
                        }}
                      >
                        {item.label}
                      </div>
                      <div
                        style={{
                          color: C.textTertiary,
                          fontSize: 11,
                          marginTop: 1,
                        }}
                      >
                        {item.sub}
                      </div>
                    </div>
                    <div style={{ color: C.textTertiary }}>
                      <Icon.ArrowRight />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom tab bar */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background: C.card,
              borderTop: `1px solid ${C.border}`,
              display: "flex",
              justifyContent: "space-around",
              padding: "10px 8px 28px",
            }}
          >
            {[
              { id: "home", label: "Home", icon: <Icon.Home /> },
              { id: "cards", label: "Cards", icon: <Icon.Cards /> },
              { id: "transfer", label: "Send", icon: <Icon.Transfer /> },
              { id: "history", label: "History", icon: <Icon.TrendUp /> },
              { id: "defi", label: "DeFi", icon: <Icon.DeFi /> },
              { id: "settings", label: "Settings", icon: <Icon.Settings /> },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  if (t.id === "transfer") setShowTransfer(true);
                  else setTab(t.id);
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  color: tab === t.id ? C.accent : C.textTertiary,
                  transition: "color 0.2s",
                  padding: "2px 6px",
                }}
              >
                {t.icon}
                <span
                  style={{ fontSize: 9, fontWeight: tab === t.id ? 600 : 400 }}
                >
                  {t.label}
                </span>
              </button>
            ))}
          </div>

          {/* Modals */}
          {showTransfer && (
            <TransferModal
              onClose={() => setShowTransfer(false)}
              nativeBalance={nativeBalance}
              spendInteractorAddress={spendInteractorAddress}
              userAddress={userAddress}
            />
          )}
          {showDeposit && (
            <DepositModal
              onClose={() => setShowDeposit(false)}
              depositorAddress={userAddress}
            />
          )}
          {selectedCard && (
            <CardModal
              card={selectedCard}
              isActive={selectedCard.isMain}
              onClose={() => setSelectedCardIdx(null)}
              onRegister={(eoa, dailyLimit) =>
                registerEoaMutation.mutate({ eoa, dailyLimit })
              }
              registering={registerEoaMutation.isPending}
            />
          )}
          {showAddCard && (
            <AddCardModal
              onClose={() => {
                setShowAddCard(false);
                registerEoaMutation.reset();
              }}
              onAdd={(eoa, dailyLimit) =>
                registerEoaMutation.mutate({ eoa, dailyLimit })
              }
              registering={registerEoaMutation.isPending}
              error={dataError}
            />
          )}
        </div>

        <div
          style={{
            textAlign: "center",
            marginTop: 20,
            color: C.textTertiary,
            fontSize: 11,
          }}
        >
          Tap on cards to manage limits · Use bottom nav to explore
        </div>
      </div>
    </div>
  );
}
