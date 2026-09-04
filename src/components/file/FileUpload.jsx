import React, { useState, useRef } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader2, Wallet, AlertTriangle } from 'lucide-react';
import { FilecoinService } from '../../services/filecoin';
import { useSupabase } from '../../hooks/useSupabase';
import { useFilecoin } from '../../contexts/FilecoinContext';
import { supabase } from '../../services/supabase/client';

const FileUpload = ({ onUploadComplete, academicMeta = {}, isFormValid = false, resetForm }) => {
  const { user, loading: authLoading } = useSupabase();
  const { connected = false, synapseReady = false, wallet, refreshPaymentStatus, availableForStorage } = useFilecoin() || {};

  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [pieceCid, setPieceCid] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploadLog, setUploadLog] = useState([]);
  const inputRef = useRef(null);
  const { isFunded } = useFilecoin();

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

  const allFieldsFilled = isFormValid && file && connected && synapseReady;

  const handleFileSelect = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setStatus('idle');
      setError(null);
      setPieceCid(null);
      setUploadLog([]);
    }
  };

  const handleUpload = async () => {
    if (!allFieldsFilled) {
      setError('Please fill all academic fields and connect your wallet.');
      setStatus('error');
      return;
    }

    setStatus('uploading');
    setError(null);
    setProgress(0);
    setUploadLog([]);

    try {
      addLog(`[Upload] Starting: ${file.name}`);
      addLog(`[Upload] Course: ${academicMeta.courseName}`);
      addLog(`[Upload] Assignment: ${academicMeta.assignmentTitle}`);
      addLog(`[Upload] Due: ${academicMeta.dueDate}`);
      addLog(`[Upload] Wallet: ${wallet?.slice(0, 10)}...`);

      // Note: no separate approveStorageOperator() call here anymore.
      // Operator approval now happens once, in the background, right
      // after wallet connect (see FilecoinContext's initializeSynapse).
      // FilecoinService.uploadFile() also checks serviceApproval()
      // internally and only sends a tx if genuinely still needed, so by
      // the time a user reaches this point it's normally just a fast
      // read — not a wallet popup + confirmation wait on every upload.

      // Step 1: Upload to Filecoin
      const result = await FilecoinService.uploadFile(file, {
        onProgress: (percent) => setProgress(percent),
        fileName: file.name,
        courseName: academicMeta.courseName,
        assignmentTitle: academicMeta.assignmentTitle,
        dueDate: academicMeta.dueDate,
        gradeWeight: academicMeta.gradeWeight,
        walletAddress: wallet,
        skipPrepare: isFunded, // ← Pass funding status
      });
      const cid = typeof result?.pieceCid === 'string'
        ? result.pieceCid
        : String(result?.pieceCid || 'unknown');

      setPieceCid(cid);
      addLog(`[Upload] PieceCID: ${cid}`);
      addLog(`[Upload] File stored on Filecoin ✓`);
      setStatus('storing');

      // Step 2: Save PieceCID + wallet_address to Supabase (index)
      try {
        const { data: insertedFile, error: insertError } = await supabase
          .from('files')
          .insert({
            user_id: user?.id || null,
            wallet_address: wallet, // ← Permanent identifier
            file_name: file.name,
            file_type: file.type || 'application/octet-stream',
            file_size: file.size,
            piece_cid: cid, // ← Saved for Filecoin download
            status: 'active',
            temperature: 'warm',
            course_name: academicMeta.courseName || null,
            assignment_title: academicMeta.assignmentTitle || null,
            due_date: academicMeta.dueDate || null,
            grade_weight: academicMeta.gradeWeight || null,
            last_modified: new Date().toISOString(),
            last_accessed: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) {
          console.error('[Upload] Supabase insert error:', insertError.message);
          addLog(`[Upload] Supabase error: ${insertError.message}`);
        } else {
          console.log('[Upload] Supabase saved with wallet:', wallet);
          addLog(`[Upload] Supabase saved: ${insertedFile?.id}`);
        }
      } catch (e) {
        console.error('[Upload] Supabase exception:', e.message);
        addLog(`[Upload] Supabase exception: ${e.message}`);
      }

      // Refresh balance — fire-and-forget, don't block "done" status on it.
      // The user doesn't need the fresh number to know the upload finished.
      if (typeof refreshPaymentStatus === 'function') {
        refreshPaymentStatus();
        addLog('[Upload] Balance refresh triggered');
      }

      setStatus('done');
      addLog('[Upload] COMPLETE!');
      if (onUploadComplete) onUploadComplete({ pieceCid: cid });
      resetForm?.(); // Reset form fields after successful upload
    } catch (err) {
      console.error('[Upload] Failed:', err);

      const errorMessage = err.message || '';

      if (errorMessage.includes('InsufficientLockupFunds')) {
        const requiredMatch = errorMessage.match(/\([^,]+,\s*(\d+),\s*(\d+)/);
        let requiredUSDFC = 0.124;
        let availableUSDFC = availableForStorage || 0;

        if (requiredMatch) {
          requiredUSDFC = parseFloat(requiredMatch[1]) / 1e18;
          availableUSDFC = parseFloat(requiredMatch[2]) / 1e18;
        }

        setError(`Insufficient funds. This upload requires ${requiredUSDFC.toFixed(3)} USDFC but you only have ${availableUSDFC.toFixed(4)} USDFC deposited.`);
        addLog(`[Upload] INSUFFICIENT FUNDS: Need ${requiredUSDFC.toFixed(3)}, have ${availableUSDFC.toFixed(4)}`);
      } else if (errorMessage.includes('Insufficient balance')) {
        setError('Insufficient balance. Fund your wallet with USDFC in Settings.');
      } else if (errorMessage.includes('user rejected')) {
        setError('Transaction rejected in MetaMask.');
      } else {
        setError(errorMessage || 'Upload failed');
      }

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
        {availableForStorage !== undefined && (
          <span className="text-xs text-gray-500 ml-2">
            Available: ${availableForStorage?.toFixed(4) ?? '0.0000'} USDFC
          </span>
        )}
      </div>

      {/* Low balance warning */}
      {connected && availableForStorage !== undefined && availableForStorage < 0.13 && (
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
          <p className="text-sm text-yellow-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Low balance: Need 0.124 USDFC. You have {availableForStorage.toFixed(4)} USDFC.
          </p>
        </div>
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
      {file && status != 'uploading' && (
        <button
          onClick={handleUpload}
          disabled={!allFieldsFilled}
          className="mt-4 w-full bg-shamrock hover:bg-shamrock-dark text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {allFieldsFilled ? 'Upload to Filecoin' : 'Fill All Fields to Upload'}
        </button>
      )}

      {/* Progress */}
      {status === 'uploading' && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600 dark:text-gray-300">Uploading to Filecoin...</span>
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
        <div className="mt-4 flex items-start text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
          <span className="text-sm">{error}</span>
        </div>
      )}
    </div>
  );
};

export default FileUpload;