import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabase/client';
import { FilecoinService } from '../services/filecoin';
import { useFilecoin } from '../contexts/FilecoinContext';
import { generateGroqReport } from '../services/ai/groqService';
import {
  Activity, Lock, Archive, AlertTriangle, CheckCircle, Zap, Brain, Loader2,
  RefreshCw, ShieldCheck, TrendingUp, FileText, Wallet, Clock, Trash2
} from 'lucide-react';

const actionIcons = {
  PROTECT: Lock,
  ARCHIVE: Archive,
  ALERT: AlertTriangle,
  VERIFY: CheckCircle,
  RESTORE: Zap,
  REBALANCE: TrendingUp,
  REPORT: Brain,
  DELETE: Trash2,
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
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkMessage, setBulkMessage] = useState(null);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setActivities([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('agent_actions')
        .select('*, files(file_name, piece_cid)')
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

  // Auto generate AI summary
  useEffect(() => {
    if (activities.length > 0) generateAiSummary();
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
        deleteActions: activities.filter(a => a.action_type === 'DELETE').length,
        balance: balance || 0,
        availableForStorage: availableForStorage || 0,
      };
      const report = await generateGroqReport(context, 'agent_activity_summary');
      setAiSummary(report);
    } catch (err) {
      console.warn('[AgentActivity] AI summary failed', err);
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

  // Helper to delete a single file from Filecoin + Supabase
  const deleteFileRecord = async (file) => {
    try {
      // Try Filecoin deletion
      try {
        const synapse = FilecoinService.getSynapse();
        if (synapse?.storage) {
          const storage = synapse.storage;
          const methods = ['terminateService', 'schedulePieceRemoval', 'delete', 'removePiece'];
          for (const method of methods) {
            if (typeof storage[method] === 'function') {
              try {
                await storage[method]({ pieceCid: file.piece_cid });
                break;
              } catch (e) {
                console.warn(`[Delete] ${method} failed:`, e.message);
              }
            }
          }
        }
      } catch (e) {
        console.warn('[Delete] Filecoin deletion error:', e.message);
      }

      // Delete from Supabase
      await supabase.from('files').delete().eq('id', file.id);

      // Log individual agent action
      await supabase.from('agent_actions').insert({
        user_id: file.user_id,
        action_type: 'DELETE',
        description: `Deleted ${file.file_name}`,
        file_id: file.id,
      });

      return true;
    } catch (err) {
      console.error('[BulkDelete] Failed for', file.file_name, err);
      return false;
    }
  };

  const handleDeleteOverdueNotSubmitted = async () => {
    if (!wallet) {
      setBulkMessage('Connect wallet first');
      return;
    }
    if (!window.confirm('Delete all overdue files that are not submitted/completed?')) return;

    setBulkDeleting(true);
    setBulkMessage(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const now = new Date();
      const { data: files } = await supabase
        .from('files')
        .select('*')
        .eq('wallet_address', wallet)
        .not('piece_cid', 'is', null)
        .not('status', 'eq', 'completed')
        .not('status', 'eq', 'protected')
        .lte('due_date', now.toISOString());

      let deleted = 0;
      for (const file of files || []) {
        const success = await deleteFileRecord(file);
        if (success) deleted++;
      }

      // Insert bulk summary log
      if (deleted > 0) {
        await supabase.from('agent_actions').insert({
          user_id: user.id,
          action_type: 'DELETE',
          description: `Bulk deleted ${deleted} overdue file(s)`,
          file_id: null,
        });
      }

      setBulkMessage(`Deleted ${deleted} overdue file(s)`);
      await fetchActivities();
    } catch (err) {
      console.error('[BulkDelete] Overdue failed:', err);
      setBulkMessage('Bulk delete failed: ' + err.message);
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleDeleteCompleted = async () => {
    if (!wallet) {
      setBulkMessage('Connect wallet first');
      return;
    }
    if (!window.confirm('Delete all completed files?')) return;

    setBulkDeleting(true);
    setBulkMessage(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: files } = await supabase
        .from('files')
        .select('*')
        .eq('wallet_address', wallet)
        .not('piece_cid', 'is', null)
        .eq('status', 'completed');

      let deleted = 0;
      for (const file of files || []) {
        const success = await deleteFileRecord(file);
        if (success) deleted++;
      }

      // Insert bulk summary log
      if (deleted > 0) {
        await supabase.from('agent_actions').insert({
          user_id: user.id,
          action_type: 'DELETE',
          description: `Bulk deleted ${deleted} completed file(s)`,
          file_id: null,
        });
      }

      setBulkMessage(`Deleted ${deleted} completed file(s)`);
      await fetchActivities();
    } catch (err) {
      console.error('[BulkDelete] Completed failed:', err);
      setBulkMessage('Bulk delete failed: ' + err.message);
    } finally {
      setBulkDeleting(false);
    }
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
    delete: activities.filter(a => a.action_type === 'DELETE').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Activity className="h-6 w-6 text-shamrock" /> Agent Activity
        </h1>
        <button onClick={handleRefresh} disabled={refreshing} className="inline-flex items-center gap-2 rounded-md border border-shamrock-darker px-3 py-2 text-sm text-gray-300 hover:bg-shamrock-darker/30 transition-colors disabled:opacity-50">
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Bulk actions */}
      <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Bulk Agent Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleDeleteOverdueNotSubmitted}
            disabled={bulkDeleting || !wallet}
            className="inline-flex items-center gap-2 rounded-md bg-red-500/20 text-red-400 px-4 py-2 text-sm font-medium hover:bg-red-500/30 disabled:opacity-50"
          >
            <Trash2 size={16} />
            Delete Overdue & Not Submitted
          </button>
          <button
            onClick={handleDeleteCompleted}
            disabled={bulkDeleting || !wallet}
            className="inline-flex items-center gap-2 rounded-md bg-green-500/20 text-green-400 px-4 py-2 text-sm font-medium hover:bg-green-500/30 disabled:opacity-50"
          >
            <CheckCircle size={16} />
            Delete Completed Files
          </button>
        </div>
        {bulkDeleting && (
          <p className="text-sm text-gray-400 mt-2 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Deleting...
          </p>
        )}
        {bulkMessage && <p className="text-sm text-gray-300 mt-2">{bulkMessage}</p>}
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
                    <p className="text-xs text-gray-500">
                      {new Date(action.created_at).toLocaleTimeString()}
                    </p>
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
          <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full flex items-center gap-1">
            <Trash2 className="h-3 w-3" /> Deletes completed/overdue files
          </span>
        </div>
      </div>
    </div>
  );
};

export default AgentActivityPage;