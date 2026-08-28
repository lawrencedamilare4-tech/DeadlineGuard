import React, { useEffect, useState, useCallback } from 'react';
import { FilecoinService } from '../services/filecoin';
import { useFilecoin } from '../contexts/FilecoinContext';
import { HardDrive, FileText, Copy, CheckCircle, AlertTriangle, Loader2, RefreshCw, Database, Cloud } from 'lucide-react';

const StoragePage = () => {
  const { wallet, connected, synapseReady } = useFilecoin();
  const [filecoinDataSets, setFilecoinDataSets] = useState([]);
  const [filecoinPieces, setFilecoinPieces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [copiedCid, setCopiedCid] = useState(null);

  const fetchFromFilecoin = useCallback(async () => {
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
      
      console.log('[Storage] Storage methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(storage)));

      // Fetch data sets from Filecoin
      let dataSets = [];
      try {
        if (typeof storage.findDataSets === 'function') {
          dataSets = await storage.findDataSets({ source: 'deadlineguard' });
        } else if (typeof storage.listDataSets === 'function') {
          dataSets = await storage.listDataSets();
        }
      } catch (dsErr) {
        console.warn('[Storage] findDataSets failed:', dsErr.message);
      }
      
      console.log('[Storage] Filecoin data sets:', dataSets);
      setFilecoinDataSets(dataSets || []);

      // Fetch pieces for each data set
      let allPieces = [];
      for (const ds of (dataSets || [])) {
        try {
          if (typeof storage.getStorageInfo === 'function') {
            const info = await storage.getStorageInfo({ 
              dataSetId: ds.id || ds.clientDataSetId 
            });
            if (info?.pieces) {
              allPieces = [...allPieces, ...info.pieces.map(p => ({
                ...p,
                dataSetId: ds.id || ds.clientDataSetId,
              }))];
            }
          }
        } catch (pieceErr) {
          console.warn('[Storage] getStorageInfo failed:', pieceErr.message);
        }
      }
      
      console.log('[Storage] Filecoin pieces:', allPieces);
      setFilecoinPieces(allPieces);

    } catch (err) {
      console.error('[Storage] Failed to fetch from Filecoin:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [synapseReady]);

  useEffect(() => {
    if (synapseReady) {
      fetchFromFilecoin();
    }
  }, [synapseReady, fetchFromFilecoin]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchFromFilecoin();
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
          <Cloud className="h-6 w-6 text-shamrock" /> Filecoin Storage
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

      {/* Wallet info */}
      <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">Connected Wallet</p>
        <p className="font-mono text-white">{wallet || 'Not connected'}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
          <p className="text-sm text-gray-500">Data Sets</p>
          <p className="text-2xl font-bold text-white">{filecoinDataSets.length}</p>
        </div>
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
          <p className="text-sm text-gray-500">Pieces Stored</p>
          <p className="text-2xl font-bold text-white">{filecoinPieces.length}</p>
        </div>
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
          <p className="text-sm text-gray-500">Total Size</p>
          <p className="text-2xl font-bold text-white">
            {formatBytes(filecoinPieces.reduce((sum, p) => sum + (p.size || 0), 0))}
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> {error}
          </p>
        </div>
      )}

      {/* Filecoin Data Sets */}
      {filecoinDataSets.length > 0 && (
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Database className="h-5 w-5 text-shamrock" /> Data Sets (On-Chain)
          </h2>
          <div className="space-y-3">
            {filecoinDataSets.map((ds, idx) => (
              <div key={idx} className="p-4 bg-shamrock-darker/20 rounded-md">
                <p className="text-sm font-mono text-gray-200">
                  DataSet ID: {String(ds.id || ds.clientDataSetId || 'Unknown').slice(0, 30)}...
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Pieces: {ds.pieces?.length || ds.pieceCount || 'N/A'}
                </p>
                {ds.metadata && (
                  <p className="text-xs text-gray-500 mt-1">
                    Source: {ds.metadata.source || 'unknown'}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pieces */}
      {filecoinPieces.length > 0 && (
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-shamrock-darker">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-shamrock" /> Stored Pieces
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 dark:border-shamrock-darker">
                  <th className="px-4 py-3 text-sm text-gray-500">PieceCID</th>
                  <th className="px-4 py-3 text-sm text-gray-500">Size</th>
                  <th className="px-4 py-3 text-sm text-gray-500">Data Set</th>
                  <th className="px-4 py-3 text-sm text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {filecoinPieces.map((piece, idx) => (
                  <tr key={idx} className="border-b border-gray-200 dark:border-shamrock-darker hover:bg-gray-50 dark:hover:bg-shamrock-darker/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-400">
                          {String(piece.pieceCid || piece.cid || 'Unknown').slice(0, 20)}...
                        </span>
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
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {formatBytes(piece.size || 0)}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">
                      {String(piece.dataSetId || '—').slice(0, 15)}...
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-green-500">
                        <CheckCircle className="h-4 w-4" /> Stored
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {filecoinDataSets.length === 0 && filecoinPieces.length === 0 && !error && (
        <div className="p-12 text-center bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker">
          <FileText className="h-12 w-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">No data stored on Filecoin for this wallet.</p>
          <p className="text-sm text-gray-500 mt-2">Connect your wallet and upload files to see them here.</p>
        </div>
      )}
    </div>
  );
};

export default StoragePage;