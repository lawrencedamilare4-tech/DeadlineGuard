import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Cloud, CheckCircle } from 'lucide-react';

const UploadLoader = ({ fileName, progress }) => {
  return (
    <div className="flex flex-col items-center justify-center py-10">
      {/* Animated file icon */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        className="relative mb-4"
      >
        <div className="absolute inset-0 bg-shamrock/20 rounded-full blur-xl" />
        <FileText className="h-16 w-16 text-shamrock relative z-10" />
      </motion.div>

      {/* Rotating ring */}
      <div className="relative w-24 h-24 mb-4">
        <motion.div
          className="absolute inset-0 border-4 border-shamrock-darker rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-0 border-4 border-transparent border-t-shamrock rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Cloud className="h-8 w-8 text-shamrock" />
        </div>
      </div>

      {/* File name */}
      <p className="text-white font-semibold text-lg mb-1">{fileName}</p>

      {/* Progress percentage */}
      <motion.div
        className="text-3xl font-bold text-shamrock"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
      >
        {Math.round(progress)}%
      </motion.div>

      {/* Progress bar */}
      <div className="w-full max-w-md bg-gray-200 dark:bg-shamrock-darker rounded-full h-3 mt-3">
        <motion.div
          className="bg-shamrock h-3 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Status message */}
      <motion.p
        className="text-sm text-gray-400 mt-3 flex items-center gap-2"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        Uploading to Filecoin...
        <span className="inline-flex gap-1">
          <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1, repeat: Infinity, delay: 0 }}>.</motion.span>
          <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}>.</motion.span>
          <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}>.</motion.span>
        </span>
      </motion.p>
    </div>
  );
};

export default UploadLoader;