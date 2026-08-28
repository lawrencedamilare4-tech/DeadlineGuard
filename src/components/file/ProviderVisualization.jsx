// src/components/file/ProviderVisualization.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { File, Server, ShieldCheck, MapPin, CheckCircle, AlertTriangle } from 'lucide-react';

const ProviderVisualization = ({ providers }) => {
  if (!providers || providers.length === 0) return null;

  return (
    <div className="flex flex-col items-center">
      {/* File icon */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center"
      >
        <File className="h-12 w-12 text-shamrock" />
        <span className="text-xs text-gray-500 mt-1 font-mono">PieceCID</span>
      </motion.div>

      {/* Lines to providers */}
      <div className="w-px h-8 bg-gray-300 dark:bg-shamrock-darker my-2" />

      {/* Providers */}
      <div className="flex flex-wrap justify-center gap-6">
        {providers.map((provider, idx) => (
          <motion.div
            key={provider.id || idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.15 }}
            className="flex flex-col items-center bg-shamrock-darker/10 rounded-lg p-4 min-w-[140px]"
          >
            <Server className="h-8 w-8 text-shamrock-light mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {provider.provider_name || 'Provider'}
            </span>
            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
              <MapPin className="h-3 w-3 mr-1" />
              {provider.location || 'Unknown'}
            </div>
            <div className="mt-2">
              {provider.health === 'healthy' ? (
                <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle className="h-3 w-3" /> Healthy
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                  <AlertTriangle className="h-3 w-3" /> Degraded
                </span>
              )}
            </div>
            <span className="mt-1 text-xs text-gray-400">
              Storage copy ✓
            </span>
          </motion.div>
        ))}
      </div>

      {/* PDP Verified line */}
      <div className="w-px h-8 bg-gray-300 dark:bg-shamrock-darker my-2" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center text-shamrock"
      >
        <ShieldCheck className="h-5 w-5 mr-1" />
        <span className="text-sm font-medium">PDP VERIFIED</span>
      </motion.div>
    </div>
  );
};

export default ProviderVisualization;