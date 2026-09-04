import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { FilecoinService } from '../services/filecoin';
import { useAccount, useWalletClient } from 'wagmi';
import { logger } from '../utils/logger';
import { createPublicClient, http, erc20Abi, parseAbi } from 'viem';
import { filecoinCalibration } from '../config/wagmi'; // adjust path
import { parseUnits } from '@filoz/synapse-sdk'; 

const FilecoinContext = createContext(null);

// Constants
const USDFC_ADDRESS = '0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0';
const PAYMENTS_ADDRESS = '0x09a0fDc2723fAd1A7b8e3e00eE5DF73841df55a0';
const OPERATOR_ADDRESS = '0x02925630df557F957f70E112bA06e50965417CA0';

const publicClient = createPublicClient({
  chain: filecoinCalibration,
  transport: http(),
});

// Pulls a tx hash out of whatever shape the Synapse SDK returns
// (raw string, { hash }, { transactionHash }, { txHash }, etc.)
const extractHash = (txResult) => {
  if (!txResult) return null;
  if (typeof txResult === 'string') return txResult;
  return txResult.hash || txResult.transactionHash || txResult.txHash || null;
};

// Wait for a transaction to actually be mined. Falls back to a fixed
// delay only if we genuinely can't find a hash to wait on.
const waitForTx = async (txResult) => {
  const hash = extractHash(txResult);
  if (hash) {
    await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
    return;
  }
  console.warn('[Filecoin] No tx hash found on result, falling back to delay:', txResult);
  await new Promise((resolve) => setTimeout(resolve, 8000));
};

export const FilecoinProvider = ({ children }) => {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState(null);
  const [depositedBalance, setDepositedBalance] = useState(0);
  const [availableForStorage, setAvailableForStorage] = useState(0);
  const [lockedBalance, setLockedBalance] = useState(0);
  const [runway, setRunway] = useState(null);
  const [spendRate, setSpendRate] = useState(null);
  const [connected, setConnected] = useState(false);
  const [synapseReady, setSynapseReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [funding, setFunding] = useState(false);
  const [error, setError] = useState(null);
  const [isFunded, setIsFunded] = useState(false);

  // Effect 1: Update wallet and connected state from wagmi
  useEffect(() => {
    if (isConnected && address) {
      const lowerAddress = address.toLowerCase();
      setWallet(lowerAddress);
      setConnected(true);
      localStorage.setItem('deadlineguard_wallet', lowerAddress);
      // Fetch balance immediately
      fetchBalance(lowerAddress);
    } else {
      setWallet(null);
      setConnected(false);
      setSynapseReady(false);
      setBalance(null);
      setDepositedBalance(0);
      setAvailableForStorage(0);
      setLockedBalance(0);
      setSpendRate(null);
      setRunway(null);
    }
  }, [address, isConnected]);

  // Effect 2: Initialize Synapse for uploads when walletClient is ready
  useEffect(() => {
    if (isConnected && address && walletClient) {
      initializeSynapse(address, walletClient);
    }
  }, [isConnected, address, walletClient]);

  const fetchBalance = async (walletAddress) => {
    setLoading(true);
    setError(null);
    try {
      const status = await FilecoinService.getPaymentStatus(walletAddress);
      setBalance(status.balance || 0);
      setDepositedBalance(status.depositedBalance || 0);
      setAvailableForStorage(status.availableForStorage || 0);
      setLockedBalance(status.lockedBalance || 0);
      setSpendRate(status.spendRate || 0);
      setRunway(status.runway || Infinity);
      setIsFunded((status.availableForStorage || 0) > 0.13);
      return status;
    } catch (err) {
      console.error('[Filecoin] Balance fetch failed:', err.message);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Polls getPaymentStatus until depositedBalance actually increases past
  // previousDeposited, or we give up. Updates state as soon as it sees the
  // change land, rather than trusting a single fixed-delay read.
  const pollForBalanceChange = useCallback(async (walletAddress, previousDeposited, {
    attempts = 12,
    intervalMs = 3000,
  } = {}) => {
    for (let i = 0; i < attempts; i++) {
      try {
        const status = await FilecoinService.getPaymentStatus(walletAddress);
        if ((status.depositedBalance || 0) > previousDeposited) {
          setBalance(status.balance || 0);
          setDepositedBalance(status.depositedBalance || 0);
          setAvailableForStorage(status.availableForStorage || 0);
          setLockedBalance(status.lockedBalance || 0);
          setSpendRate(status.spendRate || 0);
          setRunway(status.runway || Infinity);
          setIsFunded((status.availableForStorage || 0) > 0.13);
          return true;
        }
      } catch (err) {
        console.warn('[Filecoin] Poll attempt failed:', err.message);
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    console.warn('[Filecoin] Balance never reflected deposit after polling — possible RPC replication lag.');
    return false;
  }, []);

  // const initializeSynapse = async (walletAddress, walletClient) => {
  //   try {
  //     await FilecoinService.initializeSynapse(walletAddress, { walletClient });
  //     setSynapseReady(true);
  //   } catch (err) {
  //     console.warn('[Filecoin] Synapse init failed:', err.message);
  //     setSynapseReady(false);
  //   }
  // };

  const initializeSynapse = async (walletAddress, walletClient) => {
  try {
    await FilecoinService.initializeSynapse(walletAddress, { walletClient });
    setSynapseReady(true);

    // Approve storage operator (one-time)
    const synapse = FilecoinService.getSynapse();
    if (synapse?.payments?.approveOperator) {
      try {
        await synapse.payments.approveOperator({
          operator: '0x02925630df557F957f70E112bA06e50965417CA0',
        });
        console.log('[Filecoin] Operator approved');
      } catch (err) {
        // Ignore if already approved
        if (!err.message.includes('already approved') && !err.message.includes('OperatorAlreadyApproved')) {
          console.warn('[Filecoin] Operator approval failed:', err.message);
        }
      }
    }
  } catch (err) {
    console.warn('[Filecoin] Synapse init failed:', err.message);
    setSynapseReady(false);
  }
};

const approveStorageOperator = useCallback(async () => {
  const synapse = FilecoinService.getSynapse();
  if (!synapse) throw new Error('Synapse not initialized');
  const payments = synapse.payments;

  const tx = await payments.approveService({
    rateAllowance: parseUnits('10', 18),
    lockupAllowance: parseUnits('1000', 18),
    maxLockupPeriod: 86400n, // or 31536000n for extra safety
  });
  await synapse.client.waitForTransactionReceipt({ hash: tx });
}, []);

const fundWallet = useCallback(async (amount = 10) => {
  setFunding(true);
  setError(null);
  try {
    const synapse = FilecoinService.getSynapse();
    if (!synapse) throw new Error('Synapse not initialized');
    const payments = synapse.payments;
    const amountWei = BigInt(Math.floor(amount * 1e18));
    const requiredLockupPeriod = 86400n;
    const previousDeposited = depositedBalance; // snapshot before the tx

    const approval = await payments.serviceApproval();
    const needsOperatorApproval =
      !approval?.isApproved || (approval.maxLockupPeriod ?? 0n) < requiredLockupPeriod;

    const txHash = needsOperatorApproval
      ? await payments.depositWithPermitAndApproveOperator({
          amount: amountWei,
          rateAllowance: parseUnits('10', 18),
          lockupAllowance: parseUnits('1000', 18),
          maxLockupPeriod: requiredLockupPeriod,
        })
      : await payments.depositWithPermit({ amount: amountWei });

    await waitForTx(txHash);

    // Optimistic bump in the right units — just deposited, doesn't touch
    // availableForStorage/lockedBalance/isFunded, which stay stale until reconciled below
    setDepositedBalance((prev) => (prev ?? 0) + amount);

    // Reconcile in the background — poll instead of a single fetch, since
    // RPC replicas can lag right after confirmation
    if (wallet) pollForBalanceChange(wallet, previousDeposited);

    return true;
  } catch (err) {
    setError(err.message);
    throw err;
  } finally {
    setFunding(false);
  }
}, [wallet, depositedBalance, pollForBalanceChange]);


// const fundWallet = useCallback(async (amount = 10) => {
//   setFunding(true);
//   setError(null);
//   try {
//     const synapse = FilecoinService.getSynapse();
//     if (!synapse) throw new Error('Synapse not initialized');
//     const payments = synapse.payments;
//     const amountWei = BigInt(Math.floor(amount * 1e18));

//     // 1. Approve USDFC if needed
//     const allowance = await publicClient.readContract({
//       address: USDFC_ADDRESS,
//       abi: erc20Abi,
//       functionName: 'allowance',
//       args: [wallet, PAYMENTS_ADDRESS],
//     });
//     if (allowance < amountWei) {
//       const approveResult = await payments.approve({ token: 'USDFC', amount: amountWei });
//       await waitForTx(approveResult);
//     }

//     // 2. Deposit USDFC
//     const depositResult = await payments.deposit({ token: 'USDFC', amount: amountWei });
//     await waitForTx(depositResult);

//     // 3. Approve Warm Storage operator (using approveService)
//     // First check current approval status
//     const approval = await payments.serviceApproval();
//     const requiredLockupPeriod = 86400n; // provider requirement
//     if (!approval?.isApproved || (approval.maxLockupPeriod ?? 0n) < requiredLockupPeriod) {
//       console.log('[Filecoin] Approving Warm Storage operator...');
//       const operatorResult = await payments.approveService({
//         rateAllowance: parseUnits('10', 18),     // max USDFC/epoch
//         lockupAllowance: parseUnits('1000', 18), // max USDFC locked
//         maxLockupPeriod: 86400n,                 // at least 30 days in epochs (or 31536000n for a year)
//       });
//       await waitForTx(operatorResult);
//       console.log('[Filecoin] Operator approved');
//     } else {
//       console.log('[Filecoin] Operator already approved with sufficient lockup period');
//     }

//     // 4. Refresh balance
//     if (wallet) {
//       await fetchBalance(wallet);
//     }
//     return true;
//   } catch (err) {
//     setError(err.message);
//     throw err;
//   } finally {
//     setFunding(false);
//   }
// }, [wallet, depositedBalance, fetchBalance, publicClient]);

  const disconnectWallet = useCallback(() => {
    localStorage.removeItem('deadlineguard_wallet');
    setWallet(null);
    setConnected(false);
    setSynapseReady(false);
    setBalance(null);
    setDepositedBalance(0);
    setAvailableForStorage(0);
    setLockedBalance(0);
    setSpendRate(null);
    setRunway(null);
    setError(null);
  }, []);

  const refreshPaymentStatus = useCallback(async () => {
    if (!wallet) return;
    await fetchBalance(wallet);
  }, [wallet]);

  const value = {
    wallet,
    balance,
    depositedBalance,
    availableForStorage,
    lockedBalance,
    runway,
    spendRate,
    connected,
    synapseReady,
    loading,
    funding,
    error,
    isFunded,
    connectWallet: null, // RainbowKit handles connection
    disconnectWallet,
    fundWallet,
    refreshPaymentStatus,
    approveStorageOperator
  };

  return (
    <FilecoinContext.Provider value={value}>
      {children}
    </FilecoinContext.Provider>
  );
};

export const useFilecoin = () => {
  const context = useContext(FilecoinContext);
  if (!context) {
    return {
      wallet: null,
      balance: 0,
      depositedBalance: 0,
      availableForStorage: 0,
      lockedBalance: 0,
      runway: Infinity,
      spendRate: 0,
      connected: false,
      synapseReady: false,
      loading: false,
      funding: false,
      error: null,
      isFunded: false,
      connectWallet: null,
      disconnectWallet: () => {},
      fundWallet: async () => false,
      refreshPaymentStatus: async () => {},
      approveStorageOperator: async () => {},
    };
  }
  return context;
};