import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { WeatherHero } from '../components/dashboard/WeatherHero';
import { RunwayCard } from '../components/dashboard/RunwayCard';
import StorageHealth from '../components/dashboard/StorageHealth';
import ForecastPanel from '../components/dashboard/ForecastPanel';
import { supabase } from '../services/supabase/client';
import { calculateWeather } from '../engines/weatherEngine';
import { useFilecoin } from '../contexts/FilecoinContext';
import { generateGroqReport } from '../services/ai/groqService';
import {
  Loader2, RefreshCw, Database, HardDrive, Wallet, Lock, TrendingDown,
  FileText, Copy, CheckCircle, Brain, Send, MessageCircle, Sparkles, Cloud,
  Calendar, AlertTriangle, Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import SynapseStatusCard from '../components/dashboard/SynapseStatusCard';

const DashboardPage = () => {
  const {
    balance,
    depositedBalance,
    availableForStorage,
    lockedBalance,
    spendRate,
    refreshPaymentStatus,
     fundWallet,
    funding, 
    connected, 
    synapseReady,
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

      // Reload the page after 1.5 seconds to reflect updated balances
       setTimeout(() => {
      window.location.reload();
    }, 1500);
      
      // Clear success message after 5 seconds
      setTimeout(() => setFundSuccess(false), 5000);
    } catch (err) {
      setFundError(err.message || 'Funding failed');
    }
  };

  const { address: wagmiAddress, isConnected } = useAccount();

  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [validFiles, setValidFiles] = useState([]);
  const [totalStorageSize, setTotalStorageSize] = useState(0);
  const [dueSoonFiles, setDueSoonFiles] = useState([]);
  const [overdueFiles, setOverdueFiles] = useState([]);
  const [copiedCid, setCopiedCid] = useState(null);
  const [aiInsight, setAiInsight] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const insightGeneratedRef = useRef(false);
  const [statusFilter, setStatusFilter] = useState('all');

  // Chatbot state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const fetchValidFiles = useCallback(async () => {
    setLoading(true);
    try {
      const effectiveWallet = wagmiAddress
        ? wagmiAddress.toLowerCase()
        : null;

      console.log('[Dashboard] Effective wallet:', effectiveWallet);

      if (!effectiveWallet) {
        setValidFiles([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('wallet_address', effectiveWallet)
        .not('piece_cid', 'is', null)
        .order('created_at', { ascending: false });

      console.log('[Dashboard] Files found:', data?.length, 'Error:', error?.message);

      const filesData = data || [];
      const now = Date.now();
      const validFilesList = filesData
        .filter(file => file.piece_cid)
        .map(file => {
          const dueDate = file.due_date || null;
          const daysUntilDue = dueDate
            ? Math.floor((new Date(dueDate).getTime() - now) / (1000 * 60 * 60 * 24))
            : null;

          // Completed files are NOT due soon or overdue
          const isCompleted = file.status === 'completed';
          const isOverdue = !isCompleted && daysUntilDue !== null && daysUntilDue < 0;
          const isDueSoon = !isCompleted && daysUntilDue !== null && daysUntilDue <= 7 && daysUntilDue >= 0;

          return {
            id: file.id,
            file_name: file.file_name,
            file_size: file.file_size || 0,
            piece_cid: file.piece_cid,
            status: file.status || 'active',
            dueDate,
            daysUntilDue,
            isDueSoon,
            isOverdue,
            isCompleted,
            courseName: file.course_name || null,
            assignmentTitle: file.assignment_title || null,
            gradeWeight: file.grade_weight || null,
          };
        });

      setValidFiles(validFilesList);
      setTotalStorageSize(validFilesList.reduce((sum, f) => sum + (f.file_size || 0), 0));
      setDueSoonFiles(validFilesList.filter(f => f.isDueSoon));
      setOverdueFiles(validFilesList.filter(f => f.isOverdue));

      const weatherResult = calculateWeather({
        storageUtilization: totalStorageSize > 0 ? Math.min(1, totalStorageSize / (10 * 1024 * 1024 * 1024)) : 0,
        availableForStorage: availableForStorage || 0,
        depositedBalance: depositedBalance || 0,
        totalFiles: validFilesList.length,
      });

      setWeather(weatherResult);
    } catch (err) {
      console.warn('[Dashboard] Fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [wagmiAddress, availableForStorage, depositedBalance, totalStorageSize]);

  useEffect(() => {
    fetchValidFiles();
  }, [fetchValidFiles]);

  useEffect(() => {
    if (!loading && validFiles.length > 0 && !insightGeneratedRef.current) {
      insightGeneratedRef.current = true;
      generateAutoInsight();
    }
  }, [loading, validFiles.length, availableForStorage]);

  const generateAutoInsight = async () => {
    setAiLoading(true);
    setAiInsight(null);
    try {
      const context = {
        balance: balance || 0,
        depositedBalance: depositedBalance || 0,
        availableForStorage: availableForStorage || 0,
        totalFiles: validFiles.length,
        totalStorage: totalStorageSize,
        weatherState: weather?.state || 'CLEAR',
        dueSoon: dueSoonFiles.length,
        overdue: overdueFiles.length,
      };
      const report = await generateGroqReport(context, 'agent_report');
      setAiInsight(report);
    } catch (err) {
      setAiInsight(null);
    } finally {
      setAiLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (typeof refreshPaymentStatus === 'function') {
        await refreshPaymentStatus();
      }
      await fetchValidFiles();
      insightGeneratedRef.current = false;
    } catch (e) {
      console.warn('[Dashboard] Refresh warning:', e.message);
    }
    setRefreshing(false);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);

    try {
      const context = {
        balance: balance || 0,
        availableForStorage: availableForStorage || 0,
        depositedBalance: depositedBalance || 0,
        totalFiles: validFiles.length,
        totalStorage: totalStorageSize,
        dueSoon: dueSoonFiles.length,
        overdue: overdueFiles.length,
        weatherState: weather?.state || 'CLEAR',
        userQuestion: userMessage,
      };
      const response = await generateGroqReport(context, 'chat_response');
      setChatMessages((prev) => [...prev, { role: 'assistant', content: response }]);
    } catch (err) {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, could not process that.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const copyCid = (cid) => {
    if (cid) {
      navigator.clipboard.writeText(String(cid));
      setCopiedCid(String(cid));
      setTimeout(() => setCopiedCid(null), 2000);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatExactDate = (dateStr) => {
    if (!dateStr) return 'No due date';
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Filter files based on selected status
  const filteredFiles = validFiles.filter(file => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') return file.status === 'active';
    if (statusFilter === 'completed') return file.status === 'completed';
    if (statusFilter === 'protected') return file.status === 'protected';
    if (statusFilter === 'overdue') return file.isOverdue;
    if (statusFilter === 'dueSoon') return file.isDueSoon;
    return true;
  });

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
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
  <div className="flex items-center gap-3">
    <span className={`h-3 w-3 rounded-full ${isConnected ? 'bg-shamrock animate-pulse' : 'bg-gray-500'}`} />
    <span className="text-sm text-gray-300">
      {isConnected ? 'Wallet Connected' : 'Wallet Not Connected'}
    </span>
    {wagmiAddress && (
      <span className="text-sm font-mono text-gray-400">
        {wagmiAddress.slice(0, 6)}...{wagmiAddress.slice(-4)}
      </span>
    )}
  </div>
  <SynapseStatusCard />
  <button
    onClick={handleRefresh}
    disabled={refreshing}
    className="inline-flex items-center gap-2 rounded-md border border-shamrock-darker px-3 py-2 text-sm text-gray-300 hover:bg-shamrock-darker/30 transition-colors disabled:opacity-50"
  >
    <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
    Refresh
  </button>
</div>

          {/* Fund Wallet */}
          <div className="pt-4 mb-4 border-t border-gray-200 dark:border-shamrock-darker">
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
          

          {/* Weather Hero */}
          <WeatherHero weather={weather} />

          {/* AI Storage Intelligence */}
          <div className="mt-6 bg-shamrock/10 rounded-lg border border-shamrock p-6">
            <div className="flex items-center gap-2 mb-3">
              {aiLoading ? (
                <>
                  <Loader2 className="h-5 w-5 text-shamrock animate-spin" />
                  <h2 className="text-lg font-semibold text-white">Generating AI Insight...</h2>
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 text-shamrock" />
                  <h2 className="text-lg font-semibold text-white">AI Storage Intelligence</h2>
                </>
              )}
            </div>
            {aiInsight ? (
              <p className="text-sm text-gray-300 leading-relaxed">{aiInsight}</p>
            ) : (
              <p className="text-sm text-gray-500">AI insight will appear once files are uploaded.</p>
            )}
          </div>

          {/* Payment Stats */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Wallet className="h-3 w-3" /> Wallet Balance
              </p>
              <p className="text-lg font-bold text-white">${balance?.toFixed(2) ?? '0.00'}</p>
            </div>
            <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Database className="h-3 w-3" /> Deposited
              </p>
              <p className="text-lg font-bold text-white">${depositedBalance?.toFixed(4) ?? '0.0000'}</p>
            </div>
            <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-shamrock-darker p-4 bg-shamrock/10">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <TrendingDown className="h-3 w-3" /> Available
              </p>
              <p className="text-lg font-bold text-shamrock">${availableForStorage?.toFixed(4) ?? '0.0000'}</p>
            </div>
            <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Lock className="h-3 w-3" /> Locked
              </p>
              <p className="text-lg font-bold text-white">${lockedBalance?.toFixed(4) ?? '0.0000'}</p>
            </div>
          </div>

          {/* Storage Stats */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
              <p className="text-xs text-gray-500">Total Files</p>
              <p className="text-2xl font-bold text-white">{validFiles.length}</p>
            </div>
            <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
              <p className="text-xs text-gray-500">Storage Used</p>
              <p className="text-2xl font-bold text-white">{formatBytes(totalStorageSize)}</p>
            </div>
            <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-yellow-500/50 p-4">
              <p className="text-xs text-yellow-500 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Due Soon
              </p>
              <p className="text-2xl font-bold text-yellow-400">{dueSoonFiles.length}</p>
            </div>
            <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-red-500/50 p-4">
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Overdue
              </p>
              <p className="text-2xl font-bold text-red-400">{overdueFiles.length}</p>
            </div>
          </div>

          {/* Runway */}
          <div className="mt-6">
            <RunwayCard
              days={availableForStorage > 0 ? Math.floor((availableForStorage / (spendRate || 0.000000001)) / 2880) : 0}
              percentage={Math.min(100, (availableForStorage / Math.max(depositedBalance, 0.01)) * 100)}
            />
          </div>

          {/* Chatbot */}
          <div className="mt-6 bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <MessageCircle className="h-5 w-5 text-shamrock" /> Ask About Your Storage
            </h2>
            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
              {chatMessages.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Ask: "How much storage do I have left?" or "Which files are overdue?"
                </p>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div key={idx} className={`p-3 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-shamrock/20 text-white ml-8'
                      : 'bg-shamrock-darker/20 text-gray-300 mr-8'
                  }`}>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                ))
              )}
              {chatLoading && (
                <div className="flex items-center gap-2 text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask about your storage..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-shamrock-darker rounded-md bg-white dark:bg-shamrock-darker text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-shamrock"
              />
              <button
                onClick={handleSendMessage}
                disabled={chatLoading || !chatInput.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-shamrock px-4 py-2 text-sm font-semibold text-white hover:bg-shamrock-dark transition-colors disabled:opacity-50"
              >
                <Send size={16} /> Send
              </button>
            </div>
          </div>

          {/* Files Table */}
          <div className="mt-8 bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-shamrock-darker flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Cloud className="h-5 w-5 text-shamrock" /> Your Files
              </h2>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-shamrock-darker/30 border border-shamrock-darker rounded-md text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-shamrock"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="protected">Protected</option>
                <option value="overdue">Overdue</option>
                <option value="dueSoon">Due Soon</option>
              </select>
            </div>
            {filteredFiles.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">No files found.</p>
                <Link to="/dashboard/upload" className="inline-block mt-3 text-shamrock hover:underline">
                  Upload a file →
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-shamrock-darker">
                      <th className="px-4 py-3 text-sm text-gray-500">File</th>
                      <th className="px-4 py-3 text-sm text-gray-500">Due Date</th>
                      <th className="px-4 py-3 text-sm text-gray-500">Status</th>
                      <th className="px-4 py-3 text-sm text-gray-500">Size</th>
                      <th className="px-4 py-3 text-sm text-gray-500">PieceCID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFiles.map((file) => (
                      <tr key={file.id} className="border-b border-gray-200 dark:border-shamrock-darker hover:bg-gray-50 dark:hover:bg-shamrock-darker/20">
                        <td className="px-4 py-3">
                          <span className="text-shamrock font-medium">{file.file_name}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-sm ${
                            file.isOverdue ? 'text-red-400' : file.isDueSoon ? 'text-yellow-400' : 'text-gray-300'
                          }`}>
                            <Calendar className="h-3 w-3" />
                            {formatExactDate(file.dueDate)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {file.status === 'completed' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400">
                              <CheckCircle className="h-3 w-3" /> COMPLETED
                            </span>
                          ) : file.status === 'protected' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400">
                              <Lock className="h-3 w-3" /> PROTECTED
                            </span>
                          ) : file.isOverdue ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400">
                              <AlertTriangle className="h-3 w-3" /> OVERDUE ({Math.abs(file.daysUntilDue)} days)
                            </span>
                          ) : file.isDueSoon ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-400">
                              <Clock className="h-3 w-3" /> DUE SOON ({file.daysUntilDue} days)
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
                              ACTIVE
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatBytes(file.file_size)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-gray-500">{String(file.piece_cid).slice(0, 20)}...</span>
                            <button onClick={() => copyCid(file.piece_cid)} className="text-gray-400 hover:text-shamrock">
                              {copiedCid === String(file.piece_cid) ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardPage;