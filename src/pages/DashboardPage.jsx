import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { WeatherHero } from '../components/dashboard/WeatherHero';
import { RunwayCard } from '../components/dashboard/RunwayCard';
import StorageHealth from '../components/dashboard/StorageHealth';
import ForecastPanel from '../components/dashboard/ForecastPanel';
import { FilecoinService } from '../services/filecoin';
import { calculateWeather } from '../engines/weatherEngine';
import { useFilecoin } from '../contexts/FilecoinContext';
import { Loader2, RefreshCw, Database, HardDrive, Wallet, Lock, TrendingDown } from 'lucide-react';

const DashboardPage = () => {
  const { 
    wallet, 
    balance, 
    depositedBalance,
    availableForStorage,
    lockedBalance,
    runway: walletRunway, 
    spendRate, 
    connected, 
    synapseReady, 
    refreshPaymentStatus 
  } = useFilecoin();

  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [onChainPieces, setOnChainPieces] = useState([]);
  const [onChainDataSets, setOnChainDataSets] = useState([]);
  const [totalStorageSize, setTotalStorageSize] = useState(0);

  const fetchOnChainData = useCallback(async () => {
    // Don't try if synapse is not ready
    if (!synapseReady) {
      console.log('[Dashboard] Synapse not ready, skipping on-chain fetch');
      setLoading(false);
      return;
    }

    try {
      const synapse = FilecoinService.getSynapse();
      const storage = synapse.storage;
      
      let dataSets = [];
      let allPieces = [];
      let totalSize = 0;

      try {
        if (typeof storage.findDataSets === 'function') {
          dataSets = await storage.findDataSets({ source: 'deadlineguard' });
        }
      } catch (e) {
        console.warn('[Dashboard] findDataSets:', e.message);
      }

      setOnChainDataSets(dataSets || []);
      setOnChainPieces(allPieces);
      setTotalStorageSize(totalSize);

      const providerHealth = 1;
      const storageUtilization = 0;
      const effectiveRunway = walletRunway ?? 999999;

      setWeather(calculateWeather({
        storageUtilization,
        runwayEpochs: effectiveRunway,
        providerHealth,
        pdpStatus: 'VERIFIED',
        upcomingDemand: 0.5,
      }));

    } catch (err) {
      console.warn('[Dashboard] On-chain fetch failed:', err.message);
    } finally {
      setLoading(false);
    }
  }, [synapseReady, walletRunway]);

  useEffect(() => {
    fetchOnChainData();
  }, [fetchOnChainData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (typeof refreshPaymentStatus === 'function') {
        await refreshPaymentStatus();
      }
      await fetchOnChainData();
    } catch (e) {
      console.warn('[Dashboard] Refresh failed:', e.message);
    }
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-shamrock animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-shamrock-darkest">
      <div className="flex-1 px-4 py-8">
        <motion.div initial="hidden" animate="show">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${connected ? 'bg-shamrock animate-pulse' : 'bg-gray-500'}`} />
              <span className="text-sm text-gray-300">
                {connected ? 'Wallet Connected' : 'Wallet Not Connected'}
              </span>
              {wallet && (
                <span className="text-sm font-mono text-gray-400">
                  {String(wallet).slice(0, 6)}...{String(wallet).slice(-4)}
                </span>
              )}
            </div>
            <button 
              onClick={handleRefresh} 
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-md border border-shamrock-darker px-3 py-2 text-sm text-gray-300 hover:bg-shamrock-darker/30 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {/* Weather Hero */}
          <WeatherHero weather={weather} />

          {/* Payment Stats */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Wallet className="h-3 w-3" /> MetaMask Balance
              </p>
              <p className="text-lg font-bold text-white">${balance?.toFixed(2) ?? '0.00'}</p>
            </div>
            <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Database className="h-3 w-3" /> Deposited (Funded)
              </p>
              <p className="text-lg font-bold text-white">${depositedBalance?.toFixed(2) ?? '0.00'}</p>
            </div>
            <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-shamrock-darker p-4 bg-shamrock/10">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <TrendingDown className="h-3 w-3" /> Available
              </p>
              <p className="text-lg font-bold text-shamrock">${availableForStorage?.toFixed(2) ?? '0.00'}</p>
            </div>
            <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Lock className="h-3 w-3" /> Locked
              </p>
              <p className="text-lg font-bold text-white">${lockedBalance?.toFixed(4) ?? '0.0000'}</p>
            </div>
          </div>

          {/* Storage Stats */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
              <p className="text-xs text-gray-500">Data Sets</p>
              <p className="text-lg font-bold text-white">{onChainDataSets.length}</p>
            </div>
            <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
              <p className="text-xs text-gray-500">Pieces</p>
              <p className="text-lg font-bold text-white">{onChainPieces.length}</p>
            </div>
            <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
              <p className="text-xs text-gray-500">Storage Used</p>
              <p className="text-lg font-bold text-white">{(totalStorageSize / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
          </div>

          {/* Runway */}
          <div className="mt-6">
            <RunwayCard 
              days={walletRunway === Infinity ? '∞' : Math.floor(walletRunway || 0)} 
              percentage={Math.min(100, (availableForStorage / Math.max(depositedBalance, 0.01)) * 100)} 
            />
          </div>

          {/* Storage Health & Forecast */}
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            <StorageHealth status="healthy" />
            <ForecastPanel />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardPage;