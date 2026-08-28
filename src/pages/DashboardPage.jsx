import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { WeatherHero } from '../components/dashboard/WeatherHero';
import { RunwayCard } from '../components/dashboard/RunwayCard';
import StorageHealth from '../components/dashboard/StorageHealth';
import ForecastPanel from '../components/dashboard/ForecastPanel';
import { AgentActivity } from '../components/dashboard/AgentActivity';
import { ProtectedFiles } from '../components/dashboard/ProtectedFiles';
import { ArchiveCandidates } from '../components/dashboard/ArchiveCandidates';
import { supabase } from '../services/supabase/client';
import { calculateWeather } from '../engines/weatherEngine';
import { useAgentScheduler } from '../hooks/useAgentScheduler';
import { useFilecoin } from '../contexts/FilecoinContext';
import { runAgent } from '../engines/agentEngine';
import { Loader2, CloudLightning, RefreshCw } from 'lucide-react';

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

function calculateStorageUtilization(storageData = []) {
  if (!storageData.length) return 0;
  const used = storageData.reduce((sum, row) => sum + (row.storage_size ?? 0), 0);
  const total = storageData.reduce((sum, row) => sum + (row.storage_size ?? 0), 0) || 1;
  return Math.min(1, used / total);
}

function calculateProviderHealth(storageData = []) {
  if (!storageData.length) return 1;
  const healthy = storageData.filter((row) => row.pdp_status === 'VERIFIED').length;
  return healthy / storageData.length;
}

function deriveHealthStatus(providerHealth) {
  if (providerHealth >= 0.85) return 'healthy';
  if (providerHealth >= 0.5) return 'warning';
  return 'critical';
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-shamrock-darkest">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="h-40 animate-pulse rounded-3xl border border-shamrock-darker/40 bg-shamrock-darker/20" />
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl border border-shamrock-darker/40 bg-shamrock-darker/20" />
          ))}
        </div>
      </div>
    </div>
  );
}

const DashboardPage = () => {
  const { wallet, balance, runway: walletRunway, spendRate, connected, synapseReady, refreshPaymentStatus } = useFilecoin();
  const [weather, setWeather] = useState(null);
  const [runway, setRunway] = useState({ days: 0, percentage: 0 });
  const [healthStatus, setHealthStatus] = useState('healthy');
  const [files, setFiles] = useState([]);
  const [activity, setActivity] = useState([]);
  const [storageData, setStorageData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Run agent periodically
 // useAgentScheduler(60000);

const fetchData = useCallback(async () => {
  setLoading(true);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    setLoading(false);
    return;
  }

  const [
    { data: filesData },
    { data: paymentsData },
    { data: storageRecords },
    { data: activityData },
  ] = await Promise.all([
    supabase.from('files').select('*, filecoin_storage(*)').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('storage_payments').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('filecoin_storage').select('*').eq('user_id', user.id),
    supabase
      .from('agent_actions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  setStorageData(storageRecords ?? []);
  setFiles(filesData ?? []);
  setActivity(activityData ?? []);

  // Declare providerHealth FIRST
  const providerHealth = calculateProviderHealth(storageRecords ?? []);
  
  // Use real wallet balance if available
  const effectiveBalance = balance ?? paymentsData?.filecoin_balance ?? 0;
  const effectiveSpendRate = spendRate ?? paymentsData?.storage_spend_rate ?? 0.34;
  const effectiveRunway = walletRunway ?? paymentsData?.estimated_runway ?? 999999;

  const metrics = {
    storageUtilization: calculateStorageUtilization(storageRecords ?? []),
    runwayEpochs: effectiveRunway,
    providerHealth,
    pdpStatus: 'VERIFIED',
    upcomingDemand: 0.5,
  };

  setWeather(calculateWeather(metrics));
  
  // Now use providerHealth (already declared)
  setRunway({
    days: effectiveRunway === Infinity ? '∞' : effectiveRunway,
    percentage: Math.round(providerHealth * 100),
  });
  
  setHealthStatus(deriveHealthStatus(providerHealth));
  setLoading(false);
}, [balance, spendRate, walletRunway]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription
  useEffect(() => {
    const subscription = supabase
      .channel('dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'files' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshPaymentStatus();
    await fetchData();
    setRefreshing(false);
  };

  const simulateStorm = async () => {
    setSimulating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Simulate low runway
    await supabase.from('storage_payments').upsert(
      { user_id: user.id, estimated_runway: 4, filecoin_balance: 0.5, storage_spend_rate: 0.35 },
      { onConflict: 'user_id' }
    );

    await runAgent(user.id);

    setTimeout(async () => {
      await supabase.from('storage_payments').upsert(
        { user_id: user.id, estimated_runway: 11, filecoin_balance: 4.82, storage_spend_rate: 0.34 },
        { onConflict: 'user_id' }
      );
      await runAgent(user.id);
      setSimulating(false);
      fetchData();
    }, 5000);
  };

  if (loading) return <DashboardSkeleton />;

  const protectedFiles = files.filter((f) => f.status === 'protected');
  const archiveCandidates = files.filter((f) => f.status === 'active' && f.temperature === 'cold');
  const totalStorageUsed = storageData.reduce((sum, row) => sum + (row.storage_size || 0), 0);
  const totalProviders = storageData.reduce((sum, row) => sum + (row.provider_count || 0), 0);
  const healthyProviders = storageData.reduce((sum, row) => sum + (row.healthy_provider_count || 0), 0);

  return (
    <div className="min-h-screen bg-shamrock-darkest">
      <div className="flex">
        {/* Main content */}
        <div className="flex-1 px-4 py-8">
          <motion.div initial="hidden" animate="show" variants={containerVariants}>
            {/* Header with wallet info and actions */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-shamrock animate-pulse" />
                <span className="text-sm text-gray-300">
                  {connected ? 'Wallet Connected' : 'Wallet Not Connected'}
                </span>
                {wallet && (
                  <span className="text-sm font-mono text-gray-400">
                    {wallet.slice(0, 6)}...{wallet.slice(-4)}
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 rounded-md border border-shamrock-darker px-3 py-2 text-sm text-gray-300 hover:bg-shamrock-darker/30 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                  Refresh
                </button>
                <button
                  onClick={simulateStorm}
                  disabled={simulating}
                  className="inline-flex items-center gap-2 rounded-md bg-shamrock px-3 py-2 text-sm font-semibold text-white hover:bg-shamrock-dark transition-colors disabled:opacity-50"
                >
                  <CloudLightning size={16} />
                  {simulating ? 'Simulating...' : 'Simulate Storm'}
                </button>
              </div>
            </div>

            {/* Weather Hero */}
            <section id="overview">
              <motion.div variants={itemVariants}>
                <WeatherHero weather={weather} />
              </motion.div>
            </section>

            {/* Stats Cards */}
            <section className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">Balance</p>
                <p className="text-lg font-bold text-white">${balance?.toFixed(2) ?? '—'} USDFC</p>
              </div>
              <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">Spend Rate</p>
                <p className="text-lg font-bold text-white">${spendRate?.toFixed(4) ?? '—'}/epoch</p>
              </div>
              <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">Storage Used</p>
                <p className="text-lg font-bold text-white">{(totalStorageUsed / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
              <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">Providers</p>
                <p className="text-lg font-bold text-white">{healthyProviders}/{totalProviders}</p>
              </div>
            </section>

            {/* Storage & Payments & Forecast */}
            <section id="storage" className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <motion.div variants={itemVariants}>
                <RunwayCard days={runway.days} percentage={runway.percentage} />
              </motion.div>
              <motion.div variants={itemVariants}>
                <StorageHealth status={healthStatus} />
              </motion.div>
              <motion.div id="forecast" variants={itemVariants}>
                <ForecastPanel />
              </motion.div>
            </section>

            {/* Agent Activity & Protected/Archive */}
            <section id="agent" className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <motion.div variants={itemVariants}>
                <AgentActivity activities={activity} />
              </motion.div>
              <motion.div variants={itemVariants} className="space-y-6">
                <div id="protected">
                  <ProtectedFiles count={protectedFiles.length} />
                </div>
                <div id="archive">
                  <ArchiveCandidates files={archiveCandidates} />
                </div>
              </motion.div>
            </section>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;