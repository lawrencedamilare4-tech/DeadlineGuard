import React, { useEffect, useState, useCallback } from 'react';
import { FilecoinService } from '../services/filecoin';
import { useFilecoin } from '../contexts/FilecoinContext';
import { Database, Loader2, RefreshCw, FileText, Copy, CheckCircle, HardDrive, Cloud, ChevronDown, ChevronUp } from 'lucide-react';

const DataSetsPage = () => {
  const { wallet, connected, synapseReady } = useFilecoin();
  const [dataSets, setDataSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [expandedSet, setExpandedSet] = useState(null);
  const [piecesBySet, setPiecesBySet] = useState({});
  const [debugLog, setDebugLog] = useState([]);
  const [copiedCid, setCopiedCid] = useState(null);

  const addDebug = (msg) => {
    console.log(msg);
    setDebugLog((prev) => [...prev.slice(-20), msg]);
  };

const fetchDataSets = useCallback(async () => {
  setLoading(true);
  setError(null);
  setDebugLog([]);
  setPiecesBySet({});

  try {
    if (!synapseReady) {
      setError('Synapse not initialized.');
      setLoading(false);
      return;
    }

    const synapse = FilecoinService.getSynapse();
    const storage = synapse.storage;

    // Fetch data sets
    const foundDataSets = await storage.findDataSets({ source: 'deadlineguard' });
    setDataSets(foundDataSets || []);
    addDebug(`[DataSets] Found ${foundDataSets?.length || 0} data sets`);

    const piecesMap = {};
    
    for (const ds of (foundDataSets || [])) {
      const dsId = ds.id || ds.clientDataSetId || ds.dataSetId;
      const dsKey = String(dsId);
      
      addDebug(`[DataSets] DataSet ID: ${dsKey}`);
      addDebug(`[DataSets] Full DS object: ${JSON.stringify(ds, (key, value) => typeof value === 'bigint' ? value.toString() : value).substring(0, 300)}`);
      
      let foundPieces = [];
      
      // Try multiple methods
      try {
        // Method 1: getStorageInfo with dataSetId
        const info1 = await storage.getStorageInfo({ dataSetId: dsId });
        addDebug(`[DataSets] getStorageInfo(dataSetId) keys: ${Object.keys(info1 || {})}`);
        if (info1?.pieces?.length) foundPieces = info1.pieces;
        if (info1?.copies?.length) foundPieces = info1.copies;
      } catch(e1) {
        addDebug(`[DataSets] Method 1 error: ${e1.message}`);
      }
      
      // Method 2: getStorageInfo with clientDataSetId
      if (foundPieces.length === 0) {
        try {
          const info2 = await storage.getStorageInfo({ clientDataSetId: dsId });
          addDebug(`[DataSets] getStorageInfo(clientDataSetId) keys: ${Object.keys(info2 || {})}`);
          if (info2?.pieces?.length) foundPieces = info2.pieces;
          if (info2?.copies?.length) foundPieces = info2.copies;
        } catch(e2) {
          addDebug(`[DataSets] Method 2 error: ${e2.message}`);
        }
      }
      
      // Method 3: Direct ID
      if (foundPieces.length === 0) {
        try {
          const info3 = await storage.getStorageInfo(dsId);
          addDebug(`[DataSets] getStorageInfo(direct) keys: ${Object.keys(info3 || {})}`);
          if (info3?.pieces?.length) foundPieces = info3.pieces;
          if (info3?.copies?.length) foundPieces = info3.copies;
        } catch(e3) {
          addDebug(`[DataSets] Method 3 error: ${e3.message}`);
        }
      }
      
      // Method 4: Check if ds object already has pieces
      if (foundPieces.length === 0 && ds.pieces) {
        foundPieces = ds.pieces;
        addDebug(`[DataSets] Pieces found in ds object: ${ds.pieces.length}`);
      }
      
      piecesMap[dsKey] = foundPieces;
      addDebug(`[DataSets] Total pieces found for this set: ${foundPieces.length}`);
    }

    setPiecesBySet(piecesMap);
    addDebug(`[DataSets] COMPLETE. Sets: ${foundDataSets?.length}, Pieces map: ${Object.keys(piecesMap).length}`);

  } catch (err) {
    addDebug(`[DataSets] ERROR: ${err.message}`);
    setError(err.message);
  } finally {
    setLoading(false);
  }
}, [synapseReady]);

  useEffect(() => {
    if (synapseReady) {
      fetchDataSets();
    }
  }, [fetchDataSets, synapseReady]);

  const handleRefresh = () => {
    fetchDataSets();
  };

  const toggleExpand = (dsKey) => {
    setExpandedSet(expandedSet === dsKey ? null : dsKey);
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

  // Count total pieces across all sets
  const totalPieces = Object.values(piecesBySet).reduce((sum, pieces) => sum + pieces.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Database className="h-6 w-6 text-shamrock" /> Data Sets (On-Chain)
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
          <p className="text-sm text-gray-500">Total Pieces</p>
          <p className="text-2xl font-bold text-white">{totalPieces}</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Debug Log */}
      <div className="bg-shamrock-darker/20 rounded-lg p-4 max-h-40 overflow-y-auto">
        <p className="text-xs text-gray-400 font-semibold mb-2">Debug:</p>
        {debugLog.map((msg, idx) => (
          <p key={idx} className="text-xs font-mono text-gray-400">{msg}</p>
        ))}
      </div>

      {/* Data Sets List */}
      {dataSets.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker">
          <FileText className="h-12 w-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">No data sets found on Filecoin.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {dataSets.map((ds, idx) => {
            const dsId = ds.id || ds.clientDataSetId || ds.dataSetId;
            const dsKey = String(dsId);
            const pieces = piecesBySet[dsKey] || [];
            const isExpanded = expandedSet === dsKey;
            const totalSize = pieces.reduce((sum, p) => sum + (p.size || 0), 0);

            return (
              <div key={idx} className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker overflow-hidden">
                {/* Header */}
                <button
                  onClick={() => toggleExpand(dsKey)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-shamrock-darker/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5 text-shamrock" />
                    <div className="text-left">
                      <p className="font-semibold text-white">Data Set {idx + 1}</p>
                      <p className="text-xs font-mono text-gray-500">{dsKey.substring(0, 40)}...</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{pieces.length} pieces</span>
                    <span className="text-xs text-gray-400">{formatBytes(totalSize)}</span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Pieces */}
                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-shamrock-darker p-4">
                    {pieces.length === 0 ? (
                      <p className="text-sm text-gray-500">No pieces in this data set.</p>
                    ) : (
                      <div className="space-y-2">
                        {pieces.map((piece, pieceIdx) => (
                          <div key={pieceIdx} className="flex items-center justify-between p-3 bg-shamrock-darker/10 rounded-md">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-shamrock" />
                              <span className="text-xs font-mono text-gray-300">
                                {String(piece.pieceCid || piece.cid || piece.piece_cid || 'Unknown').slice(0, 30)}...
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-400">{formatBytes(piece.size || 0)}</span>
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
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DataSetsPage;