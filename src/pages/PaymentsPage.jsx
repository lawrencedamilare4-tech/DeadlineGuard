import React, { useEffect, useState, useCallback } from 'react';
import { FilecoinService } from '../services/filecoin';
import { useFilecoin } from '../contexts/FilecoinContext';
import { supabase } from '../services/supabase/client';
import { ethers } from 'ethers';
import { 
  Wallet, RefreshCw, Loader2, TrendingUp, TrendingDown, Clock, 
  FileText, CheckCircle, AlertTriangle, Database, HardDrive, Plus, Check,
  Search, ChevronLeft, ChevronRight
} from 'lucide-react';

const PAYMENTS_ADDRESS = '0x09a0fDc2723fAd1A7b8e3e00eE5DF73841df55a0';
const USDFC_ADDRESS = '0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0';
const ERC20_TRANSFER_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 value)'
];

const PAYMENT_TYPES = ['all', 'STORAGE', 'FUNDING'];

const PaymentsPage = () => {
  const { 
    wallet, 
    connected, 
    synapseReady, 
    refreshPaymentStatus, 
    depositedBalance, 
    availableForStorage, 
    lockedBalance 
  } = useFilecoin();

  const [paymentInfo, setPaymentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [recentPayments, setRecentPayments] = useState([]);

  // Pagination, search, filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Cached deposit history fetch
  const fetchDepositHistory = useCallback(async (walletAddress) => {
    if (!walletAddress) return [];

    // Check session cache first
    const cacheKey = `deposits-${walletAddress.toLowerCase()}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        // ignore and refetch
      }
    }

    const provider = new ethers.JsonRpcProvider('https://api.calibration.node.glif.io/rpc/v1');
    const usdfcContract = new ethers.Contract(USDFC_ADDRESS, ERC20_TRANSFER_ABI, provider);

    const filter = usdfcContract.filters.Transfer(walletAddress, PAYMENTS_ADDRESS);
    const currentBlock = await provider.getBlockNumber();
    const blockRange = 1000; // reduced range for faster fetch
    const fromBlock = Math.max(0, currentBlock - blockRange);
    const logs = await usdfcContract.queryFilter(filter, fromBlock, currentBlock);

    const deposits = [];
    for (const log of logs) {
      const { value } = log.args;
      // Approximate timestamp using average block time (30s)
      const blockAge = currentBlock - log.blockNumber;
      const approxTimestamp = Date.now() - blockAge * 30000;
      deposits.push({
        id: `deposit-${log.transactionHash}`,
        type: 'FUNDING',
        description: 'Deposited USDFC to storage',
        amount: `${ethers.formatUnits(value, 18)} USDFC`,
        date: new Date(approxTimestamp).toISOString(),
        status: 'COMPLETED',
        txHash: log.transactionHash,
      });
    }

    // Cache for 10 minutes
    sessionStorage.setItem(cacheKey, JSON.stringify(deposits));
    return deposits;
  }, []);

  const fetchOnChainPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!synapseReady) {
        setError('Synapse not initialized yet.');
        setLoading(false);
        return;
      }

      const synapse = FilecoinService.getSynapse();
      const payments = synapse.payments;

      // Fetch wallet balance (can be done in parallel with user fetch)
      let balance = 0;
      try {
        const balanceBigInt = await payments.walletBalance({ token: 'USDFC' });
        balance = parseFloat(balanceBigInt.toString()) / 1e18;
      } catch (e) {
        console.warn('[Payments] walletBalance failed:', e.message);
      }

      // Fetch operator approvals (optional)
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

      setPaymentInfo({
        balance,
        spendRate,
        runway,
        approvals,
      });

      // Get current user (needed for agent actions filter)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user found');

      // Parallel fetch of files, actions, and deposits
      const [uploadsResult, actionsResult, deposits] = await Promise.all([
        supabase
          .from('files')
          .select('*')
          .eq('wallet_address', wallet)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('agent_actions')
          .select('*')
          .eq('user_id', user.id)
          .in('action_type', ['ALERT', 'ARCHIVE', 'PROTECT', 'DELETE'])
          .order('created_at', { ascending: false })
          .limit(50),
        fetchDepositHistory(wallet),
      ]);

      const paymentsList = [];

      // Process uploads
      if (uploadsResult.data) {
        for (const upload of uploadsResult.data) {
          const course = upload.course_name ? `${upload.course_name} - ` : '';
          const description = upload.assignment_title
            ? `${course}${upload.assignment_title}`
            : `Stored: ${upload.file_name}`;
          paymentsList.push({
            id: `upload-${upload.id}`,
            type: 'STORAGE',
            description,
            pieceCid: upload.piece_cid,
            size: upload.file_size,
            date: upload.created_at,
            status: 'COMPLETED',
            amount: '~0.124 USDFC',
          });
        }
      }

      // Process agent actions
      if (actionsResult.data) {
        for (const action of actionsResult.data) {
          paymentsList.push({
            id: `action-${action.id}`,
            type: action.action_type,
            description: action.description,
            date: action.created_at,
            status: 'COMPLETED',
          });
        }
      }

      // Add deposits
      if (deposits) {
        paymentsList.push(...deposits);
      }

      // Sort by date (newest first)
      paymentsList.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRecentPayments(paymentsList);

    } catch (err) {
      console.error('[Payments] Fetch failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [synapseReady, availableForStorage, wallet, fetchDepositHistory]);

  useEffect(() => {
    if (synapseReady) {
      fetchOnChainPayments();
    } else {
      setLoading(false);
      setError('Synapse not initialized. Please connect your wallet.');
    }
  }, [fetchOnChainPayments, synapseReady]);

  // Reset page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshPaymentStatus();
    await fetchOnChainPayments();
    setRefreshing(false);
  };

  // Filter and search
  const filteredPayments = recentPayments.filter(payment => {
    const matchesSearch = payment.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          payment.type?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || payment.type === filterType;
    return matchesSearch && matchesFilter;
  });

  // Pagination
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPayments = filteredPayments.slice(startIndex, startIndex + itemsPerPage);

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
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-6">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-5 w-5 text-shamrock" />
            <p className="text-sm text-gray-500">Wallet Balance</p>
          </div>
          <p className="text-2xl font-bold text-white">${balance.toFixed(2)}</p>
        </div>
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-6">
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-5 w-5 text-shamrock" />
            <p className="text-sm text-gray-500">Deposited</p>
          </div>
          <p className="text-2xl font-bold text-white">${depositedBalance?.toFixed(4) ?? '0.0000'}</p>
        </div>
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-shamrock-darker p-6 bg-shamrock/10">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="h-5 w-5 text-shamrock" />
            <p className="text-sm text-gray-500">Available</p>
          </div>
          <p className="text-2xl font-bold text-shamrock">${availableForStorage?.toFixed(4) ?? '0.0000'}</p>
        </div>
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
            <HardDrive className="h-5 w-5 text-shamrock" /> Recent Storage & Funding Payments
          </h2>
          {/* Search and Filter */}
          <div className="mt-3 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search payments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-shamrock-darker border border-gray-300 dark:border-shamrock-darker rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-shamrock"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-shamrock-darker border border-gray-300 dark:border-shamrock-darker rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-shamrock"
            >
              {PAYMENT_TYPES.map(type => (
                <option key={type} value={type}>
                  {type === 'all' ? 'All Types' : type}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredPayments.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">No payments found.</p>
          </div>
        ) : (
          <>
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
                  {paginatedPayments.map((payment) => (
                    <tr key={payment.id} className="border-b border-gray-200 dark:border-shamrock-darker hover:bg-gray-50 dark:hover:bg-shamrock-darker/20">
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-300">{formatDate(payment.date)}</p>
                        <p className="text-xs text-gray-500">{formatTime(payment.date)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          payment.type === 'STORAGE' ? 'bg-shamrock/20 text-shamrock' :
                          payment.type === 'FUNDING' ? 'bg-blue-500/20 text-blue-400' :
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-shamrock-darker">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-shamrock-darker text-sm text-gray-300 hover:bg-shamrock-darker/30 disabled:opacity-50"
                >
                  <ChevronLeft size={16} /> Previous
                </button>
                <span className="text-sm text-gray-400">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-shamrock-darker text-sm text-gray-300 hover:bg-shamrock-darker/30 disabled:opacity-50"
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentsPage;