// src/components/file/PDPStatusBadge.jsx
import React from 'react';
import { ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';

const PDPStatusBadge = ({ status }) => {
  if (!status) return null;

  const normalized = status.toUpperCase();
  switch (normalized) {
    case 'VERIFIED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium">
          <ShieldCheck className="h-3 w-3" /> VERIFIED
        </span>
      );
    case 'PENDING':
    case 'CHECKING':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs font-medium">
          <Loader2 className="h-3 w-3 animate-spin" /> CHECKING
        </span>
      );
    case 'FAILED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-medium">
          <ShieldAlert className="h-3 w-3" /> FAILED
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-xs font-medium">
          UNKNOWN
        </span>
      );
  }
};

export default PDPStatusBadge;