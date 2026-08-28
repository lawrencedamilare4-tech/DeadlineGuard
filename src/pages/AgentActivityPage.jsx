import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabase/client';
import { useFilecoin } from '../contexts/FilecoinContext';
import { generateGroqReport } from '../services/ai/groqService';
import { 
  Activity, 
  Lock, 
  Archive, 
  AlertTriangle, 
  CheckCircle, 
  Zap, 
  Brain, 
  Loader2, 
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  FileText,
  Wallet,
  Clock
} from 'lucide-react';

const actionIcons = {
  PROTECT: Lock,
  ARCHIVE: Archive,
  ALERT: AlertTriangle,
  VERIFY: CheckCircle,
  RESTORE: Zap,
  REBALANCE: TrendingUp,
  REPORT: Brain,
};

const actionColors = {
  PROTECT: 'bg-green-500/20 text-green-400',
  ARCHIVE: 'bg-gray-500/20 text-gray-400',
  ALERT: 'bg-red-500/20 text-red-400',
  VERIFY: 'bg-blue-500/20 text-blue-400',
  RESTORE: 'bg-yellow-500/20 text-yellow-400',
  REBALANCE: 'bg-purple-500/20 text-purple-400',
  REPORT: 'bg-shamrock/20 text-shamrock',
};

const AgentActivityPage = () => {
  const { wallet, connected, balance, availableForStorage } = useFilecoin();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('agent_actions')
        .select('*, files(file_name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setActivities(data || []);
    } catch (err) {
      console.error('[AgentActivity] Fetch failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Auto-generate AI summary when activities load
  useEffect(() => {
    if (activities.length > 0) {
      generateAiSummary();
    }
  }, [activities.length]);

  const generateAiSummary = async () => {
    setAiLoading(true);
    setAiSummary(null);

    try {
      const context = {
        totalActions: activities.length,
        protectActions: activities.filter(a => a.action_type === 'PROTECT').length,
        archiveActions: activities.filter(a => a.action_type === 'ARCHIVE').length,
        alertActions: activities.filter(a => a.action_type === 'ALERT').length,
        verifyActions: activities.filter(a => a.action_type === 'VERIFY').length,
        recentActions: activities.slice(0, 10).map(a => ({
          type: a.action_type,
          description: a.description,
          time: a.created_at,
        })),
        balance: balance || 0,
        availableForStorage: availableForStorage || 0,
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
    await fetchActivities();
    setRefreshing(false);
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-shamrock animate-spin" />
      </div>
    );
  }

  // Stats
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
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-md border border-shamrock-darker px-3 py-2 text-sm text-gray-300 hover:bg-shamrock-darker/30 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Wallet Context */}
      <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Agent Monitoring Wallet</p>
          <p className="font-mono text-white truncate">{wallet || 'Not connected'}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Available Balance</p>
          <p className="text-lg font-bold text-shamrock">${availableForStorage?.toFixed(2) ?? '0.00'}</p>
        </div>
      </div>

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

      {/* AI Summary */}
      {aiSummary && (
        <div className="bg-shamrock/10 rounded-lg border border-shamrock p-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
            <Brain className="h-5 w-5 text-shamrock" /> AI Agent Summary
          </h2>
          <p className="text-sm text-gray-300 leading-relaxed">{aiSummary}</p>
        </div>
      )}

      {aiLoading && (
        <div className="flex items-center gap-2 text-gray-400 justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Generating AI summary...</span>
        </div>
      )}

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
            <p className="text-sm text-gray-500 mt-2">
              The agent will automatically protect files, archive old ones, and monitor your balance.
            </p>
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
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(action.created_at)}
                    </p>
                    <span className="text-xs font-mono text-gray-600">
                      {new Date(action.created_at).toLocaleDateString()}
                    </span>
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