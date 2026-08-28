import React, { useState, useRef } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader2, Wallet } from 'lucide-react';
import { FilecoinService } from '../../services/filecoin';
import { insertFileMetadata, insertFilecoinStorage } from '../../services/supabase/database';
import { useSupabase } from '../../hooks/useSupabase';
import { useFilecoin } from '../../contexts/FilecoinContext';

const FileUpload = ({ onUploadComplete }) => {
  const { user } = useSupabase();
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [pieceCid, setPieceCid] = useState(null);
  const [costEstimate, setCostEstimate] = useState(null);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef(null);
  const { connected = false, synapseReady = false, wallet } = useFilecoin() || {};

  const handleFileSelect = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setStatus('idle');
      setError(null);
      setPieceCid(null);
      setCostEstimate(null);
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;
    if (!connected || !synapseReady) {
      setError('Please connect your wallet first.');
      setStatus('error');
      return;
    }

    setStatus('uploading');
    setError(null);
    setProgress(0);

    try {
      const result = await FilecoinService.uploadFile(file, {
        onProgress: (percent) => setProgress(percent),
      });

      if (result.costEstimate) {
        setCostEstimate(result.costEstimate);
      }

      const cid = result?.pieceCid || 'unknown';
      setPieceCid(cid);
      setStatus('storing');

      const fileMetadata = {
        user_id: user.id,
        file_name: file.name,
        file_type: file.type || 'application/octet-stream',
        file_size: file.size,
        piece_cid: cid,
        status: 'active',
        temperature: 'warm',
        last_modified: new Date().toISOString(),
        last_accessed: new Date().toISOString(),
      };
      const insertedFile = await insertFileMetadata(fileMetadata);

      await insertFilecoinStorage({
        file_id: insertedFile.id,
        user_id: user.id,
        piece_cid: cid,
        storage_size: file.size,
        provider_count: result.storageInfo.providerCount,
        healthy_provider_count: result.storageInfo.healthyProviderCount,
        pdp_status: result.storageInfo.pdpStatus,
        retrieval_status: result.storageInfo.retrievalStatus,
        payment_status: result.storageInfo.paymentStatus,
        storage_status: result.storageInfo.storageStatus,
      });

      setStatus('done');
      if (onUploadComplete) onUploadComplete(insertedFile);
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err.message || 'Upload failed');
      setStatus('error');
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Upload Academic File
      </h2>

      {/* Wallet status */}
      <div className="mb-4 flex items-center gap-2 text-sm">
        <Wallet size={16} className="text-shamrock" />
        {connected && wallet ? (
          <span className="text-gray-600 dark:text-gray-300">
            Connected: {wallet.slice(0, 6)}...{wallet.slice(-4)}
          </span>
        ) : (
          <span className="text-red-500">Not connected</span>
        )}
      </div>

      {/* File selection */}
      <div
        className="border-2 border-dashed border-gray-300 dark:border-shamrock-dark rounded-lg p-8 text-center cursor-pointer hover:border-shamrock transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept=".pdf,.doc,.docx,.zip,.fig,.ppt,.pptx,.jpg,.png,.txt"
        />
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          {file ? file.name : 'Click to select a file'}
        </p>
        {file && (
          <p className="text-xs text-gray-500 mt-1">
            {(file.size / (1024 * 1024)).toFixed(2)} MB
          </p>
        )}
      </div>

      {/* Upload button */}
      {file && status === 'idle' && (
        <button
          onClick={handleUpload}
          disabled={!connected || !synapseReady}
          className="mt-4 w-full bg-shamrock hover:bg-shamrock-dark text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50"
        >
          Upload to Filecoin
        </button>
      )}

      {/* Progress */}
      {status === 'uploading' && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600 dark:text-gray-300">Uploading...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-shamrock-darker rounded-full h-2">
            <div
              className="bg-shamrock h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Cost estimate */}
      {costEstimate && (
        <div className="mt-4 p-3 bg-shamrock-darker/20 rounded-md">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Estimated cost: <span className="font-mono">{costEstimate.depositNeeded || costEstimate.total || 'Unknown'}</span> wei
          </p>
        </div>
      )}

  {/* Success state */}
      {status === 'done' && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center text-green-600 dark:text-green-400">
            <CheckCircle className="h-5 w-5 mr-2" />
            <span>Stored on Filecoin</span>
          </div>
          <p className="text-sm font-mono text-gray-600 dark:text-gray-300">
            PieceCID: {typeof pieceCid === 'string' ? pieceCid.slice(0, 20) + '...' : JSON.stringify(pieceCid)?.slice(0, 40)}
          </p>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="mt-4 flex items-start text-red-600 dark:text-red-400">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default FileUpload;