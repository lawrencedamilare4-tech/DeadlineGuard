import React, { useEffect, useState, useCallback } from 'react';
import { FilecoinService } from '../services/filecoin';
import { useFilecoin } from '../contexts/FilecoinContext';
import { Wallet, RefreshCw, Loader2, TrendingUp, TrendingDown, Clock } from 'lucide-react';

const PaymentsPage = () => {
  const { wallet, connected, synapseReady, refreshPaymentStatus } = useFilecoin();
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [costEstimate, setCostEstimate] = useState(null);

  const fetchOnChainPayments = useCallback(async () => {
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
      
      console.log('[Payments] Payment methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(payments)));

      // Fetch wallet balance from blockchain
      let balance = 0;
      try {
        const balanceBigInt = await payments.walletBalance({ token: 'USDFC' });
        balance = parseFloat(balanceBigInt.toString()) / 1e18;
        console.log('[Payments] On-chain balance:', balance);
      } catch (balanceErr) {
        console.warn('[Payments] walletBalance failed:', balanceErr.message);
      }

      // Fetch operator approvals
      let approvals = null;
      try {
        if (typeof payments.getOperatorApprovals === 'function') {
          approvals = await payments.getOperatorApprovals();
          console.log('[Payments] Operator approvals:', approvals);
        }
      } catch (approvalErr) {
        console.warn('[Payments] getOperatorApprovals failed:', approvalErr.message);
      }

      // Fetch price list / rates
      let priceList = null;
      try {
        if (typeof payments.getPriceList === 'function') {
          priceList = await payments.getPriceList();
          console.log('[Payments] Price list:', priceList);
        }
      } catch (priceErr) {
        console.warn('[Payments] getPriceList failed:', priceErr.message);
      }

      // Calculate spend rate from real data
      let spendRate = 0;
      if (priceList?.perMonth) {
        const monthlyCost = parseFloat(priceList.perMonth.toString()) / 1e18;
        const epochsPerMonth = 86400;
        spendRate = monthlyCost / epochsPerMonth;
      } else {
        // Fallback estimate
        spendRate = 0.05 / 86400; // $0.05/month for small storage
      }

      const runway = spendRate > 0 ? balance / spendRate : Infinity;

      const info = {
        balance,
        spendRate,
        runway,
        approvals,
        priceList,
        wallet: wallet,
      };

      setPaymentInfo(info);
      console.log('[Payments] Full payment info:', info);

    } catch (err) {
      console.error('[Payments] Fetch failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [synapseReady, wallet]);

  useEffect(() => {
    if (synapseReady) {
      fetchOnChainPayments();
    }
  }, [fetchOnChainPayments, synapseReady]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshPaymentStatus();
    await fetchOnChainPayments();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-shamrock animate-spin" />
      </div>
    );
  }

  const balance = paymentInfo?.balance ?? 0;
  const spendRate = paymentInfo?.spendRate ?? 0;
  const runway = paymentInfo?.runway ?? Infinity;
  const runwayDays = runway === Infinity ? '∞' : Math.floor(runway / 2880); // epochs to days (2880 epochs/day)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Wallet className="h-6 w-6 text-shamrock" /> Payments (On-Chain)
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

      {/* Wallet Info */}
      <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
        <p className="text-sm text-gray-500">Connected Wallet</p>
        <p className="font-mono text-white truncate">{wallet || 'Not connected'}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Balance */}
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-6">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-5 w-5 text-shamrock" />
            <p className="text-sm text-gray-500">USDFC Balance</p>
          </div>
          <p className="text-3xl font-bold text-white">${balance.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">On-chain wallet balance</p>
        </div>

        {/* Spend Rate */}
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-shamrock" />
            <p className="text-sm text-gray-500">Spend Rate</p>
          </div>
          <p className="text-3xl font-bold text-white">
            ${spendRate.toFixed(8)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Per epoch</p>
        </div>

        {/* Runway */}
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-6">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-shamrock" />
            <p className="text-sm text-gray-500">Runway</p>
          </div>
          <p className="text-3xl font-bold text-white">
            {runwayDays === '∞' ? '∞' : `${runwayDays} days`}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {runway === Infinity ? 'Unlimited' : `${Math.floor(runway)} epochs`}
          </p>
        </div>
      </div>

      {/* Operator Approvals */}
      {paymentInfo?.approvals && (
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Operator Approvals</h2>
          <pre className="text-xs font-mono text-gray-400 overflow-x-auto">
            {JSON.stringify(paymentInfo.approvals, null, 2)}
          </pre>
        </div>
      )}

      {/* Price List */}
      {paymentInfo?.priceList && (
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Storage Rates (On-Chain)</h2>
          <div className="space-y-3">
            {Object.entries(paymentInfo.priceList).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                <span className="font-mono text-white">{value.toString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Runway Visualization */}
      <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Runway Estimate</h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-400">Current Balance</span>
            <span className="font-mono text-white">${balance.toFixed(2)} USDFC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Spend Rate</span>
            <span className="font-mono text-white">${spendRate.toFixed(8)}/epoch</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Estimated Runway</span>
            <span className="font-mono text-shamrock font-bold">
              {runway === Infinity ? '∞' : `${Math.floor(runway).toLocaleString()} epochs`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentsPage;