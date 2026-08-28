import { motion, AnimatePresence } from 'framer-motion';
import { Sun, CloudFog, CloudDrizzle, CloudRain, Zap } from 'lucide-react';
import { WEATHER_STATES } from '../../engines/weatherEngine';

const CONFIG = {
  [WEATHER_STATES.CLEAR]: {
    label: 'Clear Skies',
    Icon: Sun,
    sky: 'from-shamrock-light/15 via-shamrock-darkest to-shamrock-darkest',
    iconColor: 'text-flare',
    ring: 'shadow-[0_0_60px_-8px_rgba(212,162,76,0.45)]',
    spin: true,
  },
  [WEATHER_STATES.WATCH]: {
    label: 'Under Watch',
    Icon: CloudFog,
    sky: 'from-shamrock/15 via-shamrock-darkest to-shamrock-darkest',
    iconColor: 'text-shamrock-light',
    ring: 'shadow-[0_0_60px_-8px_rgba(111,191,140,0.4)]',
  },
  [WEATHER_STATES.RAIN]: {
    label: 'Rain',
    Icon: CloudDrizzle,
    sky: 'from-cyan-900/20 via-shamrock-darkest to-shamrock-darkest',
    iconColor: 'text-cyan-300',
    ring: 'shadow-[0_0_60px_-8px_rgba(103,187,207,0.4)]',
    rain: true,
  },
  [WEATHER_STATES.STORM]: {
    label: 'Storm',
    Icon: CloudRain,
    sky: 'from-orange-900/25 via-shamrock-darkest to-shamrock-darkest',
    iconColor: 'text-orange-400',
    ring: 'shadow-[0_0_65px_-8px_rgba(251,146,60,0.45)]',
    rain: true,
    flicker: true,
  },
  [WEATHER_STATES.CRITICAL]: {
    label: 'Critical',
    Icon: Zap,
    sky: 'from-red-900/30 via-shamrock-darkest to-shamrock-darkest',
    iconColor: 'text-red-400',
    ring: 'shadow-[0_0_70px_-6px_rgba(248,113,113,0.55)]',
    rain: true,
    flicker: true,
  },
};

export function WeatherHero({ weather }) {
  if (!weather) return null;
  const cfg = CONFIG[weather.state] ?? CONFIG[WEATHER_STATES.CLEAR];
  const { Icon } = cfg;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-shamrock-darker/60 bg-gradient-to-br ${cfg.sky} p-8 md:p-10`}
    >
      {/* film grain for realism */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* lightning flicker */}
      <AnimatePresence>
        {cfg.flicker && (
          <motion.div
            className="pointer-events-none absolute inset-0 bg-white/10"
            animate={{ opacity: [0, 0, 0.55, 0, 0.25, 0] }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              repeatDelay: weather.state === WEATHER_STATES.CRITICAL ? 1.4 : 3.6,
              ease: 'easeOut',
            }}
          />
        )}
      </AnimatePresence>

      {/* rain streaks */}
      {cfg.rain && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 26 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute -top-1/4 h-10 w-px bg-cyan-100/20"
              style={{ left: `${(i * 3.9) % 100}%` }}
              animate={{ y: ['0%', '340%'] }}
              transition={{
                duration: 0.9 + (i % 5) * 0.15,
                repeat: Infinity,
                ease: 'linear',
                delay: (i % 7) * 0.18,
              }}
            />
          ))}
        </div>
      )}

      <div className="relative flex items-center justify-between gap-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-shamrock-lighter/60">
            Storage Forecast
          </p>
          <motion.h1
            key={cfg.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-2 font-display text-4xl md:text-5xl font-medium text-white"
          >
            {cfg.label}
          </motion.h1>
          <p className="mt-3 max-w-md text-shamrock-lighter/80">{weather.description}</p>
        </div>

        <motion.div
          className={`relative flex h-24 w-24 md:h-28 md:w-28 shrink-0 items-center justify-center rounded-full border border-white/10 bg-shamrock-darkest/60 ${cfg.ring}`}
          animate={cfg.spin ? { rotate: 360 } : {}}
          transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
        >
          <div className="pointer-events-none absolute inset-1 rounded-full bg-gradient-to-br from-white/[0.06] to-transparent" />
          <Icon className={`h-12 w-12 ${cfg.iconColor}`} strokeWidth={1.5} />
        </motion.div>
      </div>
    </div>
  );
}