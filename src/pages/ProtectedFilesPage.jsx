import React, { useEffect, useState, useCallback } from 'react';
import { FilecoinService } from '../services/filecoin';
import { useFilecoin } from '../contexts/FilecoinContext';
import { supabase } from '../services/supabase/client';
import { generateGroqReport } from '../services/ai/groqService';
import { 
  Lock, Loader2, RefreshCw, ShieldCheck, FileText, Copy, CheckCircle, 
  AlertTriangle, Clock, Brain, Calendar, TrendingUp
} from 'lucide-react';

const ProtectedFilesPage = () => {
  const { wallet, connected, synapseReady, availableForStorage } = useFilecoin();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [copiedCid, setCopiedCid] = useState(null);
  const [aiReport, setAiReport] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [filecoinMetadata, setFilecoinMetadata] = useState({});

  const fetchProtectedFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFiles([]);

    try {
      // 1. Fetch from Supabase (has PieceCIDs and assignments)
      let supabaseFiles = [];
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data } = await supabase
          .from('files')
          .select('*, assignments(*), courses(*)')
          .eq('user_id', user.id)
          .not('piece_cid', 'is', null)
          .order('created_at', { ascending: false });
        supabaseFiles = data || [];
      }
      
      if (supabaseFiles.length === 0 && wallet) {
        const { data } = await supabase
          .from('files')
          .select('*, assignments(*), courses(*)')
          .eq('wallet_address', wallet)
          .not('piece_cid', 'is', null)
          .order('created_at', { ascending: false });
        supabaseFiles = data || [];
      }

      // 2. Fetch metadata from Filecoin
      const fcMetadata = {};
      if (synapseReady) {
        try {
          const synapse = FilecoinService.getSynapse();
          const storage = synapse.storage;
          const dataSets = await storage.findDataSets({ source: 'deadlineguard' });
          
          for (const ds of (dataSets || [])) {
            const metadata = ds.metadata || {};
            if (metadata.fileName) {
              fcMetadata[metadata.fileName] = metadata;
            }
            if (metadata.pieceCid) {
              fcMetadata[metadata.pieceCid] = metadata;
            }
          }
        } catch (e) {
          console.warn('[Protected] Filecoin metadata fetch:', e.message);
        }
      }
      setFilecoinMetadata(fcMetadata);

      // 3. Merge and identify protected files
      const now = Date.now();
      const mergedFiles = supabaseFiles
        .map(file => {
          const fcMeta = fcMetadata[file.file_name] || fcMetadata[file.piece_cid] || {};
          const dueDate = fcMeta.dueDate || file.assignments?.due_date || null;
          const daysUntilDue = dueDate 
            ? Math.floor((new Date(dueDate).getTime() - now) / (1000 * 60 * 60 * 24))
            : null;
          const gradeWeight = Number(fcMeta.gradeWeight || file.assignments?.grade_weight || 0);

          return {
            ...file,
            dueDate,
            daysUntilDue,
            isDueSoon: daysUntilDue !== null && daysUntilDue <= 7 && daysUntilDue >= 0,
            isOverdue: daysUntilDue !== null && daysUntilDue < 0,
            isHighStakes: gradeWeight >= 30,
            courseName: fcMeta.courseName || file.courses?.name || null,
            assignmentTitle: fcMeta.assignmentTitle || file.assignments?.title || null,
            gradeWeight,
            metadataSource: fcMeta.dueDate ? 'Filecoin' : 'Supabase',
          };
        })
        .filter(file => {
          // Protected = due soon, overdue, high stakes, or explicitly marked protected
          return file.isDueSoon || file.isOverdue || file.isHighStakes || file.status === 'protected';
        })
        .sort((a, b) => {
          if (a.isOverdue && !b.isOverdue) return -1;
          if (!a.isOverdue && b.isOverdue) return 1;
          return (a.daysUntilDue || 0) - (b.daysUntilDue || 0);
        });

      setFiles(mergedFiles);
      console.log('[Protected] Protected files:', mergedFiles.length);

    } catch (err) {
      console.error('[Protected] Fetch failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [synapseReady, wallet]);

  useEffect(() => {
    if (synapseReady || wallet) {
      fetchProtectedFiles();
    }
  }, [fetchProtectedFiles, synapseReady, wallet]);

  // Auto-generate AI report
  useEffect(() => {
    if (files.length > 0) {
      generateAiReport();
    }
  }, [files.length]);

  const generateAiReport = async () => {
    setAiLoading(true);
    setAiReport(null);

    try {
      const context = {
        protectedFiles: files.map(f => ({
          fileName: f.file_name,
          dueDate: f.dueDate,
          daysUntilDue: f.daysUntilDue,
          isOverdue: f.isOverdue,
          gradeWeight: f.gradeWeight,
          courseName: f.courseName,
        })),
        totalProtected: files.length,
        overdue: files.filter(f => f.isOverdue).length,
        dueSoon: files.filter(f => f.isDueSoon).length,
      };

      const report = await generateGroqReport(context, 'protected_files_analysis');
      setAiReport(report);
    } catch (err) {
      console.warn('[Protected] AI report failed:', err.message);
      setAiReport(null);
    } finally {
      setAiLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchProtectedFiles();
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

  const overdueFiles = files.filter(f => f.isOverdue);
  const dueSoonFiles = files.filter(f => f.isDueSoon);
  const highStakesFiles = files.filter(f => f.isHighStakes && !f.isDueSoon && !f.isOverdue);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Lock className="h-6 w-6 text-shamrock" /> Protected Files
        </h1>
        <button onClick={handleRefresh} disabled={refreshing} className="inline-flex items-center gap-2 rounded-md border border-shamrock-darker px-3 py-2 text-sm text-gray-300 hover:bg-shamrock-darker/30 transition-colors disabled:opacity-50">
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
          <p className="text-sm text-gray-500">Total Protected</p>
          <p className="text-2xl font-bold text-white">{files.length}</p>
        </div>
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-red-500/50 p-4">
          <p className="text-sm text-red-500">Overdue</p>
          <p className="text-2xl font-bold text-red-400">{overdueFiles.length}</p>
        </div>
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-yellow-500/50 p-4">
          <p className="text-sm text-yellow-500">Due Soon</p>
          <p className="text-2xl font-bold text-yellow-400">{dueSoonFiles.length}</p>
        </div>
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
          <p className="text-sm text-gray-500">High Stakes</p>
          <p className="text-2xl font-bold text-purple-400">{highStakesFiles.length}</p>
        </div>
      </div>

      {/* AI Report */}
      {aiReport && (
        <div className="bg-shamrock/10 rounded-lg border border-shamrock p-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
            <Brain className="h-5 w-5 text-shamrock" /> AI Protection Analysis
          </h2>
          <p className="text-sm text-gray-300 leading-relaxed">{aiReport}</p>
        </div>
      )}

      {aiLoading && (
        <div className="flex items-center gap-2 text-gray-400 justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Generating AI analysis...</span>
        </div>
      )}

      {/* Files List */}
      <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-shamrock-darker">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-500" /> Protected Files
          </h2>
        </div>

        {files.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">No protected files.</p>
            <p className="text-sm text-gray-500 mt-2">
              Files due within 7 days or with high grade weight will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3 p-4">
            {files.map((file) => (
              <div key={file.id} className={`p-4 rounded-lg border ${
                file.isOverdue ? 'border-red-500/50 bg-red-500/5' :
                file.isDueSoon ? 'border-yellow-500/50 bg-yellow-500/5' :
                'border-shamrock/30 bg-shamrock/5'
              }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-semibold text-white text-lg">{file.file_name}</p>

                    {file.courseName && (
                      <p className="text-xs text-gray-400 mt-1">{file.courseName}</p>
                    )}

                    {file.dueDate && (
                      <div className={`mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold ${
                        file.isOverdue ? 'bg-red-500/20 text-red-400' :
                        file.isDueSoon ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-shamrock/10 text-shamrock'
                      }`}>
                        <Calendar className="h-4 w-4" />
                        <span>Due: {formatExactDate(file.dueDate)}</span>
                        {file.isOverdue && (
                          <span className="font-bold">({Math.abs(file.daysUntilDue)} days overdue!)</span>
                        )}
                        {file.isDueSoon && (
                          <span>({file.daysUntilDue} days left)</span>
                        )}
                      </div>
                    )}

                    {file.gradeWeight > 0 && (
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {file.gradeWeight}% of grade
                        {file.gradeWeight >= 30 && (
                          <span className="text-purple-400 font-bold">HIGH STAKES</span>
                        )}
                      </p>
                    )}

                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-500">
                        {String(file.piece_cid).slice(0, 25)}...
                      </span>
                      <button onClick={() => copyCid(file.piece_cid)} className="text-gray-400 hover:text-shamrock">
                        {copiedCid === String(file.piece_cid) ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                      <span className="text-xs text-gray-500 ml-2">{formatBytes(file.file_size)}</span>
                    </div>
                  </div>

                  {/* Status badge */}
                  <div className="shrink-0">
                    {file.isOverdue ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold">
                        <AlertTriangle className="h-3 w-3" /> OVERDUE
                      </span>
                    ) : file.isDueSoon ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold">
                        <Clock className="h-3 w-3" /> DUE SOON
                      </span>
                    ) : file.isHighStakes ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold">
                        <Lock className="h-3 w-3" /> HIGH STAKES
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold">
                        <ShieldCheck className="h-3 w-3" /> PROTECTED
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Note */}
      <div className="bg-shamrock-darker/20 rounded-lg p-4">
        <p className="text-sm text-gray-300 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-shamrock" />
          Files are protected when due within 7 days, overdue, or have grade weight ≥30%.
        </p>
      </div>
    </div>
  );
};

export default ProtectedFilesPage;