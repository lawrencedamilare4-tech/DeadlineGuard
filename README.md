# DeadlineGuard

**Your assignments have deadlines. Your storage does too.**

DeadlineGuard is an autonomous Filecoin storage agent for students. It monitors decentralized storage health, payment runway, and academic deadlines to protect critical files before storage conditions become critical.

---

## 🚀 Quick Start

### Prerequisites

1. **Node.js** (v18+)
2. **MetaMask** browser extension
3. **tFIL** (testnet FIL) — for gas fees on Filecoin Calibration
4. **tUSDFC** (testnet USDFC) — REQUIRED for storage payments

### Get Testnet Tokens

You need **tUSDFC** to pay for storage on Filecoin Calibration testnet.

1. **tFIL Faucet:** https://faucet.calibnet.chainsafe-fil.io/funds.html
2. **tUSDFC Faucet:** https://forest-explorer.chainsafe.dev/faucet/calibnet_usdfc

**IMPORTANT:** Without tUSDFC, uploads will fail with `InsufficientLockupFunds`.

### Add tUSDFC Token to MetaMask

1. Open MetaMask
2. Go to **Assets → Import Tokens**
3. Contract Address: `0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0`
4. Symbol: `tUSDFC`
5. Decimals: `18`

### Add Filecoin Calibration Network

1. Open MetaMask
2. Go to **Settings → Networks → Add Network**
3. Network Name: `Filecoin Calibration`
4. RPC URL: `https://api.calibration.node.glif.io/rpc/v1`
5. Chain ID: `314159`
6. Symbol: `tFIL`
7. Block Explorer: `https://calibration.filscan.io`

---

## 🔧 Installation

```bash
npm install
npm run dev