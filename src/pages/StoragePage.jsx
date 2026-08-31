import React, { useEffect, useState, useCallback } from 'react';
import { useFilecoin } from '../contexts/FilecoinContext';
import { FilecoinService } from '../services/filecoin';
import { supabase } from '../services/supabase/client';
import {
  HardDrive, FileText, Copy, CheckCircle, Loader2, RefreshCw, Calendar,
  AlertTriangle, Clock, Download, Eye, X, FileType, Trash2, Cloud, Database, Check
} from 'lucide-react';
import { estimateStorageCapacity } from '../utils/storage';

const StoragePage = () => {
  const { wallet, connected, synapseReady, availableForStorage } = useFilecoin();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [copiedCid, setCopiedCid] = useState(null);
  const [viewingFile, setViewingFile] = useState(null);
  const [downloadingFile, setDownloadingFile] = useState(null);
  const [deletingFile, setDeletingFile] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadedContent, setDownloadedContent] = useState(null);
  const [previewText, setPreviewText] = useState(null);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [previewType, setPreviewType] = useState(null);
  const [markingDone, setMarkingDone] = useState(null);
  const [showMarkDoneConfirm, setShowMarkDoneConfirm] = useState(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!wallet) {
        setFiles([]);
        setLoading(false);
        return;
      }

      const { data: filesData, error: filesError } = await supabase
        .from('files')
        .select('*')
        .eq('wallet_address', wallet)
        .order('created_at', { ascending: false });

      if (filesError) throw filesError;

      const now = Date.now();
      const allFiles = (filesData || []).map(file => {
        const daysUntilDue = file.due_date
          ? Math.floor((new Date(file.due_date).getTime() - now) / (1000 * 60 * 60 * 24))
          : null;

        const isCompleted = file.status === 'completed';

        return {
          ...file,
          dueDate: file.due_date || null,
          daysUntilDue,
          isDueSoon: daysUntilDue !== null && daysUntilDue <= 7 && daysUntilDue >= 0,
          isOverdue: daysUntilDue !== null && daysUntilDue < 0,
          courseName: file.course_name || null,
          assignmentTitle: file.assignment_title || null,
          hasValidCid: !!file.piece_cid,
          isCompleted,
        };
      });

      setFiles(allFiles);
      console.log('[Storage] Files by wallet:', allFiles.length);

    } catch (err) {
      console.error('[Storage] Fetch failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleRefresh = () => {
    fetchFiles();
  };

  const handleMarkAsCompleted = async (file) => {
    setMarkingDone(file.id);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('files')
        .update({ status: 'completed', temperature: 'cold' })
        .eq('id', file.id);

      if (updateError) throw updateError;

      await fetchFiles();
    } catch (err) {
      setError('Failed to mark as completed: ' + err.message);
    } finally {
      setMarkingDone(null);
      setShowMarkDoneConfirm(null);
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
      await supabase.from('files').delete().eq('id', file.id);

      try {
        const synapse = FilecoinService.getSynapse();
        const storage = synapse.storage;
        if (typeof storage.terminateService === 'function') {
          await storage.terminateService({ pieceCid: file.piece_cid });
        }
      } catch (e) {
        console.warn('[Delete] Filecoin delete warning:', e.message);
      }

      await fetchFiles();
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

  const totalStorageUsed = files.reduce((sum, f) => sum + (f.file_size || 0), 0);
  const storageCapacity = estimateStorageCapacity(availableForStorage || 0);
  const storagePercentage = storageCapacity > 0
    ? Math.min(100, (totalStorageUsed / storageCapacity) * 100)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-shamrock animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with wrap */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Cloud className="h-6 w-6 text-shamrock" /> Storage
        </h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-md border border-shamrock-darker px-3 py-2 text-sm text-gray-300 hover:bg-shamrock-darker/30 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Storage Usage */}
      {storageCapacity === 0 ? (
        <p className="text-yellow-400 text-sm">Deposit USDFC to see storage capacity</p>
      ) : (
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-shamrock" /> Storage Usage
            </h2>
            <span className="text-sm text-gray-400">{formatBytes(totalStorageUsed)} / {formatBytes(storageCapacity)}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-shamrock-darker rounded-full h-4">
            <div
              className={`h-4 rounded-full transition-all duration-500 ${storagePercentage > 90 ? 'bg-red-500' : 'bg-shamrock'}`}
              style={{ width: `${storagePercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Files List */}
      {files.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker">
          <FileText className="h-12 w-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">No files for this wallet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {files.map((file) => (
            <div
              key={file.id}
              className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4 flex flex-col sm:flex-row sm:items-start gap-4"
            >
              {/* Left: Icon + File Info */}
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div
                  className={`p-2 rounded-lg shrink-0 ${
                    file.isCompleted
                      ? 'bg-green-500/20'
                      : file.isOverdue
                      ? 'bg-red-500/20'
                      : file.isDueSoon
                      ? 'bg-yellow-500/20'
                      : 'bg-shamrock/20'
                  }`}
                >
                  {file.isCompleted ? (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  ) : file.isOverdue ? (
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                  ) : file.isDueSoon ? (
                    <Clock className="h-5 w-5 text-yellow-400" />
                  ) : (
                    <FileText className="h-5 w-5 text-shamrock" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-white text-lg truncate max-w-full">{file.file_name}</p>
                    {file.isCompleted && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400 font-semibold">
                        COMPLETED
                      </span>
                    )}
                  </div>

                  {file.courseName && <div className="text-xs text-gray-400 mt-1">{file.courseName}</div>}
                  {file.assignmentTitle && <div className="text-xs text-gray-500">{file.assignmentTitle}</div>}

                  {file.dueDate && (
                    <div
                      className={`mt-2 flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold ${
                        file.isCompleted
                          ? 'bg-green-500/10 text-green-400'
                          : file.isOverdue
                          ? 'bg-red-500/20 text-red-400'
                          : file.isDueSoon
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-shamrock/10 text-shamrock'
                      }`}
                    >
                      <Calendar className="h-4 w-4 shrink-0" />
                      <span>Due: {formatExactDate(file.dueDate)}</span>
                      {!file.isCompleted && file.daysUntilDue !== null && file.daysUntilDue >= 0 && (
                        <span className="text-xs">({file.daysUntilDue} days)</span>
                      )}
                      {!file.isCompleted && file.isOverdue && (
                        <span className="text-xs font-bold">({Math.abs(file.daysUntilDue)} days overdue!)</span>
                      )}
                    </div>
                  )}

                  <div className="mt-2 flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-mono text-green-400 max-w-[200px] truncate">
                      {String(file.piece_cid || 'No CID').slice(0, 25)}...
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
                    <span className="text-xs text-gray-400">{formatBytes(file.file_size)}</span>
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex flex-row sm:flex-col gap-2 flex-wrap sm:flex-nowrap sm:items-end">
                <button
                  onClick={() => setShowMarkDoneConfirm(file)}
                  disabled={file.isCompleted || markingDone === file.id}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-green-500 text-green-400 text-xs font-medium hover:bg-green-500/10 disabled:opacity-50 whitespace-nowrap"
                >
                  {markingDone === file.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : file.isCompleted ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <CheckCircle className="h-3 w-3" />
                  )}
                  {file.isCompleted ? 'Done' : 'Mark Done'}
                </button>

                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleDownload(file)}
                    disabled={downloadingFile === file.id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-shamrock text-white text-xs font-medium hover:bg-shamrock-dark disabled:opacity-50"
                  >
                    {downloadingFile === file.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Download className="h-3 w-3" />
                    )}
                  </button>
                  <button
                    onClick={() => handleView(file)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-shamrock text-shamrock text-xs font-medium hover:bg-shamrock/10"
                  >
                    <Eye className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(file)}
                    disabled={deletingFile === file.id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-red-500 text-red-400 text-xs font-medium hover:bg-red-500/10 disabled:opacity-50"
                  >
                    {deletingFile === file.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mark Done Confirmation Modal */}
      {showMarkDoneConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-shamrock-darkest rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-400" /> Mark as Completed?
            </h3>
            <p className="text-sm text-gray-400 mb-4 break-words">
              Are you sure you want to mark <span className="text-white font-semibold">{showMarkDoneConfirm.file_name}</span> as completed?
              <br />
              <span className="text-xs text-gray-500">This will make it an archive candidate.</span>
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowMarkDoneConfirm(null)}
                className="px-4 py-2 rounded-md border border-gray-500 text-gray-300 hover:bg-gray-500/10"
              >
                Cancel
              </button>
              <button
                onClick={() => handleMarkAsCompleted(showMarkDoneConfirm)}
                disabled={markingDone === showMarkDoneConfirm.id}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
              >
                {markingDone === showMarkDoneConfirm.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-shamrock-darkest rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-400" /> Delete File?
            </h3>
            <p className="text-sm text-gray-400 mb-4 break-words">
              Delete <span className="text-white font-semibold">{showDeleteConfirm.file_name}</span>?
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDeleteConfirm(null)} className="px-4 py-2 rounded-md border border-gray-500 text-gray-300">Cancel</button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                disabled={deletingFile === showDeleteConfirm.id}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
              >
                {deletingFile === showDeleteConfirm.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete
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
              <h3 className="text-lg font-semibold text-white truncate">{viewingFile.file_name}</h3>
              <button
                onClick={() => {
                  setViewingFile(null);
                  setDownloadedContent(null);
                  setPreviewText(null);
                  setPreviewImageUrl(null);
                  setPreviewType(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
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
                  <button
                    onClick={() => handleDownload(viewingFile)}
                    className="mt-4 inline-flex items-center gap-2 rounded-md bg-shamrock px-4 py-2 text-sm text-white"
                  >
                    <Download className="h-4 w-4" /> Download
                  </button>
                </div>
              ) : downloadedContent ? (
                <div className="text-center py-8">
                  <FileText className="h-16 w-16 text-gray-500 mx-auto mb-3" />
                  <button
                    onClick={() => {
                      const url = URL.createObjectURL(downloadedContent);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = viewingFile.file_name;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="mt-3 inline-flex items-center gap-2 rounded-md bg-shamrock px-4 py-2 text-sm text-white"
                  >
                    <Download className="h-4 w-4" /> Download
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 text-shamrock animate-spin mx-auto" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoragePage;