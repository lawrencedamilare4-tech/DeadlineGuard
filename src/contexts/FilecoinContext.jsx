import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { FilecoinService } from '../services/filecoin';
import { useAccount, useWalletClient } from 'wagmi';
import { logger } from '../utils/logger';

const FilecoinContext = createContext(null);

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
    } catch (err) {
      console.error('[Filecoin] Balance fetch failed:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const initializeSynapse = async (walletAddress, walletClient) => {
    try {
      await FilecoinService.initializeSynapse(walletAddress, { walletClient });
      setSynapseReady(true);
    } catch (err) {
      console.warn('[Filecoin] Synapse init failed:', err.message);
      setSynapseReady(false);
    }
  };

  const fundWallet = useCallback(async (amount = 10) => {
    setFunding(true);
    setError(null);
    try {
      const synapse = FilecoinService.getSynapse();
      if (!synapse) throw new Error('Synapse not initialized');
      const payments = synapse.payments;
      const amountWei = BigInt(Math.floor(amount * 1e18));

      if (typeof payments.approve === 'function') {
        await payments.approve({ token: 'USDFC', amount: amountWei });
      }
      if (typeof payments.deposit === 'function') {
        await payments.deposit({ token: 'USDFC', amount: amountWei });
      }
      if (typeof payments.approveOperator === 'function') {
        await payments.approveOperator({
          operator: '0x02925630df557F957f70E112bA06e50965417CA0',
        });
      }

      if (wallet) {
        await fetchBalance(wallet);
      }
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setFunding(false);
    }
  }, [wallet]);

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
    };
  }
  return context;
};