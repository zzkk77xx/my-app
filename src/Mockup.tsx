import { useState, useEffect, useRef } from "react";
import {
  usePrivy,
  useWallets,
  useMfaEnrollment,
  useCreateWallet,
  getEmbeddedConnectedWallet,
} from "@privy-io/react-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { encodeFunctionData } from "viem";
import QRCode from "qrcode";

const NATIVE_TOKEN = "0x7Dcd90Fe59D992CAA57dB69041B6cEEc9Db6E2af";
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const AAVE_LOGO = "https://cryptologos.cc/logos/aave-aave-logo.svg";
const UNI_LOGO = "https://cryptologos.cc/logos/uniswap-uni-logo.svg";
const TOKEN_DECIMALS = 6;

const MONAD_TESTNET = {
  chainId: "0x279F", // 10143
  chainName: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: ["https://testnet-rpc.monad.xyz/"],
  blockExplorerUrls: ["https://testnet.monadexplorer.com/"],
};

async function switchToMonad(provider: {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}) {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: MONAD_TESTNET.chainId }],
    });
  } catch (e: unknown) {
    // 4902 = chain not yet added to wallet
    if ((e as { code?: number })?.code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [MONAD_TESTNET],
      });
    } else {
      throw e;
    }
  }
}

const SPEND_INTERACTOR_READ_ABI = [
  {
    type: "function",
    name: "getDailyLimit",
    inputs: [{ name: "eoa", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRemainingLimit",
    inputs: [{ name: "eoa", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

const ERC20_ABI = [
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

async function rpcRead(to: string, data: string): Promise<string> {
  const res = await fetch("https://testnet-rpc.monad.xyz/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to, data }, "latest"],
    }),
  });
  const json = await res.json();
  return json.result ?? "0x0";
}

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
      width="22"
      height="22"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
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
  Pencil: () => (
    <svg
      width="13"
      height="13"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
  boxShadow: "0 25px 80px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06) inset",
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
    const fracStr = frac.toString().padStart(decimals, "0").slice(0, 2);
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

function cardNumberFromAddr(addr: string): string {
  if (!addr || addr.length < 18) return "•••• •••• •••• 0000";
  const s = addr.slice(2).toUpperCase();
  return `${s.slice(0, 4)} ${s.slice(4, 8)} ${s.slice(8, 12)} ${s.slice(12, 16)}`;
}

function cardExpiryFromAddr(addr: string): string {
  if (!addr || addr.length < 6) return "12/29";
  const byte = parseInt(addr.slice(-2), 16) || 0;
  const month = (byte % 12) + 1;
  const year = 26 + (byte % 4);
  return `${String(month).padStart(2, "0")}/${year}`;
}

// --- QR Scanner Modal ---
function QRScannerModal({
  onClose,
  onScan,
}: {
  onClose: () => void;
  onScan: (address: string, amount: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!("BarcodeDetector" in window)) {
        setErr(
          "QR scanning requires Chrome or Edge. Please try a different browser.",
        );
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        streamRef.current = stream;
        if (videoRef.current && !cancelled) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        // @ts-ignore
        const detector = new BarcodeDetector({ formats: ["qr_code"] });

        async function detect() {
          if (cancelled || !videoRef.current) return;
          try {
            // @ts-ignore
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              handleRaw(codes[0].rawValue as string);
              return;
            }
          } catch {}
          rafRef.current = requestAnimationFrame(detect);
        }
        detect();
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Camera access denied.");
      }
    }

    start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function handleRaw(raw: string) {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    cancelAnimationFrame(rafRef.current);
    let address = "";
    let amount = "";
    try {
      const j = JSON.parse(raw);
      address = j.address ?? j.to ?? "";
      amount = j.amount ?? j.value ?? "";
    } catch {
      const eip = raw.match(/(?:ethereum|monad):([0-9a-fA-Fx]+)/);
      if (eip) {
        address = eip[1];
        const val = raw.match(/[?&]value=([0-9.]+)/);
        if (val) amount = val[1];
      } else if (/^0x[0-9a-fA-F]{40}/.test(raw.trim())) {
        const parts = raw.trim().split(/[:?&]/);
        address = parts[0];
        amount = parts[1] ?? "";
      }
    }
    if (/^0x[0-9a-fA-F]{40}$/.test(address)) {
      onScan(address, amount);
    } else {
      setErr("Could not read a valid address from QR code. Try again.");
    }
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#000",
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        borderRadius: 44,
        overflow: "hidden",
      }}
    >
      {err ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 32,
            color: "#fff",
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#E5334A"
            strokeWidth="1.5"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p
            style={{
              textAlign: "center",
              fontSize: 14,
              color: "rgba(255,255,255,0.8)",
              lineHeight: 1.5,
            }}
          >
            {err}
          </p>
          <button
            onClick={onClose}
            style={{
              padding: "12px 28px",
              background: "rgba(255,255,255,0.15)",
              border: "none",
              borderRadius: 14,
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            muted
            playsInline
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          {/* Viewfinder overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 200,
              height: 200,
            }}
          >
            {/* Corner brackets */}
            {[
              {
                top: 0,
                left: 0,
                borderTop: "3px solid #fff",
                borderLeft: "3px solid #fff",
              },
              {
                top: 0,
                right: 0,
                borderTop: "3px solid #fff",
                borderRight: "3px solid #fff",
              },
              {
                bottom: 0,
                left: 0,
                borderBottom: "3px solid #fff",
                borderLeft: "3px solid #fff",
              },
              {
                bottom: 0,
                right: 0,
                borderBottom: "3px solid #fff",
                borderRight: "3px solid #fff",
              },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  width: 28,
                  height: 28,
                  borderRadius: 3,
                  ...s,
                }}
              />
            ))}
          </div>
          {/* Label */}
          <div
            style={{
              position: "absolute",
              bottom: 120,
              left: 0,
              right: 0,
              textAlign: "center",
              color: "#fff",
              fontSize: 13,
              fontWeight: 500,
              textShadow: "0 1px 4px rgba(0,0,0,0.5)",
            }}
          >
            Point at a QR code
          </div>
          {/* Cancel */}
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              bottom: 60,
              left: "50%",
              transform: "translateX(-50%)",
              padding: "12px 32px",
              background: "rgba(255,255,255,0.18)",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 16,
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              backdropFilter: "blur(8px)",
            }}
          >
            Cancel
          </button>
        </>
      )}
    </div>
  );
}

// --- Transfer Modal ---
function TransferModal({
  onClose,
  spendInteractorAddress,
  userAddress,
  getAccessToken,
  cards = [],
  initialRecipient = "",
  initialAmount = "",
}: {
  onClose: () => void;
  spendInteractorAddress: string | null;
  userAddress: string;
  getAccessToken: () => Promise<string | null>;
  cards?: {
    id: number;
    name: string;
    emoji: string;
    color: string;
    address: string;
    isMain: boolean;
    isBackendCard?: boolean;
    dailyLimit: string;
    remaining: string;
  }[];
  initialRecipient?: string;
  initialAmount?: string;
}) {
  // Only show backend-managed cards (private key stored server-side)
  const spendingCards = cards.filter((c) => c.isBackendCard);

  const [selectedCardIdx, setSelectedCardIdx] = useState(0);
  const selectedCard =
    spendingCards[selectedCardIdx] ?? spendingCards[0] ?? null;

  const [mode, setMode] = useState<"pathA" | "pathB">("pathA");
  const [amount, setAmount] = useState(initialAmount);
  const [recipient, setRecipient] = useState(initialRecipient);
  const [stage, setStage] = useState<
    "input" | "confirm" | "tracking" | "rejected"
  >("input");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [pathBResult, setPathBResult] = useState<{
    approved: boolean;
    status: string;
    reason?: string;
    relayId?: string;
  } | null>(null);
  const [withdrawalStatus, setWithdrawalStatus] = useState("pending");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  // Poll for withdrawal status after Path A authorization
  useEffect(() => {
    if (stage !== "tracking" || !txHash) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `${API_URL}/events?contract=${spendInteractorAddress}&limit=50`,
        );
        if (res.ok) {
          const evts = await res.json();
          const match = evts.find(
            (e: any) =>
              (e.transactionHash ?? e.txHash)?.toLowerCase() ===
              txHash.toLowerCase(),
          );
          if (match?.withdrawalStatus) {
            setWithdrawalStatus(match.withdrawalStatus);
            if (
              match.withdrawalStatus === "done" ||
              match.withdrawalStatus === "failed"
            ) {
              clearInterval(interval);
            }
          }
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [stage, txHash, spendInteractorAddress]);

  async function handlePathA() {
    if (!amount || !recipient || sending) return;
    if (!selectedCard) {
      setErr("No spending card available. Add a card first.");
      return;
    }
    setSending(true);
    setErr("");
    try {
      fetch(`${API_URL}/recipients/by-address`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: recipient }),
      }).catch(() => {});

      const token = await getAccessToken();
      const res = await fetch(
        `${API_URL}/users/${userAddress}/cards/${selectedCard.address}/spend`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: parseWei(amount, 18),
            recipient,
            transferType: 0,
          }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body?.error ?? res.statusText);
      }
      const { txHash: hash } = await res.json();

      setTxHash(hash);
      setStage("tracking");
      setWithdrawalStatus("pending");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  async function handlePathB() {
    if (!amount || !recipient || sending) return;
    setSending(true);
    setErr("");
    try {
      const token = await getAccessToken();
      fetch(`${API_URL}/recipients/by-address`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: recipient }),
      }).catch(() => {});

      const res = await fetch(`${API_URL}/transfer/propose`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userAddress,
          amount: parseWei(amount, 18),
          recipient,
          transferType: 0,
        }),
      });
      const result = await res.json();
      if (!res.ok)
        throw new Error(result.reason || result.error || res.statusText);

      setPathBResult(result);
      if (result.status === "approved") {
        setStage("tracking");
        setWithdrawalStatus("done");
      } else {
        setStage("rejected");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  const statusLabel = (s: string) => {
    if (s === "done") return "Transfer complete";
    if (s === "failed") return "Execution failed";
    if (s === "processing") return "Processing from pool...";
    return "Waiting for execution...";
  };

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
          maxHeight: "85%",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
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

        {/* ===== INPUT STAGE ===== */}
        {stage === "input" && (
          <>
            {/* Path A/B Toggle */}
            <div
              style={{
                display: "flex",
                gap: 0,
                marginBottom: 20,
                background: C.bg,
                borderRadius: 12,
                padding: 3,
                border: `1px solid ${C.border}`,
              }}
            >
              {[
                {
                  id: "pathA" as const,
                  label: "Card Payment",
                  sub: "On-chain auth",
                },
                {
                  id: "pathB" as const,
                  label: "Bank Transfer",
                  sub: "Bank co-signs",
                },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setMode(p.id)}
                  style={{
                    flex: 1,
                    padding: "10px 8px 8px",
                    background: mode === p.id ? C.card : "transparent",
                    border: "none",
                    borderRadius: 10,
                    cursor: "pointer",
                    boxShadow:
                      mode === p.id ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                    transition: "all 0.2s",
                  }}
                >
                  <div
                    style={{
                      color: mode === p.id ? C.textPrimary : C.textTertiary,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {p.label}
                  </div>
                  <div
                    style={{
                      color: C.textTertiary,
                      fontSize: 10,
                      marginTop: 2,
                    }}
                  >
                    {p.sub}
                  </div>
                </button>
              ))}
            </div>

            {/* From account — only for Path A (card payments) */}
            {mode === "pathA" &&
              (spendingCards.length > 0 ? (
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      color: C.textSecondary,
                      fontSize: 12,
                      letterSpacing: 1,
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    Pay from
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {spendingCards.map((card, i) => (
                      <button
                        key={card.id}
                        onClick={() => setSelectedCardIdx(i)}
                        style={{
                          flex: spendingCards.length <= 3 ? 1 : undefined,
                          padding: "10px 14px",
                          background:
                            selectedCardIdx === i ? C.accentSoft : C.bg,
                          border: `1.5px solid ${selectedCardIdx === i ? C.accent : C.border}`,
                          borderRadius: 12,
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.15s",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            marginBottom: 2,
                          }}
                        >
                          <span style={{ fontSize: 14 }}>{card.emoji}</span>
                          <span
                            style={{
                              color:
                                selectedCardIdx === i
                                  ? C.textPrimary
                                  : C.textSecondary,
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            {card.name}
                          </span>
                        </div>
                        <div style={{ color: C.textTertiary, fontSize: 10 }}>
                          ${fmtWei(card.remaining, 18)} left today
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: "rgba(229,51,74,0.08)",
                    borderRadius: 14,
                    padding: "12px 16px",
                    marginBottom: 16,
                    color: C.red,
                    fontSize: 13,
                  }}
                >
                  No spending card yet. Go to Cards to add one.
                </div>
              ))}

            {/* Recipient */}
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
            <div style={{ position: "relative", marginBottom: 16 }}>
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
                  outline: "none",
                  boxSizing: "border-box",
                  paddingRight: 120,
                }}
              />
              <button
                onClick={() => setShowScanner(true)}
                style={{
                  position: "absolute",
                  right: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 12,
                  color: C.accent,
                  fontWeight: 600,
                  cursor: "pointer",
                  letterSpacing: 0.2,
                  whiteSpace: "nowrap",
                  background: "none",
                  border: "none",
                  padding: 0,
                }}
              >
                Scan QR code
              </button>
            </div>

            {/* Amount */}
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

            {/* Info notice */}
            {/* <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 6,
                marginBottom: 16,
                padding: "8px 12px",
                background: mode === "pathA" ? C.yellowSoft : C.accentSoft,
                border: `1px solid ${mode === "pathA" ? "rgba(224,155,0,0.18)" : "rgba(108,92,231,0.18)"}`,
                borderRadius: 10,
              }}
            >
              <span
                style={{
                  color: mode === "pathA" ? C.yellow : C.accent,
                  fontSize: 13,
                  marginTop: 1,
                }}
              >
                ⓘ
              </span>
              <span
                style={{
                  color: mode === "pathA" ? C.yellow : C.accent,
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              >
                {mode === "pathA" ? (
                  "Your registered EOA signs the authorization on-chain. The backend executes from the pool."
                ) : (
                  <>
                    The bank validates, co-signs, and executes. Transfers above{" "}
                    <strong>$10,000</strong> require compliance review.
                  </>
                )}
              </span>
            </div> */}

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

            <button
              onClick={
                mode === "pathA" ? handlePathA : () => setStage("confirm")
              }
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
              <Icon.Send />{" "}
              {sending
                ? "Processing..."
                : mode === "pathA"
                  ? "Authorize Payment"
                  : "Submit Transfer"}
            </button>
          </>
        )}

        {/* ===== CONFIRM STAGE (Path B only) ===== */}
        {stage === "confirm" && (
          <>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  background: C.accentSoft,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  fontSize: 24,
                }}
              >
                <Icon.Send />
              </div>
              <div
                style={{
                  color: C.textPrimary,
                  fontSize: 18,
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                Confirm Transfer
              </div>
              <div style={{ color: C.textSecondary, fontSize: 13 }}>
                Please review the details below
              </div>
            </div>

            <div
              style={{
                background: C.bg,
                borderRadius: 14,
                padding: "16px",
                marginBottom: 20,
                border: `1px solid ${C.border}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <span style={{ color: C.textSecondary, fontSize: 13 }}>
                  Amount
                </span>
                <span
                  style={{
                    color: C.textPrimary,
                    fontSize: 15,
                    fontWeight: 600,
                  }}
                >
                  ${amount}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ color: C.textSecondary, fontSize: 13 }}>
                  Recipient
                </span>
                <span
                  style={{
                    color: C.textPrimary,
                    fontSize: 12,
                    fontFamily: "monospace",
                  }}
                >
                  {recipient.slice(0, 8)}...{recipient.slice(-6)}
                </span>
              </div>
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

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => {
                  setStage("input");
                  setErr("");
                }}
                disabled={sending}
                style={{
                  flex: 1,
                  padding: "14px",
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 14,
                  color: C.textSecondary,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Back
              </button>
              <button
                onClick={handlePathB}
                disabled={sending}
                style={{
                  flex: 2,
                  padding: "14px",
                  background: C.accent,
                  border: "none",
                  borderRadius: 14,
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  opacity: sending ? 0.5 : 1,
                }}
              >
                {sending ? "Processing..." : "Confirm & Send"}
              </button>
            </div>
          </>
        )}

        {/* ===== TRACKING STAGE (two-phase status) ===== */}
        {stage === "tracking" && (
          <>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  background: C.greenSoft,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  fontSize: 26,
                }}
              >
                {withdrawalStatus === "done" ? "✓" : "⟳"}
              </div>
              <div
                style={{
                  color: C.textPrimary,
                  fontSize: 18,
                  fontWeight: 700,
                  marginBottom: 4,
                }}
              >
                {withdrawalStatus === "done"
                  ? "Transfer Complete"
                  : "Transfer in Progress"}
              </div>
              <div style={{ color: C.textSecondary, fontSize: 13 }}>
                {amount} $ to {shortenAddr(recipient, 6)}
              </div>
            </div>

            {/* Phase 1: Authorization */}
            <div
              style={{
                background: C.greenSoft,
                border: "1px solid rgba(0,168,107,0.2)",
                borderRadius: 14,
                padding: "14px 16px",
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span style={{ color: C.green, fontSize: 18, fontWeight: 700 }}>
                ✓
              </span>
              <div>
                <div style={{ color: C.green, fontSize: 13, fontWeight: 600 }}>
                  Authorization Confirmed
                </div>
                <div
                  style={{ color: C.textSecondary, fontSize: 11, marginTop: 2 }}
                >
                  {txHash
                    ? `Tx: ${shortenAddr(txHash, 8)}`
                    : pathBResult?.relayId
                      ? `Relay: ${pathBResult.relayId.slice(0, 12)}...`
                      : "Approved by bank"}
                </div>
              </div>
            </div>

            {/* Phase 2: Execution */}
            <div
              style={{
                background:
                  withdrawalStatus === "done"
                    ? C.greenSoft
                    : withdrawalStatus === "failed"
                      ? C.redSoft
                      : C.yellowSoft,
                border: `1px solid ${withdrawalStatus === "done" ? "rgba(0,168,107,0.2)" : withdrawalStatus === "failed" ? "rgba(229,51,74,0.2)" : "rgba(224,155,0,0.2)"}`,
                borderRadius: 14,
                padding: "14px 16px",
                marginBottom: 24,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span
                style={{
                  color:
                    withdrawalStatus === "done"
                      ? C.green
                      : withdrawalStatus === "failed"
                        ? C.red
                        : C.yellow,
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                {withdrawalStatus === "done"
                  ? "✓"
                  : withdrawalStatus === "failed"
                    ? "✕"
                    : "⟳"}
              </span>
              <div>
                <div
                  style={{
                    color:
                      withdrawalStatus === "done"
                        ? C.green
                        : withdrawalStatus === "failed"
                          ? C.red
                          : C.yellow,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Execution
                </div>
                <div
                  style={{ color: C.textSecondary, fontSize: 11, marginTop: 2 }}
                >
                  {statusLabel(withdrawalStatus)}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                width: "100%",
                padding: "14px",
                background: withdrawalStatus === "done" ? C.accent : C.bg,
                border:
                  withdrawalStatus === "done"
                    ? "none"
                    : `1px solid ${C.border}`,
                borderRadius: 14,
                color: withdrawalStatus === "done" ? "#fff" : C.textSecondary,
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {withdrawalStatus === "done" ? "Done" : "Close"}
            </button>
          </>
        )}

        {/* ===== REJECTED STAGE ===== */}
        {stage === "rejected" && (
          <>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  background: C.redSoft,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  fontSize: 26,
                }}
              >
                ✕
              </div>
              <div
                style={{
                  color: C.textPrimary,
                  fontSize: 18,
                  fontWeight: 700,
                  marginBottom: 4,
                }}
              >
                Transfer Declined
              </div>
            </div>
            <div
              style={{
                background: C.redSoft,
                border: "1px solid rgba(229,51,74,0.15)",
                borderRadius: 14,
                padding: "16px",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  color: C.red,
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 6,
                }}
              >
                Transfer Rejected
              </div>
              <div
                style={{
                  color: C.textSecondary,
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                {pathBResult?.reason ||
                  "The bank's policy engine has declined this transfer."}
              </div>
            </div>
            <div
              style={{
                background: C.bg,
                borderRadius: 14,
                padding: "14px 16px",
                marginBottom: 20,
                border: `1px solid ${C.border}`,
              }}
            >
              <div
                style={{
                  color: C.textSecondary,
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                Please contact your account manager for assistance or try a
                smaller amount.
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => {
                  setStage("input");
                  setPathBResult(null);
                  setErr("");
                }}
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
                }}
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: "14px",
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 14,
                  color: C.textSecondary,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
      {showScanner && (
        <QRScannerModal
          onClose={() => setShowScanner(false)}
          onScan={(address, amount) => {
            setRecipient(address);
            if (amount) setAmount(amount);
            setShowScanner(false);
          }}
        />
      )}
    </div>
  );
}

// --- QR Generator Modal ---
function QRGeneratorModal({
  onClose,
  defaultAddress,
}: {
  onClose: () => void;
  defaultAddress: string;
}) {
  const [address, setAddress] = useState(defaultAddress);
  const [amount, setAmount] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const data = amount.trim()
      ? JSON.stringify({ address: address.trim(), amount: amount.trim() })
      : address.trim() || " ";
    QRCode.toCanvas(canvasRef.current!, data, {
      width: 220,
      margin: 2,
      color: { dark: "#0D1117", light: "#FFFFFF" },
    });
  }, [address, amount]);

  const isValidAddr = /^0x[0-9a-fA-F]{40}$/.test(address.trim());

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "flex-end",
        zIndex: 100,
        borderRadius: 44,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          background: C.card,
          borderRadius: "28px 28px 44px 44px",
          padding: "24px 24px 40px",
        }}
      >
        {/* Handle */}
        <div
          style={{
            width: 40,
            height: 4,
            background: C.border,
            borderRadius: 2,
            margin: "0 auto 20px",
          }}
        />

        <div
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: C.textPrimary,
            marginBottom: 20,
          }}
        >
          Generate Payment QR
        </div>

        {/* Address */}
        <label
          style={{
            display: "block",
            fontSize: 11,
            color: C.textSecondary,
            letterSpacing: 0.8,
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          Recipient Address
        </label>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="0x..."
          style={{
            width: "100%",
            padding: "12px 14px",
            background: C.bg,
            border: `1px solid ${isValidAddr || !address ? C.border : C.red}`,
            borderRadius: 12,
            color: C.textPrimary,
            fontSize: 13,
            fontFamily: "monospace",
            marginBottom: 12,
            outline: "none",
            boxSizing: "border-box",
          }}
        />

        {/* Amount */}
        <label
          style={{
            display: "block",
            fontSize: 11,
            color: C.textSecondary,
            letterSpacing: 0.8,
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          Amount — optional
        </label>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          inputMode="decimal"
          style={{
            width: "100%",
            padding: "12px 14px",
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            color: C.textPrimary,
            fontSize: 14,
            marginBottom: 20,
            outline: "none",
            boxSizing: "border-box",
          }}
        />

        {/* QR canvas */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              padding: 12,
              background: "#fff",
              borderRadius: 16,
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              border: `1px solid ${C.border}`,
            }}
          >
            <canvas ref={canvasRef} />
          </div>
        </div>

        {/* Hint */}
        <div
          style={{
            textAlign: "center",
            color: C.textTertiary,
            fontSize: 11,
            marginBottom: 20,
          }}
        >
          {isValidAddr
            ? "Scan with any wallet to pay"
            : "Enter a valid address to generate the QR code"}
        </div>

        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: 14,
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            color: C.textSecondary,
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

// --- Deposit Modal ---
function DepositModal({
  onClose,
  depositorAddress,
  accountNumber,
}: {
  onClose: () => void;
  depositorAddress: string | null;
  accountNumber: string | null;
}) {
  const { wallets } = useWallets();
  const qc = useQueryClient();

  const [mode, setMode] = useState<"choose" | "self" | "other">("choose");
  const [amount, setAmount] = useState("");
  const [otherAcctNum, setOtherAcctNum] = useState("");
  // Browser wallet (not linked to Privy account)
  const [browserAddr, setBrowserAddr] = useState<string | null>(null);
  const [browserProvider, setBrowserProvider] = useState<any>(null);
  // "privy" = use a Privy wallet, "browser" = use injected browser wallet
  const [walletSource, setWalletSource] = useState<"privy" | "browser">(
    "privy",
  );
  const [selectedPrivyIdx, setSelectedPrivyIdx] = useState(() => {
    const idx = wallets.findIndex((w) => w.walletClientType !== "privy");
    return idx >= 0 ? idx : 0;
  });

  useEffect(() => {
    const idx = wallets.findIndex((w) => w.walletClientType !== "privy");
    if (idx >= 0) setSelectedPrivyIdx(idx);
  }, [wallets.length]);

  const [stage, setStage] = useState<
    "input" | "processing" | "failed" | "done"
  >("input");
  const [step, setStep] = useState(0);
  const [approveSkipped, setApproveSkipped] = useState(false);
  const [err, setErr] = useState("");
  const [sending, setSending] = useState(false);

  const privyWallet = wallets[selectedPrivyIdx] ?? wallets[0] ?? null;
  const senderAddress =
    walletSource === "browser" && browserAddr
      ? browserAddr
      : (privyWallet?.address ?? null);
  const targetAcctNum = mode === "self" ? accountNumber : otherAcctNum;

  async function connectBrowserWallet() {
    const eth = (window as any).ethereum;
    if (!eth) {
      setErr("No browser wallet detected. Install Rabby or MetaMask.");
      return;
    }
    try {
      const accounts = (await eth.request({
        method: "eth_requestAccounts",
      })) as string[];
      if (accounts.length > 0) {
        setBrowserAddr(accounts[0]);
        setBrowserProvider(eth);
        setWalletSource("browser");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Wallet connection rejected.");
    }
  }

  async function getProvider() {
    if (walletSource === "browser" && browserProvider) {
      await switchToMonad(browserProvider);
      return browserProvider;
    }
    if (!privyWallet) throw new Error("No wallet connected.");
    const p = await privyWallet.getEthereumProvider();
    await switchToMonad(p);
    return p;
  }

  async function handleDeposit() {
    if (!senderAddress || !amount || !targetAcctNum) return;
    setSending(true);
    setErr("");
    setStage("processing");
    setStep(0);
    setApproveSkipped(false);

    try {
      // Step 0: Prepare deposit
      const prepRes = await fetch(`${API_URL}/deposit/prepare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          depositor: senderAddress,
          token: NATIVE_TOKEN,
          amount: parseWei(amount),
          accountNumber: parseInt(targetAcctNum),
        }),
      });
      const prepData = await prepRes.json();
      if (!prepRes.ok) throw new Error(prepData.error || prepRes.statusText);

      const { to: poolAddress, calldata, value, relayId } = prepData;

      const provider = await getProvider();

      // Step 1: Check allowance & approve if needed
      setStep(1);
      const amountBn = BigInt(parseWei(amount));
      const allowData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [senderAddress as `0x${string}`, poolAddress as `0x${string}`],
      });
      const allowHex = await rpcRead(NATIVE_TOKEN, allowData);
      const currentAllowance = allowHex === "0x0" ? 0n : BigInt(allowHex);

      if (currentAllowance < amountBn) {
        const appData = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "approve",
          args: [poolAddress as `0x${string}`, 2n ** 256n - 1n],
        });
        const appHash = (await provider.request({
          method: "eth_sendTransaction",
          params: [{ from: senderAddress, to: NATIVE_TOKEN, data: appData }],
        })) as string;

        // Wait for approval to confirm
        for (let i = 0; i < 60; i++) {
          const rcpt = await fetch("https://testnet-rpc.monad.xyz/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "eth_getTransactionReceipt",
              params: [appHash],
            }),
          });
          const rcptJson = await rcpt.json();
          if (rcptJson.result) break;
          await new Promise((r) => setTimeout(r, 1000));
        }
      } else {
        setApproveSkipped(true);
      }

      // Step 2: Submit deposit transaction
      setStep(2);
      const txParams: Record<string, string> = {
        from: senderAddress,
        to: poolAddress,
        data: calldata,
      };
      if (value && value !== "0" && value !== "0x0") {
        txParams.value = value.startsWith("0x")
          ? value
          : `0x${BigInt(value).toString(16)}`;
      }
      await provider.request({
        method: "eth_sendTransaction",
        params: [txParams],
      });

      // Step 3: Confirm deposit
      setStep(3);
      const confRes = await fetch(`${API_URL}/deposit/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relayId }),
      });
      const confData = await confRes.json();
      if (!confRes.ok) throw new Error(confData.error || confRes.statusText);

      // Refresh balance
      qc.invalidateQueries({ queryKey: ["balances", depositorAddress] });

      setStage("done");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setStage("failed");
    } finally {
      setSending(false);
    }
  }

  const STEPS = [
    "Preparing deposit...",
    "Approving token...",
    "Submitting deposit...",
    "Confirming on-chain...",
  ];
  const STEPS_DONE = [
    "Deposit prepared",
    approveSkipped ? "Already approved" : "Token approved",
    "Deposit submitted",
    "Deposit confirmed",
  ];

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
          maxHeight: "85%",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {mode !== "choose" && stage === "input" && (
              <button
                onClick={() => {
                  setMode("choose");
                  setErr("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: C.textSecondary,
                  cursor: "pointer",
                  fontSize: 18,
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ←
              </button>
            )}
            <span
              style={{ color: C.textPrimary, fontSize: 20, fontWeight: 600 }}
            >
              {stage === "done"
                ? "Deposit Complete"
                : stage === "failed"
                  ? "Deposit Failed"
                  : stage === "processing"
                    ? "Processing"
                    : "Add Funds"}
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

        {/* ===== CHOOSE MODE ===== */}
        {mode === "choose" && stage === "input" && (
          <>
            <div
              style={{
                color: C.textSecondary,
                fontSize: 14,
                marginBottom: 20,
                lineHeight: 1.5,
              }}
            >
              Deposit <strong style={{ color: C.textPrimary }}>USDC</strong> on{" "}
              <strong style={{ color: C.textPrimary }}>Monad Testnet</strong>{" "}
              directly from your connected wallet.
            </div>

            {/* My Account option */}
            <div
              onClick={() => accountNumber && setMode("self")}
              style={{
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 16,
                padding: "20px",
                marginBottom: 12,
                cursor: accountNumber ? "pointer" : "not-allowed",
                opacity: accountNumber ? 1 : 0.5,
                transition: "border-color 0.2s",
              }}
              onMouseEnter={(e) => {
                if (accountNumber)
                  (e.currentTarget as HTMLDivElement).style.borderColor =
                    C.accent;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  C.border;
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    background: C.accentSoft,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                >
                  <Icon.Download />
                </div>
                <div>
                  <div
                    style={{
                      color: C.textPrimary,
                      fontSize: 15,
                      fontWeight: 600,
                      marginBottom: 3,
                    }}
                  >
                    Deposit to My Account
                  </div>
                  <div
                    style={{
                      color: C.textTertiary,
                      fontSize: 12,
                      lineHeight: 1.4,
                    }}
                  >
                    {accountNumber
                      ? `Account #${accountNumber}`
                      : "Account not yet set up"}
                  </div>
                </div>
                <div
                  style={{
                    marginLeft: "auto",
                    color: C.textTertiary,
                  }}
                >
                  <Icon.ArrowRight />
                </div>
              </div>
            </div>

            {/* Another Account option */}
            <div
              onClick={() => setMode("other")}
              style={{
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 16,
                padding: "20px",
                marginBottom: 20,
                cursor: "pointer",
                transition: "border-color 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  C.accent;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  C.border;
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    background: C.greenSoft,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    color: C.green,
                    flexShrink: 0,
                  }}
                >
                  <Icon.Send />
                </div>
                <div>
                  <div
                    style={{
                      color: C.textPrimary,
                      fontSize: 15,
                      fontWeight: 600,
                      marginBottom: 3,
                    }}
                  >
                    Deposit to Another Account
                  </div>
                  <div
                    style={{
                      color: C.textTertiary,
                      fontSize: 12,
                      lineHeight: 1.4,
                    }}
                  >
                    Enter the recipient's account number
                  </div>
                </div>
                <div
                  style={{
                    marginLeft: "auto",
                    color: C.textTertiary,
                  }}
                >
                  <Icon.ArrowRight />
                </div>
              </div>
            </div>

            {/* Network badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: C.accentSoft,
                border: `1px solid ${C.accent}22`,
                borderRadius: 8,
                padding: "4px 10px",
                fontSize: 12,
                color: C.accent,
                fontWeight: 600,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  background: C.green,
                }}
              />
              Monad Testnet · Chain ID 10143
            </div>
          </>
        )}

        {/* ===== INPUT STAGE ===== */}
        {mode !== "choose" && stage === "input" && (
          <>
            {/* Account number */}
            {mode === "self" ? (
              <div
                style={{
                  background: `linear-gradient(135deg, ${C.accent}12 0%, ${C.accent}06 100%)`,
                  border: `1px solid ${C.accent}22`,
                  borderRadius: 14,
                  padding: "14px 16px",
                  marginBottom: 16,
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
                  Account Number
                </div>
                <div
                  style={{
                    color: C.accent,
                    fontSize: 22,
                    fontWeight: 800,
                    letterSpacing: 2,
                    fontFamily: "monospace",
                  }}
                >
                  {accountNumber}
                </div>
              </div>
            ) : (
              <>
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
                  Recipient Account Number
                </label>
                <input
                  type="number"
                  placeholder="Enter account number"
                  value={otherAcctNum}
                  onChange={(e) => setOtherAcctNum(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 14,
                    color: C.textPrimary,
                    fontSize: 18,
                    fontWeight: 600,
                    fontFamily: "monospace",
                    outline: "none",
                    boxSizing: "border-box",
                    marginBottom: 16,
                  }}
                />
              </>
            )}

            {/* Wallet selector */}
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
              Pay from wallet
            </label>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                marginBottom: 16,
              }}
            >
              {/* Browser wallet option */}
              {browserAddr && (
                <div
                  onClick={() => setWalletSource("browser")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    background:
                      walletSource === "browser" ? C.accentSoft : C.bg,
                    border: `1.5px solid ${walletSource === "browser" ? C.accent : C.border}`,
                    borderRadius: 12,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      border: `2px solid ${walletSource === "browser" ? C.accent : C.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {walletSource === "browser" && (
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          background: C.accent,
                        }}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        color: C.textPrimary,
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      Browser Wallet
                    </div>
                    <div
                      style={{
                        color: C.textTertiary,
                        fontSize: 11,
                        fontFamily: "monospace",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {shortenAddr(browserAddr, 6)}
                    </div>
                  </div>
                </div>
              )}
              {/* Privy wallet options */}
              {wallets.map((w, idx) => {
                const isSelected =
                  walletSource === "privy" && idx === selectedPrivyIdx;
                return (
                  <div
                    key={w.address}
                    onClick={() => {
                      setSelectedPrivyIdx(idx);
                      setWalletSource("privy");
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 14px",
                      background: isSelected ? C.accentSoft : C.bg,
                      border: `1.5px solid ${isSelected ? C.accent : C.border}`,
                      borderRadius: 12,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        border: `2px solid ${isSelected ? C.accent : C.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {isSelected && (
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            background: C.accent,
                          }}
                        />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          color: C.textPrimary,
                          fontSize: 13,
                          fontWeight: 500,
                        }}
                      >
                        {w.walletClientType === "privy"
                          ? "Embedded Wallet"
                          : w.walletClientType
                            ? w.walletClientType.charAt(0).toUpperCase() +
                              w.walletClientType.slice(1)
                            : "Wallet"}
                      </div>
                      <div
                        style={{
                          color: C.textTertiary,
                          fontSize: 11,
                          fontFamily: "monospace",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {shortenAddr(w.address, 6)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Connect browser wallet */}
            {!browserAddr && (
              <button
                onClick={connectBrowserWallet}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "none",
                  border: `1px dashed ${C.border}`,
                  borderRadius: 12,
                  color: C.accent,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  marginBottom: 16,
                }}
              >
                <Icon.Plus /> Connect Browser Wallet
              </button>
            )}

            {/* Amount */}
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
              Amount (USDC)
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

            {/* Info */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 6,
                marginBottom: 16,
                padding: "8px 12px",
                background: C.accentSoft,
                border: `1px solid rgba(108,92,231,0.18)`,
                borderRadius: 10,
              }}
            >
              <span style={{ color: C.accent, fontSize: 13, marginTop: 1 }}>
                ⓘ
              </span>
              <span style={{ color: C.accent, fontSize: 12, lineHeight: 1.5 }}>
                {mode === "self"
                  ? "USDC will be deposited from your connected wallet and credited to your account balance."
                  : "USDC will be deposited from your connected wallet and credited to the recipient's account."}
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

            <button
              onClick={handleDeposit}
              disabled={sending || !amount || !targetAcctNum || !senderAddress}
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
                opacity:
                  sending || !amount || !targetAcctNum || !senderAddress
                    ? 0.5
                    : 1,
              }}
            >
              <Icon.Download /> Deposit USDC
            </button>
          </>
        )}

        {/* ===== PROCESSING STAGE ===== */}
        {stage === "processing" && (
          <>
            <div
              style={{
                textAlign: "center",
                marginBottom: 24,
                color: C.textSecondary,
                fontSize: 13,
              }}
            >
              {amount} USDC → Account #{targetAcctNum}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {STEPS.map((label, i) => {
                const done = step > i;
                const active = step === i;
                return (
                  <div key={i}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 0",
                      }}
                    >
                      {/* Step indicator */}
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          background: done
                            ? C.greenSoft
                            : active
                              ? C.accentSoft
                              : C.bg,
                          border: `2px solid ${done ? C.green : active ? C.accent : C.border}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          fontWeight: 700,
                          color: done
                            ? C.green
                            : active
                              ? C.accent
                              : C.textTertiary,
                          flexShrink: 0,
                        }}
                      >
                        {done ? "✓" : i + 1}
                      </div>
                      <div>
                        <div
                          style={{
                            color: done
                              ? C.green
                              : active
                                ? C.textPrimary
                                : C.textTertiary,
                            fontSize: 13,
                            fontWeight: active ? 600 : 400,
                          }}
                        >
                          {done ? STEPS_DONE[i] : label}
                        </div>
                      </div>
                      {active && (
                        <div
                          style={{
                            marginLeft: "auto",
                            width: 16,
                            height: 16,
                            border: `2px solid ${C.accent}`,
                            borderTopColor: "transparent",
                            borderRadius: "50%",
                            animation: "spin 0.8s linear infinite",
                          }}
                        />
                      )}
                    </div>
                    {/* Connector line */}
                    {i < STEPS.length - 1 && (
                      <div
                        style={{
                          width: 2,
                          height: 12,
                          background: done ? C.green : C.border,
                          marginLeft: 13,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </>
        )}

        {/* ===== FAILED STAGE ===== */}
        {stage === "failed" && (
          <>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  background: C.redSoft,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  fontSize: 26,
                  color: C.red,
                  fontWeight: 700,
                }}
              >
                ✕
              </div>
              <div
                style={{
                  color: C.textPrimary,
                  fontSize: 18,
                  fontWeight: 700,
                  marginBottom: 4,
                }}
              >
                Deposit Failed
              </div>
              <div style={{ color: C.textSecondary, fontSize: 13 }}>
                {amount} USDC → Account #{targetAcctNum}
              </div>
            </div>

            {/* Stepper showing which step failed */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 0,
                marginBottom: 20,
              }}
            >
              {STEPS.map((label, i) => {
                const done = step > i;
                const failed = step === i;
                return (
                  <div key={i}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "8px 0",
                      }}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          background: done
                            ? C.greenSoft
                            : failed
                              ? C.redSoft
                              : C.bg,
                          border: `2px solid ${done ? C.green : failed ? C.red : C.border}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 10,
                          fontWeight: 700,
                          color: done
                            ? C.green
                            : failed
                              ? C.red
                              : C.textTertiary,
                          flexShrink: 0,
                        }}
                      >
                        {done ? "✓" : failed ? "✕" : i + 1}
                      </div>
                      <div
                        style={{
                          color: done
                            ? C.green
                            : failed
                              ? C.red
                              : C.textTertiary,
                          fontSize: 12,
                          fontWeight: failed ? 600 : 400,
                        }}
                      >
                        {done
                          ? STEPS_DONE[i]
                          : failed
                            ? `Failed: ${label.replace("...", "")}`
                            : label.replace("...", "")}
                      </div>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div
                        style={{
                          width: 2,
                          height: 8,
                          background: done ? C.green : C.border,
                          marginLeft: 11,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Error reason */}
            <div
              style={{
                background: C.redSoft,
                border: "1px solid rgba(229,51,74,0.15)",
                borderRadius: 14,
                padding: "14px 16px",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  color: C.red,
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                Error Details
              </div>
              <div
                style={{
                  color: C.textSecondary,
                  fontSize: 12,
                  lineHeight: 1.5,
                  wordBreak: "break-word",
                }}
              >
                {err || "An unknown error occurred."}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => {
                  setStage("input");
                  setErr("");
                }}
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
                }}
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: "14px",
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 14,
                  color: C.textSecondary,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </>
        )}

        {/* ===== DONE STAGE ===== */}
        {stage === "done" && (
          <>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  background: C.greenSoft,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  fontSize: 26,
                  color: C.green,
                  fontWeight: 700,
                }}
              >
                ✓
              </div>
              <div
                style={{
                  color: C.textPrimary,
                  fontSize: 18,
                  fontWeight: 700,
                  marginBottom: 4,
                }}
              >
                Deposit Successful
              </div>
              <div style={{ color: C.textSecondary, fontSize: 13 }}>
                {amount} USDC has been credited to Account #{targetAcctNum}
              </div>
            </div>
            <button
              onClick={onClose}
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
              }}
            >
              Done
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
  onAdd: (dailyLimit: string) => void;
  registering: boolean;
  error: string;
}) {
  const [limit, setLimit] = useState(1000);

  function handleSubmit() {
    onAdd(parseWei(limit.toString(), 18));
  }

  const displayErr = error;

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
          Daily spending limit
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
  const daily = parseFloat(fmtWei(card.dailyLimit, 18)) || 0;
  const rem = parseFloat(fmtWei(card.remaining, 18)) || 0;
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
            Address
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
                $ {spent.toFixed(4)} / {daily.toFixed(4)}
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
            onClick={() =>
              onRegister(card.address, parseWei(limit.toString(), 18))
            }
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
export default function AnoBankMobileApp() {
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
  // Use the embedded (Privy-managed) wallet as account identity
  const embeddedWallet = getEmbeddedConnectedWallet(wallets);
  const userAddress: string | null = embeddedWallet?.address ?? null;

  // Tracks which button triggered login — "signup" creates a Safe, "payment" skips it
  const [loginIntent, setLoginIntent] = useState<"signup" | "payment" | null>(
    null,
  );

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
    enabled: authenticated && !!userAddress && loginIntent !== "payment",
    staleTime: Infinity,
    retry: 3,
  });

  const { data: balancesData, isLoading: balancesLoading } = useQuery({
    queryKey: ["balances", userAddress],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/balances?addr=${userAddress}`);
      if (!res.ok) {
        const b = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(b?.error ?? res.statusText);
      }
      return res.json() as Promise<Record<string, string>>;
    },
    enabled: authenticated && !!userAddress,
    refetchInterval: 30_000,
  });

  const { data: eoasData, isLoading: eoasLoading } = useQuery({
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

  const eoas = eoasData?.eoas ?? [];

  const spendInteractorAddress = eoasData?.spendInteractorAddress ?? null;

  // Backend-managed cards (private keys stored server-side, usable for Path A)
  const { data: backendCardsData } = useQuery({
    queryKey: ["cards", userAddress],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/users/${userAddress}/cards`);
      if (!res.ok) return { cards: [] };
      return res.json() as Promise<{
        cards: { address: string; dailyLimit: string }[];
      }>;
    },
    enabled: authenticated && !!userAddress,
  });
  const backendCardAddresses = new Set(
    (backendCardsData?.cards ?? []).map((c) => c.address.toLowerCase()),
  );

  const { data: historyData, isLoading: eventsLoading } = useQuery({
    queryKey: ["history", userAddress],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}/users/${userAddress}/history?limit=50`,
      );
      if (!res.ok) {
        const b = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(b?.error ?? res.statusText);
      }
      return res.json() as Promise<any[]>;
    },
    enabled: authenticated && !!userAddress,
    refetchInterval: 10_000,
  });

  // Account number for deposit reference
  const { data: accountNumberData } = useQuery({
    queryKey: ["accountNumber", userAddress],
    queryFn: async () => {
      const token = await getAccessToken();
      const res = await fetch(
        `${API_URL}/users/${userAddress}/account-number`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) return { accountNumber: null };
      return res.json() as Promise<{ accountNumber: string | null }>;
    },
    enabled: authenticated && !!userAddress,
    staleTime: Infinity,
  });

  // EOA on-chain limits (daily limit + remaining)
  const { data: eoaLimitsData } = useQuery({
    queryKey: ["eoaLimits", spendInteractorAddress, eoas],
    queryFn: async () => {
      if (!spendInteractorAddress || eoas.length === 0) return {};
      const limits: Record<string, { dailyLimit: string; remaining: string }> =
        {};
      for (const eoa of eoas) {
        try {
          const dailyData = encodeFunctionData({
            abi: SPEND_INTERACTOR_READ_ABI,
            functionName: "getDailyLimit",
            args: [eoa as `0x${string}`],
          });
          const remainData = encodeFunctionData({
            abi: SPEND_INTERACTOR_READ_ABI,
            functionName: "getRemainingLimit",
            args: [eoa as `0x${string}`],
          });
          const [dailyHex, remainHex] = await Promise.all([
            rpcRead(spendInteractorAddress, dailyData),
            rpcRead(spendInteractorAddress, remainData),
          ]);
          limits[eoa.toLowerCase()] = {
            dailyLimit: dailyHex === "0x0" ? "0" : BigInt(dailyHex).toString(),
            remaining: remainHex === "0x0" ? "0" : BigInt(remainHex).toString(),
          };
        } catch {
          limits[eoa.toLowerCase()] = { dailyLimit: "0", remaining: "0" };
        }
      }
      return limits;
    },
    enabled: !!spendInteractorAddress && eoas.length > 0,
    refetchInterval: 30_000,
  });

  const registerEoaMutation = useMutation({
    mutationFn: async ({
      eoa,
      dailyLimit,
    }: {
      eoa?: string;
      dailyLimit: string;
    }) => {
      const token = await getAccessToken();
      // If eoa is provided, register specific EOA via /eoas; otherwise create new card via /cards
      const url = eoa
        ? `${API_URL}/users/${userAddress}/eoas`
        : `${API_URL}/users/${userAddress}/cards`;
      const body = eoa
        ? { eoa, dailyLimit, allowedTypes: [0, 1] }
        : { dailyLimit, allowedTypes: [0, 1] };
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(data?.error ?? res.statusText);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["eoas", userAddress] });
      qc.invalidateQueries({ queryKey: ["cards", userAddress] });
      setSelectedCardIdx(null);
      setShowAddCard(false);
    },
  });

  // ── Derived
  const safeAddress = registrationData?.safeAddress ?? null;
  const balances = balancesData ?? {};
  const history = historyData ?? [];
  const dataLoading = balancesLoading || eoasLoading || eventsLoading;
  const dataError = registerEoaMutation.error
    ? String(registerEoaMutation.error)
    : "";

  // ── UI state
  const [tab, setTab] = useState("home");
  const [showTransfer, setShowTransfer] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [qrPreset, setQrPreset] = useState<{
    address: string;
    amount: string;
  } | null>(null);
  const [showQrGenerator, setShowQrGenerator] = useState(false);
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [userName, setUserName] = useState<string>(
    () => localStorage.getItem("userName") ?? "",
  );
  const [editingUserName, setEditingUserName] = useState(false);
  const [cardNames, setCardNames] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem("cardNames") ?? "{}");
    } catch {
      return {};
    }
  });
  const [editingCardAddr, setEditingCardAddr] = useState<string | null>(null);
  useEffect(() => {
    localStorage.setItem("userName", userName);
  }, [userName]);
  useEffect(() => {
    localStorage.setItem("cardNames", JSON.stringify(cardNames));
  }, [cardNames]);

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
          AnoBank
        </div>
        <div style={{ color: C.textSecondary, fontSize: 15, marginBottom: 48 }}>
          Private Banking
        </div>
        <div style={{ width: "100%", maxWidth: 340 }}>
          <button
            onClick={() => {
              setLoginIntent("signup");
              login();
            }}
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
            Sign Up
          </button>
          <button
            onClick={() => {
              setLoginIntent("payment");
              login();
            }}
            style={{
              width: "100%",
              padding: "18px",
              background: "transparent",
              border: `2px solid ${C.accent}`,
              borderRadius: 18,
              color: C.accent,
              fontSize: 17,
              fontWeight: 700,
              cursor: "pointer",
              marginBottom: 12,
            }}
          >
            Send Payment
          </button>
          <div
            style={{
              color: C.textTertiary,
              fontSize: 12,
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            Connect your wallet to access your AnoBank account.
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
  const nativeBalance = fmtWei(balances["usd"], 18); // stored as 18 decimals in DB

  // Cards: user address first, then EOAs
  const allCardAddresses = [
    userAddress,
    ...eoas.filter((e) => e.toLowerCase() !== userAddress.toLowerCase()),
  ];
  const cards = allCardAddresses.map((addr, i) => {
    const meta = CARD_META[i % CARD_META.length];
    const limits = eoaLimitsData?.[addr.toLowerCase()] ?? {
      dailyLimit: "0",
      remaining: "0",
    };
    const defaultName = i === 0 ? "Main Account" : meta.name;
    return {
      id: i,
      name: cardNames[addr.toLowerCase()] ?? defaultName,
      emoji: i === 0 ? "🏦" : meta.emoji,
      color: i === 0 ? C.accent : meta.color,
      address: addr,
      isMain: i === 0,
      isBackendCard: backendCardAddresses.has(addr.toLowerCase()),
      dailyLimit: limits.dailyLimit,
      remaining: limits.remaining,
    };
  });

  // Unified activity rows
  const txRows = history.map((ev: any) => {
    const isDeposit = ev.type === "deposit";
    const isRefund = ev.type === "refund";
    const amt = ev.amount ? parseFloat(fmtWei(ev.amount, 18)) : 0;
    return {
      type: ev.type as string,
      name: isDeposit ? "Deposit" : isRefund ? "Refund" : "Payment",
      amount: amt,
      date: ev.createdAt
        ? new Date(ev.createdAt).toLocaleDateString("en", {
            month: "short",
            day: "numeric",
          })
        : "",
      note: ev.note ?? "",
      txHash: ev.reference ?? "",
      withdrawalStatus: ev.withdrawalStatus ?? null,
      isCredit: isDeposit || isRefund,
    };
  });

  // Monthly stats (outgoing only)
  const monthlySpent = txRows
    .filter((t) => !t.isCredit)
    .reduce((s, t) => s + t.amount, 0);
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
              pointerEvents: "none",
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
              pointerEvents: "none",
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
                    {editingUserName ? (
                      <input
                        autoFocus
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        onBlur={() => setEditingUserName(false)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && setEditingUserName(false)
                        }
                        placeholder={shortenAddr(userAddress, 4)}
                        style={{
                          fontSize: 22,
                          fontWeight: 700,
                          color: C.textPrimary,
                          background: "transparent",
                          border: "none",
                          borderBottom: `2px solid ${C.accent}`,
                          outline: "none",
                          width: 180,
                          padding: "2px 0",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            color: C.textPrimary,
                            fontSize: 22,
                            fontWeight: 700,
                          }}
                        >
                          {userName || shortenAddr(userAddress, 4)}
                        </span>
                        <button
                          onClick={() => setEditingUserName(true)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: C.textTertiary,
                            padding: 4,
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <Icon.Pencil />
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setTab("settings")}
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      background: C.accentSoft,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: `1.5px solid ${C.border}`,
                      color: C.textSecondary,
                      cursor: "pointer",
                    }}
                  >
                    <Icon.Settings />
                  </button>
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
                      pointerEvents: "none",
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
                      onClick={() => setBalanceVisible((b) => !b)}
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
                        : `$${nativeBalance}`
                      : "•••••"}
                  </div>
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
                      4.6% APY
                    </span>
                    <span style={{ color: C.textTertiary, fontSize: 12 }}>
                      AnoBank Pool · native yield
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
                  {cards
                    .filter((c) => !c.isMain)
                    .map((card) => {
                      const cardNum = cardNumberFromAddr(card.address);
                      const expiry = cardExpiryFromAddr(card.address);
                      const colorA = card.color;
                      const colorB = `${card.color}99`;
                      const daily =
                        parseFloat(fmtWei(card.dailyLimit, 18)) || 0;
                      const rem = parseFloat(fmtWei(card.remaining, 18)) || 0;
                      const spent = Math.max(0, daily - rem);
                      const pct =
                        daily > 0 ? Math.min((spent / daily) * 100, 100) : 0;
                      return (
                        <div
                          key={card.id}
                          onClick={() => setSelectedCardIdx(card.id)}
                          style={{
                            minWidth: 230,
                            borderRadius: 20,
                            padding: "16px 18px 0",
                            background: `linear-gradient(135deg, ${colorA} 0%, ${colorB} 100%)`,
                            cursor: "pointer",
                            flexShrink: 0,
                            position: "relative",
                            overflow: "hidden",
                            boxShadow: `0 8px 24px ${colorA}55`,
                            color: "#fff",
                          }}
                        >
                          {/* Decorative circles */}
                          <div
                            style={{
                              position: "absolute",
                              top: -25,
                              right: -25,
                              width: 110,
                              height: 110,
                              borderRadius: "50%",
                              background: "rgba(255,255,255,0.08)",
                              pointerEvents: "none",
                            }}
                          />
                          <div
                            style={{
                              position: "absolute",
                              bottom: 20,
                              right: 15,
                              width: 90,
                              height: 90,
                              borderRadius: "50%",
                              background: "rgba(255,255,255,0.05)",
                              pointerEvents: "none",
                            }}
                          />

                          {/* Top row: chip + scan */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 14,
                            }}
                          >
                            <div
                              style={{
                                width: 30,
                                height: 22,
                                borderRadius: 4,
                                background:
                                  "linear-gradient(135deg, #D4AF37 0%, #FFF3A3 50%, #D4AF37 100%)",
                                border: "1px solid rgba(255,255,255,0.4)",
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: 2,
                                padding: 4,
                                boxSizing: "border-box",
                              }}
                            >
                              {[0, 1, 2, 3].map((i) => (
                                <div
                                  key={i}
                                  style={{
                                    background: "rgba(180,140,0,0.55)",
                                    borderRadius: 1,
                                  }}
                                />
                              ))}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowQrScanner(true);
                              }}
                              style={{
                                background: "rgba(255,255,255,0.2)",
                                border: "none",
                                borderRadius: 8,
                                padding: "4px 9px",
                                color: "#fff",
                                fontSize: 10,
                                fontWeight: 600,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                letterSpacing: 0.2,
                              }}
                            >
                              <svg
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                              >
                                <rect x="3" y="3" width="7" height="7" rx="1" />
                                <rect
                                  x="14"
                                  y="3"
                                  width="7"
                                  height="7"
                                  rx="1"
                                />
                                <rect
                                  x="3"
                                  y="14"
                                  width="7"
                                  height="7"
                                  rx="1"
                                />
                                <rect
                                  x="14"
                                  y="14"
                                  width="3"
                                  height="3"
                                  rx="0.5"
                                />
                                <rect
                                  x="18"
                                  y="18"
                                  width="3"
                                  height="3"
                                  rx="0.5"
                                />
                              </svg>
                              Scan QR
                            </button>
                          </div>

                          {/* Card number */}
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 500,
                              letterSpacing: 2.5,
                              marginBottom: 12,
                              opacity: 0.92,
                              fontFamily: "monospace",
                            }}
                          >
                            {cardNum}
                          </div>

                          {/* Cardholder + expiry */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-end",
                              marginBottom: 12,
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontSize: 8,
                                  opacity: 0.65,
                                  marginBottom: 2,
                                  letterSpacing: 0.8,
                                  textTransform: "uppercase",
                                }}
                              >
                                Cardholder
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  letterSpacing: 0.5,
                                }}
                              >
                                {card.name.toUpperCase()}
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div
                                style={{
                                  fontSize: 8,
                                  opacity: 0.65,
                                  marginBottom: 2,
                                  letterSpacing: 0.8,
                                }}
                              >
                                EXPIRES
                              </div>
                              <div style={{ fontSize: 11, fontWeight: 700 }}>
                                {expiry}
                              </div>
                            </div>
                          </div>

                          {/* Spending limit bar */}
                          <div style={{ marginLeft: -18, marginRight: -18 }}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                paddingLeft: 18,
                                paddingRight: 18,
                                marginBottom: 5,
                              }}
                            >
                              <span style={{ fontSize: 9, opacity: 0.7 }}>
                                {daily > 0
                                  ? `${spent.toFixed(2)} spent`
                                  : "No limit set"}
                              </span>
                              {daily > 0 && (
                                <span style={{ fontSize: 9, opacity: 0.7 }}>
                                  ${daily.toFixed(2)}
                                </span>
                              )}
                            </div>
                            <div
                              style={{
                                height: 3,
                                background: "rgba(255,255,255,0.2)",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${pct}%`,
                                  background:
                                    pct > 80
                                      ? "#FF6B6B"
                                      : "rgba(255,255,255,0.8)",
                                  transition: "width 0.6s ease",
                                }}
                              />
                            </div>
                          </div>
                          {/* bottom padding */}
                          <div style={{ height: 14 }} />
                        </div>
                      );
                    })}
                  <div
                    onClick={() => {
                      registerEoaMutation.reset();
                      setShowAddCard(true);
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
                {/* <div
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
                    Interact directly with DeFi protocols from your AnoBank
                    account
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
                        sub: "Provide Liquidity",
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
                  </div>
                </div> */}

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
                          padding: "13px 16px",
                          gap: 12,
                          borderBottom:
                            i < Math.min(txRows.length, 5) - 1
                              ? `1px solid ${C.border}`
                              : "none",
                        }}
                      >
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 10,
                            background: tx.isCredit
                              ? C.greenSoft
                              : C.bg,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            color: tx.isCredit ? C.green : C.textTertiary,
                          }}
                        >
                          {tx.isCredit ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="19" x2="12" y2="5" />
                              <polyline points="5 12 12 5 19 12" />
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="5" y1="12" x2="19" y2="12" />
                              <polyline points="12 5 19 12 12 19" />
                            </svg>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ color: C.textSecondary, fontSize: 13, fontWeight: 500 }}>
                              {tx.name}
                            </span>
                            {tx.withdrawalStatus && (
                              <span
                                style={{
                                  fontSize: 9,
                                  fontWeight: 600,
                                  padding: "2px 6px",
                                  borderRadius: 8,
                                  background:
                                    tx.withdrawalStatus === "done"
                                      ? C.greenSoft
                                      : tx.withdrawalStatus === "failed"
                                        ? C.redSoft
                                        : `${C.accent}15`,
                                  color:
                                    tx.withdrawalStatus === "done"
                                      ? C.green
                                      : tx.withdrawalStatus === "failed"
                                        ? C.red
                                        : C.accent,
                                  textTransform: "uppercase" as const,
                                  letterSpacing: 0.3,
                                }}
                              >
                                {tx.withdrawalStatus === "done"
                                  ? "Executed"
                                  : tx.withdrawalStatus === "failed"
                                    ? "Failed"
                                    : "Pending"}
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              color: C.textTertiary,
                              fontSize: 11,
                              marginTop: 2,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {tx.date}{tx.note ? ` · ${tx.note}` : ""}
                          </div>
                        </div>
                        <div
                          style={{
                            color: tx.isCredit ? C.green : C.textSecondary,
                            fontSize: 13,
                            fontWeight: 600,
                            flexShrink: 0,
                          }}
                        >
                          {tx.isCredit ? "+" : "-"}${tx.amount.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Monthly Summary */}
                <div
                  style={{
                    color: C.textPrimary,
                    fontSize: 20,
                    fontWeight: 700,
                    marginBottom: 14,
                  }}
                >
                  {monthName} Summary
                </div>
                <div
                  style={{
                    background: C.card,
                    borderRadius: 20,
                    padding: "20px",
                    border: `1px solid ${C.border}`,
                    marginBottom: 20,
                  }}
                >
                  {/* Revenue row */}
                  {(() => {
                    const balance = parseFloat(nativeBalance) || 0;
                    const expenses = monthlySpent;
                    // Revenue = what's in the account + what was spent out this month
                    const revenue = balance + expenses;
                    const maxVal = Math.max(revenue, expenses, 0.01);
                    return [
                      {
                        emoji: "💰",
                        label: "Revenue",
                        value: `+$${revenue.toFixed(2)}`,
                        color: C.accent,
                        bar: C.accent,
                        pct: Math.round((revenue / maxVal) * 100),
                      },
                      {
                        emoji: "🧾",
                        label: "Expenses",
                        value: expenses > 0 ? `-$${expenses.toFixed(2)}` : "$0.00",
                        color: expenses > 0 ? C.red : C.textTertiary,
                        bar: C.red,
                        pct: Math.round((expenses / maxVal) * 100),
                      },
                      {
                        emoji: "📈",
                        label: "Yield earned",
                        value: "+$0.00",
                        color: C.green,
                        bar: C.green,
                        pct: 0,
                      },
                    ];
                  })().map((row, i, arr) => (
                    <div
                      key={row.label}
                      style={{ marginBottom: i < arr.length - 1 ? 18 : 0 }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 6,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span style={{ fontSize: 16 }}>{row.emoji}</span>
                          <span
                            style={{
                              color: C.textSecondary,
                              fontSize: 14,
                            }}
                          >
                            {row.label}
                          </span>
                        </div>
                        <span
                          style={{
                            color: row.color,
                            fontSize: 16,
                            fontWeight: 700,
                          }}
                        >
                          {row.value}
                        </span>
                      </div>
                      <div
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          borderRadius: 4,
                          height: 4,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            borderRadius: 4,
                            width: `${row.pct}%`,
                            background: row.bar,
                            transition: "width 0.8s ease",
                          }}
                        />
                      </div>
                    </div>
                  ))}

                  {/* Divider + Net */}
                  <div
                    style={{
                      borderTop: `1px solid ${C.border}`,
                      marginTop: 18,
                      paddingTop: 14,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 14,
                    }}
                  >
                    <span style={{ color: C.textSecondary, fontSize: 14 }}>
                      Net this month
                    </span>
                    <span
                      style={{
                        color: C.green,
                        fontSize: 20,
                        fontWeight: 700,
                      }}
                    >
                      {parseFloat(nativeBalance) >= 0
                        ? `+$${parseFloat(nativeBalance).toFixed(2)}`
                        : `-$${Math.abs(parseFloat(nativeBalance)).toFixed(2)}`}
                    </span>
                  </div>

                  {/* Insight box */}
                  <div
                    style={{
                      background: "rgba(0,168,107,0.10)",
                      border: `1px solid rgba(0,168,107,0.20)`,
                      borderRadius: 14,
                      padding: "14px 16px",
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                    }}
                  >
                    <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>
                      💡
                    </span>
                    <span
                      style={{ color: C.green, fontSize: 13, lineHeight: 1.55 }}
                    >
                      Your current balance is{" "}
                      <strong>${parseFloat(nativeBalance).toFixed(2)}</strong>.
                      Yield tracking coming soon.
                    </span>
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
                {cards
                  .filter((c) => !c.isMain)
                  .map((card) => {
                    const daily = parseFloat(fmtWei(card.dailyLimit, 18)) || 0;
                    const rem = parseFloat(fmtWei(card.remaining, 18)) || 0;
                    const spent = Math.max(0, daily - rem);
                    const pct = daily > 0 ? (spent / daily) * 100 : 0;
                    const cardNum = cardNumberFromAddr(card.address);
                    const expiry = cardExpiryFromAddr(card.address);
                    const colorA = card.color;
                    const colorB = card.isMain ? "#4A3ABF" : `${card.color}99`;
                    return (
                      <div key={card.id} style={{ marginBottom: 16 }}>
                        {/* Credit card visual */}
                        <div
                          onClick={() => setSelectedCardIdx(card.id)}
                          style={{
                            width: "100%",
                            height: 180,
                            borderRadius: 22,
                            padding: "20px 22px",
                            background: `linear-gradient(135deg, ${colorA} 0%, ${colorB} 100%)`,
                            cursor: "pointer",
                            position: "relative",
                            overflow: "hidden",
                            boxShadow: `0 10px 30px ${colorA}44`,
                            color: "#fff",
                            boxSizing: "border-box",
                            marginBottom: 10,
                          }}
                        >
                          {/* Decorative circles */}
                          <div
                            style={{
                              position: "absolute",
                              top: -30,
                              right: -30,
                              width: 140,
                              height: 140,
                              borderRadius: "50%",
                              background: "rgba(255,255,255,0.08)",
                              pointerEvents: "none",
                            }}
                          />
                          <div
                            style={{
                              position: "absolute",
                              bottom: -40,
                              right: 20,
                              width: 110,
                              height: 110,
                              borderRadius: "50%",
                              background: "rgba(255,255,255,0.05)",
                              pointerEvents: "none",
                            }}
                          />

                          {/* Top row: chip + badges */}
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
                                width: 34,
                                height: 26,
                                borderRadius: 5,
                                background:
                                  "linear-gradient(135deg, #D4AF37 0%, #FFF3A3 50%, #D4AF37 100%)",
                                border: "1px solid rgba(255,255,255,0.4)",
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: 2,
                                padding: 4,
                                boxSizing: "border-box",
                              }}
                            >
                              {[0, 1, 2, 3].map((i) => (
                                <div
                                  key={i}
                                  style={{
                                    background: "rgba(180,140,0,0.55)",
                                    borderRadius: 1,
                                  }}
                                />
                              ))}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              {card.isMain && (
                                <div
                                  style={{
                                    background: "rgba(255,255,255,0.25)",
                                    borderRadius: 6,
                                    padding: "2px 8px",
                                    fontSize: 9,
                                    fontWeight: 700,
                                    letterSpacing: 0.5,
                                  }}
                                >
                                  MAIN
                                </div>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowQrScanner(true);
                                }}
                                style={{
                                  background: "rgba(255,255,255,0.2)",
                                  border: "none",
                                  borderRadius: 8,
                                  padding: "4px 9px",
                                  color: "#fff",
                                  fontSize: 10,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                  letterSpacing: 0.2,
                                }}
                              >
                                <svg
                                  width="10"
                                  height="10"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                >
                                  <rect
                                    x="3"
                                    y="3"
                                    width="7"
                                    height="7"
                                    rx="1"
                                  />
                                  <rect
                                    x="14"
                                    y="3"
                                    width="7"
                                    height="7"
                                    rx="1"
                                  />
                                  <rect
                                    x="3"
                                    y="14"
                                    width="7"
                                    height="7"
                                    rx="1"
                                  />
                                  <rect
                                    x="14"
                                    y="14"
                                    width="3"
                                    height="3"
                                    rx="0.5"
                                  />
                                  <rect
                                    x="18"
                                    y="18"
                                    width="3"
                                    height="3"
                                    rx="0.5"
                                  />
                                </svg>
                                Scan QR
                              </button>
                            </div>
                          </div>

                          {/* Card number */}
                          <div
                            style={{
                              fontSize: 15,
                              fontWeight: 500,
                              letterSpacing: 3,
                              marginBottom: 16,
                              opacity: 0.92,
                              fontFamily: "monospace",
                            }}
                          >
                            {cardNum}
                          </div>

                          {/* Bottom row */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-end",
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontSize: 9,
                                  opacity: 0.65,
                                  marginBottom: 3,
                                  letterSpacing: 0.8,
                                  textTransform: "uppercase",
                                }}
                              >
                                Cardholder
                              </div>
                              <div
                                style={{
                                  fontSize: 12,
                                  fontWeight: 700,
                                  letterSpacing: 0.5,
                                }}
                              >
                                {card.name.toUpperCase()}
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div
                                style={{
                                  fontSize: 9,
                                  opacity: 0.65,
                                  marginBottom: 3,
                                  letterSpacing: 0.8,
                                }}
                              >
                                EXPIRES
                              </div>
                              <div style={{ fontSize: 12, fontWeight: 700 }}>
                                {expiry}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Below card: name, balance, limit bar */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 6,
                            paddingLeft: 4,
                            paddingRight: 4,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            {editingCardAddr === card.address ? (
                              <input
                                autoFocus
                                value={
                                  cardNames[card.address.toLowerCase()] ??
                                  card.name
                                }
                                onChange={(e) =>
                                  setCardNames((prev) => ({
                                    ...prev,
                                    [card.address.toLowerCase()]: e.target.value,
                                  }))
                                }
                                onBlur={() => setEditingCardAddr(null)}
                                onKeyDown={(e) =>
                                  e.key === "Enter" && setEditingCardAddr(null)
                                }
                                style={{
                                  fontSize: 14,
                                  fontWeight: 600,
                                  color: C.textPrimary,
                                  background: "transparent",
                                  border: "none",
                                  borderBottom: `2px solid ${C.accent}`,
                                  outline: "none",
                                  width: 130,
                                  padding: "1px 0",
                                }}
                              />
                            ) : (
                              <>
                                <span
                                  style={{
                                    color: C.textPrimary,
                                    fontSize: 14,
                                    fontWeight: 600,
                                  }}
                                >
                                  {card.name}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCardNames((prev) => ({
                                      ...prev,
                                      [card.address.toLowerCase()]:
                                        prev[card.address.toLowerCase()] ??
                                        card.name,
                                    }));
                                    setEditingCardAddr(card.address);
                                  }}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: C.textTertiary,
                                    padding: 3,
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                >
                                  <Icon.Pencil />
                                </button>
                              </>
                            )}
                          </div>
                          <div
                            style={{
                              color: C.textPrimary,
                              fontSize: 14,
                              fontWeight: 700,
                            }}
                          >
                            {card.isMain ? `$${nativeBalance}` : "—"}
                          </div>
                        </div>
                        <div style={{ paddingLeft: 4, paddingRight: 4 }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 4,
                            }}
                          >
                            <span
                              style={{ color: C.textTertiary, fontSize: 11 }}
                            >
                              {daily > 0
                                ? `Spent ${spent.toFixed(4)} $`
                                : "No daily limit set"}
                            </span>
                            {daily > 0 && (
                              <span
                                style={{ color: C.textTertiary, fontSize: 11 }}
                              >
                                Limit {daily.toFixed(4)} $
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              background: C.border,
                              borderRadius: 4,
                              height: 4,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                borderRadius: 4,
                                width: `${Math.min(pct, 100)}%`,
                                background:
                                  pct > 80
                                    ? C.red
                                    : daily > 0
                                      ? card.color
                                      : C.border,
                                transition: "width 0.6s ease",
                              }}
                            />
                          </div>
                        </div>
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
                    No transactions yet.
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
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 10,
                            background: tx.isCredit ? C.greenSoft : C.bg,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            color: tx.isCredit ? C.green : C.textTertiary,
                          }}
                        >
                          {tx.isCredit ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="19" x2="12" y2="5" />
                              <polyline points="5 12 12 5 19 12" />
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="5" y1="12" x2="19" y2="12" />
                              <polyline points="12 5 19 12 12 19" />
                            </svg>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ color: C.textSecondary, fontSize: 13, fontWeight: 500 }}>
                              {tx.name}
                            </span>
                            {tx.withdrawalStatus && (
                              <span
                                style={{
                                  fontSize: 9,
                                  fontWeight: 600,
                                  padding: "2px 6px",
                                  borderRadius: 8,
                                  background:
                                    tx.withdrawalStatus === "done"
                                      ? C.greenSoft
                                      : tx.withdrawalStatus === "failed"
                                        ? C.redSoft
                                        : `${C.accent}15`,
                                  color:
                                    tx.withdrawalStatus === "done"
                                      ? C.green
                                      : tx.withdrawalStatus === "failed"
                                        ? C.red
                                        : C.accent,
                                  textTransform: "uppercase" as const,
                                  letterSpacing: 0.3,
                                }}
                              >
                                {tx.withdrawalStatus === "done"
                                  ? "Executed"
                                  : tx.withdrawalStatus === "failed"
                                    ? "Failed"
                                    : "Pending"}
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              color: C.textTertiary,
                              fontSize: 11,
                              marginTop: 2,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {tx.date}
                            {tx.note ? ` · ${tx.note}` : ""}
                            {tx.txHash ? ` · ${shortenAddr(tx.txHash, 4)}` : ""}
                          </div>
                        </div>
                        <div
                          style={{
                            color: tx.isCredit ? C.green : C.textSecondary,
                            fontSize: 13,
                            fontWeight: 600,
                            flexShrink: 0,
                          }}
                        >
                          {tx.isCredit ? "+" : "-"}${tx.amount.toFixed(2)}
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
                  Access DeFi protocols directly from your AnoBank account
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
                    {shortenAddr(userAddress, 4)}
                  </div>
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

                {/* Generate Payment QR */}
                <div
                  onClick={() => setShowQrGenerator(true)}
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
                      Generate Payment QR
                    </div>
                    <div
                      style={{
                        color: C.textTertiary,
                        fontSize: 11,
                        marginTop: 1,
                      }}
                    >
                      Share your address as a scannable QR code
                    </div>
                  </div>
                  <div style={{ color: C.textTertiary }}>
                    <Icon.ArrowRight />
                  </div>
                </div>

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
              onClose={() => {
                setShowTransfer(false);
                setQrPreset(null);
              }}
              spendInteractorAddress={spendInteractorAddress}
              userAddress={userAddress}
              getAccessToken={getAccessToken}
              initialRecipient={qrPreset?.address ?? ""}
              initialAmount={qrPreset?.amount ?? ""}
              cards={cards}
            />
          )}
          {showQrScanner && (
            <QRScannerModal
              onClose={() => setShowQrScanner(false)}
              onScan={(address, amount) => {
                setShowQrScanner(false);
                setQrPreset({ address, amount });
                setShowTransfer(true);
              }}
            />
          )}
          {showDeposit && (
            <DepositModal
              onClose={() => setShowDeposit(false)}
              depositorAddress={userAddress}
              accountNumber={accountNumberData?.accountNumber ?? null}
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
              onAdd={(dailyLimit) => registerEoaMutation.mutate({ dailyLimit })}
              registering={registerEoaMutation.isPending}
              error={dataError}
            />
          )}
          {showQrGenerator && (
            <QRGeneratorModal
              onClose={() => setShowQrGenerator(false)}
              defaultAddress={userAddress ?? ""}
            />
          )}
        </div>
      </div>
    </div>
  );
}
