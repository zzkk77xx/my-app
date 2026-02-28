import { useState } from "react";
import {
  useUnlink,
  useUnlinkHistory,
  useSend,
  useTxStatus,
  formatAmount,
  parseAmount,
  shortenHex,
} from "@unlink-xyz/react";

const S = {
  root: {
    minHeight: "100vh",
    background: "#1a1a1a",
    color: "#e0e0e0",
    fontFamily: "monospace",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    padding: "32px 16px",
  },
  card: {
    background: "#242424",
    border: "1px solid #444",
    borderRadius: "12px",
    padding: "32px",
    width: "100%",
    maxWidth: "520px",
    boxSizing: "border-box" as const,
  },
  h1: { margin: "0 0 24px", fontSize: "1.4rem", color: "#fff" },
  h2: { margin: "0 0 16px", fontSize: "1.1rem", color: "#ccc" },
  label: { display: "block", marginBottom: "6px", fontSize: "0.8rem", color: "#aaa" },
  input: {
    width: "100%",
    background: "#1a1a1a",
    border: "1px solid #444",
    borderRadius: "6px",
    color: "#e0e0e0",
    padding: "8px 10px",
    fontSize: "0.9rem",
    boxSizing: "border-box" as const,
    outline: "none",
    marginBottom: "12px",
  },
  textarea: {
    width: "100%",
    background: "#1a1a1a",
    border: "1px solid #444",
    borderRadius: "6px",
    color: "#e0e0e0",
    padding: "8px 10px",
    fontSize: "0.85rem",
    fontFamily: "monospace",
    boxSizing: "border-box" as const,
    outline: "none",
    resize: "vertical" as const,
    minHeight: "80px",
    marginBottom: "12px",
  },
  btn: {
    background: "#646cff",
    border: "none",
    borderRadius: "6px",
    color: "#fff",
    padding: "10px 20px",
    fontSize: "0.9rem",
    cursor: "pointer",
    marginRight: "8px",
    marginBottom: "8px",
  },
  btnDanger: {
    background: "#c0392b",
    border: "none",
    borderRadius: "6px",
    color: "#fff",
    padding: "10px 20px",
    fontSize: "0.9rem",
    cursor: "pointer",
    marginRight: "8px",
    marginBottom: "8px",
  },
  btnGhost: {
    background: "transparent",
    border: "1px solid #444",
    borderRadius: "6px",
    color: "#aaa",
    padding: "10px 20px",
    fontSize: "0.9rem",
    cursor: "pointer",
    marginRight: "8px",
    marginBottom: "8px",
  },
  btnSm: {
    background: "#646cff",
    border: "none",
    borderRadius: "4px",
    color: "#fff",
    padding: "4px 10px",
    fontSize: "0.8rem",
    cursor: "pointer",
  },
  btnSmGhost: {
    background: "transparent",
    border: "1px solid #444",
    borderRadius: "4px",
    color: "#aaa",
    padding: "4px 10px",
    fontSize: "0.8rem",
    cursor: "pointer",
  },
  link: {
    background: "none",
    border: "none",
    color: "#646cff",
    cursor: "pointer",
    fontSize: "0.9rem",
    padding: 0,
    textDecoration: "underline",
  },
  mono: {
    background: "#111",
    border: "1px solid #333",
    borderRadius: "6px",
    padding: "10px 14px",
    fontSize: "0.82rem",
    wordBreak: "break-all" as const,
    marginBottom: "12px",
    color: "#b0ffb0",
  },
  error: {
    background: "#3a1a1a",
    border: "1px solid #c0392b",
    borderRadius: "6px",
    padding: "10px 14px",
    color: "#ff8080",
    fontSize: "0.85rem",
    marginBottom: "12px",
  },
  warning: {
    background: "#2a2000",
    border: "1px solid #a08000",
    borderRadius: "6px",
    padding: "10px 14px",
    color: "#ffd060",
    fontSize: "0.85rem",
    marginBottom: "12px",
  },
  info: {
    background: "#1a2a3a",
    border: "1px solid #3a6a9a",
    borderRadius: "6px",
    padding: "10px 14px",
    color: "#80c0ff",
    fontSize: "0.85rem",
    marginBottom: "12px",
  },
  tabBar: {
    display: "flex",
    borderBottom: "1px solid #444",
    marginBottom: "20px",
    gap: "2px",
    flexWrap: "wrap" as const,
  },
  tab: (active: boolean) => ({
    background: "none",
    border: "none",
    borderBottom: active ? "2px solid #646cff" : "2px solid transparent",
    color: active ? "#646cff" : "#888",
    padding: "8px 14px",
    cursor: "pointer",
    fontSize: "0.85rem",
    marginBottom: "-1px",
  }),
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 0",
    borderBottom: "1px solid #333",
  },
  badge: (color: string) => ({
    display: "inline-block",
    background: color,
    color: "#fff",
    borderRadius: "4px",
    padding: "2px 7px",
    fontSize: "0.75rem",
    marginRight: "6px",
  }),
  spinner: {
    display: "inline-block",
    width: "18px",
    height: "18px",
    border: "2px solid #444",
    borderTop: "2px solid #646cff",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    marginRight: "10px",
    verticalAlign: "middle",
  },
  select: {
    width: "100%",
    background: "#1a1a1a",
    border: "1px solid #444",
    borderRadius: "6px",
    color: "#e0e0e0",
    padding: "8px 10px",
    fontSize: "0.9rem",
    boxSizing: "border-box" as const,
    outline: "none",
    marginBottom: "12px",
  },
  section: { marginBottom: "20px" },
};

const NATIVE_TOKEN = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

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

export default function Wallet() {
  // ── Setup flow
  const [setupScreen, setSetupScreen] = useState<"choice" | "backup" | "import">("choice");
  const [newMnemonic, setNewMnemonic] = useState("");
  const [importInput, setImportInput] = useState("");

  // ── Main nav
  const [activeTab, setActiveTab] = useState<"overview" | "send" | "history" | "accounts" | "settings">("overview");

  // ── Send form
  const [sendToken, setSendToken] = useState(NATIVE_TOKEN);
  const [sendTokenCustom, setSendTokenCustom] = useState("");
  const [sendRecipient, setSendRecipient] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [lastRelayId, setLastRelayId] = useState<string | null>(null);

  // ── Settings
  const [exportedMnemonic, setExportedMnemonic] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

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

  const { send, isPending: sendPending, error: sendError, reset: resetSend } = useSend();

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
      <div style={S.root}>
        <div style={S.card}>
          <h1 style={S.h1}>Unlink Wallet</h1>
          <div>
            <span style={S.spinner} />
            {status || "Initializing..."}
          </div>
        </div>
      </div>
    );
  }

  if (!walletExists) {
    return (
      <div style={S.root}>
        <div style={S.card}>
          <h1 style={S.h1}>Unlink Wallet</h1>
          {error && (
            <div style={S.error}>
              {String(error)}
              <button style={{ ...S.link, marginLeft: 8 }} onClick={clearError}>
                Dismiss
              </button>
            </div>
          )}
          {busy && <div style={S.info}><span style={S.spinner} />{status}</div>}

          {setupScreen === "choice" && (
            <>
              <p style={{ color: "#aaa", marginBottom: "20px" }}>
                No wallet found. Create a new one or import an existing wallet.
              </p>
              <button style={S.btn} onClick={handleCreateWallet} disabled={busy}>
                Create Wallet
              </button>
              <br />
              <button style={S.link} onClick={() => setSetupScreen("import")}>
                Import existing wallet
              </button>
            </>
          )}

          {setupScreen === "backup" && (
            <>
              <h2 style={S.h2}>Back up your recovery phrase</h2>
              <div style={S.warning}>
                Write these words down and store them somewhere safe. Anyone with this phrase can access your funds.
              </div>
              <div style={S.mono}>{newMnemonic}</div>
              <button style={S.btn} onClick={handleConfirmBackup} disabled={busy}>
                I've backed it up — continue
              </button>
            </>
          )}

          {setupScreen === "import" && (
            <>
              <h2 style={S.h2}>Import wallet</h2>
              <label style={S.label}>Recovery phrase (12 or 24 words)</label>
              <textarea
                style={S.textarea}
                value={importInput}
                onChange={(e) => setImportInput(e.target.value)}
                placeholder="word1 word2 word3 ..."
                rows={4}
              />
              <button style={S.btn} onClick={handleImportWallet} disabled={busy || !importInput.trim()}>
                Import
              </button>
              <button style={S.link} onClick={() => setSetupScreen("choice")}>
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
      <div style={S.root}>
        <div style={S.card}>
          <h1 style={S.h1}>Unlink Wallet</h1>
          {busy && <div style={S.info}><span style={S.spinner} />{status}</div>}
          <p style={{ color: "#aaa" }}>Your wallet is ready. Create your first account to get started.</p>
          <button style={S.btn} onClick={() => createAccount()} disabled={busy}>
            Create Account
          </button>
        </div>
      </div>
    );
  }

  // ── Main wallet view
  const effectiveToken = sendToken === "custom" ? sendTokenCustom.trim() : sendToken;
  const selectedBalance = balances[effectiveToken];
  const hasPending =
    (pendingSends?.length ?? 0) > 0 ||
    (pendingDeposits?.length ?? 0) > 0 ||
    (pendingWithdrawals?.length ?? 0) > 0;

  return (
    <div style={S.root}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={S.card}>
        <h1 style={S.h1}>Unlink Wallet</h1>

        {/* Global error */}
        {error && (
          <div style={S.error}>
            {String(error)}
            <button style={{ ...S.link, marginLeft: 8 }} onClick={clearError}>
              Dismiss
            </button>
          </div>
        )}

        {/* Busy indicator */}
        {busy && <div style={S.info}><span style={S.spinner} />{status}</div>}

        {/* Tab bar */}
        <div style={S.tabBar}>
          {(["overview", "send", "history", "accounts", "settings"] as const).map((t) => (
            <button key={t} style={S.tab(activeTab === t)} onClick={() => setActiveTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Overview tab */}
        {activeTab === "overview" && (
          <div>
            <div style={S.section}>
              <label style={S.label}>Active address</label>
              <div style={S.mono}>{activeAccount.address}</div>
            </div>

            <div style={S.section}>
              <label style={S.label}>Balances</label>
              {Object.keys(balances).length === 0 ? (
                <p style={{ color: "#666", fontSize: "0.85rem" }}>No balances yet</p>
              ) : (
                Object.entries(balances).map(([token, bal]) => (
                  <div key={token} style={S.row}>
                    <span style={{ fontSize: "0.8rem", color: "#888" }}>{shortenHex(token, 6)}</span>
                    <span>{formatAmount(bal, 18)}</span>
                  </div>
                ))
              )}
            </div>

            {hasPending && (
              <div style={S.section}>
                <label style={S.label}>Pending operations</label>
                {(pendingSends ?? []).map((p: any, i: number) => (
                  <div key={i} style={S.row}>
                    <span style={S.badge("#646cff")}>send</span>
                    <span style={{ fontSize: "0.8rem", color: "#aaa" }}>{JSON.stringify(p)}</span>
                  </div>
                ))}
                {(pendingDeposits ?? []).map((p: any, i: number) => (
                  <div key={i} style={S.row}>
                    <span style={S.badge("#1e7e34")}>deposit</span>
                    <span style={{ fontSize: "0.8rem", color: "#aaa" }}>{JSON.stringify(p)}</span>
                  </div>
                ))}
                {(pendingWithdrawals ?? []).map((p: any, i: number) => (
                  <div key={i} style={S.row}>
                    <span style={S.badge("#856404")}>withdrawal</span>
                    <span style={{ fontSize: "0.8rem", color: "#aaa" }}>{JSON.stringify(p)}</span>
                  </div>
                ))}
              </div>
            )}

            <button style={S.btn} onClick={() => refresh()} disabled={busy}>
              Refresh
            </button>
            <button style={S.btnGhost} onClick={() => forceResync()} disabled={busy}>
              Force Resync
            </button>
          </div>
        )}

        {/* ── Send tab */}
        {activeTab === "send" && (
          <div>
            <div style={S.section}>
              <label style={S.label}>Token</label>
              <select
                style={S.select}
                value={sendToken}
                onChange={(e) => setSendToken(e.target.value)}
              >
                <option value={NATIVE_TOKEN}>Native ETH ({shortenHex(NATIVE_TOKEN, 6)})</option>
                <option value="custom">Custom token address…</option>
              </select>
              {sendToken === "custom" && (
                <input
                  style={S.input}
                  value={sendTokenCustom}
                  onChange={(e) => setSendTokenCustom(e.target.value)}
                  placeholder="0x..."
                />
              )}
              {selectedBalance !== undefined && (
                <div style={{ fontSize: "0.8rem", color: "#aaa", marginBottom: "8px" }}>
                  Available: {formatAmount(selectedBalance, 18)}
                </div>
              )}
            </div>

            <div style={S.section}>
              <label style={S.label}>Recipient</label>
              <input
                style={S.input}
                value={sendRecipient}
                onChange={(e) => setSendRecipient(e.target.value)}
                placeholder="unlink1... or 0x..."
              />
            </div>

            <div style={S.section}>
              <label style={S.label}>Amount</label>
              <input
                style={S.input}
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                placeholder="0.0"
                type="number"
                min="0"
              />
            </div>

            <button
              style={{ ...S.btn, opacity: sendPending || busy || !sendAmount || !sendRecipient ? 0.5 : 1 }}
              onClick={handleSend}
              disabled={sendPending || busy || !sendAmount || !sendRecipient}
            >
              {sendPending ? "Sending…" : "Send"}
            </button>

            {sendError && (
              <div style={{ ...S.error, marginTop: "12px" }}>
                {String(sendError)}
              </div>
            )}

            {lastRelayId && (
              <div style={{ ...S.info, marginTop: "12px" }}>
                <div><strong>Relay ID:</strong> {shortenHex(lastRelayId, 8)}</div>
                {txStatus && (
                  <>
                    <div>
                      <strong>Status:</strong>{" "}
                      <span style={S.badge(badgeColor(txStatus.state ?? ""))}>
                        {txStatus.state}
                      </span>
                    </div>
                    {txStatus.txHash && (
                      <div style={{ marginTop: "4px" }}>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ color: "#aaa", fontSize: "0.85rem" }}>Transaction history</span>
              <button style={S.btnSm} onClick={() => refreshHistory()}>
                Refresh
              </button>
            </div>

            {historyLoading && (
              <div style={{ color: "#888" }}><span style={S.spinner} />Loading…</div>
            )}

            {historyError && (
              <div style={S.error}>{String(historyError)}</div>
            )}

            {!historyLoading && !historyError && (!history || history.length === 0) && (
              <p style={{ color: "#666", fontSize: "0.85rem" }}>No transactions yet.</p>
            )}

            {(history ?? []).map((entry: any) => (
              <div key={entry.id} style={{ ...S.row, flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
                <div>
                  <span style={S.badge(kindColor(entry.kind))}>{entry.kind}</span>
                  <span style={S.badge(badgeColor(entry.status))}>{entry.status}</span>
                  {entry.txHash && (
                    <span style={{ fontSize: "0.78rem", color: "#888" }}>
                      {shortenHex(entry.txHash, 8)}
                    </span>
                  )}
                </div>
                {(entry.amounts ?? []).map((a: any, i: number) => (
                  <div key={i} style={{ fontSize: "0.82rem", color: Number(a.delta) < 0 ? "#ff8080" : "#80ff80" }}>
                    {a.delta} {shortenHex(a.token, 6)}
                  </div>
                ))}
                {entry.timestamp && (
                  <div style={{ fontSize: "0.75rem", color: "#666" }}>
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
              <div key={i} style={S.row}>
                <div>
                  <div style={{ fontSize: "0.85rem", color: i === activeAccountIndex ? "#646cff" : "#ccc" }}>
                    Account #{i} {i === activeAccountIndex && "(active)"}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#888" }}>{shortenHex(acc.address, 6)}</div>
                </div>
                <button
                  style={i === activeAccountIndex ? S.btnSmGhost : S.btnSm}
                  onClick={() => switchAccount(i)}
                  disabled={i === activeAccountIndex || busy}
                >
                  {i === activeAccountIndex ? "Active" : "Switch"}
                </button>
              </div>
            ))}
            <div style={{ marginTop: "16px" }}>
              <button style={S.btn} onClick={() => createAccount()} disabled={busy}>
                Create Account
              </button>
            </div>
          </div>
        )}

        {/* ── Settings tab */}
        {activeTab === "settings" && (
          <div>
            <div style={S.section}>
              <h2 style={S.h2}>Export recovery phrase</h2>
              <button style={S.btn} onClick={handleExportMnemonic} disabled={busy}>
                Show recovery phrase
              </button>
              {exportedMnemonic && (
                <>
                  <div style={{ ...S.warning, marginTop: "8px" }}>
                    Keep this private. Anyone with this phrase controls your wallet.
                  </div>
                  <div style={S.mono}>{exportedMnemonic}</div>
                  <button style={S.btnGhost} onClick={() => setExportedMnemonic("")}>
                    Hide
                  </button>
                </>
              )}
            </div>

            <div style={{ ...S.section, borderTop: "1px solid #3a1a1a", paddingTop: "20px" }}>
              <h2 style={{ ...S.h2, color: "#ff8080" }}>Danger zone</h2>
              {!confirmClear ? (
                <button style={S.btnDanger} onClick={() => setConfirmClear(true)}>
                  Clear Wallet
                </button>
              ) : (
                <div>
                  <div style={S.warning}>
                    This will permanently delete your wallet from this device. Make sure you have your recovery phrase.
                  </div>
                  <button style={S.btnDanger} onClick={() => { clearWallet(); setConfirmClear(false); }}>
                    Yes, clear wallet
                  </button>
                  <button style={S.btnGhost} onClick={() => setConfirmClear(false)}>
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
