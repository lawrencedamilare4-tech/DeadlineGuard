import React, { useEffect, useState, useCallback } from 'react';
import { FilecoinService } from '../services/filecoin';
import { useFilecoin } from '../contexts/FilecoinContext';
import { Cloud, Loader2, RefreshCw, Sun, CloudRain, CloudLightning, Cloudy, TrendingUp, TrendingDown } from 'lucide-react';
import { calculateWeather } from '../engines/weatherEngine';

const ForecastPage = () => {
  const { wallet, connected, synapseReady, balance, spendRate, refreshPaymentStatus } = useFilecoin();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [forecastData, setForecastData] = useState([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [currentSpendRate, setCurrentSpendRate] = useState(0);
  const [currentRunway, setCurrentRunway] = useState(Infinity);
  const [storageSize, setStorageSize] = useState(0);

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
      const storage = synapse.storage;

      // 1. Fetch current balance from blockchain
      let balanceValue = 0;
      try {
        const balanceBigInt = await payments.walletBalance({ token: 'USDFC' });
        balanceValue = parseFloat(balanceBigInt.toString()) / 1e18;
      } catch (err) {
        console.warn('[Forecast] Balance fetch failed:', err.message);
        balanceValue = balance || 0;
      }
      setCurrentBalance(balanceValue);

      // 2. Fetch price list for spend rate
      let spendRateValue = spendRate || 0;
      try {
        if (typeof payments.getPriceList === 'function') {
          const priceList = await payments.getPriceList();
          if (priceList?.perMonth) {
            const monthlyCost = parseFloat(priceList.perMonth.toString()) / 1e18;
            const epochsPerMonth = 86400;
            spendRateValue = monthlyCost / epochsPerMonth;
          }
        }
      } catch (err) {
        console.warn('[Forecast] Price list fetch failed:', err.message);
      }
      setCurrentSpendRate(spendRateValue);

      // 3. Calculate current runway
      const runwayValue = spendRateValue > 0 ? balanceValue / spendRateValue : Infinity;
      setCurrentRunway(runwayValue);

      // 4. Fetch storage info for utilization
      let totalSize = 0;
      try {
        if (typeof storage.findDataSets === 'function') {
          const dataSets = await storage.findDataSets({ source: 'deadlineguard' });
          for (const ds of (dataSets || [])) {
            if (typeof storage.getStorageInfo === 'function') {
              const info = await storage.getStorageInfo({ dataSetId: ds.id || ds.clientDataSetId });
              if (info?.pieces) {
                totalSize += info.pieces.reduce((sum, p) => sum + (p.size || 0), 0);
              }
            }
          }
        }
      } catch (err) {
        console.warn('[Forecast] Storage info fetch failed:', err.message);
      }
      setStorageSize(totalSize);

      // 5. Generate 7-day forecast based on real data
      const forecast = generateForecast(balanceValue, spendRateValue, runwayValue, totalSize);
      setForecastData(forecast);

      console.log('[Forecast] On-chain data:', {
        balance: balanceValue,
        spendRate: spendRateValue,
        runway: runwayValue,
        storageSize: totalSize,
      });

    } catch (err) {
      console.error('[Forecast] Fetch failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [synapseReady, balance, spendRate]);

  useEffect(() => {
    if (synapseReady) {
      fetchOnChainForecast();
    }
  }, [fetchOnChainForecast, synapseReady]);

  const generateForecast = (balance, spendRate, runway, storageSize) => {
    const days = [];
    const epochsPerDay = 2880; // 30-second epochs
    
    for (let day = 0; day < 7; day++) {
      const epochsUsed = day * epochsPerDay;
      const remainingRunway = runway === Infinity ? Infinity : runway - epochsUsed;
      const projectedBalance = spendRate > 0 ? Math.max(0, balance - (spendRate * epochsUsed)) : balance;
      
      // Determine weather for this day
      let state = 'CLEAR';
      let icon = Sun;
      
      if (remainingRunway === Infinity) {
        state = 'CLEAR';
      } else if (remainingRunway <= 100) {
        state = 'CRITICAL';
        icon = CloudLightning;
      } else if (remainingRunway <= 500) {
        state = 'STORM';
        icon = CloudLightning;
      } else if (remainingRunway <= 2000) {
        state = 'RAIN';
        icon = CloudRain;
      } else if (remainingRunway <= 5000) {
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
        balance: projectedBalance,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-shamrock animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Cloud className="h-6 w-6 text-shamrock" /> 7-Day Forecast (On-Chain)
        </h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
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

      {/* Current Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
          <p className="text-xs text-gray-500">Current Balance</p>
          <p className="text-2xl font-bold text-white">${currentBalance.toFixed(2)}</p>
        </div>
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
          <p className="text-xs text-gray-500">Spend Rate</p>
          <p className="text-2xl font-bold text-white">${currentSpendRate.toFixed(8)}/epoch</p>
        </div>
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
          <p className="text-xs text-gray-500">Current Runway</p>
          <p className="text-2xl font-bold text-white">
            {currentRunway === Infinity ? '∞' : `${Math.floor(currentRunway).toLocaleString()} epochs`}
          </p>
        </div>
      </div>

      {/* 7-Day Forecast Grid */}
      <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Forecast</h2>
        
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
                  {day.runway === '∞' ? '∞' : day.runway.toLocaleString()} ep
                </span>
                <span className="text-xs text-gray-500">
                  ${day.balance.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Explanation */}
      <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-6">
        <h2 className="text-lg font-semibold text-white mb-3">How This Forecast Works</h2>
        <p className="text-sm text-gray-400 leading-relaxed">
          This forecast is based on real on-chain data from Filecoin:
        </p>
        <ul className="text-sm text-gray-400 mt-2 space-y-1 list-disc list-inside">
          <li>Current USDFC balance: <span className="text-white">${currentBalance.toFixed(2)}</span></li>
          <li>Spend rate: <span className="text-white">${currentSpendRate.toFixed(8)}/epoch</span></li>
          <li>Current runway: <span className="text-white">{currentRunway === Infinity ? '∞' : Math.floor(currentRunway).toLocaleString()} epochs</span></li>
          <li>Storage used: <span className="text-white">{(storageSize / (1024 * 1024)).toFixed(2)} MB</span></li>
        </ul>
        <p className="text-sm text-gray-500 mt-3">
          The forecast projects balance depletion over 7 days at the current spend rate.
        </p>
      </div>
    </div>
  );
};

export default ForecastPage;