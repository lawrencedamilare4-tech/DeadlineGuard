import { motion } from 'framer-motion';
import { Card } from '../common/Card';

const START_ANGLE = -120; // degrees, top-left-ish
const SWEEP = 240; // degrees, ends bottom-right-ish

function angleForValue(value) {
  const clamped = Math.min(Math.max(value, 0), 100);
  return START_ANGLE + (clamped / 100) * SWEEP;
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

export function RunwayCard({ days = 0, percentage = 0 }) {
  const needleAngle = angleForValue(percentage);
  const zoneColor = percentage < 33 ? '#f04438' : percentage < 66 ? '#f2b84b' : '#4db372';

  return (
    <Card glow>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-medium text-white">Storage Runway</h3>
        <span className="font-mono text-[10px] uppercase tracking-widest text-shamrock-lighter/50">
          Instrument 01
        </span>
      </div>

      <div className="flex items-center gap-6">
        <div>
          <p className="font-mono text-4xl font-semibold tabular-nums text-white">{days}</p>
          <p className="mt-1 text-sm text-shamrock-lighter/70">days remaining</p>
        </div>

        <div className="relative ml-auto h-32 w-32 shrink-0">
          <svg viewBox="0 0 120 120" className="h-full w-full">
            {/* dial face */}
            <circle cx="60" cy="60" r="54" fill="#0b1910" stroke="#1f472e" strokeWidth="2" />

            {/* base track */}
            <path
              d={describeArc(60, 60, 44, START_ANGLE, START_ANGLE + SWEEP)}
              fill="none"
              stroke="#1f472e"
              strokeWidth="6"
              strokeLinecap="round"
            />
            {/* value arc */}
            <path
              d={describeArc(60, 60, 44, START_ANGLE, needleAngle)}
              fill="none"
              stroke={zoneColor}
              strokeWidth="6"
              strokeLinecap="round"
            />

            {/* tick marks */}
            {Array.from({ length: 13 }).map((_, i) => {
              const a = START_ANGLE + (i / 12) * SWEEP;
              const rad = (a * Math.PI) / 180;
              const inner = i % 3 === 0 ? 36 : 39;
              const x1 = 60 + inner * Math.cos(rad);
              const y1 = 60 + inner * Math.sin(rad);
              const x2 = 60 + 44 * Math.cos(rad);
              const y2 = 60 + 44 * Math.sin(rad);
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#6fbf8c"
                  strokeOpacity={i % 3 === 0 ? 0.6 : 0.3}
                  strokeWidth={i % 3 === 0 ? 1.75 : 1}
                />
              );
            })}

            {/* needle */}
            <motion.g
              initial={{ rotate: START_ANGLE }}
              animate={{ rotate: needleAngle }}
              transition={{ type: 'spring', stiffness: 55, damping: 11 }}
              style={{ originX: '60px', originY: '60px' }}
            >
              <line x1="60" y1="60" x2="60" y2="27" stroke="#d4a24c" strokeWidth="2.5" strokeLinecap="round" />
            </motion.g>
            <circle cx="60" cy="60" r="4.5" fill="#d4a24c" />
            <circle cx="60" cy="60" r="1.5" fill="#0b1910" />

            {/* glass dome highlight */}
            <ellipse cx="44" cy="34" rx="20" ry="11" fill="white" opacity="0.05" />
          </svg>
          <span className="absolute inset-x-0 bottom-1 text-center font-mono text-[11px] text-shamrock-lighter/60">
            {percentage}%
          </span>
        </div>
      </div>
    </Card>
  );
}