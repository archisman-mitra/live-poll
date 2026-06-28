import {
  Contract,
  Networks,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  Address,
  Keypair,
  Account,
} from "@stellar/stellar-sdk";
import { Server, Api, assembleTransaction } from "@stellar/stellar-sdk/rpc";

// ─── Config ──────────────────────────────────────────────────────────────────
export const CONTRACT_ID =
  "CBNDCWBGV72UQ35XPP26Z452DEVNS5HCDGBEQKZVQ2WZMYAS6OYLICGU";
export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const RPC_URL = "https://soroban-testnet.stellar.org";

const server = new Server(RPC_URL);
const contract = new Contract(CONTRACT_ID);

// ─── Read helpers (no signing) ────────────────────────────────────────────────

/**
 * Calls a read-only Soroban function via simulateTransaction.
 * @param {string} method  - contract method name
 * @param {import("@stellar/stellar-sdk").xdr.ScVal[]} args - encoded arguments
 * @returns {Promise<any>} - decoded result
 */
async function simulateCall(method, args = []) {
  // Use a random keypair as source — sequence number doesn't matter for simulations
  const kp = Keypair.random();
  const account = new Account(kp.publicKey(), "0");

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);

  if (Api.isSimulationError(sim)) {
    throw new Error(`Simulation error: ${sim.error}`);
  }

  const retVal = sim.result?.retval;
  if (!retVal) return null;
  return scValToNative(retVal);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the vote count for the given option ("Java" or "Python").
 * @param {string} option
 * @returns {Promise<number>}
 */
export async function getVotes(option) {
  const result = await simulateCall("get_votes", [
    nativeToScVal(option, { type: "symbol" }),
  ]);
  return Number(result ?? 0);
}

/**
 * Returns true if the given Stellar address has already voted.
 * @param {string} address
 * @returns {Promise<boolean>}
 */
export async function hasVoted(address) {
  const result = await simulateCall("has_voted", [
    new Address(address).toScVal(),
  ]);
  return Boolean(result);
}

/**
 * Builds an assembled (ready-to-sign) vote transaction XDR.
 *
 * @param {string} voterAddress - Stellar account address (G…)
 * @param {string} option       - "Java" or "Python"
 * @returns {Promise<string>}   - unsigned assembled transaction XDR
 */
export async function buildVoteTransaction(voterAddress, option) {
  const account = await server.getAccount(voterAddress);

  const tx = new TransactionBuilder(account, {
    fee: "1000000", // 0.1 XLM – generous for Soroban
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "vote",
        new Address(voterAddress).toScVal(),
        nativeToScVal(option, { type: "symbol" })
      )
    )
    .setTimeout(0) // no expiry — user can take their time in the wallet
    .build();

  // Simulate to get auth entries / resource fees
  const sim = await server.simulateTransaction(tx);

  if (Api.isSimulationError(sim)) {
    const errMsg = sim.error ?? JSON.stringify(sim);
    if (
      errMsg.toLowerCase().includes("alreadyvoted") ||
      errMsg.toLowerCase().includes("already")
    ) {
      throw new Error("ALREADY_VOTED");
    }
    throw new Error(`Simulation error: ${errMsg}`);
  }

  // Assemble adds the resource fees and auth entries.
  // setTimeout(0) above already set maxTime=0 (valid indefinitely) on the
  // original tx, and assembleTransaction preserves it via cloneFrom.
  const assembled = assembleTransaction(tx, sim).build();
  return assembled.toXDR();
}

/**
 * Submits a signed transaction XDR to the network and polls until final status.
 *
 * @param {string} signedXdr - signed transaction XDR
 * @returns {Promise<"CONFIRMED">}
 * @throws {Error} on failure or timeout
 */
export async function submitAndWait(signedXdr) {
  const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  
  let response;
  try {
    response = await server.sendTransaction(tx);
  } catch(e) {
    throw new Error("Failed to send: " + e.message);
  }

  if (response.status === "ERROR") {
    throw new Error("Transaction failed to submit: " + JSON.stringify(response.errorResult));
  }

  if (response.status === "DUPLICATE") {
    // already submitted, just poll
  }

  const hash = response.hash;
  console.log("TX hash:", hash);

  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const check = await server.getTransaction(hash);
    console.log("TX status:", check.status);

    if (check.status === Api.GetTransactionStatus.SUCCESS) {
      return "CONFIRMED";
    }
    if (check.status === Api.GetTransactionStatus.FAILED) {
      throw new Error("TRANSACTION_FAILED");
    }
  }

  throw new Error("Transaction timed out");
}
