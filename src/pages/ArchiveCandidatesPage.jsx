import React, { useEffect, useState, useCallback } from 'react';
import { FilecoinService } from '../services/filecoin';
import { useFilecoin } from '../contexts/FilecoinContext';
import { supabase } from '../services/supabase/client';
import { Archive, Loader2, RefreshCw, FileText, Copy, CheckCircle, AlertTriangle, Brain, Zap } from 'lucide-react';

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 1. Fetch files from Supabase (metadata index)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: filesData, error: filesError } = await supabase
        .from('files')
        .select('*, filecoin_storage(*), assignments(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (filesError) throw filesError;

      const allFiles = filesData || [];
      setFiles(allFiles);

      // 2. Identify archive candidates based on on-chain + academic data
      const now = Date.now();
      const candidatesList = allFiles.filter(file => {
        const assignment = file.assignments;
        const isCompleted = assignment?.status === 'completed';
        const isOld = file.created_at && (now - new Date(file.created_at).getTime()) > 90 * 24 * 60 * 60 * 1000; // 3 months
        const isCold = file.temperature === 'cold';
        const isLarge = (file.file_size || 0) > 500 * 1024 * 1024; // >500MB
        const notDueSoon = !assignment?.due_date || (new Date(assignment.due_date).getTime() - now) > 7 * 24 * 60 * 60 * 1000;

        return (isCompleted || isOld || isCold) && notDueSoon;
      });

      setCandidates(candidatesList);

    } catch (err) {
      console.error('[Archive] Fetch failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleAiAnalysis = async () => {
    setAnalyzing(true);
    setAiAnalysis(null);
    
    try {
      // Prepare context for Groq
      const context = {
        wallet: wallet,
        totalFiles: files.length,
        candidates: candidates.map(f => ({
          fileName: f.file_name,
          size: f.file_size,
          pieceCid: f.piece_cid,
          temperature: f.temperature,
          status: f.status,
          createdAt: f.created_at,
          assignment: f.assignments ? {
            title: f.assignments.title,
            dueDate: f.assignments.due_date,
            gradeWeight: f.assignments.grade_weight,
            status: f.assignments.status,
          } : null,
        })),
        onChainData: {
          connected,
          synapseReady,
        },
      };

      // Call Groq via Supabase Edge Function
      const { data, error: groqError } = await supabase.functions.invoke('groq-report', {
        body: {
          context,
          task: 'archive_analysis',
        },
      });

      if (groqError) throw groqError;
      
      setAiAnalysis(data?.report || data?.analysis || 'No analysis available.');

    } catch (err) {
      console.error('[Archive] AI analysis failed:', err);
      setAiAnalysis('AI analysis unavailable. Using deterministic rules only.');
    } finally {
      setAnalyzing(false);
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
    if (!bytes) return '0 B';
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Archive className="h-6 w-6 text-shamrock" /> Archive Candidates
        </h1>
        <div className="flex gap-3">
          <button
            onClick={handleAiAnalysis}
            disabled={analyzing || candidates.length === 0}
            className="inline-flex items-center gap-2 rounded-md border border-shamrock px-3 py-2 text-sm text-shamrock hover:bg-shamrock/10 transition-colors disabled:opacity-50"
          >
            <Brain size={16} className={analyzing ? 'animate-pulse' : ''} />
            {analyzing ? 'Analyzing...' : 'AI Analysis'}
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-md border border-shamrock-darker px-3 py-2 text-sm text-gray-300 hover:bg-shamrock-darker/30 transition-colors"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Wallet Info */}
      <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
        <p className="text-sm text-gray-500">Wallet</p>
        <p className="font-mono text-white truncate">{wallet || 'Not connected'}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
          <p className="text-sm text-gray-500">Total Files</p>
          <p className="text-2xl font-bold text-white">{files.length}</p>
        </div>
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
          <p className="text-sm text-gray-500">Archive Candidates</p>
          <p className="text-2xl font-bold text-shamrock">{candidates.length}</p>
        </div>
      </div>

      {/* AI Analysis */}
      {aiAnalysis && (
        <div className="bg-shamrock/10 rounded-lg border border-shamrock p-4">
          <h2 className="text-lg font-semibold text-shamrock mb-2 flex items-center gap-2">
            <Zap className="h-5 w-5" /> AI Analysis (Groq)
          </h2>
          <p className="text-sm text-gray-300 leading-relaxed">{aiAnalysis}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> {error}
          </p>
        </div>
      )}

      {/* Candidates List */}
      {candidates.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker">
          <FileText className="h-12 w-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">No archive candidates found.</p>
          <p className="text-sm text-gray-500 mt-2">
            Files that are completed, old (3+ months), or cold will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-shamrock-darker">
            <h2 className="text-lg font-semibold text-white">Candidates for Archival</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 dark:border-shamrock-darker">
                  <th className="px-4 py-3 text-sm text-gray-500">File</th>
                  <th className="px-4 py-3 text-sm text-gray-500">Size</th>
                  <th className="px-4 py-3 text-sm text-gray-500">PieceCID</th>
                  <th className="px-4 py-3 text-sm text-gray-500">Temperature</th>
                  <th className="px-4 py-3 text-sm text-gray-500">Reason</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((file) => {
                  const assignment = file.assignments;
                  const isOld = new Date(file.created_at).getTime() < Date.now() - 90 * 24 * 60 * 60 * 1000;
                  const reason = assignment?.status === 'completed' 
                    ? 'Completed' 
                    : isOld 
                    ? 'Old (3+ months)' 
                    : file.temperature === 'cold' 
                    ? 'Cold' 
                    : 'Large file';

                  return (
                    <tr key={file.id} className="border-b border-gray-200 dark:border-shamrock-darker hover:bg-gray-50 dark:hover:bg-shamrock-darker/20">
                      <td className="px-4 py-3">
                        <span className="text-white font-medium">{file.file_name}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {formatBytes(file.file_size)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-500">
                            {String(file.piece_cid || '—').slice(0, 20)}...
                          </span>
                          {file.piece_cid && (
                            <button onClick={() => copyCid(file.piece_cid)} className="text-gray-400 hover:text-shamrock">
                              {copiedCid === String(file.piece_cid) ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          file.temperature === 'hot' ? 'bg-red-100 text-red-700' :
                          file.temperature === 'warm' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {file.temperature?.toUpperCase() || 'COLD'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">{reason}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Deterministic Rules Note */}
      <div className="bg-shamrock-darker/20 rounded-lg p-4">
        <p className="text-sm text-gray-300">
          <strong>Archive Rules:</strong> Files are flagged as archive candidates if they are:
        </p>
        <ul className="text-sm text-gray-400 mt-2 space-y-1 list-disc list-inside">
          <li>Completed (assignment status = completed)</li>
          <li>Older than 3 months</li>
          <li>Temperature = COLD (rarely accessed)</li>
          <li>Larger than 500 MB</li>
          <li>NOT due within 7 days (protected by agent rule)</li>
        </ul>
      </div>
    </div>
  );
};

export default ArchiveCandidatesPage;