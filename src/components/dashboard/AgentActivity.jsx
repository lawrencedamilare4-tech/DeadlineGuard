import { Card } from '../common/Card';

export function AgentActivity({ activities = [] }) {
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-medium text-white">Agent Activity</h3>
        <span className="font-mono text-[10px] uppercase tracking-widest text-shamrock-lighter/40">
          Live log
        </span>
      </div>
      <div className="space-y-1">
        {activities.length === 0 ? (
          <p className="text-shamrock-lighter/60 text-sm">No recent activity</p>
        ) : (
          activities.map((activity, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.03]"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-shamrock" />
              <span className="text-sm text-shamrock-lighter/90">{activity.description}</span>
              <span className="ml-auto font-mono text-xs text-shamrock-lighter/40">{activity.time}</span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}