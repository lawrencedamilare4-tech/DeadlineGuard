import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { FilecoinService } from '../services/filecoin';
import { logger } from '../utils/logger';

const FilecoinContext = createContext(null);

export const FilecoinProvider = ({ children }) => {
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

  const connectWallet = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSynapseReady(false);
    
    try {
      if (!window.ethereum) {
        throw new Error('No wallet detected. Please install MetaMask.');
      }

      console.log('[Connect] Switching to Filecoin Calibration...');
      await FilecoinService.switchToFilecoinCalibration();

      console.log('[Connect] Requesting accounts...');
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];
      console.log('[Connect] Account:', address);

      console.log('[Connect] Initializing Synapse...');
      await FilecoinService.initializeSynapse(address);

      localStorage.setItem('deadlineguard_wallet', address);
      setWallet(address);
      setConnected(true);
      setSynapseReady(true);

      // Fetch payment status
      try {
        const paymentStatus = await FilecoinService.getPaymentStatus();
        setBalance(paymentStatus.balance || 0);
        setDepositedBalance(paymentStatus.depositedBalance || 0);
        setAvailableForStorage(paymentStatus.availableForStorage || 0);
        setLockedBalance(paymentStatus.lockedBalance || 0);
        setSpendRate(paymentStatus.spendRate || 0);
        setRunway(paymentStatus.runway || Infinity);
        setIsFunded((paymentStatus.availableForStorage || 0) > 0.13);
        console.log('[Connect] isFunded:', (paymentStatus.availableForStorage || 0) > 0.13);
      } catch (payErr) {
        console.warn('[Connect] Payment fetch warning:', payErr.message);
      }

      console.log('[Connect] Wallet connected, returning:', address);
      return address;
    } catch (err) {
      console.error('[Connect] Error:', err.message);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fundWallet = useCallback(async (amount = 10) => {
    setFunding(true);
    setError(null);
    
    try {
      const synapse = FilecoinService.getSynapse();
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
      
      console.log('[Fund] Wallet funded with', amount, 'USDFC');
      
      // Refresh all balances
      const paymentStatus = await FilecoinService.getPaymentStatus();
      setBalance(paymentStatus.balance || 0);
      setDepositedBalance(paymentStatus.depositedBalance || 0);
      setAvailableForStorage(paymentStatus.availableForStorage || 0);
      setLockedBalance(paymentStatus.lockedBalance || 0);
      setSpendRate(paymentStatus.spendRate || 0);
      setRunway(paymentStatus.runway || Infinity);
      setIsFunded((paymentStatus.availableForStorage || 0) > 0.13);
      
      return true;
    } catch (err) {
      console.error('[Fund] Error:', err.message);
      setError(err.message);
      throw err;
    } finally {
      setFunding(false);
    }
  }, []);

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
    setIsFunded(false);
    setError(null);
  }, []);

  const refreshPaymentStatus = useCallback(async () => {
    if (!synapseReady) return;
    
    try {
      const paymentStatus = await FilecoinService.getPaymentStatus();
      setBalance(paymentStatus.balance || 0);
      setDepositedBalance(paymentStatus.depositedBalance || 0);
      setAvailableForStorage(paymentStatus.availableForStorage || 0);
      setLockedBalance(paymentStatus.lockedBalance || 0);
      setSpendRate(paymentStatus.spendRate || 0);
      setRunway(paymentStatus.runway || Infinity);
      setIsFunded((paymentStatus.availableForStorage || 0) > 0.13);
      console.log('[Refresh] isFunded:', (paymentStatus.availableForStorage || 0) > 0.13);
    } catch (err) {
      console.warn('[Refresh] Payment refresh failed:', err.message);
    }
  }, [synapseReady]);

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
    connectWallet,
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
      connectWallet: async () => null,
      disconnectWallet: () => {},
      fundWallet: async () => false,
      refreshPaymentStatus: async () => {},
    };
  }
  
  return context;
};