// src/components/file/RetrievalModal.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FilecoinService } from '../../services/filecoin';

const RetrievalModal = ({ file, onClose }) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('retrieving'); // retrieving, done, error
  const [error, setError] = useState(null);
  const [simulated, setSimulated] = useState(false);

  useEffect(() => {
    const handleRetrieve = async () => {
      try {
        const result = await FilecoinService.retrieveFile(file.piece_cid, {
          fileName: file.file_name,
          onProgress: (p) => setProgress(p),
        });
        setSimulated(result.simulated);
        // Create download link
        const url = URL.createObjectURL(result.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.file_name || 'retrieved_file.txt';
        a.click();
        URL.revokeObjectURL(url);
        setStatus('done');
      } catch (err) {
        setError(err.message);
        setStatus('error');
      }
    };
    handleRetrieve();
  }, [file]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-shamrock-darkest rounded-lg p-6 max-w-md w-full mx-4"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Retrieving from Filecoin
        </h3>
        {status === 'retrieving' && (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              PieceCID: {file.piece_cid?.slice(0, 20)}...
            </p>
            <div className="w-full bg-gray-200 dark:bg-shamrock-darker rounded-full h-2 mb-2">
              <div
                className="bg-shamrock h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">{Math.round(progress)}% complete</p>
          </>
        )}
        {status === 'done' && (
          <div>
            <p className="text-green-600 dark:text-green-400">✓ File retrieved successfully. Download started.</p>
            {simulated && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                (Simulated retrieval – real Synapse SDK method not available)
              </p>
            )}
          </div>
        )}
        {status === 'error' && (
          <p className="text-red-600 dark:text-red-400">Error: {error}</p>
        )}
        <button
          onClick={onClose}
          className="mt-4 bg-gray-200 dark:bg-shamrock-darker text-gray-800 dark:text-white px-4 py-2 rounded-md hover:bg-gray-300 dark:hover:bg-shamrock-dark transition-colors"
        >
          Close
        </button>
      </motion.div>
    </div>
  );
};

export default RetrievalModal;