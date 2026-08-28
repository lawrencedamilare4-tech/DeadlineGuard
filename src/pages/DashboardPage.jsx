import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { WeatherHero } from '../components/dashboard/WeatherHero';
import { RunwayCard } from '../components/dashboard/RunwayCard';
import StorageHealth from '../components/dashboard/StorageHealth';
import ForecastPanel from '../components/dashboard/ForecastPanel';
import { FilecoinService } from '../services/filecoin';
import { supabase } from '../services/supabase/client';
import { calculateWeather } from '../engines/weatherEngine';
import { useFilecoin } from '../contexts/FilecoinContext';
import { Loader2, RefreshCw, Database, HardDrive, Wallet, Lock, TrendingDown, FileText, Copy, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

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
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [totalStorageSize, setTotalStorageSize] = useState(0);
  const [copiedCid, setCopiedCid] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    try {
      // Fetch files from Supabase (index)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: filesData, error: filesError } = await supabase
          .from('files')
          .select('*, filecoin_storage(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!filesError) {
          setUploadedFiles(filesData || []);
          const total = (filesData || []).reduce((sum, f) => sum + (f.file_size || 0), 0);
          setTotalStorageSize(total);
        }
      }

      // Calculate weather
      const providerHealth = 1;
      const storageUtilization = totalStorageSize > 0 ? Math.min(1, totalStorageSize / (10 * 1024 * 1024 * 1024)) : 0;
      const effectiveRunway = walletRunway ?? 999999;

      setWeather(calculateWeather({
        storageUtilization,
        runwayEpochs: effectiveRunway,
        providerHealth,
        pdpStatus: 'VERIFIED',
        upcomingDemand: 0.5,
      }));

    } catch (err) {
      console.warn('[Dashboard] Fetch warning:', err.message);
    } finally {
      setLoading(false);
    }
  }, [walletRunway]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (typeof refreshPaymentStatus === 'function') {
        await refreshPaymentStatus();
      }
      await fetchData();
    } catch (e) {
      console.warn('[Dashboard] Refresh warning:', e.message);
    }
    setRefreshing(false);
  };

  const copyCid = (cid) => {
    if (cid) {
      navigator.clipboard.writeText(String(cid));
      setCopiedCid(String(cid));
      setTimeout(() => setCopiedCid(null), 2000);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
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

          {/* Payment Stats - FROM FILECOIN */}
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
              <p className="text-xs text-gray-500">Files Uploaded</p>
              <p className="text-2xl font-bold text-white">{uploadedFiles.length}</p>
            </div>
            <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
              <p className="text-xs text-gray-500">Total Storage Used</p>
              <p className="text-2xl font-bold text-white">{formatBytes(totalStorageSize)}</p>
            </div>
            <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
              <p className="text-xs text-gray-500">Spend Rate</p>
              <p className="text-2xl font-bold text-white">${spendRate?.toFixed(8) ?? '0.00'}/epoch</p>
            </div>
          </div>

          {/* Runway */}
          <div className="mt-6">
            <RunwayCard 
              days={walletRunway === Infinity ? '∞' : Math.floor(walletRunway || 0)} 
              percentage={Math.min(100, (availableForStorage / Math.max(depositedBalance, 0.01)) * 100)} 
            />
          </div>

          {/* Uploaded Files */}
          <div className="mt-8 bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-shamrock-darker">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-shamrock" /> Uploaded Files
              </h2>
            </div>

            {uploadedFiles.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">No files uploaded yet.</p>
                <Link to="/dashboard/upload" className="inline-block mt-3 text-shamrock hover:underline">
                  Upload your first file →
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-shamrock-darker">
                      <th className="px-4 py-3 text-sm text-gray-500">File</th>
                      <th className="px-4 py-3 text-sm text-gray-500">Size</th>
                      <th className="px-4 py-3 text-sm text-gray-500">PieceCID</th>
                      <th className="px-4 py-3 text-sm text-gray-500">Copies</th>
                      <th className="px-4 py-3 text-sm text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadedFiles.map((file) => {
                      const storage = file.filecoin_storage?.[0];
                      return (
                        <tr key={file.id} className="border-b border-gray-200 dark:border-shamrock-darker hover:bg-gray-50 dark:hover:bg-shamrock-darker/20">
                          <td className="px-4 py-3">
                            <span className="text-shamrock font-medium">{file.file_name}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                            {formatBytes(file.file_size)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-gray-500">
                                {String(file.piece_cid || '—').slice(0, 20)}...
                              </span>
                              {file.piece_cid && (
                                <button onClick={() => copyCid(file.piece_cid)} className="text-gray-400 hover:text-shamrock">
                                  {copiedCid === String(file.piece_cid) ? (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                            {storage?.healthy_provider_count ?? '—'}/{storage?.provider_count ?? '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              {file.status?.toUpperCase() || 'ACTIVE'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
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