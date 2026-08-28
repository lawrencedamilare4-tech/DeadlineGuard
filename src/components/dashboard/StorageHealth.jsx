// import { Card } from '../common/Card';

// const STATUS = {
//   healthy: { label: 'Healthy', color: '#4db372' },
//   warning: { label: 'Warning', color: '#f2b84b' },
//   critical: { label: 'Critical', color: '#f04438' },
// };

// export function StorageHealth({ status = 'healthy' }) {
//   const s = STATUS[status] ?? STATUS.healthy;

//   return (
//     <Card>
//       <h3 className="font-display text-lg font-medium text-white mb-4">Health Status</h3>
//       <div className="flex items-center gap-3">
//         <span className="relative flex h-3 w-3">
//           <span
//             className="absolute inset-0 rounded-full animate-ping"
//             style={{ backgroundColor: s.color, opacity: 0.45 }}
//           />
//           <span
//             className="relative h-3 w-3 rounded-full"
//             style={{ backgroundColor: s.color, boxShadow: `0 0 14px 2px ${s.color}66` }}
//           />
//         </span>
//         <span className="font-mono text-sm uppercase tracking-wide text-white">{s.label}</span>
//       </div>
//     </Card>
//   );
// }

import React from 'react';
import { HardDrive, ShieldCheck, AlertTriangle } from 'lucide-react';

const StorageHealth = ({ data }) => {
  if (!data || data.length === 0) return null;
  const totalProviders = data.reduce((sum, d) => sum + (d.provider_count || 0), 0);
  const healthy = data.reduce((sum, d) => sum + (d.healthy_provider_count || 0), 0);
  const healthPercent = totalProviders > 0 ? Math.round((healthy / totalProviders) * 100) : 0;
  const pdpStatus = data.every(d => d.pdp_status === 'VERIFIED') ? 'VERIFIED' : 'CHECKING';

  return (
    <div className="p-6 bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker">
      <div className="flex items-center mb-4">
        <HardDrive className="h-6 w-6 text-shamrock mr-2" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Storage Health</h3>
      </div>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-300">Provider copies</span>
            <span className="font-medium">{healthy}/{totalProviders} healthy</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-shamrock-darker rounded-full h-2">
            <div
              className={`h-2 rounded-full ${healthPercent > 90 ? 'bg-shamrock' : healthPercent > 70 ? 'bg-shamrock-light' : 'bg-storm-warning'}`}
              style={{ width: `${healthPercent}%` }}
            />
          </div>
        </div>
        <div className="flex items-center">
          <ShieldCheck className="h-5 w-5 text-shamrock mr-2" />
          <span className="text-sm">PDP: {pdpStatus}</span>
        </div>
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-storm-warning mr-2" />
          <span className="text-sm">Retrieval: AVAILABLE</span>
        </div>
      </div>
    </div>
  );
};

export default StorageHealth;