import { useState, useEffect, useCallback, useRef } from "react";
import { StellarWalletsKit } from "@creit-tech/stellar-wallets-kit/sdk";
import { defaultModules } from "@creit-tech/stellar-wallets-kit/modules/utils";
import { Networks } from "@stellar/stellar-sdk";
import confetti from "canvas-confetti";
import {
  getVotes,
  hasVoted,
  buildVoteTransaction,
  submitAndWait,
} from "./lib/contract";
import Toast from "./components/Toast";
import DonutChart from "./components/DonutChart";
import TransactionSteps from "./components/TransactionSteps";

// ─── Init Stellar Wallets Kit once ───────────────────────────────────────────
StellarWalletsKit.init({ modules: defaultModules() });

// ─── Constants ────────────────────────────────────────────────────────────────
const OPTIONS = ["Java", "Python"];
const REFRESH_INTERVAL = 5000; // 5 seconds

// ─── Helpers ──────────────────────────────────────────────────────────────────
const truncateAddress = (addr) =>
  addr ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : "";

function getTimeAgo(date) {
  if (!date) return "Never";
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 5) return "Just now";
  return `${seconds} seconds ago`;
}

// ─── Option Card Component ────────────────────────────────────────────────────
function OptionCard({ name, votes, totalVotes, selected, disabled, onSelect, emoji }) {
  const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
  const isSelected = selected === name;

  return (
    <button
      id={`vote-btn-${name.toLowerCase()}`}
      onClick={() => !disabled && onSelect(name)}
      disabled={disabled}
      title={disabled ? "" : "Click to select"}
      className={[
        "group relative flex flex-col gap-4 rounded-2xl border p-6 text-left transition-all duration-300",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        disabled
          ? "cursor-not-allowed opacity-70"
          : "cursor-pointer hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-900/20",
        isSelected
          ? "border-blue-500 bg-blue-950/60 shadow-lg shadow-blue-900/30"
          : "border-gray-800 bg-gray-900/60 hover:border-gray-700",
      ].join(" ")}
      aria-label={`Vote for ${name}`}
    >
      {/* Selection indicator */}
      {isSelected && (
        <span className="absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs text-white">
          ✓
        </span>
      )}

      {/* Emoji + Name */}
      <div className="flex items-center gap-3">
        <span className="text-4xl transition-transform group-hover:scale-110">{emoji}</span>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
            Option
          </p>
          <h2 className="text-2xl font-bold text-white">{name}</h2>
        </div>
      </div>

      {/* Vote count */}
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-extrabold text-white tabular-nums">
          {votes}
        </span>
        <span className="text-sm text-gray-400">votes</span>
        <span
          className={[
            "ml-auto text-lg font-semibold tabular-nums",
            isSelected ? "text-blue-400" : "text-gray-400",
          ].join(" ")}
        >
          {pct}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
        <div
          className={[
            "vote-bar h-full rounded-full transition-all duration-1000 ease-out",
            isSelected
              ? "bg-gradient-to-r from-blue-600 to-blue-400"
              : "bg-gradient-to-r from-gray-600 to-gray-500 group-hover:from-gray-500 group-hover:to-gray-400",
            totalVotes > 0 && "animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]"
          ].join(" ")}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </button>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [votes, setVotes] = useState({ Java: 0, Python: 0 });
  const [selectedOption, setSelectedOption] = useState(null);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [txStatus, setTxStatus] = useState(null); // null | "building" | "signing" | "submitting" | "confirmed" | "failed"
  const [toast, setToast] = useState(null); // { message, type }
  const [isConnecting, setIsConnecting] = useState(false);
  const [votesLoading, setVotesLoading] = useState(true);
  const [lastSynced, setLastSynced] = useState(null);
  const [now, setNow] = useState(new Date());
  
  const intervalRef = useRef(null);

  // ── Fetch vote counts ──────────────────────────────────────────────────────
  const refreshVotes = useCallback(async () => {
    try {
      const [java, python] = await Promise.all([
        getVotes("java"),
        getVotes("python"),
      ]);
      setVotes({ Java: java, Python: python });
      setLastSynced(new Date());
    } catch (e) {
      console.error("Failed to fetch votes:", e);
    } finally {
      setVotesLoading(false);
    }
  }, []);

  // Start polling on mount
  useEffect(() => {
    refreshVotes();
    intervalRef.current = setInterval(refreshVotes, REFRESH_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [refreshVotes]);

  // Update 'now' for the relative time display
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Connect wallet ─────────────────────────────────────────────────────────
  const connectWallet = useCallback(async () => {
    setIsConnecting(true);
    setToast(null);
    try {
      const { address } = await StellarWalletsKit.authModal();
      setWalletAddress(address);

      // Check if already voted
      const voted = await hasVoted(address);
      setAlreadyVoted(voted);
    } catch (e) {
      console.error("Wallet connection failed:", e);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // ── Disconnect wallet ──────────────────────────────────────────────────────
  const disconnectWallet = useCallback(() => {
    setWalletAddress(null);
    setAlreadyVoted(false);
    setSelectedOption(null);
    setTxStatus(null);
    setToast({ message: "Wallet disconnected", type: "info" });
  }, []);

  // ── Share Vote ─────────────────────────────────────────────────────────────
  const shareVote = () => {
    const text = selectedOption 
      ? `I just voted for ${selectedOption} on-chain! 🚀 #Stellar #Web3`
      : `I just voted on-chain! 🚀 #Stellar #Web3`;
    navigator.clipboard.writeText(text);
    setToast({ message: "Copied to clipboard!", type: "success" });
  };

  // ── Vote ───────────────────────────────────────────────────────────────────
  const castVote = useCallback(async () => {
    setToast(null);

    if (!walletAddress) {
      setToast({ message: "Please connect your wallet first", type: "error" });
      return;
    }
    if (!selectedOption) {
      setToast({ message: "Please select an option first", type: "error" });
      return;
    }
    if (alreadyVoted) {
      setToast({ message: "You have already voted", type: "error" });
      return;
    }

    try {
      // 1. Build the transaction
      setTxStatus("building");
      const unsignedXdr = await buildVoteTransaction(
        walletAddress,
        selectedOption.toLowerCase()
      );

      // 2. Sign it via the connected wallet
      setTxStatus("signing");
      const { signedTxXdr } = await StellarWalletsKit.signTransaction(
        unsignedXdr,
        {
          networkPassphrase: Networks.TESTNET,
          address: walletAddress,
        }
      );

      // 3. Submit and wait
      setTxStatus("submitting");
      await submitAndWait(signedTxXdr);

      setTxStatus("confirmed");
      setAlreadyVoted(true);
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#3b82f6", "#10b981", "#8b5cf6"]
      });

      // Refresh counts immediately after voting
      await refreshVotes();
    } catch (e) {
      console.error("Vote failed:", e);
      if (
        e.message === "ALREADY_VOTED" ||
        e.message?.toLowerCase().includes("already")
      ) {
        setAlreadyVoted(true);
        setTxStatus(null);
        setToast({ message: "You have already voted", type: "error" });
      } else {
        setTxStatus("failed");
        setToast({ message: "Transaction failed. Please try again", type: "error" });
      }
    }
  }, [walletAddress, selectedOption, alreadyVoted, refreshVotes]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const totalVotes = votes.Java + votes.Python;
  const isVoting = ["building", "signing", "submitting"].includes(txStatus);
  const voteButtonDisabled = isVoting || alreadyVoted || !selectedOption || !walletAddress;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-gray-950 text-white">
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />

      {/* ── Background decoration ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-blue-900/20 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-emerald-900/10 blur-[100px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-indigo-900/10 blur-[100px]" />
      </div>

      {/* ── Header ── */}
      <header className="relative z-10 flex items-center justify-between border-b border-gray-800/60 px-6 py-4 backdrop-blur-sm">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 text-sm font-bold">
            ✶
          </div>
          <span className="font-semibold text-gray-200">Stellar Poll</span>
        </div>

        {/* Wallet button */}
        <div className="flex items-center gap-3">
          {walletAddress ? (
            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-2 rounded-full border border-gray-700 bg-gray-800/60 px-4 py-2 text-sm font-medium text-gray-300"
              >
                <span className="h-2 w-2 rounded-full bg-green-400" />
                {truncateAddress(walletAddress)}
              </div>
              <button
                id="wallet-disconnect-btn"
                onClick={disconnectWallet}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-700 bg-gray-800/60 text-gray-400 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400"
                title="Disconnect wallet"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              id="connect-wallet-btn"
              onClick={connectWallet}
              disabled={isConnecting}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:from-blue-500 hover:to-purple-500 disabled:opacity-60"
            >
              {isConnecting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Connecting…
                </>
              ) : (
                <>Connect Wallet</>
              )}
            </button>
          )}
        </div>
      </header>

      {/* ── Main ── */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
        {!walletAddress ? (
          /* ── Landing Hero Section ── */
          <div className="flex w-full max-w-2xl flex-col items-center text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-800/40 bg-blue-950/40 px-4 py-1.5 text-sm font-medium text-blue-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
              Live on Stellar Testnet
            </div>
            
            <h1 className="mb-6 text-5xl font-extrabold tracking-tight text-white sm:text-7xl">
              Your vote.<br />
              <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">On-chain. Forever.</span>
            </h1>
            
            <p className="mb-10 text-lg text-gray-400 sm:text-xl">
              Join <span className="font-semibold text-white">{totalVotes}</span> developers who have already cast their vote in the ultimate showdown.
            </p>

            <button
              onClick={connectWallet}
              disabled={isConnecting}
              className="group mb-12 flex items-center gap-3 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 text-lg font-bold text-white shadow-[0_0_40px_-10px_rgba(59,130,246,0.5)] transition-all hover:scale-105 hover:shadow-[0_0_60px_-15px_rgba(59,130,246,0.7)]"
            >
              Get Started
              <svg className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>

            <div className="flex flex-wrap justify-center gap-4">
              {[{ icon: "⚡", text: "Instant" }, { icon: "🔒", text: "Immutable" }, { icon: "🌐", text: "Decentralized" }].map((feature, i) => (
                <div key={i} className="flex items-center gap-2 rounded-full border border-gray-800 bg-gray-900/50 px-5 py-2 text-sm font-medium text-gray-300 backdrop-blur-sm">
                  <span>{feature.icon}</span>
                  {feature.text}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ── Voting UI ── */
          <div className="w-full max-w-xl">
            {/* Card */}
            <div className="rounded-3xl border border-gray-800/60 bg-gray-900/40 p-8 shadow-2xl backdrop-blur-xl transition-all duration-500">
              {/* Title */}
              <div className="mb-8 text-center">
                <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  Java vs Python
                </h1>
                <p className="mt-2 text-gray-400">Cast Your Vote — Immutably on Soroban</p>
              </div>

              {/* Poll Options */}
              <div className="mb-6 grid gap-4">
                {OPTIONS.map((opt) => (
                  <OptionCard
                    key={opt}
                    name={opt}
                    votes={votes[opt]}
                    totalVotes={totalVotes}
                    selected={selectedOption}
                    disabled={isVoting || alreadyVoted}
                    onSelect={setSelectedOption}
                    emoji={opt === "Java" ? "☕" : "🐍"}
                  />
                ))}
              </div>

              {/* Already voted banner */}
              {alreadyVoted && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-800/40 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-400">
                  <span className="text-base">🗳️</span>
                  You already voted — results update every 5 seconds.
                </div>
              )}

              {/* Vote button + status */}
              <div className="flex flex-col items-center gap-3">
                {!alreadyVoted && (
                  <button
                    id="cast-vote-btn"
                    onClick={castVote}
                    disabled={voteButtonDisabled}
                    className={[
                      "w-full rounded-xl py-4 text-base font-bold tracking-wide transition-all duration-200",
                      voteButtonDisabled
                        ? "cursor-not-allowed bg-gray-800 text-gray-500"
                        : "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-900/30 hover:from-blue-500 hover:to-purple-500 hover:shadow-blue-800/40 active:scale-[0.98]",
                    ].join(" ")}
                  >
                    {isVoting ? "Processing..." : `Vote for ${selectedOption ?? "…"}`}
                  </button>
                )}

                {txStatus && <TransactionSteps status={txStatus} />}
              </div>

              {/* Results Section (only show if voted) */}
              {alreadyVoted && (
                <div className="mt-8 animate-[fade-in_0.5s_ease-out] border-t border-gray-800/60 pt-8">
                  <h3 className="mb-6 text-center text-xl font-bold text-white">Current Results</h3>
                  <DonutChart javaVotes={votes.Java} pythonVotes={votes.Python} />
                  
                  <div className="mt-8 flex justify-center">
                    <button
                      onClick={shareVote}
                      className="flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-800/50 px-6 py-3 font-medium text-white transition hover:bg-gray-700"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-5.368m0 5.368l5.657 5.657m-5.657-5.657l5.657-5.657m0 11.314a3 3 0 105.368-5.368 3 3 0 00-5.368 5.368m0-11.314a3 3 0 105.368 5.368 3 3 0 00-5.368-5.368" />
                      </svg>
                      Share your vote
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 mt-auto border-t border-gray-800/60 bg-gray-950/80 px-6 py-6 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <a
              href="https://stellar.expert/explorer/testnet/contract/CBNDCWBGV72UQ35XPP26Z452DEVNS5HCDGBEQKZVQ2WZMYAS6OYLICGU"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-300 hover:underline"
            >
              Stellar Explorer
            </a>
            <span>•</span>
            <a
              href="https://github.com/stellar/soroban-example-dapp"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-300 hover:underline"
            >
              GitHub
            </a>
          </div>
          
          <div className="flex flex-col items-center gap-2 sm:items-end">
            <div className="inline-flex items-center gap-1.5 rounded bg-gray-900 px-2 py-1 text-xs font-medium text-gray-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Built on Soroban
            </div>
            <span className="text-xs text-gray-600">
              Last synced: {getTimeAgo(lastSynced)}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
