import React, { useEffect, useState, useCallback } from 'react';
import { useFilecoin } from '../contexts/FilecoinContext';
import { FilecoinService } from '../services/filecoin';
import { generateGroqReport } from '../services/ai/groqService';
import { 
  HardDrive, FileText, Copy, CheckCircle, Loader2, RefreshCw, Calendar, 
  AlertTriangle, Brain, Clock, Download, Eye, X, FileType, Trash2, Cloud, Database
} from 'lucide-react';

const StoragePage = () => {
  const { wallet, connected, synapseReady, availableForStorage } = useFilecoin();
  const [files, setFiles] = useState([]);
  const [dataSets, setDataSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [copiedCid, setCopiedCid] = useState(null);
  const [debugLog, setDebugLog] = useState([]);

  const addDebug = (msg) => {
    console.log(msg);
    setDebugLog((prev) => [...prev.slice(-20), msg]);
  };

  const fetchFromFilecoin = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFiles([]);
    setDebugLog([]);

    try {
      if (!synapseReady) {
        setError('Synapse not initialized. Connect your wallet first.');
        setLoading(false);
        return;
      }

      const synapse = FilecoinService.getSynapse();
      const storage = synapse.storage;

      addDebug('[Fetch] Fetching from Filecoin only...');

      // Get ALL data sets
      let foundDataSets = [];
      try {
        foundDataSets = await storage.findDataSets({ source: 'deadlineguard' });
        addDebug(`[Fetch] Data sets found: ${foundDataSets?.length || 0}`);
      } catch (e) {
        addDebug(`[Fetch] findDataSets error: ${e.message}`);
      }

      if (!foundDataSets || foundDataSets.length === 0) {
        try {
          foundDataSets = await storage.findDataSets();
          addDebug(`[Fetch] findDataSets() no-args: ${foundDataSets?.length || 0}`);
        } catch (e) {
          addDebug(`[Fetch] findDataSets no-args error: ${e.message}`);
        }
      }

      setDataSets(foundDataSets || []);

      const allFiles = [];
      const now = Date.now();

      for (const ds of (foundDataSets || [])) {
        const dsId = ds.id || ds.clientDataSetId || ds.dataSetId;
        const metadata = ds.metadata || {};
        const dsKey = String(dsId);
        
        addDebug(`[Fetch] DataSet: ${dsKey.substring(0, 40)}...`);
        addDebug(`[Fetch] Metadata keys: ${Object.keys(metadata).join(', ') || 'none'}`);
        addDebug(`[Fetch] Full metadata: ${JSON.stringify(metadata).substring(0, 200)}`);

        // Try to get pieces for this data set
        let pieces = [];
        try {
          const info = await storage.getStorageInfo({ dataSetId: dsId });
          addDebug(`[Fetch] getStorageInfo keys: ${Object.keys(info || {}).join(', ')}`);
          
          if (info?.pieces?.length) {
            pieces = info.pieces;
            addDebug(`[Fetch] Pieces: ${pieces.length}`);
          } else if (info?.copies?.length) {
            pieces = info.copies;
            addDebug(`[Fetch] Copies: ${pieces.length}`);
          }
        } catch (e) {
          addDebug(`[Fetch] getStorageInfo: ${e.message}`);
        }

        // If no pieces found, create entry from data set metadata
        if (pieces.length === 0) {
          addDebug('[Fetch] No pieces - using data set as entry');
          
          // Extract any info from metadata
          const pieceCid = metadata.pieceCid || metadata.piece_cid || null;
          const fileName = metadata.fileName || metadata.file_name || metadata.name || `Filecoin-Data-Set-${dsKey.substring(0, 12)}`;
          const fileSize = Number(metadata.fileSize || metadata.file_size || metadata.size || 0);
          const dueDate = metadata.dueDate || metadata.due_date || null;

          const daysUntilDue = dueDate 
            ? Math.floor((new Date(dueDate).getTime() - now) / (1000 * 60 * 60 * 24))
            : null;

          allFiles.push({
            id: `fc-${dsKey.substring(0, 20)}`,
            file_name: fileName,
            file_size: fileSize,
            piece_cid: pieceCid,
            status: 'active',
            dueDate,
            daysUntilDue,
            isDueSoon: daysUntilDue !== null && daysUntilDue <= 7 && daysUntilDue >= 0,
            isOverdue: daysUntilDue !== null && daysUntilDue < 0,
            courseName: metadata.courseName || metadata.course_name || null,
            assignmentTitle: metadata.assignmentTitle || metadata.assignment_title || null,
            gradeWeight: metadata.gradeWeight || metadata.grade_weight || null,
            dataSetId: dsKey,
            isOnChain: true,
          });
        } else {
          // Pieces found
          for (const piece of pieces) {
            const pieceCid = piece.pieceCid || piece.cid || piece.piece_cid;
            const pieceMetadata = piece.metadata || {};
            const dueDate = pieceMetadata.dueDate || metadata.dueDate || null;
            const daysUntilDue = dueDate 
              ? Math.floor((new Date(dueDate).getTime() - now) / (1000 * 60 * 60 * 24))
              : null;

            allFiles.push({
              id: `fc-${dsKey.substring(0, 15)}-${String(pieceCid || '').substring(0, 10)}`,
              file_name: pieceMetadata.fileName || metadata.fileName || `Piece-${String(pieceCid || dsKey).substring(0, 12)}`,
              file_size: Number(piece.size || pieceMetadata.fileSize || metadata.fileSize || 0),
              piece_cid: pieceCid,
              status: 'active',
              dueDate,
              daysUntilDue,
              isDueSoon: daysUntilDue !== null && daysUntilDue <= 7 && daysUntilDue >= 0,
              isOverdue: daysUntilDue !== null && daysUntilDue < 0,
              courseName: pieceMetadata.courseName || metadata.courseName || null,
              assignmentTitle: pieceMetadata.assignmentTitle || metadata.assignmentTitle || null,
              isOnChain: true,
            });
          }
        }
      }

      setFiles(allFiles);
      addDebug(`[Fetch] TOTAL files from Filecoin: ${allFiles.length}`);

    } catch (err) {
      console.error('[Fetch] Failed:', err);
      setError(err.message);
      addDebug(`[Fetch] ERROR: ${err.message}`);
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

  const handleDownload = async (file) => {
    if (!file.piece_cid) {
      setError('No PieceCID available for this file');
      return;
    }

    setError(null);
    try {
      const result = await FilecoinService.retrieveFile(file.piece_cid, {
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
    if (!bytes || bytes === 0) return 'Unknown size';
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
  const storageCapacity = 10 * 1024 * 1024 * 1024;
  const storagePercentage = Math.min(100, (totalStorageUsed / storageCapacity) * 100);

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
          <Cloud className="h-6 w-6 text-shamrock" /> Storage (Filecoin Only)
        </h1>
        <button onClick={handleRefresh} disabled={refreshing} className="inline-flex items-center gap-2 rounded-md border border-shamrock-darker px-3 py-2 text-sm text-gray-300 hover:bg-shamrock-darker/30 transition-colors">
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Storage Usage */}
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
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
          <p className="text-sm text-gray-500">Data Sets</p>
          <p className="text-2xl font-bold text-white">{dataSets.length}</p>
        </div>
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
          <p className="text-sm text-gray-500">Files</p>
          <p className="text-2xl font-bold text-white">{files.length}</p>
        </div>
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
          <p className="text-sm text-gray-500">Available</p>
          <p className="text-2xl font-bold text-shamrock">${availableForStorage?.toFixed(4) ?? '0.0000'}</p>
        </div>
      </div>

      {/* Debug Log */}
      {debugLog.length > 0 && (
        <div className="bg-shamrock-darker/20 rounded-lg p-3 max-h-48 overflow-y-auto">
          <p className="text-xs text-gray-400 font-semibold mb-2">Filecoin Debug:</p>
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

      {/* Files List */}
      {files.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker">
          <FileText className="h-12 w-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">No files found on Filecoin.</p>
          <p className="text-sm text-gray-500 mt-2">Check the debug log above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {files.map((file) => (
            <div key={file.id} className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 rounded-lg bg-shamrock/20 shrink-0">
                    <Database className="h-5 w-5 text-shamrock" />
                  </div>

                  <div className="flex-1">
                    <p className="font-semibold text-white text-lg">{file.file_name}</p>

                    {file.courseName && <div className="text-xs text-gray-400 mt-1">{file.courseName}</div>}

                    {file.dueDate && (
                      <div className={`mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold ${file.isOverdue ? 'bg-red-500/20 text-red-400' : file.isDueSoon ? 'bg-yellow-500/20 text-yellow-400' : 'bg-shamrock/10 text-shamrock'}`}>
                        <Calendar className="h-4 w-4" />
                        <span>Due: {formatExactDate(file.dueDate)}</span>
                      </div>
                    )}

                    <div className="mt-2 flex items-center gap-3">
                      {file.piece_cid ? (
                        <>
                          <span className="text-xs font-mono text-gray-500">{String(file.piece_cid).slice(0, 25)}...</span>
                          <button onClick={() => copyCid(file.piece_cid)} className="text-gray-400 hover:text-shamrock">
                            {copiedCid === String(file.piece_cid) ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-gray-500">No PieceCID in metadata</span>
                      )}
                      <span className="text-xs text-gray-400">{formatBytes(file.file_size)}</span>
                      <span className="text-xs text-green-500 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> On-Chain
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <button 
                    onClick={() => handleDownload(file)} 
                    disabled={!file.piece_cid}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-shamrock text-white text-xs font-medium hover:bg-shamrock-dark disabled:opacity-30"
                  >
                    <Download className="h-3 w-3" /> Download
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StoragePage;