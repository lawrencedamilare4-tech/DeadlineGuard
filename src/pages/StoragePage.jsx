import React, { useEffect, useState, useCallback } from 'react';
import { FilecoinService } from '../services/filecoin';
import { useFilecoin } from '../contexts/FilecoinContext';
import { HardDrive, FileText, Copy, CheckCircle, Loader2, RefreshCw, Database, Cloud } from 'lucide-react';

const StoragePage = () => {
  const { wallet, connected, synapseReady } = useFilecoin();
  const [pieces, setPieces] = useState([]);
  const [dataSets, setDataSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState([]);
  const [copiedCid, setCopiedCid] = useState(null);

  const addDebug = (msg) => {
    console.log(msg);
    setDebugInfo((prev) => [...prev, msg]);
  };

  const fetchFromFilecoin = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDebugInfo([]);
    setPieces([]);
    setDataSets([]);

    try {
      if (!synapseReady) {
        setError('Synapse not initialized. Connect your wallet first.');
        setLoading(false);
        return;
      }

      const synapse = FilecoinService.getSynapse();
      const storage = synapse.storage;

      addDebug('[Fetch] Storage methods: ' + Object.getOwnPropertyNames(Object.getPrototypeOf(storage)).join(', '));

      // Method 1: findDataSets with source
      let foundDataSets = [];
      try {
        if (typeof storage.findDataSets === 'function') {
          const result = await storage.findDataSets({ source: 'deadlineguard' });
          addDebug('[Fetch] findDataSets(source) returned: ' + (result ? result.length : 0) + ' items');
          if (result && result.length > 0) {
            foundDataSets = result;
            setDataSets(result);
            addDebug('[Fetch] First data set: ' + JSON.stringify(result[0], null, 2).substring(0, 200));
          }
        }
      } catch (e) {
        addDebug('[Fetch] findDataSets(source) failed: ' + e.message);
      }

      // Method 2: findDataSets without args
      if (foundDataSets.length === 0) {
        try {
          if (typeof storage.findDataSets === 'function') {
            const result = await storage.findDataSets();
            addDebug('[Fetch] findDataSets() returned: ' + (result ? result.length : 0) + ' items');
            if (result && result.length > 0) {
              foundDataSets = result;
              setDataSets(result);
            }
          }
        } catch (e) {
          addDebug('[Fetch] findDataSets() failed: ' + e.message);
        }
      }

      // Method 3: getStorageInfo
      if (foundDataSets.length === 0) {
        try {
          if (typeof storage.getStorageInfo === 'function') {
            const info = await storage.getStorageInfo({});
            addDebug('[Fetch] getStorageInfo returned: ' + (info ? 'data' : 'null'));
            if (info?.pieces) {
              setPieces(info.pieces);
              addDebug('[Fetch] Pieces found: ' + info.pieces.length);
            }
            if (info?.copies) {
              setPieces(info.copies);
              addDebug('[Fetch] Copies found: ' + info.copies.length);
            }
          }
        } catch (e) {
          addDebug('[Fetch] getStorageInfo failed: ' + e.message);
        }
      }

      // Method 4: For each data set, try getStorageInfo
      if (foundDataSets.length > 0) {
        let allPieces = [];
        for (const ds of foundDataSets) {
          const dsId = ds.id || ds.clientDataSetId || ds.dataSetId;
          addDebug('[Fetch] Checking data set: ' + String(dsId).substring(0, 30));
          
          try {
            if (typeof storage.getStorageInfo === 'function') {
              const info = await storage.getStorageInfo({ dataSetId: dsId });
              if (info?.pieces) {
                addDebug('[Fetch] Data set ' + String(dsId).substring(0, 20) + ' has ' + info.pieces.length + ' pieces');
                allPieces = [...allPieces, ...info.pieces.map(p => ({ ...p, dataSetId: dsId }))];
              }
            }
          } catch (e) {
            addDebug('[Fetch] getStorageInfo for ' + String(dsId).substring(0, 20) + ' failed: ' + e.message);
          }
        }
        setPieces(allPieces);
      }

      addDebug('[Fetch] Total pieces found: ' + pieces.length);

    } catch (err) {
      console.error('[Fetch] Failed:', err);
      setError(err.message);
      addDebug('[Fetch] ERROR: ' + err.message);
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

  const copyCid = (cid) => {
    if (cid) {
      navigator.clipboard.writeText(String(cid));
      setCopiedCid(String(cid));
      setTimeout(() => setCopiedCid(null), 2000);
    }
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
          <Cloud className="h-6 w-6 text-shamrock" /> Filecoin Storage (On-Chain)
        </h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-md border border-shamrock-darker px-3 py-2 text-sm text-gray-300 hover:bg-shamrock-darker/30 transition-colors"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Wallet */}
      <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
        <p className="text-sm text-gray-500">Wallet</p>
        <p className="font-mono text-white truncate">{wallet || 'Not connected'}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
          <p className="text-sm text-gray-500">Data Sets</p>
          <p className="text-2xl font-bold text-white">{dataSets.length}</p>
        </div>
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-4">
          <p className="text-sm text-gray-500">Pieces</p>
          <p className="text-2xl font-bold text-white">{pieces.length}</p>
        </div>
      </div>

      {/* Debug Info */}
      <div className="bg-shamrock-darker/20 rounded-lg p-4 max-h-60 overflow-y-auto">
        <p className="text-xs text-gray-400 font-semibold mb-2">Debug:</p>
        {debugInfo.map((msg, idx) => (
          <p key={idx} className="text-xs font-mono text-gray-400">{msg}</p>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Pieces */}
      {pieces.length > 0 && (
        <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-shamrock-darker">
            <h2 className="text-lg font-semibold text-white">Stored Pieces</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 dark:border-shamrock-darker">
                  <th className="px-4 py-3 text-sm text-gray-500">PieceCID</th>
                  <th className="px-4 py-3 text-sm text-gray-500">Size</th>
                  <th className="px-4 py-3 text-sm text-gray-500">Copy</th>
                </tr>
              </thead>
              <tbody>
                {pieces.map((piece, idx) => (
                  <tr key={idx} className="border-b border-gray-200 dark:border-shamrock-darker hover:bg-gray-50 dark:hover:bg-shamrock-darker/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-400">
                          {String(piece.pieceCid || piece.cid || piece.piece_cid || 'Unknown').slice(0, 30)}...
                        </span>
                        <button 
                          onClick={() => copyCid(piece.pieceCid || piece.cid || piece.piece_cid)}
                          className="text-gray-400 hover:text-shamrock"
                        >
                          {copiedCid === String(piece.pieceCid || piece.cid || piece.piece_cid) ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {piece.size ? String(piece.size) : 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-green-500">✓</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty */}
      {pieces.length === 0 && dataSets.length === 0 && !error && (
        <div className="p-12 text-center bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker">
          <FileText className="h-12 w-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">No data found on Filecoin for this wallet.</p>
          <p className="text-sm text-gray-500 mt-2">Check the debug log above for SDK responses.</p>
        </div>
      )}
    </div>
  );
};

export default StoragePage;