import React, { useState, useRef } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader2, Wallet } from 'lucide-react';
import { FilecoinService } from '../../services/filecoin';
import { useSupabase } from '../../hooks/useSupabase';
import { useFilecoin } from '../../contexts/FilecoinContext';
import { supabase } from '../../services/supabase/client';

const FileUpload = ({ onUploadComplete, academicMeta = {}, onFileSelect, validateForm }) => {
  const { user, loading: authLoading } = useSupabase();
  const { connected = false, synapseReady = false, wallet, refreshPaymentStatus } = useFilecoin() || {};
  
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [pieceCid, setPieceCid] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploadLog, setUploadLog] = useState([]);
  const inputRef = useRef(null);

  const addLog = (message) => {
    console.log(message);
    setUploadLog((prev) => [...prev, message]);
  };

  if (authLoading) {
    return <div className="text-center py-10"><Loader2 className="h-6 w-6 text-shamrock animate-spin mx-auto" /></div>;
  }

  if (!user) {
    return <div className="text-center py-10 text-gray-400">Please sign in to upload files.</div>;
  }

  const canUpload = connected && synapseReady;

  const handleFileSelect = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setStatus('idle');
      setError(null);
      setPieceCid(null);
      setUploadLog([]);
      if (onFileSelect) onFileSelect(selected);
    }
  };

  const handleUpload = async () => {
    if (validateForm) {
      const validationError = validateForm();
      if (validationError) {
        setError(validationError);
        setStatus('error');
        return;
      }
    }

    if (!file) {
      setError('Please select a file.');
      setStatus('error');
      return;
    }

    if (!connected || !synapseReady) {
      setError('Please connect your wallet first.');
      setStatus('error');
      return;
    }

    setStatus('uploading');
    setError(null);
    setProgress(0);
    setUploadLog([]);

    try {
      addLog(`[Upload] Starting: ${file.name}`);
      addLog(`[Upload] Size: ${(file.size / (1024 * 1024)).toFixed(2)} MB`);

      // Upload to Filecoin
      const result = await FilecoinService.uploadFile(file, {
        onProgress: (percent) => {
          setProgress(percent);
          if (percent % 25 === 0) addLog(`[Upload] Progress: ${Math.round(percent)}%`);
        },
      });

      const cid = typeof result?.pieceCid === 'string' 
        ? result.pieceCid 
        : String(result?.pieceCid || 'unknown');

      setPieceCid(cid);
      addLog(`[Upload] PieceCID: ${cid}`);
      addLog(`[Upload] Providers: ${result?.storageInfo?.providerCount || 2}`);
      setStatus('storing');

      // Save minimal metadata to Supabase
      try {
        const { data: insertedFile, error: insertError } = await supabase
          .from('files')
          .insert({
            user_id: user.id,
            file_name: file.name,
            file_type: file.type || 'application/octet-stream',
            file_size: file.size,
            piece_cid: cid,
            status: 'active',
            temperature: 'warm',
            priority_score: 0.5,
            urgency_score: 0.5,
            last_modified: new Date().toISOString(),
            last_accessed: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) {
          addLog(`[Upload] Supabase insert warning: ${insertError.message}`);
        } else {
          addLog(`[Upload] Supabase saved: ${insertedFile?.id}`);
        }
      } catch (supabaseErr) {
        addLog(`[Upload] Supabase error (non-fatal): ${supabaseErr.message}`);
      }

      // Refresh wallet balance after upload
      if (typeof refreshPaymentStatus === 'function') {
        addLog('[Upload] Refreshing wallet balance...');
        try {
          await refreshPaymentStatus();
          addLog('[Upload] Balance refreshed');
        } catch (refreshErr) {
          addLog(`[Upload] Balance refresh failed: ${refreshErr.message}`);
        }
      }

      setStatus('done');
      addLog('[Upload] COMPLETE!');
      
      if (onUploadComplete) onUploadComplete({ pieceCid: cid });
    } catch (err) {
      console.error('[Upload] Failed:', err);
      addLog(`[Upload] ERROR: ${err.message}`);
      setError(err.message || 'Upload failed');
      setStatus('error');
    }
  };

  return (
    <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Upload File</h2>

      {/* Wallet status */}
      <div className="mb-4 flex items-center gap-2 text-sm">
        <Wallet size={16} className="text-shamrock" />
        {connected && wallet ? (
          <span className="text-gray-600 dark:text-gray-300">
            Connected: {String(wallet).slice(0, 6)}...{String(wallet).slice(-4)}
          </span>
        ) : (
          <span className="text-red-500">Not connected</span>
        )}
      </div>

      {!connected && (
        <p className="text-sm text-red-500 mb-3">Please connect your wallet to upload to Filecoin.</p>
      )}

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
          disabled={!canUpload}
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
            <div className="bg-shamrock h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Upload Log */}
      {uploadLog.length > 0 && (
        <div className="mt-4 p-3 bg-shamrock-darker/20 rounded-md max-h-40 overflow-y-auto">
          <p className="text-xs text-gray-400 font-semibold mb-2">Upload Log:</p>
          {uploadLog.map((log, idx) => (
            <p key={idx} className="text-xs font-mono text-gray-400">{log}</p>
          ))}
        </div>
      )}

      {/* Success */}
      {status === 'done' && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center text-green-600 dark:text-green-400">
            <CheckCircle className="h-5 w-5 mr-2" />
            <span>Stored on Filecoin</span>
          </div>
          <p className="text-sm font-mono text-gray-600 dark:text-gray-300">
            PieceCID: {String(pieceCid || 'unknown').slice(0, 40)}
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