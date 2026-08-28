import React, { useEffect, useState, useCallback } from 'react';
import { FilecoinService } from '../services/filecoin';
import { useFilecoin } from '../contexts/FilecoinContext';
import { supabase } from '../services/supabase/client';
import { generateGroqReport } from '../services/ai/groqService';
import { 
  Archive, Loader2, RefreshCw, FileText, Copy, CheckCircle, 
  AlertTriangle, Brain, Zap, Calendar, TrendingUp, Cloud, Clock
} from 'lucide-react';

const ArchiveCandidatesPage = () => {
  const { wallet, connected, synapseReady } = useFilecoin();
  const [files, setFiles] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [copiedCid, setCopiedCid] = useState(null);
  const [filecoinMetadata, setFilecoinMetadata] = useState({});
  const [debugLog, setDebugLog] = useState([]);

  const addDebug = (msg) => {
    console.log(msg);
    setDebugLog((prev) => [...prev.slice(-15), msg]);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDebugLog([]);
    
    try {
      // 1. Fetch on-chain data sets and metadata from Filecoin
      const fcMetadata = {};
      
      if (synapseReady) {
        try {
          const synapse = FilecoinService.getSynapse();
          const storage = synapse.storage;
          const dataSets = await storage.findDataSets({ source: 'deadlineguard' });
          
          addDebug(`[Archive] Data sets from Filecoin: ${dataSets?.length || 0}`);
          
          for (const ds of (dataSets || [])) {
            const metadata = ds.metadata || {};
            addDebug(`[Archive] Metadata: ${JSON.stringify(metadata).substring(0, 200)}`);
            
            if (metadata.fileName) {
              fcMetadata[metadata.fileName] = metadata;
            }
            if (metadata.pieceCid) {
              fcMetadata[metadata.pieceCid] = metadata;
            }
          }
        } catch (e) {
          addDebug(`[Archive] Filecoin fetch: ${e.message}`);
        }
      }
      
      setFilecoinMetadata(fcMetadata);

      // 2. Fetch files from Supabase (for PieceCIDs)
      let filesData = [];
      const { data: { user } } = await supabase.auth.getUser();
      
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

      addDebug(`[Archive] Files from Supabase: ${filesData.length}`);

      // 3. Merge with Filecoin metadata
      const now = Date.now();
      const mergedFiles = filesData.map(file => {
        const fcMeta = fcMetadata[file.file_name] || fcMetadata[file.piece_cid] || {};
        
        // Due date from Filecoin metadata FIRST
        const dueDate = fcMeta.dueDate || file.assignments?.due_date || null;
        const courseName = fcMeta.courseName || file.courses?.name || null;
        const assignmentTitle = fcMeta.assignmentTitle || file.assignments?.title || null;
        const gradeWeight = Number(fcMeta.gradeWeight || file.assignments?.grade_weight || 0);
        const fileSize = Number(fcMeta.fileSize || file.file_size || 0);
        
        const daysUntilDue = dueDate 
          ? Math.floor((new Date(dueDate).getTime() - now) / (1000 * 60 * 60 * 24))
          : null;

        return {
          ...file,
          file_size: fileSize,
          dueDate,
          daysUntilDue,
          isDueSoon: daysUntilDue !== null && daysUntilDue <= 7 && daysUntilDue >= 0,
          isOverdue: daysUntilDue !== null && daysUntilDue < 0,
          courseName,
          assignmentTitle,
          gradeWeight,
          metadataSource: fcMeta.dueDate ? 'Filecoin' : 'Supabase',
        };
      });

      setFiles(mergedFiles);

      // 4. Identify archive candidates
      // Files are archive candidates if:
      // - They have NO due date (no deadline protection)
      // - OR they are old (3+ months) AND not due soon
      // - OR they are cold AND not due soon
      // - OR they are completed AND not due soon
      // Files due soon or overdue are PROTECTED (not candidates)
      
      const candidatesList = mergedFiles.filter(file => {
        const ageDays = file.created_at 
          ? Math.floor((now - new Date(file.created_at).getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        
        const isOld = ageDays > 90;
        const isCold = file.temperature === 'cold';
        const isLarge = file.file_size > 500 * 1024 * 1024;
        const isCompleted = file.status === 'completed';
        const hasDueDate = file.dueDate !== null;
        const isDueSoon = file.isDueSoon;
        const isOverdue = file.isOverdue;

        // NOT archive candidate if due soon or overdue
        if (isDueSoon || isOverdue) {
          addDebug(`[Archive] EXCLUDED (due soon/overdue): ${file.file_name} (${file.daysUntilDue} days)`);
          return false;
        }

        // Archive if old, cold, large, or completed
        if (isOld || isCold || isLarge || isCompleted) {
          addDebug(`[Archive] CANDIDATE: ${file.file_name} (old:${isOld}, cold:${isCold}, large:${isLarge}, completed:${isCompleted})`);
          return true;
        }

        // Archive if no due date and file is old
        if (!hasDueDate && ageDays > 30) {
          addDebug(`[Archive] CANDIDATE (no due date, old): ${file.file_name}`);
          return true;
        }

        return false;
      });

      setCandidates(candidatesList);
      addDebug(`[Archive] Total candidates: ${candidatesList.length}`);

    } catch (err) {
      console.error('[Archive] Fetch failed:', err);
      setError(err.message);
      addDebug(`[Archive] ERROR: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [synapseReady, wallet]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-generate AI analysis
  useEffect(() => {
    if (candidates.length > 0 && !aiAnalysis) {
      handleAiAnalysis();
    }
  }, [candidates.length]);

  const handleAiAnalysis = async () => {
    setAnalyzing(true);
    setAiAnalysis(null);
    
    try {
      const context = {
        totalFiles: files.length,
        archiveCandidates: candidates.length,
        candidates: candidates.map(f => ({
          fileName: f.file_name,
          size: f.file_size,
          dueDate: f.dueDate,
          daysUntilDue: f.daysUntilDue,
          gradeWeight: f.gradeWeight,
          metadataSource: f.metadataSource,
        })),
      };

      const report = await generateGroqReport(context, 'archive_analysis');
      setAiAnalysis(report);
    } catch (err) {
      setAiAnalysis(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
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
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Archive className="h-6 w-6 text-shamrock" /> Archive Candidates
        </h1>
        <button onClick={handleRefresh} disabled={refreshing} className="inline-flex items-center gap-2 rounded-md border border-shamrock-darker px-3 py-2 text-sm text-gray-300 hover:bg-shamrock-darker/30 transition-colors">
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
          <p className="text-sm text-gray-500">Total Files</p>
          <p className="text-2xl font-bold text-white">{files.length}</p>
        </div>
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
          <p className="text-sm text-gray-500">Archive Candidates</p>
          <p className="text-2xl font-bold text-shamrock">{candidates.length}</p>
        </div>
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-green-500/50 p-4">
          <p className="text-sm text-green-500">Protected (Due Soon/Overdue)</p>
          <p className="text-2xl font-bold text-green-400">{files.filter(f => f.isDueSoon || f.isOverdue).length}</p>
        </div>
      </div>

      {/* Debug Log */}
      {debugLog.length > 0 && (
        <div className="bg-shamrock-darker/20 rounded-lg p-3 max-h-40 overflow-y-auto">
          {debugLog.map((msg, idx) => (
            <p key={idx} className="text-xs font-mono text-gray-400">{msg}</p>
          ))}
        </div>
      )}

      {/* AI Analysis */}
      {aiAnalysis && (
        <div className="bg-shamrock/10 rounded-lg border border-shamrock p-4">
          <h2 className="text-lg font-semibold text-shamrock mb-2 flex items-center gap-2">
            <Brain className="h-5 w-5" /> AI Analysis
          </h2>
          <p className="text-sm text-gray-300 leading-relaxed">{aiAnalysis}</p>
        </div>
      )}

      {/* Candidates */}
      {candidates.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker">
          <FileText className="h-12 w-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">No archive candidates.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {candidates.map((file) => (
            <div key={file.id} className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-white">{file.file_name}</p>
                  {file.dueDate && (
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Due: {formatExactDate(file.dueDate)}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-500">{String(file.piece_cid).slice(0, 25)}...</span>
                    <button onClick={() => copyCid(file.piece_cid)} className="text-gray-400 hover:text-shamrock">
                      {copiedCid === String(file.piece_cid) ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">{formatBytes(file.file_size)}</p>
                  <p className="text-xs text-gray-500">Source: {file.metadataSource}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ArchiveCandidatesPage;