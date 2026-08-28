import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { WeatherHero } from '../components/dashboard/WeatherHero';
import { RunwayCard } from '../components/dashboard/RunwayCard';
import StorageHealth from '../components/dashboard/StorageHealth';
import ForecastPanel from '../components/dashboard/ForecastPanel';
import { FilecoinService } from '../services/filecoin';
import { calculateWeather } from '../engines/weatherEngine';
import { useFilecoin } from '../contexts/FilecoinContext';
import { generateGroqReport } from '../services/ai/groqService';
import { 
  Loader2, RefreshCw, Database, HardDrive, Wallet, Lock, TrendingDown, 
  FileText, Copy, CheckCircle, Brain, Send, MessageCircle, Sparkles, Cloud
} from 'lucide-react';
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
  const [onChainFiles, setOnChainFiles] = useState([]);
  const [onChainDataSets, setOnChainDataSets] = useState([]);
  const [totalStorageSize, setTotalStorageSize] = useState(0);
  const [copiedCid, setCopiedCid] = useState(null);
  const [aiInsight, setAiInsight] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const insightGeneratedRef = useRef(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [debugLog, setDebugLog] = useState([]);

  const addDebug = (msg) => {
    console.log(msg);
    setDebugLog((prev) => [...prev.slice(-10), msg]);
  };

  const fetchFromFilecoin = useCallback(async () => {
    setLoading(true);
    
    try {
      if (!synapseReady) {
        addDebug('[Dashboard] Synapse not ready, skipping Filecoin fetch');
        setLoading(false);
        return;
      }

      const synapse = FilecoinService.getSynapse();
      const storage = synapse.storage;

      addDebug('[Dashboard] Fetching from Filecoin...');

      // 1. Get data sets
      let dataSets = [];
      try {
        dataSets = await storage.findDataSets({ source: 'deadlineguard' });
        addDebug(`[Dashboard] Data sets: ${dataSets?.length || 0}`);
      } catch (e) {
        addDebug(`[Dashboard] findDataSets error: ${e.message}`);
      }

      setOnChainDataSets(dataSets || []);

      // 2. Extract files and calculate total size
      const allFiles = [];
      let totalSize = 0;
      const now = Date.now();

      for (const ds of (dataSets || [])) {
        const dsId = ds.id || ds.clientDataSetId || ds.dataSetId;
        const metadata = ds.metadata || {};

        // Try to get pieces
        let pieces = [];
        try {
          const info = await storage.getStorageInfo({ dataSetId: dsId });
          if (info?.pieces?.length) {
            pieces = info.pieces;
          }
        } catch (e) {
          addDebug(`[Dashboard] getStorageInfo for ${String(dsId).substring(0, 20)}: ${e.message}`);
        }

        // If no pieces but metadata exists
        if (pieces.length === 0 && Object.keys(metadata).length > 0) {
          pieces = [{ pieceCid: metadata.pieceCid, size: metadata.size || 0 }];
        }

        for (const piece of pieces) {
          const pieceCid = piece.pieceCid || piece.cid || metadata.pieceCid;
          const fileSize = Number(piece.size || metadata.size || 0);
          totalSize += fileSize;

          allFiles.push({
            id: `fc-${String(dsId).substring(0, 15)}-${String(pieceCid || '').substring(0, 10)}`,
            file_name: metadata.fileName || `File-${String(pieceCid || dsId).substring(0, 15)}`,
            file_size: fileSize,
            piece_cid: pieceCid,
            status: 'active',
            dueDate: metadata.dueDate || null,
            courseName: metadata.courseName || null,
            assignmentTitle: metadata.assignmentTitle || null,
            dataSetId: dsId,
          });
        }
      }

      setOnChainFiles(allFiles);
      setTotalStorageSize(totalSize);
      addDebug(`[Dashboard] Files: ${allFiles.length}, Size: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);

      // 3. Calculate weather based on Filecoin data
      const storageUtilization = totalSize > 0 ? Math.min(1, totalSize / (10 * 1024 * 1024 * 1024)) : 0;
      
      const weatherResult = calculateWeather({
        storageUtilization,
        availableForStorage: availableForStorage || 0,
        depositedBalance: depositedBalance || 0,
        totalFiles: allFiles.length,
      });

      setWeather(weatherResult);

    } catch (err) {
      console.warn('[Dashboard] Fetch warning:', err.message);
      addDebug(`[Dashboard] ERROR: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [synapseReady, availableForStorage, depositedBalance]);

  useEffect(() => {
    fetchFromFilecoin();
  }, [fetchFromFilecoin]);

  // Auto-generate AI insight
  useEffect(() => {
    if (!loading && onChainFiles.length > 0 && !insightGeneratedRef.current) {
      insightGeneratedRef.current = true;
      generateAutoInsight();
    }
  }, [loading, onChainFiles.length, availableForStorage, weather]);

  const generateAutoInsight = async () => {
    setAiLoading(true);
    setAiInsight(null);

    try {
      const context = {
        balance: balance || 0,
        depositedBalance: depositedBalance || 0,
        availableForStorage: availableForStorage || 0,
        lockedBalance: lockedBalance || 0,
        totalFiles: onChainFiles.length,
        totalStorage: totalStorageSize,
        weatherState: weather?.state || 'CLEAR',
      };

      const report = await generateGroqReport(context, 'agent_report');
      setAiInsight(report);
    } catch (err) {
      console.warn('[Dashboard] AI insight failed:', err.message);
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
      await fetchFromFilecoin();
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
        totalFiles: onChainFiles.length,
        totalStorage: totalStorageSize,
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
                {connected ? 'Wallet Connected (Filecoin)' : 'Wallet Not Connected'}
              </span>
              {wallet && (
                <span className="text-sm font-mono text-gray-400">
                  {String(wallet).slice(0, 6)}...{String(wallet).slice(-4)}
                </span>
              )}
            </div>
            <button onClick={handleRefresh} disabled={refreshing} className="inline-flex items-center gap-2 rounded-md border border-shamrock-darker px-3 py-2 text-sm text-gray-300 hover:bg-shamrock-darker/30 transition-colors disabled:opacity-50">
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
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
            ) : aiLoading ? (
              <p className="text-sm text-gray-500">Analyzing your storage...</p>
            ) : (
              <p className="text-sm text-gray-500">AI insight will appear once files are on-chain.</p>
            )}
          </div>

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

          {/* Storage Stats - FROM FILECOIN */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
              <p className="text-xs text-gray-500">Files (On-Chain)</p>
              <p className="text-2xl font-bold text-white">{onChainFiles.length}</p>
            </div>
            <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
              <p className="text-xs text-gray-500">Storage Used (Filecoin)</p>
              <p className="text-2xl font-bold text-white">{formatBytes(totalStorageSize)}</p>
            </div>
            <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
              <p className="text-xs text-gray-500">Data Sets</p>
              <p className="text-2xl font-bold text-white">{onChainDataSets.length}</p>
            </div>
          </div>

          {/* Debug Log */}
          {debugLog.length > 0 && (
            <div className="mt-4 bg-shamrock-darker/20 rounded-lg p-3 max-h-32 overflow-y-auto">
              {debugLog.map((msg, idx) => (
                <p key={idx} className="text-xs font-mono text-gray-400">{msg}</p>
              ))}
            </div>
          )}

          {/* Chat Q&A */}
          <div className="mt-6 bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <MessageCircle className="h-5 w-5 text-shamrock" /> Ask About Your Storage
            </h2>
            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
              {chatMessages.length === 0 ? (
                <p className="text-sm text-gray-500">Ask: "How much storage do I have left?"</p>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div key={idx} className={`p-3 rounded-lg ${msg.role === 'user' ? 'bg-shamrock/20 text-white ml-8' : 'bg-shamrock-darker/20 text-gray-300 mr-8'}`}>
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
              <button onClick={handleSendMessage} disabled={chatLoading || !chatInput.trim()} className="inline-flex items-center gap-2 rounded-md bg-shamrock px-4 py-2 text-sm font-semibold text-white hover:bg-shamrock-dark transition-colors disabled:opacity-50">
                <Send size={16} /> Send
              </button>
            </div>
          </div>

          {/* Runway */}
          <div className="mt-6">
            <RunwayCard 
              days={availableForStorage > 0 ? Math.floor((availableForStorage / (spendRate || 0.000000001)) / 2880) : 0} 
              percentage={Math.min(100, (availableForStorage / Math.max(depositedBalance, 0.01)) * 100)} 
            />
          </div>

          {/* Uploaded Files - FROM FILECOIN */}
          <div className="mt-8 bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-shamrock-darker">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Cloud className="h-5 w-5 text-shamrock" /> Files on Filecoin
              </h2>
            </div>
            {onChainFiles.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">No files found on Filecoin.</p>
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
                    </tr>
                  </thead>
                  <tbody>
                    {onChainFiles.map((file) => (
                      <tr key={file.id} className="border-b border-gray-200 dark:border-shamrock-darker hover:bg-gray-50 dark:hover:bg-shamrock-darker/20">
                        <td className="px-4 py-3">
                          <span className="text-shamrock font-medium">{file.file_name}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatBytes(file.file_size)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-gray-500">{String(file.piece_cid || '—').slice(0, 20)}...</span>
                            {file.piece_cid && (
                              <button onClick={() => copyCid(file.piece_cid)} className="text-gray-400 hover:text-shamrock">
                                {copiedCid === String(file.piece_cid) ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                              </button>
                            )}
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