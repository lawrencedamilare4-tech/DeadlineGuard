import React, { useEffect, useState, useCallback } from 'react';
import { FilecoinService } from '../services/filecoin';
import { useFilecoin } from '../contexts/FilecoinContext';
import { supabase } from '../services/supabase/client';
import { ethers } from 'ethers';
import { 
  Cloud, Loader2, RefreshCw, Sun, CloudRain, CloudLightning, Cloudy, 
  TrendingUp, TrendingDown, Wallet, Database, Lock, Clock
} from 'lucide-react';

const ForecastPage = () => {
  const { 
    wallet, connected, synapseReady, balance, spendRate, 
    depositedBalance, availableForStorage, lockedBalance,
    refreshPaymentStatus 
  } = useFilecoin();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [forecastData, setForecastData] = useState([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [currentSpendRate, setCurrentSpendRate] = useState(0);
  const [currentRunway, setCurrentRunway] = useState(Infinity);
  const [storageSize, setStorageSize] = useState(0);
  const [fileCount, setFileCount] = useState(0);

  const fetchOnChainForecast = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!synapseReady) {
        setError('Synapse not initialized. Please connect your wallet.');
        setLoading(false);
        return;
      }

      const synapse = FilecoinService.getSynapse();
      const payments = synapse.payments;

      // 1. Get REAL balances from contract (not wallet)
      let deposited = depositedBalance || 0;
      let available = availableForStorage || 0;
      let locked = lockedBalance || 0;
      let walletBal = balance || 0;

      try {
        const { ethers } = await import('ethers');
        const provider = new ethers.BrowserProvider(window.ethereum);
        const USDFC_ADDRESS = '0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0';
        const PAYMENTS_ADDRESS = '0x09a0fDc2723fAd1A7b8e3e00eE5DF73841df55a0';
        
        const PAYMENTS_ABI = [
          'function accounts(address token, address owner) view returns (uint256 funds, uint256 lockedFunds, bool frozen)',
        ];

        const contract = new ethers.Contract(PAYMENTS_ADDRESS, PAYMENTS_ABI, provider);
        const address = await provider.getSigner().getAddress();
        const accountInfo = await contract.accounts(USDFC_ADDRESS, address);
        
        deposited = parseFloat(accountInfo.funds.toString()) / 1e18;
        locked = parseFloat(accountInfo.lockedFunds.toString()) / 1e18;
        available = Math.max(0, deposited - locked);
      } catch (e) {
        console.warn('[Forecast] Contract query:', e.message);
      }

      setCurrentBalance(available); // Use AVAILABLE balance for forecast

      // 2. Real spend rate (actual cost per epoch)
      let realSpendRate = 0;
      try {
        // Calculate based on actual locked funds and time
        // Locked funds are for current storage period
        const storageDurationEpochs = 86400; // ~30 days
        realSpendRate = locked > 0 ? locked / storageDurationEpochs : 0.05 / 86400;
      } catch (e) {
        realSpendRate = 0.05 / 86400;
      }
      setCurrentSpendRate(realSpendRate);

      // 3. Real runway based on AVAILABLE balance
      const runwayValue = realSpendRate > 0 && available > 0 
        ? available / realSpendRate 
        : Infinity;
      setCurrentRunway(runwayValue);

      // 4. Get storage size from Supabase (files with valid PieceCIDs)
      let totalSize = 0;
      let fileCountValue = 0;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        let query = supabase.from('files').select('*').not('piece_cid', 'is', null);
        
        if (user) {
          const { data: files } = await query.eq('user_id', user.id);
          if (files) {
            totalSize = files.reduce((sum, f) => sum + (f.file_size || 0), 0);
            fileCountValue = files.length;
          }
        }
        
        if (fileCountValue === 0 && wallet) {
          const { data: walletFiles } = await supabase
            .from('files')
            .select('*')
            .eq('wallet_address', wallet)
            .not('piece_cid', 'is', null);
          if (walletFiles) {
            totalSize = walletFiles.reduce((sum, f) => sum + (f.file_size || 0), 0);
            fileCountValue = walletFiles.length;
          }
        }
      } catch (e) {
        console.warn('[Forecast] Supabase query:', e.message);
      }
      setStorageSize(totalSize);
      setFileCount(fileCountValue);

      // 5. Generate forecast based on real data
      const forecast = generateForecast(available, realSpendRate, runwayValue, totalSize, fileCountValue, locked);
      setForecastData(forecast);

      console.log('[Forecast] Real data:', {
        available,
        deposited,
        locked,
        spendRate: realSpendRate,
        runway: runwayValue,
        storageSize: totalSize,
        fileCount: fileCountValue,
      });

    } catch (err) {
      console.error('[Forecast] Fetch failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [synapseReady, balance, depositedBalance, availableForStorage, lockedBalance, wallet]);

  useEffect(() => {
    if (synapseReady) {
      fetchOnChainForecast();
    } else {
      setLoading(false);
      setError('Synapse not initialized. Please connect your wallet.');
    }
  }, [fetchOnChainForecast, synapseReady]);

  const generateForecast = (availableBalance, spendRate, runway, storageSize, fileCount, locked) => {
    const days = [];
    const epochsPerDay = 2880;
    const storageCapacity = 10 * 1024 * 1024 * 1024; // 10GB
    
    for (let day = 0; day < 7; day++) {
      const epochsUsed = day * epochsPerDay;
      const remainingBalance = spendRate > 0 
        ? Math.max(0, availableBalance - (spendRate * epochsUsed)) 
        : availableBalance;
      
      const remainingRunway = runway === Infinity 
        ? Infinity 
        : Math.max(0, runway - epochsUsed);

      // Determine weather based on remaining balance AND storage usage
      let state = 'CLEAR';
      let icon = Sun;
      const storageUtilization = storageSize / storageCapacity;

      if (remainingBalance <= 0.01) {
        state = 'CRITICAL';
        icon = CloudLightning;
      } else if (remainingBalance < 0.05) {
        state = 'STORM';
        icon = CloudLightning;
      } else if (remainingBalance < 0.10) {
        state = 'RAIN';
        icon = CloudRain;
      } else if (remainingBalance < 0.50 || storageUtilization > 0.7) {
        state = 'WATCH';
        icon = Cloudy;
      } else {
        state = 'CLEAR';
      }

      days.push({
        day: day === 0 ? 'Today' : `+${day}`,
        state,
        icon,
        runway: remainingRunway === Infinity ? '∞' : Math.floor(remainingRunway),
        balance: remainingBalance,
        storageUsed: Math.min(100, storageUtilization * 100),
      });
    }
    
    return days;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshPaymentStatus();
    await fetchOnChainForecast();
    setRefreshing(false);
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-shamrock animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Cloud className="h-6 w-6 text-shamrock" /> 7-Day Forecast
        </h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing || !synapseReady}
          className="inline-flex items-center gap-2 rounded-md border border-shamrock-darker px-3 py-2 text-sm text-gray-300 hover:bg-shamrock-darker/30 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Real On-Chain Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <TrendingDown className="h-3 w-3" /> Available
          </p>
          <p className="text-2xl font-bold text-shamrock">${currentBalance.toFixed(4)}</p>
        </div>
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Database className="h-3 w-3" /> Deposited
          </p>
          <p className="text-2xl font-bold text-white">${depositedBalance?.toFixed(4) ?? '0.0000'}</p>
        </div>
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Lock className="h-3 w-3" /> Locked
          </p>
          <p className="text-2xl font-bold text-white">${lockedBalance?.toFixed(4) ?? '0.0000'}</p>
        </div>
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Runway
          </p>
          <p className="text-2xl font-bold text-white">
            {currentRunway === Infinity ? '∞' : `${Math.floor(currentRunway / 2880)} days`}
          </p>
        </div>
      </div>

      {/* 7-Day Forecast */}
      <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Projected Storage Conditions</h2>
        
        <div className="grid grid-cols-7 gap-2 text-center">
          {forecastData.map((day) => {
            const Icon = day.icon;
            return (
              <div key={day.day} className="flex flex-col items-center p-3 rounded-lg bg-shamrock-darker/10">
                <span className="text-xs text-gray-400 font-medium">{day.day}</span>
                <Icon className={`h-8 w-8 my-2 ${
                  day.state === 'CLEAR' ? 'text-shamrock' :
                  day.state === 'WATCH' ? 'text-yellow-400' :
                  day.state === 'RAIN' ? 'text-blue-400' :
                  day.state === 'STORM' ? 'text-orange-400' :
                  'text-red-500'
                }`} />
                <span className="text-xs font-bold text-white">{day.state}</span>
                <span className="text-xs text-gray-400 mt-1">
                  ${day.balance.toFixed(4)}
                </span>
                <span className="text-xs text-gray-500">
                  {day.runway === '∞' ? '∞' : `${Math.floor(day.runway / 2880)}d`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-6">
        <h2 className="text-lg font-semibold text-white mb-3">Forecast Summary</h2>
        <div className="space-y-2 text-sm text-gray-400">
          <p>
            <span className="text-white font-semibold">{fileCount}</span> files stored 
            using <span className="text-white font-semibold">{formatBytes(storageSize)}</span>
          </p>
          <p>
            Available balance: <span className="text-shamrock font-semibold">${currentBalance.toFixed(4)} USDFC</span>
          </p>
          <p>
            Spend rate: <span className="text-white">${currentSpendRate.toFixed(10)}/epoch</span>
          </p>
          <p>
            Estimated runway: <span className="text-white font-semibold">
              {currentRunway === Infinity ? '∞' : `${Math.floor(currentRunway / 2880)} days`}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForecastPage;