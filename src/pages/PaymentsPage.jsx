import React, { useEffect, useState, useCallback } from 'react';
import { FilecoinService } from '../services/filecoin';
import { useFilecoin } from '../contexts/FilecoinContext';
import { supabase } from '../services/supabase/client';
import { 
  Wallet, RefreshCw, Loader2, TrendingUp, TrendingDown, Clock, 
  FileText, CheckCircle, AlertTriangle, Database, HardDrive
} from 'lucide-react';

const PaymentsPage = () => {
  const { wallet, connected, synapseReady, refreshPaymentStatus, depositedBalance, availableForStorage, lockedBalance } = useFilecoin();
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [recentPayments, setRecentPayments] = useState([]);

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

      // Fetch wallet balance
      let balance = 0;
      try {
        const balanceBigInt = await payments.walletBalance({ token: 'USDFC' });
        balance = parseFloat(balanceBigInt.toString()) / 1e18;
      } catch (e) {
        console.warn('[Payments] walletBalance failed:', e.message);
      }

      // Fetch operator approvals (shows what's locked/used)
      let approvals = null;
      try {
        if (typeof payments.getOperatorApprovals === 'function') {
          approvals = await payments.getOperatorApprovals();
        }
      } catch (e) {
        console.warn('[Payments] getOperatorApprovals failed:', e.message);
      }

      // Spend rate
      const spendRate = 0.05 / 86400;
      const runway = spendRate > 0 ? (availableForStorage || balance) / spendRate : Infinity;

      const info = {
        balance,
        spendRate,
        runway,
        approvals,
      };

      setPaymentInfo(info);

      // Fetch recent payments from Supabase (agent actions + file uploads)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Get upload actions (payments for storage)
        const { data: uploads } = await supabase
          .from('files')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        // Get agent actions related to payments
        const { data: actions } = await supabase
          .from('agent_actions')
          .select('*')
          .in('action_type', ['ALERT', 'ARCHIVE', 'PROTECT', 'DELETE'])
          .order('created_at', { ascending: false })
          .limit(10);

        // Combine and map to payment entries
        const paymentsList = [];

        if (uploads) {
          for (const upload of uploads) {
            paymentsList.push({
              id: `upload-${upload.id}`,
              type: 'STORAGE',
              description: `Stored: ${upload.file_name}`,
              pieceCid: upload.piece_cid,
              size: upload.file_size,
              date: upload.created_at,
              status: 'COMPLETED',
              amount: '~0.124 USDFC',
            });
          }
        }

        if (actions) {
          for (const action of actions) {
            paymentsList.push({
              id: `action-${action.id}`,
              type: action.action_type,
              description: action.description,
              date: action.created_at,
              status: 'COMPLETED',
            });
          }
        }

        // Sort by date
        paymentsList.sort((a, b) => new Date(b.date) - new Date(a.date));
        setRecentPayments(paymentsList.slice(0, 15));

      } catch (supabaseErr) {
        console.warn('[Payments] Supabase fetch:', supabaseErr.message);
      }

    } catch (err) {
      console.error('[Payments] Fetch failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [synapseReady, availableForStorage]);

  useEffect(() => {
    if (synapseReady) {
      fetchOnChainPayments();
    } else {
      setLoading(false);
      setError('Synapse not initialized. Please connect your wallet.');
    }
  }, [fetchOnChainPayments, synapseReady]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshPaymentStatus();
    await fetchOnChainPayments();
    setRefreshing(false);
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '—';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
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
  const runwayDays = runway === Infinity ? '∞' : Math.floor(runway / 2880);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Wallet className="h-6 w-6 text-shamrock" /> Payments
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

      {/* Wallet Info */}
      <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
        <p className="text-sm text-gray-500">Connected Wallet</p>
        <p className="font-mono text-white truncate">{wallet || 'Not connected'}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MetaMask Balance */}
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-6">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-5 w-5 text-shamrock" />
            <p className="text-sm text-gray-500">MetaMask</p>
          </div>
          <p className="text-2xl font-bold text-white">${balance.toFixed(2)}</p>
        </div>

        {/* Deposited */}
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-6">
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-5 w-5 text-shamrock" />
            <p className="text-sm text-gray-500">Deposited</p>
          </div>
          <p className="text-2xl font-bold text-white">${depositedBalance?.toFixed(4) ?? '0.0000'}</p>
        </div>

        {/* Available */}
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-shamrock-darker p-6 bg-shamrock/10">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="h-5 w-5 text-shamrock" />
            <p className="text-sm text-gray-500">Available</p>
          </div>
          <p className="text-2xl font-bold text-shamrock">${availableForStorage?.toFixed(4) ?? '0.0000'}</p>
        </div>

        {/* Runway */}
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-6">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-shamrock" />
            <p className="text-sm text-gray-500">Runway</p>
          </div>
          <p className="text-2xl font-bold text-white">{runwayDays === '∞' ? '∞' : `${runwayDays}d`}</p>
        </div>
      </div>

      {/* Recent Payments */}
      <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-shamrock-darker">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-shamrock" /> Recent Storage Payments
          </h2>
        </div>

        {recentPayments.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">No storage payments yet.</p>
            <p className="text-sm text-gray-500 mt-2">Upload files to see payment history.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 dark:border-shamrock-darker">
                  <th className="px-4 py-3 text-sm text-gray-500">Date</th>
                  <th className="px-4 py-3 text-sm text-gray-500">Type</th>
                  <th className="px-4 py-3 text-sm text-gray-500">Description</th>
                  <th className="px-4 py-3 text-sm text-gray-500">Amount</th>
                  <th className="px-4 py-3 text-sm text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((payment) => (
                  <tr key={payment.id} className="border-b border-gray-200 dark:border-shamrock-darker hover:bg-gray-50 dark:hover:bg-shamrock-darker/20">
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-300">{formatDate(payment.date)}</p>
                      <p className="text-xs text-gray-500">{formatTime(payment.date)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        payment.type === 'STORAGE' ? 'bg-shamrock/20 text-shamrock' :
                        payment.type === 'ALERT' ? 'bg-red-500/20 text-red-400' :
                        payment.type === 'ARCHIVE' ? 'bg-gray-500/20 text-gray-400' :
                        payment.type === 'PROTECT' ? 'bg-green-500/20 text-green-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {payment.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-white">{payment.description}</p>
                      {payment.pieceCid && (
                        <p className="text-xs font-mono text-gray-500">
                          CID: {String(payment.pieceCid).slice(0, 25)}...
                        </p>
                      )}
                      {payment.size > 0 && (
                        <p className="text-xs text-gray-500">Size: {formatBytes(payment.size)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {payment.amount || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-green-500">
                        <CheckCircle className="h-4 w-4" /> {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentsPage;