import { Archive } from 'lucide-react';
import { Card } from '../common/Card';

export function ArchiveCandidates({ files = [] }) {
  return (
    <Card>
      <h3 className="font-display text-lg font-medium text-white mb-4">Archive Candidates</h3>
      {files.length === 0 ? (
        <p className="text-shamrock-lighter/60 text-sm">No files ready for archival</p>
      ) : (
        <div className="space-y-1">
          {files.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.03]"
            >
              <div className="flex min-w-0 items-center gap-2">
                <Archive className="h-4 w-4 shrink-0 text-shamrock-lighter/50" strokeWidth={1.5} />
                <span className="truncate text-sm text-shamrock-lighter/90">{file.name}</span>
              </div>
              <span className="shrink-0 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-amber-300">
                Ready
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}