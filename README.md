# 🗳️ Live Poll — Java vs Python on Stellar Testnet

A decentralized live poll dApp built on Stellar's Soroban smart contract platform. Users connect their Stellar wallet and cast a single immutable vote for either Java or Python. Votes are recorded on-chain and results update in real-time every 5 seconds.

---

## 🚀 Live Demo

[Deploy link here — add after Vercel deploy]

---

## 📸 Screenshots

### Wallet Connect Modal

[Add screenshot of wallet options modal here]

### Poll UI

[Add screenshot of voting screen here]

---

## 📋 Contract Details

| Field                | Value                                                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Contract Address** | `CBNDCWBGV72UQ35XPP26Z452DEVNS5HCDGBEQKZVQ2WZMYAS6OYLICGU`                                                                          |
| **Network**          | Stellar Testnet                                                                                                                     |
| **Transaction Hash** | `a66db8cbf355ba188ec283ebd684a3f96499ec0256b2ddd1db8b28e2c9d7d3d4`                                                                  |
| **Explorer**         | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CBNDCWBGV72UQ35XPP26Z452DEVNS5HCDGBEQKZVQ2WZMYAS6OYLICGU) |

---

## ✅ Level 2 Requirements

- ✅ **3 error types handled** — wallet not connected, already voted, transaction failed
- ✅ **Contract deployed on testnet** — Soroban contract on Stellar Testnet
- ✅ **Contract called from frontend** — `vote()`, `get_votes()`, `has_voted()`
- ✅ **Transaction status visible** — Building → Signing → Submitting → Confirmed
- ✅ **2+ meaningful commits** — see commit history

---

## 🛠️ Tech Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Wallet:** StellarWalletsKit (Freighter, xBull, Albedo, and more)
- **Smart Contract:** Rust + Soroban SDK
- **Network:** Stellar Testnet
- **RPC:** `https://soroban-testnet.stellar.org`

---

## ⚙️ Setup Instructions

### Prerequisites

- Node.js 18+
- Rust + `wasm32v1-none` target
- Stellar CLI

### 1. Clone the repo

```bash
git clone https://github.com/archisman-mitra/live-poll.git
cd live-poll
```

### 2. Install frontend dependencies

```bash
cd frontend
npm install
```

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### 4. Build the smart contract (optional)

```bash
cd contract
cargo build --target wasm32v1-none --release
```

---

## 📁 Project Structure

live-poll/

├── contract/ # Soroban smart contract (Rust)

│ └── contracts/live-poll/

│ └── src/lib.rs # Contract logic

└── frontend/ # React + Vite frontend

└── src/

├── lib/contract.js # Contract interaction logic

├── components/ # Toast, DonutChart, TransactionSteps

## └── App.jsx # Main app

## 🔐 How It Works

1. User connects their Stellar wallet via StellarWalletsKit
2. Selects Java or Python
3. Clicks Vote — transaction is built, simulated, and sent to the wallet for signing
4. Signed transaction is submitted to Stellar Testnet
5. Contract records the vote and prevents double voting at the blockchain level
6. Results refresh every 5 seconds via RPC polling

---

## ⚠️ Error Handling

| Error                | Trigger                     | Message shown                          |
| -------------------- | --------------------------- | -------------------------------------- |
| Wallet not connected | Vote clicked without wallet | "Please connect your wallet first"     |
| Already voted        | Address has voted before    | "You have already voted"               |
| Transaction failed   | Network or contract error   | "Transaction failed. Please try again" |

---

Built with ❤️ on [Soroban](https://soroban.stellar.org)
