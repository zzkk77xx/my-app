import { useState, useEffect } from "react";
import {
  useUnlink,
  useUnlinkHistory,
  useSend,
  useTxStatus,
  formatAmount,
  parseAmount,
  shortenHex,
} from "@unlink-xyz/react";
import { usePrivy, useWallets } from "@privy-io/react-auth";

const NATIVE_TOKEN = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

function badgeColor(s: string) {
  if (s === "confirmed" || s === "success") return "#1e7e34";
  if (s === "pending") return "#856404";
  if (s === "failed" || s === "error") return "#721c24";
  return "#444";
}

function kindColor(k: string) {
  if (k === "send") return "#646cff";
  if (k === "deposit") return "#1e7e34";
  if (k === "withdrawal") return "#856404";
  return "#444";
}

const btn =
  "bg-[#646cff] border-none rounded-md text-white px-5 py-2.5 text-sm cursor-pointer mr-2 mb-2 disabled:opacity-50";
const btnDanger =
  "bg-[#c0392b] border-none rounded-md text-white px-5 py-2.5 text-sm cursor-pointer mr-2 mb-2";
const btnGhost =
  "bg-transparent border border-[#444] rounded-md text-[#aaa] px-5 py-2.5 text-sm cursor-pointer mr-2 mb-2";
const btnSm =
  "bg-[#646cff] border-none rounded text-white px-2.5 py-1 text-[0.8rem] cursor-pointer";
const btnSmGhost =
  "bg-transparent border border-[#444] rounded text-[#aaa] px-2.5 py-1 text-[0.8rem] cursor-pointer";
const linkBtn =
  "bg-transparent border-none text-[#646cff] cursor-pointer text-sm p-0 underline";
const inputCls =
  "w-full bg-[#1a1a1a] border border-[#444] rounded-md text-[#e0e0e0] px-2.5 py-2 text-sm box-border outline-none mb-3";
const monoBox =
  "bg-[#111] border border-[#333] rounded-md px-3.5 py-2.5 text-[0.82rem] break-all mb-3 text-[#b0ffb0] font-mono";
const errorBox =
  "bg-[#3a1a1a] border border-[#c0392b] rounded-md px-3.5 py-2.5 text-[#ff8080] text-sm mb-3";
const warningBox =
  "bg-[#2a2000] border border-[#a08000] rounded-md px-3.5 py-2.5 text-[#ffd060] text-sm mb-3";
const infoBox =
  "bg-[#1a2a3a] border border-[#3a6a9a] rounded-md px-3.5 py-2.5 text-[#80c0ff] text-sm mb-3";
const labelCls = "block mb-1.5 text-[0.8rem] text-[#aaa]";
const rowCls = "flex items-center justify-between py-2 border-b border-[#333]";
const sectionCls = "mb-5";
const spinner =
  "inline-block w-[18px] h-[18px] border-2 border-[#444] border-t-[#646cff] rounded-full animate-spin mr-2.5 align-middle";

export default function Wallet() {
  // ── Setup flow
  const [setupScreen, setSetupScreen] = useState<
    "choice" | "backup" | "import"
  >("choice");
  const [newMnemonic, setNewMnemonic] = useState("");
  const [importInput, setImportInput] = useState("");

  // ── Main nav
  const [activeTab, setActiveTab] = useState<
    "overview" | "send" | "history" | "accounts" | "settings"
  >("overview");

  // ── Send form
  const [sendToken, setSendToken] = useState(NATIVE_TOKEN);
  const [sendTokenCustom, setSendTokenCustom] = useState("");
  const [sendRecipient, setSendRecipient] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [lastRelayId, setLastRelayId] = useState<string | null>(null);

  // ── Settings
  const [exportedMnemonic, setExportedMnemonic] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  // ── Privy (unconditional)
  const {
    ready: privyReady,
    authenticated,
    login,
    logout,
    getAccessToken,
  } = usePrivy();
  const { wallets } = useWallets();
  const externalWallet = wallets[0];

  // Only surface the address once both `authenticated` and the wallet address
  // are settled — clears immediately on logout so stale addresses never linger.
  const [confirmedAddress, setConfirmedAddress] = useState<string | null>(null);
  useEffect(() => {
    if (!authenticated) {
      setConfirmedAddress(null);
    } else if (authenticated && externalWallet?.address) {
      setConfirmedAddress(externalWallet.address);
    }
  }, [authenticated, externalWallet?.address]);

  // Register user with backend on first login (idempotent — safe to call every time)
  useEffect(() => {
    if (!authenticated || !externalWallet?.address) return;
    getAccessToken().then((token) => {
      fetch(`${API_URL}/users/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ address: externalWallet.address }),
      }).catch((err) => console.error("[register] failed:", err));
    });
  }, [authenticated, externalWallet?.address]);

  // ── Hooks (unconditional)
  const {
    ready,
    walletExists,
    busy,
    status,
    error,
    clearError,
    accounts,
    activeAccount,
    activeAccountIndex,
    balances,
    pendingSends,
    pendingDeposits,
    pendingWithdrawals,
    createWallet,
    importWallet,
    exportMnemonic,
    clearWallet,
    createAccount,
    switchAccount,
    refresh,
    forceResync,
  } = useUnlink();

  const {
    history,
    loading: historyLoading,
    error: historyError,
    refresh: refreshHistory,
  } = useUnlinkHistory();

  const {
    send,
    isPending: sendPending,
    error: sendError,
    reset: resetSend,
  } = useSend();

  const txStatus = useTxStatus(lastRelayId);

  // ── Handlers
  async function handleCreateWallet() {
    const { mnemonic } = await createWallet();
    setNewMnemonic(mnemonic);
    setSetupScreen("backup");
  }

  async function handleConfirmBackup() {
    await createAccount();
    setNewMnemonic("");
    setSetupScreen("choice");
  }

  async function handleImportWallet() {
    const m = importInput.trim();
    if (!m) return;
    await importWallet(m);
    setImportInput("");
  }

  async function handleSend() {
    if (!sendAmount || !sendRecipient) return;
    resetSend();
    setLastRelayId(null);
    // Pre-register recipient mapping so the watcher can resolve it if a
    // SpendAuthorized event fires for the same address later.
    fetch(`${API_URL}/recipients/by-address`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: sendRecipient }),
    }).catch(() => {
      /* best-effort, don't block the send */
    });
    const token = sendToken === "custom" ? sendTokenCustom.trim() : sendToken;
    const amount = parseAmount(sendAmount, 18);
    const result = await send([{ token, recipient: sendRecipient, amount }]);
    setLastRelayId(result.relayId);
    setSendAmount("");
    setSendRecipient("");
  }

  async function handleExportMnemonic() {
    const m = await exportMnemonic();
    setExportedMnemonic(m);
  }

  // ── Screen gates
  if (!ready) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] text-[#e0e0e0] font-mono flex flex-col items-center py-8 px-4">
        <div className="bg-[#242424] border border-[#444] rounded-xl p-8 w-full max-w-[520px]">
          <h1 className="m-0 mb-6 text-[1.4rem] text-white">Unlink Wallet</h1>
          <div>
            <span className={spinner} />
            {status || "Initializing..."}
          </div>
        </div>
      </div>
    );
  }

  if (!walletExists) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] text-[#e0e0e0] font-mono flex flex-col items-center py-8 px-4">
        <div className="bg-[#242424] border border-[#444] rounded-xl p-8 w-full max-w-[520px]">
          <h1 className="m-0 mb-6 text-[1.4rem] text-white">Unlink Wallet</h1>
          {error && (
            <div className={errorBox}>
              {String(error)}
              <button className={`${linkBtn} ml-2`} onClick={clearError}>
                Dismiss
              </button>
            </div>
          )}
          {busy && (
            <div className={infoBox}>
              <span className={spinner} />
              {status}
            </div>
          )}

          {setupScreen === "choice" && (
            <>
              <p className="text-[#aaa] mb-5">
                No wallet found. Create a new one or import an existing wallet.
              </p>
              <button
                className={btn}
                onClick={handleCreateWallet}
                disabled={busy}
              >
                Create Wallet
              </button>
              <br />
              <button
                className={linkBtn}
                onClick={() => setSetupScreen("import")}
              >
                Import existing wallet
              </button>

              <div className="border-t border-[#333] mt-5 pt-5">
                <p className="text-[#888] text-[0.8rem] mb-3">
                  Or connect an external wallet
                </p>
                {!privyReady ? (
                  <button className={btnGhost} disabled>
                    Loading…
                  </button>
                ) : confirmedAddress ? (
                  <div className={infoBox}>
                    <div className="text-[0.8rem] mb-2">
                      Connected: {shortenHex(confirmedAddress, 6)}
                    </div>
                    <button className={btnGhost} onClick={logout}>
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <button className={btnGhost} onClick={login}>
                    Connect Wallet
                  </button>
                )}
              </div>
            </>
          )}

          {setupScreen === "backup" && (
            <>
              <h2 className="m-0 mb-4 text-[1.1rem] text-[#ccc]">
                Back up your recovery phrase
              </h2>
              <div className={warningBox}>
                Write these words down and store them somewhere safe. Anyone
                with this phrase can access your funds.
              </div>
              <div className={monoBox}>{newMnemonic}</div>
              <button
                className={btn}
                onClick={handleConfirmBackup}
                disabled={busy}
              >
                I've backed it up — continue
              </button>
            </>
          )}

          {setupScreen === "import" && (
            <>
              <h2 className="m-0 mb-4 text-[1.1rem] text-[#ccc]">
                Import wallet
              </h2>
              <label className={labelCls}>
                Recovery phrase (12 or 24 words)
              </label>
              <textarea
                className="w-full bg-[#1a1a1a] border border-[#444] rounded-md text-[#e0e0e0] px-2.5 py-2 text-[0.85rem] font-mono box-border outline-none resize-y min-h-[80px] mb-3"
                value={importInput}
                onChange={(e) => setImportInput(e.target.value)}
                placeholder="word1 word2 word3 ..."
                rows={4}
              />
              <button
                className={btn}
                onClick={handleImportWallet}
                disabled={busy || !importInput.trim()}
              >
                Import
              </button>
              <button
                className={linkBtn}
                onClick={() => setSetupScreen("choice")}
              >
                Back
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!activeAccount) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] text-[#e0e0e0] font-mono flex flex-col items-center py-8 px-4">
        <div className="bg-[#242424] border border-[#444] rounded-xl p-8 w-full max-w-[520px]">
          <h1 className="m-0 mb-6 text-[1.4rem] text-white">Unlink Wallet</h1>
          {busy && (
            <div className={infoBox}>
              <span className={spinner} />
              {status}
            </div>
          )}
          <p className="text-[#aaa]">
            Your wallet is ready. Create your first account to get started.
          </p>
          <button
            className={btn}
            onClick={() => createAccount()}
            disabled={busy}
          >
            Create Account
          </button>
        </div>
      </div>
    );
  }

  // ── Main wallet view
  const effectiveToken =
    sendToken === "custom" ? sendTokenCustom.trim() : sendToken;
  const selectedBalance = balances[effectiveToken];
  const hasPending =
    (pendingSends?.length ?? 0) > 0 ||
    (pendingDeposits?.length ?? 0) > 0 ||
    (pendingWithdrawals?.length ?? 0) > 0;

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-[#e0e0e0] font-mono flex flex-col items-center py-8 px-4">
      <div className="bg-[#242424] border border-[#444] rounded-xl p-8 w-full max-w-[520px]">
        <h1 className="m-0 mb-6 text-[1.4rem] text-white">Unlink Wallet</h1>

        {/* Global error */}
        {error && (
          <div className={errorBox}>
            {String(error)}
            <button className={`${linkBtn} ml-2`} onClick={clearError}>
              Dismiss
            </button>
          </div>
        )}

        {/* Busy indicator */}
        {busy && (
          <div className={infoBox}>
            <span className={spinner} />
            {status}
          </div>
        )}

        {/* Tab bar */}
        <div className="flex border-b border-[#444] mb-5 gap-0.5 flex-wrap">
          {(
            ["overview", "send", "history", "accounts", "settings"] as const
          ).map((t) => (
            <button
              key={t}
              className={`bg-transparent border-none border-b-2 ${activeTab === t ? "border-b-[#646cff] text-[#646cff]" : "border-b-transparent text-[#888]"} px-3.5 py-2 cursor-pointer text-[0.85rem] -mb-px`}
              onClick={() => setActiveTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Overview tab */}
        {activeTab === "overview" && (
          <div>
            <div className={sectionCls}>
              <label className={labelCls}>Active address</label>
              <div className={monoBox}>{activeAccount.address}</div>
            </div>

            <div className={sectionCls}>
              <label className={labelCls}>Balances</label>
              {Object.keys(balances).length === 0 ? (
                <p className="text-[#666] text-[0.85rem]">No balances yet</p>
              ) : (
                Object.entries(balances).map(([token, bal]) => (
                  <div key={token} className={rowCls}>
                    <span className="text-[0.8rem] text-[#888]">
                      {shortenHex(token, 6)}
                    </span>
                    <span>{formatAmount(bal, 18)}</span>
                  </div>
                ))
              )}
            </div>

            {hasPending && (
              <div className={sectionCls}>
                <label className={labelCls}>Pending operations</label>
                {(pendingSends ?? []).map((p: any, i: number) => (
                  <div key={i} className={rowCls}>
                    <span
                      className="inline-block text-white rounded px-1.5 py-0.5 text-[0.75rem] mr-1.5"
                      style={{ background: "#646cff" }}
                    >
                      send
                    </span>
                    <span className="text-[0.8rem] text-[#aaa]">
                      {JSON.stringify(p)}
                    </span>
                  </div>
                ))}
                {(pendingDeposits ?? []).map((p: any, i: number) => (
                  <div key={i} className={rowCls}>
                    <span
                      className="inline-block text-white rounded px-1.5 py-0.5 text-[0.75rem] mr-1.5"
                      style={{ background: "#1e7e34" }}
                    >
                      deposit
                    </span>
                    <span className="text-[0.8rem] text-[#aaa]">
                      {JSON.stringify(p)}
                    </span>
                  </div>
                ))}
                {(pendingWithdrawals ?? []).map((p: any, i: number) => (
                  <div key={i} className={rowCls}>
                    <span
                      className="inline-block text-white rounded px-1.5 py-0.5 text-[0.75rem] mr-1.5"
                      style={{ background: "#856404" }}
                    >
                      withdrawal
                    </span>
                    <span className="text-[0.8rem] text-[#aaa]">
                      {JSON.stringify(p)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className={sectionCls}>
              <label className={labelCls}>External wallet</label>
              {!privyReady ? (
                <p className="text-[#666] text-[0.85rem]">Loading…</p>
              ) : confirmedAddress ? (
                <div className="flex items-center justify-between">
                  <span className="text-[0.85rem] text-[#e0e0e0]">
                    {shortenHex(confirmedAddress, 8)}
                  </span>
                  <button className={btnSmGhost} onClick={logout}>
                    Disconnect
                  </button>
                </div>
              ) : (
                <button className={btnGhost} onClick={login}>
                  Connect Wallet
                </button>
              )}
            </div>

            <button className={btn} onClick={() => refresh()} disabled={busy}>
              Refresh
            </button>
            <button
              className={btnGhost}
              onClick={() => forceResync()}
              disabled={busy}
            >
              Force Resync
            </button>
          </div>
        )}

        {/* ── Send tab */}
        {activeTab === "send" && (
          <div>
            <div className={sectionCls}>
              <label className={labelCls}>Token</label>
              <select
                className={inputCls}
                value={sendToken}
                onChange={(e) => setSendToken(e.target.value)}
              >
                <option value={NATIVE_TOKEN}>
                  Native ETH ({shortenHex(NATIVE_TOKEN, 6)})
                </option>
                <option value="custom">Custom token address…</option>
              </select>
              {sendToken === "custom" && (
                <input
                  className={inputCls}
                  value={sendTokenCustom}
                  onChange={(e) => setSendTokenCustom(e.target.value)}
                  placeholder="0x..."
                />
              )}
              {selectedBalance !== undefined && (
                <div className="text-[0.8rem] text-[#aaa] mb-2">
                  Available: {formatAmount(selectedBalance, 18)}
                </div>
              )}
            </div>

            <div className={sectionCls}>
              <label className={labelCls}>Recipient</label>
              <input
                className={inputCls}
                value={sendRecipient}
                onChange={(e) => setSendRecipient(e.target.value)}
                placeholder="unlink1... or 0x..."
              />
            </div>

            <div className={sectionCls}>
              <label className={labelCls}>Amount</label>
              <input
                className={inputCls}
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                placeholder="0.0"
                type="number"
                min="0"
              />
            </div>

            <button
              className={`${btn} disabled:opacity-50`}
              onClick={handleSend}
              disabled={sendPending || busy || !sendAmount || !sendRecipient}
            >
              {sendPending ? "Sending…" : "Send"}
            </button>

            {sendError && (
              <div className={`${errorBox} mt-3`}>{String(sendError)}</div>
            )}

            {lastRelayId && (
              <div className={`${infoBox} mt-3`}>
                <div>
                  <strong>Relay ID:</strong> {shortenHex(lastRelayId, 8)}
                </div>
                {txStatus && (
                  <>
                    <div>
                      <strong>Status:</strong>{" "}
                      <span
                        className="inline-block text-white rounded px-1.5 py-0.5 text-[0.75rem] mr-1.5"
                        style={{ background: badgeColor(txStatus.state ?? "") }}
                      >
                        {txStatus.state}
                      </span>
                    </div>
                    {txStatus.txHash && (
                      <div className="mt-1">
                        <strong>Tx:</strong> {shortenHex(txStatus.txHash, 8)}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── History tab */}
        {activeTab === "history" && (
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-[#aaa] text-[0.85rem]">
                Transaction history
              </span>
              <button className={btnSm} onClick={() => refreshHistory()}>
                Refresh
              </button>
            </div>

            {historyLoading && (
              <div className="text-[#888]">
                <span className={spinner} />
                Loading…
              </div>
            )}

            {historyError && (
              <div className={errorBox}>{String(historyError)}</div>
            )}

            {!historyLoading &&
              !historyError &&
              (!history || history.length === 0) && (
                <p className="text-[#666] text-[0.85rem]">
                  No transactions yet.
                </p>
              )}

            {(history ?? []).map((entry: any) => (
              <div
                key={entry.id}
                className={`${rowCls} flex-col items-start gap-1`}
              >
                <div>
                  <span
                    className="inline-block text-white rounded px-1.5 py-0.5 text-[0.75rem] mr-1.5"
                    style={{ background: kindColor(entry.kind) }}
                  >
                    {entry.kind}
                  </span>
                  <span
                    className="inline-block text-white rounded px-1.5 py-0.5 text-[0.75rem] mr-1.5"
                    style={{ background: badgeColor(entry.status) }}
                  >
                    {entry.status}
                  </span>
                  {entry.txHash && (
                    <span className="text-[0.78rem] text-[#888]">
                      {shortenHex(entry.txHash, 8)}
                    </span>
                  )}
                </div>
                {(entry.amounts ?? []).map((a: any, i: number) => (
                  <div
                    key={i}
                    className={`text-[0.82rem] ${Number(a.delta) < 0 ? "text-[#ff8080]" : "text-[#80ff80]"}`}
                  >
                    {a.delta} {shortenHex(a.token, 6)}
                  </div>
                ))}
                {entry.timestamp && (
                  <div className="text-[0.75rem] text-[#666]">
                    {new Date(entry.timestamp).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Accounts tab */}
        {activeTab === "accounts" && (
          <div>
            {(accounts ?? []).map((acc: any, i: number) => (
              <div key={i} className={rowCls}>
                <div>
                  <div
                    className={`text-[0.85rem] ${i === activeAccountIndex ? "text-[#646cff]" : "text-[#ccc]"}`}
                  >
                    Account #{i} {i === activeAccountIndex && "(active)"}
                  </div>
                  <div className="text-[0.78rem] text-[#888]">
                    {shortenHex(acc.address, 6)}
                  </div>
                </div>
                <button
                  className={i === activeAccountIndex ? btnSmGhost : btnSm}
                  onClick={() => switchAccount(i)}
                  disabled={i === activeAccountIndex || busy}
                >
                  {i === activeAccountIndex ? "Active" : "Switch"}
                </button>
              </div>
            ))}
            <div className="mt-4">
              <button
                className={btn}
                onClick={() => createAccount()}
                disabled={busy}
              >
                Create Account
              </button>
            </div>
          </div>
        )}

        {/* ── Settings tab */}
        {activeTab === "settings" && (
          <div>
            <div className={sectionCls}>
              <h2 className="m-0 mb-4 text-[1.1rem] text-[#ccc]">
                Export recovery phrase
              </h2>
              <button
                className={btn}
                onClick={handleExportMnemonic}
                disabled={busy}
              >
                Show recovery phrase
              </button>
              {exportedMnemonic && (
                <>
                  <div className={`${warningBox} mt-2`}>
                    Keep this private. Anyone with this phrase controls your
                    wallet.
                  </div>
                  <div className={monoBox}>{exportedMnemonic}</div>
                  <button
                    className={btnGhost}
                    onClick={() => setExportedMnemonic("")}
                  >
                    Hide
                  </button>
                </>
              )}
            </div>

            <div className={`${sectionCls} border-t border-[#3a1a1a] pt-5`}>
              <h2 className="m-0 mb-4 text-[1.1rem] text-[#ff8080]">
                Danger zone
              </h2>
              {!confirmClear ? (
                <button
                  className={btnDanger}
                  onClick={() => setConfirmClear(true)}
                >
                  Clear Wallet
                </button>
              ) : (
                <div>
                  <div className={warningBox}>
                    This will permanently delete your wallet from this device.
                    Make sure you have your recovery phrase.
                  </div>
                  <button
                    className={btnDanger}
                    onClick={() => {
                      clearWallet();
                      setConfirmClear(false);
                    }}
                  >
                    Yes, clear wallet
                  </button>
                  <button
                    className={btnGhost}
                    onClick={() => setConfirmClear(false)}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
