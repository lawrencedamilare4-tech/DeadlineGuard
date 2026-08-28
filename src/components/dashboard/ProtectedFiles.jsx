import { ShieldCheck } from 'lucide-react';
import { Card } from '../common/Card';

export function ProtectedFiles({ count = 0 }) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-display text-lg font-medium text-white mb-4">Protected Files</h3>
          <p className="font-mono text-4xl font-semibold tabular-nums text-white">{count}</p>
          <p className="mt-2 text-sm text-shamrock-lighter/70">Active storage agreements</p>
        </div>
        <ShieldCheck className="h-8 w-8 shrink-0 text-shamrock-light/70" strokeWidth={1.5} />
      </div>
    </Card>
  );
}