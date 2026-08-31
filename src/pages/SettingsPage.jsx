import React, { useState, useEffect, useRef } from 'react';
import { useFilecoin } from '../contexts/FilecoinContext';
import { useSupabase } from '../hooks/useSupabase';
import { supabase } from '../services/supabase/client';
import { Check, X, Wallet, Loader2 } from 'lucide-react';

const SettingsPage = () => {
  const { user } = useSupabase();
  const { 
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
    connectWallet, 
    fundWallet,
    refreshPaymentStatus,
    disconnectWallet,
  } = useFilecoin();
  
  const [fundAmount, setFundAmount] = useState(10);
  const [fundSuccess, setFundSuccess] = useState(false);
  const [fundError, setFundError] = useState(null);

  const handleFundWallet = async () => {
    setFundSuccess(false);
    setFundError(null);
    
    try {
      await fundWallet(fundAmount);
      setFundSuccess(true);
      
      // Refresh payment status after funding
      if (typeof refreshPaymentStatus === 'function') {
        await refreshPaymentStatus();
      }
      
      // Clear success message after 5 seconds
      setTimeout(() => setFundSuccess(false), 5000);
    } catch (err) {
      setFundError(err.message || 'Funding failed');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Settings</h1>

      {/* Filecoin Wallet Section */}
      <section className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Wallet className="h-5 w-5 mr-2 text-shamrock" /> Filecoin Wallet
        </h2>

        {!connected ? (
          <div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Connect your wallet to manage Filecoin storage payments.
            </p>
            <button 
              onClick={connectWallet} 
              disabled={loading} 
              className="inline-flex items-center gap-2 rounded-md bg-shamrock px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-shamrock-dark disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Wallet size={16} />
                  Connect Wallet
                </>
              )}
            </button>
            {error && <p className="text-red-600 mt-2 text-sm">{error}</p>}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Wallet Address */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-300">Wallet Address</span>
              <span className="font-mono text-sm text-green-400">
                {wallet?.slice(0, 10)}...{wallet?.slice(-6)}
              </span>
            </div>

            {/* Network */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-300">Network</span>
              <span className="font-medium text-green-400">Filecoin Calibration</span>
            </div>

            {/* Synapse Status */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-300">Synapse Status</span>
              {synapseReady ? (
                <span className="text-green-500 flex items-center gap-1">
                  <Check size={16} className="text-green-400" /> Ready
                </span>
              ) : (
                <span className="text-yellow-500">Initializing...</span>
              )}
            </div>

            {/* MetaMask Balance */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-300">MetaMask Balance</span>
              <span className="font-medium text-green-400">${balance?.toFixed(2) ?? '—'} USDFC</span>
            </div>

            {/* Deposited Balance */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-300">Deposited (Funded)</span>
              <span className="font-medium text-green-400">${depositedBalance?.toFixed(4) ?? '0.0000'} USDFC</span>
            </div>

            {/* Available Balance */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-300">Available</span>
              <span className="font-bold text-green-400">${availableForStorage?.toFixed(4) ?? '0.0000'} USDFC</span>
            </div>

            {/* Locked Balance */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-300">Locked</span>
              <span className="font-medium text-green-400">${lockedBalance?.toFixed(4) ?? '0.0000'} USDFC</span>
            </div>

            {/* Spend Rate */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-300">Spend Rate</span>
              <span className="font-medium text-green-400">${spendRate?.toFixed(8) ?? '—'} / epoch</span>
            </div>

            {/* Runway */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-300">Runway</span>
              <span className="font-medium text-green-400">
                {runway === Infinity ? '∞' : runway ? `${Math.floor(runway / 2880)} days` : '—'}
              </span>
            </div>

            {/* Fund Wallet */}
            <div className="pt-4 border-t border-gray-200 dark:border-shamrock-darker">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                Fund your wallet with tUSDFC for storage payments:
              </p>
              <div className="flex gap-3 items-center">
                <input
                  type="number"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(Math.max(1, Number(e.target.value)))}
                  min="1"
                  max="100"
                  className="w-24 px-3 py-2 border border-gray-300 dark:border-shamrock-darker rounded-md bg-white dark:bg-shamrock-darker text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-shamrock"
                />
                <button
                  onClick={handleFundWallet}
                  disabled={funding || !synapseReady}
                  className="inline-flex items-center gap-2 rounded-md bg-shamrock px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-shamrock-dark disabled:opacity-50"
                >
                  {funding ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Funding...
                    </>
                  ) : (
                    'Fund Wallet'
                  )}
                </button>
              </div>

              {/* Funding Success */}
              {fundSuccess && (
                <p className="mt-3 text-green-500 text-sm flex items-center gap-1">
                  <Check size={16} className="text-green-400" /> Wallet funded successfully! Balance refreshed.
                </p>
              )}

              {/* Funding Error */}
              {fundError && (
                <p className="mt-3 text-red-600 text-sm">{fundError}</p>
              )}

              <p className="text-xs text-gray-500 mt-2">
                This deposits tUSDFC to the Filecoin Payments contract for storage.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default SettingsPage;