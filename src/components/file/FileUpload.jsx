import React, { useState, useRef } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader2, Wallet } from 'lucide-react';
import { FilecoinService } from '../../services/filecoin';
import { useSupabase } from '../../hooks/useSupabase';
import { useFilecoin } from '../../contexts/FilecoinContext';
import { supabase } from '../../services/supabase/client';

const FileUpload = ({ onUploadComplete, academicMeta = {}, isFormValid = false }) => {
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
      addLog(`[Upload] Grade Weight: ${academicMeta.gradeWeight}%`);

      // Upload to Filecoin WITH FULL METADATA
      const result = await FilecoinService.uploadFile(file, {
        onProgress: (percent) => {
          setProgress(percent);
          if (percent % 25 === 0) addLog(`[Upload] Progress: ${Math.round(percent)}%`);
        },
        // Pass academic metadata to store on Filecoin
        fileName: file.name,
        courseName: academicMeta.courseName,
        assignmentTitle: academicMeta.assignmentTitle,
        dueDate: academicMeta.dueDate,
        gradeWeight: academicMeta.gradeWeight,
      });

      const cid = typeof result?.pieceCid === 'string' 
        ? result.pieceCid 
        : String(result?.pieceCid || 'unknown');

      setPieceCid(cid);
      addLog(`[Upload] PieceCID: ${cid}`);
      addLog(`[Upload] Metadata stored on Filecoin: fileName, courseName, assignmentTitle, dueDate, gradeWeight`);
      setStatus('storing');

      // Create course in Supabase (for reference)
      let courseId = null;
      try {
        const { data: existingCourse } = await supabase
          .from('courses')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', academicMeta.courseName)
          .maybeSingle();

        if (existingCourse) {
          courseId = existingCourse.id;
        } else {
          const { data: newCourse } = await supabase
            .from('courses')
            .insert({
              user_id: user.id,
              name: academicMeta.courseName,
              semester: new Date().getFullYear().toString(),
            })
            .select()
            .single();
          if (newCourse) courseId = newCourse.id;
        }
      } catch (e) {
        addLog(`[Upload] Course warning: ${e.message}`);
      }

      // Create assignment in Supabase
      let assignmentId = null;
      try {
        const { data: assignment } = await supabase
          .from('assignments')
          .insert({
            user_id: user.id,
            course_id: courseId,
            title: academicMeta.assignmentTitle,
            due_date: academicMeta.dueDate,
            grade_weight: academicMeta.gradeWeight,
            status: 'pending',
          })
          .select()
          .single();
        if (assignment) assignmentId = assignment.id;
      } catch (e) {
        addLog(`[Upload] Assignment warning: ${e.message}`);
      }

      // Calculate scores
      const now = Date.now();
      const due = new Date(academicMeta.dueDate).getTime();
      const daysUntilDue = Math.max(0, (due - now) / (1000 * 60 * 60 * 24));
      const priorityScore = Math.min(1, 
        ((daysUntilDue <= 7 ? 1 : daysUntilDue <= 14 ? 0.7 : daysUntilDue <= 30 ? 0.4 : 0.2) + 
         (academicMeta.gradeWeight / 100)) / 2
      );
      const urgencyScore = daysUntilDue <= 3 ? 1 : daysUntilDue <= 7 ? 0.8 : daysUntilDue <= 14 ? 0.5 : daysUntilDue <= 30 ? 0.3 : 0.1;

      // Save file metadata to Supabase (as backup index)
      try {
        const { data: insertedFile } = await supabase
          .from('files')
          .insert({
            user_id: user.id,
            course_id: courseId,
            assignment_id: assignmentId,
            file_name: file.name,
            file_type: file.type || 'application/octet-stream',
            file_size: file.size,
            piece_cid: cid,
            status: 'active',
            temperature: 'warm',
            priority_score: priorityScore,
            urgency_score: urgencyScore,
            last_modified: new Date().toISOString(),
            last_accessed: new Date().toISOString(),
          })
          .select()
          .single();
        addLog(`[Upload] Supabase backup saved: ${insertedFile?.id}`);
      } catch (e) {
        addLog(`[Upload] Supabase error (non-fatal): ${e.message}`);
      }

      if (typeof refreshPaymentStatus === 'function') {
        await refreshPaymentStatus();
        addLog('[Upload] Balance refreshed');
      }

      setStatus('done');
      addLog('[Upload] COMPLETE! File stored on Filecoin with full metadata.');
      if (onUploadComplete) onUploadComplete({ pieceCid: cid });
    } catch (err) {
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

      {/* Validation Message */}
      {!allFieldsFilled && (
        <p className="mt-3 text-xs text-yellow-500">
          ⚠️ Fill all academic fields, select a file, and connect wallet to enable upload.
        </p>
      )}

      {/* Upload button */}
      {file && (
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
            <span>Stored on Filecoin with Metadata</span>
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