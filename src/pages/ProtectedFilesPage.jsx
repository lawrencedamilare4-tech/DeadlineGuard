import React, { useEffect, useState, useCallback } from 'react';
import { FilecoinService } from '../services/filecoin';
import { useFilecoin } from '../contexts/FilecoinContext';
import { Lock, Loader2, RefreshCw, ShieldCheck, FileText, Copy, CheckCircle } from 'lucide-react';

const ProtectedFilesPage = () => {
  const { wallet, connected, synapseReady } = useFilecoin();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [copiedCid, setCopiedCid] = useState(null);

  const fetchProtectedFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!synapseReady) {
        setError('Synapse not initialized. Please connect your wallet.');
        setLoading(false);
        return;
      }

      const synapse = FilecoinService.getSynapse();
      const storage = synapse.storage;
      
      console.log('[Protected] Fetching on-chain files...');

      // Fetch all data sets from Filecoin
      let dataSets = [];
      try {
        if (typeof storage.findDataSets === 'function') {
          dataSets = await storage.findDataSets({ source: 'deadlineguard' });
        } else if (typeof storage.listDataSets === 'function') {
          dataSets = await storage.listDataSets();
        }
      } catch (dsErr) {
        console.warn('[Protected] findDataSets failed:', dsErr.message);
      }

      console.log('[Protected] Data sets:', dataSets);

      // Collect all pieces with their metadata
      let allPieces = [];
      for (const ds of (dataSets || [])) {
        try {
          if (typeof storage.getStorageInfo === 'function') {
            const info = await storage.getStorageInfo({ 
              dataSetId: ds.id || ds.clientDataSetId 
            });
            
            if (info?.pieces) {
              const pieces = info.pieces.map(p => ({
                ...p,
                dataSetId: ds.id || ds.clientDataSetId,
                source: ds.metadata?.source || 'unknown',
                isProtected: true, // On-chain pieces are always protected
              }));
              allPieces = [...allPieces, ...pieces];
            }
          }
        } catch (pieceErr) {
          console.warn('[Protected] getStorageInfo failed:', pieceErr.message);
        }
      }

      setFiles(allPieces);
      console.log('[Protected] On-chain pieces:', allPieces.length);

    } catch (err) {
      console.error('[Protected] Fetch failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [synapseReady]);

  useEffect(() => {
    if (synapseReady) {
      fetchProtectedFiles();
    }
  }, [fetchProtectedFiles, synapseReady]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchProtectedFiles();
    setRefreshing(false);
  };

  const copyCid = (cid) => {
    if (cid) {
      navigator.clipboard.writeText(cid);
      setCopiedCid(cid);
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
          <Lock className="h-6 w-6 text-shamrock" /> Protected Files (On-Chain)
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

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Wallet info */}
      <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
        <p className="text-sm text-gray-500">Connected Wallet</p>
        <p className="font-mono text-white truncate">{wallet || 'Not connected'}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
          <p className="text-sm text-gray-500">Protected Pieces</p>
          <p className="text-2xl font-bold text-white">{files.length}</p>
        </div>
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
          <p className="text-sm text-gray-500">Total Size</p>
          <p className="text-2xl font-bold text-white">
            {formatBytes(files.reduce((sum, f) => sum + (f.size || 0), 0))}
          </p>
        </div>
      </div>

      {/* Files List */}
      <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-shamrock-darker">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-500" /> Protected on Filecoin
          </h2>
        </div>

        {files.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">No protected files on-chain.</p>
            <p className="text-sm text-gray-500 mt-2">
              All uploaded files are protected by default on Filecoin.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 dark:border-shamrock-darker">
                  <th className="px-4 py-3 text-sm text-gray-500">PieceCID</th>
                  <th className="px-4 py-3 text-sm text-gray-500">Size</th>
                  <th className="px-4 py-3 text-sm text-gray-500">Data Set</th>
                  <th className="px-4 py-3 text-sm text-gray-500">Status</th>
                  <th className="px-4 py-3 text-sm text-gray-500">Copy</th>
                </tr>
              </thead>
              <tbody>
                {files.map((piece, idx) => (
                  <tr key={idx} className="border-b border-gray-200 dark:border-shamrock-darker hover:bg-gray-50 dark:hover:bg-shamrock-darker/20">
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-gray-400">
                        {String(piece.pieceCid || piece.cid || 'Unknown').slice(0, 25)}...
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {formatBytes(piece.size || 0)}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">
                      {String(piece.dataSetId || '—').slice(0, 15)}...
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-green-500">
                        <Lock className="h-4 w-4" /> Protected
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => copyCid(piece.pieceCid || piece.cid)}
                        className="text-gray-400 hover:text-shamrock"
                      >
                        {copiedCid === (piece.pieceCid || piece.cid) ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Note */}
      <div className="bg-shamrock-darker/20 rounded-lg p-4">
        <p className="text-sm text-gray-300 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-shamrock" />
          All files stored on Filecoin are cryptographically protected with PDP (Proof of Data Possession) verification.
        </p>
      </div>
    </div>
  );
};

export default ProtectedFilesPage;