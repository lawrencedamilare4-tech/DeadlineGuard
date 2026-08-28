import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { FilecoinService } from '../services/filecoin';
import { logger } from '../utils/logger';

const FilecoinContext = createContext(null);

export const FilecoinProvider = ({ children }) => {
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState(null);
  const [runway, setRunway] = useState(null);
  const [spendRate, setSpendRate] = useState(null);
  const [connected, setConnected] = useState(false);
  const [synapseReady, setSynapseReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [funding, setFunding] = useState(false);
  const [error, setError] = useState(null);

  // On mount, restore saved wallet and re-initialize
  useEffect(() => {
    const savedWallet = localStorage.getItem('deadlineguard_wallet');
    if (savedWallet) {
      setWallet(savedWallet);
      setConnected(true);
      
      const reinitialize = async () => {
        try {
          await FilecoinService.initializeSynapse(savedWallet);
          setSynapseReady(true);
          
          try {
            const paymentStatus = await FilecoinService.getPaymentStatus();
            setBalance(paymentStatus.balance);
            setSpendRate(paymentStatus.spendRate);
            setRunway(paymentStatus.runway);
          } catch (payErr) {
            console.warn('[Filecoin] Payment fetch failed during reinit:', payErr.message);
          }
        } catch (err) {
          console.warn('[Filecoin] Re-init failed:', err.message);
          setSynapseReady(false);
        }
      };
      
      reinitialize();
    }
  }, []);

  const connectWallet = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSynapseReady(false);
    
    try {
      if (!window.ethereum) {
        throw new Error('No wallet detected. Please install MetaMask.');
      }

      await FilecoinService.switchToFilecoinCalibration();

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];

      await FilecoinService.initializeSynapse(address);

      localStorage.setItem('deadlineguard_wallet', address);
      setWallet(address);
      setConnected(true);
      setSynapseReady(true);

      try {
        const paymentStatus = await FilecoinService.getPaymentStatus();
        setBalance(paymentStatus.balance);
        setSpendRate(paymentStatus.spendRate);
        setRunway(paymentStatus.runway);
      } catch (payErr) {
        console.warn('[Filecoin] Payment fetch failed:', payErr.message);
        setBalance(0);
        setSpendRate(0);
        setRunway(Infinity);
      }

      logger.info('[Filecoin] Wallet connected:', address);
      return address;
    } catch (err) {
      console.error('[Filecoin] Wallet connection failed:', err);
      setError(err.message);
      setConnected(false);
      setSynapseReady(false);
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
      
      console.log('[Filecoin] Payment methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(payments)));
      
      const amountWei = BigInt(Math.floor(amount * 1e6));
      
      // Step 1: Approve USDFC spending
      if (typeof payments.approve === 'function') {
        console.log('[Filecoin] Approving USDFC...');
        await payments.approve({
          token: 'USDFC',
          amount: amountWei,
        });
      }
      
      // Step 2: Deposit USDFC to Payments contract
      if (typeof payments.deposit === 'function') {
        console.log('[Filecoin] Depositing USDFC...');
        await payments.deposit({
          token: 'USDFC',
          amount: amountWei,
        });
      }
      
      // Step 3: Approve operator (storage provider)
      if (typeof payments.approveOperator === 'function') {
        console.log('[Filecoin] Approving operator...');
        await payments.approveOperator({
          operator: '0x02925630df557F957f70E112bA06e50965417CA0',
        });
      }
      
      console.log('[Filecoin] Wallet fully funded and approved');
      
      // Refresh payment status
      const paymentStatus = await FilecoinService.getPaymentStatus();
      setBalance(paymentStatus.balance);
      setSpendRate(paymentStatus.spendRate);
      setRunway(paymentStatus.runway);
      
      return true;
    } catch (err) {
      console.error('[Filecoin] Funding failed:', err);
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
    setSpendRate(null);
    setRunway(null);
    setError(null);
  }, []);

  const refreshPaymentStatus = useCallback(async () => {
    if (!synapseReady) return;
    
    try {
      const paymentStatus = await FilecoinService.getPaymentStatus();
      setBalance(paymentStatus.balance);
      setSpendRate(paymentStatus.spendRate);
      setRunway(paymentStatus.runway);
    } catch (err) {
      console.warn('[Filecoin] Payment refresh failed:', err.message);
    }
  }, [synapseReady]);

  const value = {
    wallet,
    balance,
    runway,
    spendRate,
    connected,
    synapseReady,
    loading,
    funding,
    error,
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
    throw new Error('useFilecoin must be used within a FilecoinProvider');
  }
  return context;
};