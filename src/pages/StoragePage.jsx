import React, { useEffect, useState, useCallback } from 'react';
import { useFilecoin } from '../contexts/FilecoinContext';
import { FilecoinService } from '../services/filecoin';
import { generateGroqReport } from '../services/ai/groqService';
import { 
  HardDrive, FileText, Copy, CheckCircle, Loader2, RefreshCw, Calendar, 
  TrendingUp, Flame, Lock, Archive, AlertTriangle, Brain, Clock, BookOpen, 
  GraduationCap, ShieldCheck, Download, Eye, X, FileType, Trash2, Cloud, Database
} from 'lucide-react';

const StoragePage = () => {
  const { wallet, connected, synapseReady, availableForStorage, depositedBalance } = useFilecoin();
  const [files, setFiles] = useState([]);
  const [dataSets, setDataSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [copiedCid, setCopiedCid] = useState(null);
  const [aiReport, setAiReport] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeGroup, setActiveGroup] = useState('all');
  const [viewingFile, setViewingFile] = useState(null);
  const [downloadingFile, setDownloadingFile] = useState(null);
  const [deletingFile, setDeletingFile] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadedContent, setDownloadedContent] = useState(null);
  const [previewText, setPreviewText] = useState(null);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [previewType, setPreviewType] = useState(null);
  const [debugLog, setDebugLog] = useState([]);

  const addDebug = (msg) => {
    console.log(msg);
    setDebugLog((prev) => [...prev.slice(-10), msg]);
  };

const fetchFromFilecoin = useCallback(async () => {
  setLoading(true);
  setError(null);
  setFiles([]);

  try {
    if (!synapseReady) {
      setError('Synapse not initialized.');
      setLoading(false);
      return;
    }

    const synapse = FilecoinService.getSynapse();
    const storage = synapse.storage;

    // Get data sets with metadata
    const dataSets = await storage.findDataSets({ source: 'deadlineguard' });
    setDataSets(dataSets || []);

    const allFiles = [];
    const now = Date.now();

    for (const ds of (dataSets || [])) {
      const dsId = ds.id || ds.clientDataSetId;
      const metadata = ds.metadata || {};

      // Try to get pieces for this data set
      try {
        const info = await storage.getStorageInfo({ dataSetId: dsId });
        
        if (info?.pieces?.length) {
          for (const piece of info.pieces) {
            const pieceCid = piece.pieceCid || piece.cid;
            const dueDate = piece.metadata?.dueDate || metadata.dueDate || null;
            const daysUntilDue = dueDate 
              ? Math.floor((new Date(dueDate).getTime() - now) / (1000 * 60 * 60 * 24))
              : null;

            allFiles.push({
              id: `fc-${String(dsId).substring(0, 15)}-${String(pieceCid || '').substring(0, 10)}`,
              file_name: piece.metadata?.fileName || metadata.fileName || 'Unknown File',
              file_size: Number(piece.size || piece.metadata?.fileSize || metadata.fileSize || 0),
              piece_cid: pieceCid,
              status: 'active',
              dueDate,
              daysUntilDue,
              isDueSoon: daysUntilDue !== null && daysUntilDue <= 7 && daysUntilDue >= 0,
              isOverdue: daysUntilDue !== null && daysUntilDue < 0,
              courseName: piece.metadata?.courseName || metadata.courseName || null,
              assignmentTitle: piece.metadata?.assignmentTitle || metadata.assignmentTitle || null,
              gradeWeight: piece.metadata?.gradeWeight || metadata.gradeWeight || null,
              isFromFilecoin: true,
            });
          }
        }
      } catch (e) {
        addDebug(`[Fetch] getStorageInfo for ${String(dsId).substring(0, 20)}: ${e.message}`);
      }
    }

    setFiles(allFiles);
    addDebug(`[Fetch] Files with metadata from Filecoin: ${allFiles.length}`);

  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
}, [synapseReady]);

  useEffect(() => {
    if (synapseReady) {
      fetchFromFilecoin();
    }
  }, [fetchFromFilecoin, synapseReady]);

  const handleRefresh = () => {
    fetchFromFilecoin();
  };

  const handleAiAnalysis = async () => {
    setAnalyzing(true);
    setAiReport(null);
    try {
      const context = {
        totalFiles: files.length,
        dueSoon: files.filter(f => f.isDueSoon).length,
        overdue: files.filter(f => f.isOverdue).length,
      };
      const report = await generateGroqReport(context, 'archive_analysis');
      setAiReport(report);
    } catch (err) {
      setAiReport('AI analysis unavailable.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDownload = async (file) => {
    setDownloadingFile(file.id);
    setDownloadProgress(0);
    setError(null);

    try {
      if (!file.piece_cid) throw new Error('No PieceCID');

      const result = await FilecoinService.retrieveFile(file.piece_cid, {
        onProgress: (percent) => setDownloadProgress(percent),
        fileName: file.file_name,
      });

      const url = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (err) {
      setError(`Download failed: ${err.message}`);
    } finally {
      setDownloadingFile(null);
    }
  };

  const handleDelete = async (file) => {
    setDeletingFile(file.id);
    setError(null);

    try {
      if (!file.piece_cid) throw new Error('No PieceCID');

      const synapse = FilecoinService.getSynapse();
      const storage = synapse.storage;
      let deletedOnChain = false;

      // Try multiple delete methods
      const deleteMethods = [
        { name: 'terminateService', args: { pieceCid: file.piece_cid } },
        { name: 'schedulePieceRemoval', args: { pieceCid: file.piece_cid } },
        { name: 'delete', args: { pieceCid: file.piece_cid } },
        { name: 'removePiece', args: { pieceCid: file.piece_cid } },
      ];

      for (const method of deleteMethods) {
        if (typeof storage[method.name] === 'function') {
          try {
            await storage[method.name](method.args);
            deletedOnChain = true;
            addDebug(`[Delete] ${method.name} successful`);
            break;
          } catch (e) {
            addDebug(`[Delete] ${method.name}: ${e.message}`);
          }
        }
      }

      if (!deletedOnChain) {
        addDebug('[Delete] SDK delete not available. File remains on-chain.');
      }

      // Refresh list
      await fetchFromFilecoin();
      addDebug('[Delete] Complete');

    } catch (err) {
      setError(`Delete failed: ${err.message}`);
    } finally {
      setDeletingFile(null);
      setShowDeleteConfirm(null);
    }
  };

  const handleView = async (file) => {
    setViewingFile(file);
    setDownloadedContent(null);
    setPreviewText(null);
    setPreviewImageUrl(null);
    setPreviewType(null);
    setDownloadProgress(0);

    try {
      const result = await FilecoinService.retrieveFile(file.piece_cid, {
        onProgress: (percent) => setDownloadProgress(percent),
        fileName: file.file_name,
      });

      const blob = result.blob;
      setDownloadedContent(blob);

      const ext = file.file_name?.split('.').pop()?.toLowerCase();
      const mimeType = blob.type || '';

      if (mimeType.startsWith('image/')) {
        setPreviewType('image');
        setPreviewImageUrl(URL.createObjectURL(blob));
      } else if (ext === 'pdf' || mimeType === 'application/pdf') {
        setPreviewType('pdf');
      } else if (mimeType.startsWith('text/') || ['txt', 'md', 'json'].includes(ext)) {
        setPreviewType('text');
        try { setPreviewText(await blob.text()); } catch { setPreviewType('other'); }
      } else {
        setPreviewType('other');
      }
    } catch (err) {
      setError(`View failed: ${err.message}`);
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
    if (!bytes || bytes === 0) return 'Unknown';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatExactDate = (dateStr) => {
    if (!dateStr) return 'No due date';
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Storage calculations
  const totalStorageUsed = files.reduce((sum, f) => sum + (f.file_size || 0), 0);
  const storageCapacity = 10 * 1024 * 1024 * 1024; // 10GB
  const storagePercentage = Math.min(100, (totalStorageUsed / storageCapacity) * 100);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-shamrock animate-spin" />
      </div>
    );
  }

  const groups = {
    all: files,
    dueSoon: files.filter(f => f.isDueSoon || f.isOverdue),
  };

  const currentFiles = groups[activeGroup] || files;

  const groupTabs = [
    { key: 'all', label: 'All Files', icon: FileText },
    { key: 'dueSoon', label: 'Due Soon', icon: Calendar },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Cloud className="h-6 w-6 text-shamrock" /> Storage (Filecoin On-Chain)
        </h1>
        <div className="flex gap-3">
          <button onClick={handleAiAnalysis} disabled={analyzing || files.length === 0} className="inline-flex items-center gap-2 rounded-md border border-shamrock px-3 py-2 text-sm text-shamrock hover:bg-shamrock/10 transition-colors disabled:opacity-50">
            <Brain size={16} /> AI
          </button>
          <button onClick={handleRefresh} disabled={refreshing} className="inline-flex items-center gap-2 rounded-md border border-shamrock-darker px-3 py-2 text-sm text-gray-300 hover:bg-shamrock-darker/30 transition-colors">
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Storage Usage Progress Bar */}
      <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-shamrock" /> Storage Usage
          </h2>
          <span className="text-sm text-gray-400">{formatBytes(totalStorageUsed)} / {formatBytes(storageCapacity)}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-shamrock-darker rounded-full h-4 mb-2">
          <div className={`h-4 rounded-full transition-all duration-500 ${storagePercentage > 90 ? 'bg-red-500' : storagePercentage > 70 ? 'bg-yellow-500' : 'bg-shamrock'}`} style={{ width: `${storagePercentage}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>{storagePercentage.toFixed(1)}% used</span>
          <span>{formatBytes(Math.max(0, storageCapacity - totalStorageUsed))} free</span>
        </div>
      </div>

      {/* Wallet + Balance */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
          <p className="text-sm text-gray-500">Wallet</p>
          <p className="font-mono text-white truncate">{wallet || 'Not connected'}</p>
        </div>
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
          <p className="text-sm text-gray-500">Available Balance</p>
          <p className="text-lg font-bold text-shamrock">${availableForStorage?.toFixed(4) ?? '0.0000'}</p>
        </div>
      </div>

      {/* Debug Log */}
      {debugLog.length > 0 && (
        <div className="bg-shamrock-darker/20 rounded-lg p-3 max-h-32 overflow-y-auto">
          {debugLog.map((msg, idx) => (
            <p key={idx} className="text-xs font-mono text-gray-400">{msg}</p>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> {error}</p>
        </div>
      )}

      {/* Group Tabs */}
      <div className="flex flex-wrap gap-2">
        {groupTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setActiveGroup(tab.key)} className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeGroup === tab.key ? 'bg-shamrock text-white' : 'bg-shamrock-darker/20 text-gray-300 hover:bg-shamrock-darker/40'}`}>
              <Icon size={14} /> {tab.label} ({groups[tab.key].length})
            </button>
          );
        })}
      </div>

      {/* Files List */}
      {currentFiles.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker">
          <FileText className="h-12 w-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">No files found on Filecoin.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {currentFiles.map((file) => (
            <div key={file.id} className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4 hover:border-shamrock transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`p-2 rounded-lg shrink-0 ${file.isOverdue ? 'bg-red-500/20' : file.isDueSoon ? 'bg-yellow-500/20' : 'bg-shamrock/20'}`}>
                    {file.isOverdue ? <AlertTriangle className="h-5 w-5 text-red-400" /> : file.isDueSoon ? <Clock className="h-5 w-5 text-yellow-400" /> : <FileText className="h-5 w-5 text-shamrock" />}
                  </div>

                  <div className="flex-1">
                    <p className="font-semibold text-white text-lg">{file.file_name}</p>

                    {/* Course + Assignment */}
                    {(file.courseName || file.assignmentTitle) && (
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                        {file.courseName && <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {file.courseName}</span>}
                        {file.assignmentTitle && <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" /> {file.assignmentTitle}</span>}
                      </div>
                    )}

                    {/* Due Date */}
                    {file.dueDate ? (
                      <div className={`mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold ${file.isOverdue ? 'bg-red-500/20 text-red-400' : file.isDueSoon ? 'bg-yellow-500/20 text-yellow-400' : 'bg-shamrock/10 text-shamrock'}`}>
                        <Calendar className="h-4 w-4" />
                        <span>Due: {formatExactDate(file.dueDate)}</span>
                        {file.daysUntilDue !== null && file.daysUntilDue >= 0 && <span className="text-xs">({file.daysUntilDue} days)</span>}
                        {file.isOverdue && <span className="text-xs font-bold">({Math.abs(file.daysUntilDue)} days overdue!)</span>}
                      </div>
                    ) : (
                      <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-500 bg-gray-500/10">
                        <Calendar className="h-4 w-4" /> <span>No due date</span>
                      </div>
                    )}

                    {/* PieceCID + Size */}
                    <div className="mt-2 flex items-center gap-3">
                      <span className="text-xs font-mono text-gray-500">{String(file.piece_cid || 'No CID').slice(0, 25)}...</span>
                      {file.piece_cid && (
                        <button onClick={() => copyCid(file.piece_cid)} className="text-gray-400 hover:text-shamrock">
                          {copiedCid === String(file.piece_cid) ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </button>
                      )}
                      <span className="text-xs text-gray-400 ml-2">{formatBytes(file.file_size)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="shrink-0 flex gap-2">
                  <button onClick={() => handleDownload(file)} disabled={downloadingFile === file.id} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-shamrock text-white text-xs font-medium hover:bg-shamrock-dark transition-colors disabled:opacity-50">
                    {downloadingFile === file.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                  </button>
                  <button onClick={() => handleView(file)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-shamrock text-shamrock text-xs font-medium hover:bg-shamrock/10 transition-colors">
                    <Eye className="h-3 w-3" />
                  </button>
                  <button onClick={() => setShowDeleteConfirm(file)} disabled={deletingFile === file.id} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-red-500 text-red-400 text-xs font-medium hover:bg-red-500/10 transition-colors disabled:opacity-50">
                    {deletingFile === file.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  </button>
                </div>
              </div>

              {downloadingFile === file.id && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 dark:bg-shamrock-darker rounded-full h-2">
                    <div className="bg-shamrock h-2 rounded-full transition-all" style={{ width: `${downloadProgress}%` }} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-shamrock-darkest rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2"><Trash2 className="h-5 w-5 text-red-400" /> Delete File?</h3>
            <p className="text-sm text-gray-400 mb-4">Delete <span className="text-white font-semibold">{showDeleteConfirm.file_name}</span> from Filecoin?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDeleteConfirm(null)} className="px-4 py-2 rounded-md border border-gray-500 text-gray-300 hover:bg-gray-500/10">Cancel</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} disabled={deletingFile === showDeleteConfirm.id} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600 disabled:opacity-50">
                {deletingFile === showDeleteConfirm.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewingFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-shamrock-darkest rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-shamrock-darker">
              <h3 className="text-lg font-semibold text-white">{viewingFile.file_name}</h3>
              <button onClick={() => { setViewingFile(null); setDownloadedContent(null); setPreviewText(null); setPreviewImageUrl(null); setPreviewType(null); }} className="text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {previewType === 'image' && previewImageUrl ? (
                <img src={previewImageUrl} alt={viewingFile.file_name} className="max-w-full rounded-lg" />
              ) : previewType === 'text' && previewText ? (
                <pre className="text-sm text-gray-300 whitespace-pre-wrap">{previewText}</pre>
              ) : previewType === 'pdf' ? (
                <div className="text-center py-8">
                  <FileType className="h-16 w-16 text-red-400 mx-auto mb-3" />
                  <p className="text-white font-semibold">PDF Document</p>
                  <button onClick={() => handleDownload(viewingFile)} className="mt-4 inline-flex items-center gap-2 rounded-md bg-shamrock px-4 py-2 text-sm text-white"><Download className="h-4 w-4" /> Download</button>
                </div>
              ) : downloadedContent ? (
                <div className="text-center py-8">
                  <FileText className="h-16 w-16 text-gray-500 mx-auto mb-3" />
                  <button onClick={() => { const url = URL.createObjectURL(downloadedContent); const a = document.createElement('a'); a.href = url; a.download = viewingFile.file_name; a.click(); URL.revokeObjectURL(url); }} className="mt-3 inline-flex items-center gap-2 rounded-md bg-shamrock px-4 py-2 text-sm text-white"><Download className="h-4 w-4" /> Download</button>
                </div>
              ) : (
                <div className="text-center py-8"><Loader2 className="h-8 w-8 text-shamrock animate-spin mx-auto" /></div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoragePage;