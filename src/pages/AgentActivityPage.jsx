import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabase/client';
import { FilecoinService } from '../services/filecoin';
import { useFilecoin } from '../contexts/FilecoinContext';
import { generateGroqReport } from '../services/ai/groqService';
import { 
  Activity, Lock, Archive, AlertTriangle, CheckCircle, Zap, Brain, Loader2, 
  RefreshCw, ShieldCheck, TrendingUp, FileText, Wallet, Clock, Cloud, Database, Calendar
} from 'lucide-react';

const actionIcons = {
  PROTECT: Lock,
  ARCHIVE: Archive,
  ALERT: AlertTriangle,
  VERIFY: CheckCircle,
  RESTORE: Zap,
  REBALANCE: TrendingUp,
  REPORT: Brain,
  DELETE: Archive,
};

const actionColors = {
  PROTECT: 'bg-green-500/20 text-green-400',
  ARCHIVE: 'bg-gray-500/20 text-gray-400',
  ALERT: 'bg-red-500/20 text-red-400',
  VERIFY: 'bg-blue-500/20 text-blue-400',
  RESTORE: 'bg-yellow-500/20 text-yellow-400',
  REBALANCE: 'bg-purple-500/20 text-purple-400',
  REPORT: 'bg-shamrock/20 text-shamrock',
  DELETE: 'bg-red-500/20 text-red-400',
};

const AgentActivityPage = () => {
  const { wallet, connected, balance, availableForStorage, depositedBalance, synapseReady } = useFilecoin();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [onChainDataSets, setOnChainDataSets] = useState([]);
  const [filecoinMetadata, setFilecoinMetadata] = useState({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch agent actions from Supabase
      let actionsData = [];
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('agent_actions')
          .select('*, files(file_name, piece_cid)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        actionsData = data || [];
      }

      setActivities(actionsData);

      // 2. Fetch uploaded files from Supabase
      let filesData = [];
      if (user) {
        const { data } = await supabase
          .from('files')
          .select('*, assignments(*), courses(*)')
          .eq('user_id', user.id)
          .not('piece_cid', 'is', null)
          .order('created_at', { ascending: false });
        filesData = data || [];
      }
      
      if (filesData.length === 0 && wallet) {
        const { data } = await supabase
          .from('files')
          .select('*, assignments(*), courses(*)')
          .eq('wallet_address', wallet)
          .not('piece_cid', 'is', null)
          .order('created_at', { ascending: false });
        filesData = data || [];
      }

      // 3. Fetch metadata from Filecoin (due dates stored here)
      const fcMetadata = {};
      let onChainSets = [];
      if (synapseReady) {
        try {
          const synapse = FilecoinService.getSynapse();
          const storage = synapse.storage;
          onChainSets = await storage.findDataSets({ source: 'deadlineguard' });
          
          for (const ds of (onChainSets || [])) {
            const metadata = ds.metadata || {};
            
            // Map by fileName AND by pieceCid
            if (metadata.fileName) {
              fcMetadata[metadata.fileName] = metadata;
            }
            if (metadata.pieceCid) {
              fcMetadata[metadata.pieceCid] = metadata;
            }
            
            console.log('[AgentActivity] Filecoin metadata:', metadata);
          }
        } catch (e) {
          console.warn('[AgentActivity] Filecoin fetch:', e.message);
        }
      }
      
      setOnChainDataSets(onChainSets);
      setFilecoinMetadata(fcMetadata);

      // 4. Merge files with Filecoin metadata for due dates
      const now = Date.now();
      const mergedFiles = filesData.map(file => {
        const fcMeta = fcMetadata[file.file_name] || fcMetadata[file.piece_cid] || {};
        
        // Due date priority: Filecoin metadata > Supabase assignments
        const dueDate = fcMeta.dueDate || file.assignments?.due_date || null;
        const courseName = fcMeta.courseName || file.courses?.name || null;
        const assignmentTitle = fcMeta.assignmentTitle || file.assignments?.title || null;
        const gradeWeight = fcMeta.gradeWeight || file.assignments?.grade_weight || null;
        
        const daysUntilDue = dueDate 
          ? Math.floor((new Date(dueDate).getTime() - now) / (1000 * 60 * 60 * 24))
          : null;

        return {
          ...file,
          dueDate,
          daysUntilDue,
          isDueSoon: daysUntilDue !== null && daysUntilDue <= 7 && daysUntilDue >= 0,
          isOverdue: daysUntilDue !== null && daysUntilDue < 0,
          courseName,
          assignmentTitle,
          gradeWeight,
          metadataSource: fcMeta.dueDate ? 'Filecoin' : (file.assignments?.due_date ? 'Supabase' : 'None'),
        };
      });

      setUploadedFiles(mergedFiles);
      console.log('[AgentActivity] Merged files with due dates:', mergedFiles.length);

    } catch (err) {
      console.error('[AgentActivity] Fetch failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [wallet, synapseReady]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-generate AI summary
  useEffect(() => {
    if (activities.length > 0 || uploadedFiles.length > 0) {
      generateAiSummary();
    }
  }, [activities.length, uploadedFiles.length]);

  const generateAiSummary = async () => {
    setAiLoading(true);
    setAiSummary(null);

    try {
      const dueSoon = uploadedFiles.filter(f => f.isDueSoon);
      const overdue = uploadedFiles.filter(f => f.isOverdue);

      const context = {
        totalActions: activities.length,
        totalFiles: uploadedFiles.length,
        dueSoon: dueSoon.length,
        overdue: overdue.length,
        protectActions: activities.filter(a => a.action_type === 'PROTECT').length,
        archiveActions: activities.filter(a => a.action_type === 'ARCHIVE').length,
        alertActions: activities.filter(a => a.action_type === 'ALERT').length,
        balance: balance || 0,
        availableForStorage: availableForStorage || 0,
        depositedBalance: depositedBalance || 0,
        onChainDataSets: onChainDataSets.length,
      };

      const report = await generateGroqReport(context, 'agent_activity_summary');
      setAiSummary(report);
    } catch (err) {
      console.warn('[AgentActivity] AI summary failed:', err.message);
      setAiSummary(null);
    } finally {
      setAiLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMins = Math.floor((now - date) / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const formatExactDate = (dateStr) => {
    if (!dateStr) return 'No due date';
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-shamrock animate-spin" />
      </div>
    );
  }

  const dueSoonFiles = uploadedFiles.filter(f => f.isDueSoon);
  const overdueFiles = uploadedFiles.filter(f => f.isOverdue);

  const stats = {
    total: activities.length,
    protect: activities.filter(a => a.action_type === 'PROTECT').length,
    archive: activities.filter(a => a.action_type === 'ARCHIVE').length,
    alert: activities.filter(a => a.action_type === 'ALERT').length,
    verify: activities.filter(a => a.action_type === 'VERIFY').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Activity className="h-6 w-6 text-shamrock" /> Agent Activity
        </h1>
        <button onClick={handleRefresh} disabled={refreshing} className="inline-flex items-center gap-2 rounded-md border border-shamrock-darker px-3 py-2 text-sm text-gray-300 hover:bg-shamrock-darker/30 transition-colors disabled:opacity-50">
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Context Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
          <p className="text-sm text-gray-500">Files Monitored</p>
          <p className="text-2xl font-bold text-white">{uploadedFiles.length}</p>
        </div>
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-yellow-500/50 p-4">
          <p className="text-sm text-yellow-500">Due Soon</p>
          <p className="text-2xl font-bold text-yellow-400">{dueSoonFiles.length}</p>
        </div>
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-red-500/50 p-4">
          <p className="text-sm text-red-500">Overdue</p>
          <p className="text-2xl font-bold text-red-400">{overdueFiles.length}</p>
        </div>
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
          <p className="text-sm text-gray-500">On-Chain Sets</p>
          <p className="text-2xl font-bold text-shamrock">{onChainDataSets.length}</p>
        </div>
      </div>

      {/* Due Soon Files */}
      {(dueSoonFiles.length > 0 || overdueFiles.length > 0) && (
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Deadline Alerts</h2>
          <div className="space-y-3">
            {overdueFiles.map((file) => (
              <div key={file.id} className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <p className="text-sm font-medium text-white">{file.file_name}</p>
                  <span className="text-xs text-red-400 font-bold ml-auto">
                    OVERDUE ({Math.abs(file.daysUntilDue)} days)
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Due: {formatExactDate(file.dueDate)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Source: {file.metadataSource}</p>
              </div>
            ))}
            {dueSoonFiles.map((file) => (
              <div key={file.id} className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-400" />
                  <p className="text-sm font-medium text-white">{file.file_name}</p>
                  <span className="text-xs text-yellow-400 font-bold ml-auto">
                    DUE SOON ({file.daysUntilDue} days)
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Due: {formatExactDate(file.dueDate)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Source: {file.metadataSource}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Summary */}
      {aiSummary && (
        <div className="bg-shamrock/10 rounded-lg border border-shamrock p-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
            <Brain className="h-5 w-5 text-shamrock" /> AI Agent Summary
          </h2>
          <p className="text-sm text-gray-300 leading-relaxed">{aiSummary}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4 text-center">
          <p className="text-xs text-gray-500">Total Actions</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4 text-center">
          <p className="text-xs text-gray-500">Protected</p>
          <p className="text-2xl font-bold text-green-400">{stats.protect}</p>
        </div>
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4 text-center">
          <p className="text-xs text-gray-500">Archived</p>
          <p className="text-2xl font-bold text-gray-400">{stats.archive}</p>
        </div>
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4 text-center">
          <p className="text-xs text-gray-500">Alerts</p>
          <p className="text-2xl font-bold text-red-400">{stats.alert}</p>
        </div>
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4 text-center">
          <p className="text-xs text-gray-500">Verified</p>
          <p className="text-2xl font-bold text-blue-400">{stats.verify}</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Activity Timeline */}
      <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Activity Timeline</h2>

        {activities.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">No agent actions yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((action) => {
              const Icon = actionIcons[action.action_type] || Activity;
              const colorClass = actionColors[action.action_type] || 'bg-gray-500/20 text-gray-400';

              return (
                <div key={action.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-shamrock-darker/10 transition-colors">
                  <div className={`p-2 rounded-lg shrink-0 ${colorClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{action.description}</p>
                    {action.files?.file_name && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        <FileText className="inline h-3 w-3 mr-1" />
                        {action.files.file_name}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-gray-500">{formatTime(action.created_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Agent Capabilities */}
      <div className="bg-shamrock-darker/20 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">What the Agent Does</h3>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> Protects deadline-critical files
          </span>
          <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded-full flex items-center gap-1">
            <Archive className="h-3 w-3" /> Archives old files
          </span>
          <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Alerts on low balance
          </span>
          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full flex items-center gap-1">
            <CheckCircle className="h-3 w-3" /> Verifies storage
          </span>
          <span className="px-2 py-1 bg-shamrock/20 text-shamrock rounded-full flex items-center gap-1">
            <Brain className="h-3 w-3" /> AI analysis
          </span>
        </div>
      </div>
    </div>
  );
};

export default AgentActivityPage;