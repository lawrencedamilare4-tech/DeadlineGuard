import React from 'react';
import { motion } from 'framer-motion';

const StorageGauge = ({ percentage, usedBytes, totalBytes }) => {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = (pct) => {
    if (pct > 90) return '#ef4444'; // red
    if (pct > 70) return '#f59e0b'; // yellow
    return '#4db372'; // shamrock green
  };

  const color = getColor(percentage);

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="140" viewBox="0 0 120 120">
        {/* Background circle */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#2a2a2a"
          strokeWidth="10"
        />
        
        {/* Animated progress circle */}
        <motion.circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          transform="rotate(-90 60 60)"
        />
        
        {/* Percentage text */}
        <text
          x="60"
          y="65"
          textAnchor="middle"
          fill={color}
          fontSize="24"
          fontWeight="bold"
        >
          {percentage.toFixed(1)}%
        </text>
      </svg>
      
      <p className="text-xs text-gray-400 mt-2">
        {formatBytes(usedBytes)} / {formatBytes(totalBytes)}
      </p>
    </div>
  );
};

export default StorageGauge;