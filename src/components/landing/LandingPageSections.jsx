import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Sun, CloudSun, CloudRain, CloudLightning, Wallet, ShieldCheck, Server,
  CheckCircle2, Copy, ArrowRight, ArrowUpRight, Activity, RefreshCw,
  Clock, FileText, Layers, Eye, Search, Zap, PlayCircle,
} from 'lucide-react';
import Navbar from '../layout/Navbar';
import StormSimulation from '../storm/StormSimulation';
import { COLORS, FONT_DISPLAY, FONT_MONO, FONT_BODY, PIECE_CID, PROOF_ITEMS, FORECAST, PIPELINE, WEATHER } from '../../utils/constants';
import { useNavigate } from 'react-router-dom';

const EASE = [0.2, 0.7, 0.2, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

const stagger = (staggerChildren = 0.08, delayChildren = 0) => ({
  hidden: {},
  show: {
    transition: { staggerChildren, delayChildren },
  },
});

const gridItem = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: EASE } },
};

function Reveal({ children, className, style, staggerChildren = 0.08, delayChildren = 0, once = true, amount = 0.2, as = 'div', ...rest }) {
  const MotionTag = motion[as] || motion.div;
  return (
    <MotionTag
      className={className}
      style={style}
      variants={stagger(staggerChildren, delayChildren)}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}

function useAnimatedNumber(target, duration = 700) {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      setDisplay(target);
      fromRef.current = target;
      return;
    }
    const from = fromRef.current;
    const to = target;
    const start = performance.now();
    cancelAnimationFrame(rafRef.current);

    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, reduced]);

  return display;
}

export function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

      .dg-scope { font-family: ${FONT_BODY}; }
      .dg-scope * { box-sizing: border-box; }
      .dg-scope ::selection { background: ${COLORS.clear}; color: ${COLORS.canvas}; }
      .dg-scope :focus-visible { outline: 2px solid ${COLORS.clear}; outline-offset: 2px; border-radius: 2px; }
      .dg-scope a { text-decoration: none; color: inherit; }
      .dg-scope button { font-family: inherit; }

      @keyframes dgFlow { to { stroke-dashoffset: -24; } }
      @keyframes dgBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

      .dg-flow { stroke-dasharray: 4 6; animation: dgFlow 1.4s linear infinite; }
      .dg-caret { animation: dgBlink 1s step-end infinite; }

      .dg-grid-bg {
        background-image:
          linear-gradient(${COLORS.hairline} 1px, transparent 1px),
          linear-gradient(90deg, ${COLORS.hairline} 1px, transparent 1px);
        background-size: 32px 32px;
      }

      .dg-panel-transition { transition: background-color 1s ease; }
      .dg-num-transition { transition: color 0.6s ease; }

      @media (prefers-reduced-motion: reduce) {
        .dg-flow, .dg-caret { animation: none !important; }
        .dg-scope * { transition-duration: 0.01ms !important; }
      }
    `}</style>
  );
}

function Eyebrow({ children }) {
  return (
    <motion.div
      variants={fadeUp}
      className="inline-flex items-center gap-2 text-xs uppercase tracking-widest mb-4"
      style={{ color: COLORS.watch, fontFamily: FONT_MONO, letterSpacing: '0.14em' }}
    >
      <span style={{ width: 14, height: 1, background: COLORS.watch }} />
      {children}
    </motion.div>
  );
}

function WeatherBadge({ weatherKey, pulse }) {
  const w = WEATHER[weatherKey];
  const Icon = w.Icon;
  const reduced = useReducedMotion();
  return (
    <div
      className="inline-flex items-center gap-2.5 pl-2 pr-3.5 py-1.5"
      style={{ background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}` }}
    >
      <motion.span
        animate={pulse && !reduced ? { opacity: [1, 0.35, 1] } : { opacity: 1 }}
        transition={pulse && !reduced ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } : {}}
        style={{ width: 7, height: 7, borderRadius: 999, background: w.dot, boxShadow: `0 0 8px ${w.dot}`, display: 'inline-block' }}
      />
      <Icon size={14} style={{ color: COLORS.text }} strokeWidth={1.75} />
      <AnimatePresence mode="wait">
        <motion.span
          key={w.label}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.25 }}
          className="text-xs uppercase"
          style={{ color: COLORS.text, fontFamily: FONT_MONO, letterSpacing: '0.08em' }}
        >
          {w.label}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function Gauge({ value, max, label, valueLabel, color, size = 132 }) {
  const stroke = 4.5;
  const r = (size - stroke) / 2 - 6;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const sweep = 250;
  const startDeg = -215;
  const pct = Math.max(0, Math.min(1, value / max));
  const arcLen = circumference * (sweep / 360);
  const filled = arcLen * pct;

  const ticks = Array.from({ length: 9 }, (_, i) => {
    const angle = ((startDeg + (i / 8) * sweep) * Math.PI) / 180;
    const x1 = cx + Math.cos(angle) * (r - 3);
    const y1 = cy + Math.sin(angle) * (r - 3);
    const x2 = cx + Math.cos(angle) * (r - 9);
    const y2 = cy + Math.sin(angle) * (r - 9);
    return { x1, y1, x2, y2 };
  });

  return (
    <motion.div
      className="flex flex-col items-center"
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={COLORS.border} strokeWidth={1.5} />
        ))}
        <g transform={`rotate(${startDeg} ${cx} ${cy})`}>
          <circle
            cx={cx} cy={cy} r={r} fill="none" stroke={COLORS.surfaceRaised} strokeWidth={stroke}
            strokeDasharray={`${arcLen} ${circumference - arcLen}`} strokeLinecap="round"
          />
          <motion.circle
            cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke}
            strokeLinecap="round"
            initial={false}
            animate={{ strokeDasharray: `${filled} ${circumference - filled}` }}
            transition={{ duration: 0.6, ease: EASE }}
            style={{ transition: 'stroke 0.6s ease' }}
          />
        </g>
        <text x={cx} y={cy - 4} textAnchor="middle" fill={COLORS.text} fontSize="26" fontFamily={FONT_MONO} fontWeight="500">
          {valueLabel}
        </text>
        <text x={cx} y={cy + 20} textAnchor="middle" fill={COLORS.textMuted} fontSize="10" fontFamily={FONT_MONO} letterSpacing="1.5">
          {label.toUpperCase()}
        </text>
      </svg>
    </motion.div>
  );
}

function CopyHash({ value, display }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      /* clipboard unavailable — ignore */
    }
  };
  return (
    <motion.button
      onClick={handleCopy}
      whileHover={{ y: -1, borderColor: COLORS.clear }}
      whileTap={{ scale: 0.97 }}
      className="inline-flex items-center gap-2 px-2.5 py-1.5 group"
      style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, color: COLORS.text }}
      aria-label="Copy PieceCID"
    >
      <span style={{ fontFamily: FONT_MONO, fontSize: 12.5 }}>{display}</span>
      <Copy size={12} style={{ color: copied ? COLORS.clear : COLORS.textMuted }} />
      <AnimatePresence>
        {copied && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            style={{ fontFamily: FONT_MONO, fontSize: 11, color: COLORS.clear, whiteSpace: 'nowrap', overflow: 'hidden' }}
          >
            Copied
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function SectionLabel({ index, total, title }) {
  return (
    <motion.div
      variants={fadeUp}
      className="flex items-baseline gap-3 mb-3"
    >
      <span style={{ fontFamily: FONT_MONO, color: COLORS.textFaint, fontSize: 12 }}>
        {index} / {total}
      </span>
      <div style={{ height: 1, flex: 1, background: COLORS.hairline }} />
    </motion.div>
  );
}

export function Hero() {
  const navigate = useNavigate();
  return (
    <section id="top" className="relative dg-grid-bg" style={{ background: COLORS.canvas }}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(60% 50% at 50% 0%, rgba(77,179,114,0.10), transparent)` }}
      />
      <div className="relative max-w-6xl mx-auto px-6 md:px-10 pt-20 pb-24 md:pt-28 md:pb-32">
        <motion.div
          className="max-w-3xl"
          variants={stagger(0.1)}
          initial="hidden"
          animate="show"
        >
          <Eyebrow>Filecoin Onchain Cloud · Autonomous Storage Agent</Eyebrow>
          <motion.h1
            variants={fadeUp}
            style={{ fontFamily: FONT_DISPLAY, color: COLORS.text, lineHeight: 1.04, letterSpacing: '-0.02em' }}
            className="text-[42px] md:text-[64px] font-semibold"
          >
            Your assignments
            <br />
            have deadlines.
            <br />
            <span style={{ color: COLORS.clear }}>Your storage does too.</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-6 text-base md:text-lg max-w-xl" style={{ color: COLORS.textMuted }}>
            DeadlineGuard watches deadlines, storage health, and Filecoin payment runway together —
            and moves before a storm becomes a missed submission.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-9 flex flex-wrap items-center gap-4">
            <motion.button
              onClick={() => navigate('/login')}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold"
              style={{ background: COLORS.clear, color: COLORS.canvas }}
            >
              <Wallet size={16} />
              Connect wallet
            </motion.button>
            <motion.a
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              href="#simulate"
              className="inline-flex items-center gap-2 px-5 py-3 text-sm"
              style={{ border: `1px solid ${COLORS.border}`, color: COLORS.text }}
            >
              Watch a storm roll in
              <ArrowRight size={15} />
            </motion.a>
          </motion.div>
        </motion.div>

        <Reveal
          className="mt-16 md:mt-20 grid grid-cols-2 md:grid-cols-4 gap-px"
          style={{ background: COLORS.hairline, border: `1px solid ${COLORS.hairline}` }}
          staggerChildren={0.1}
          delayChildren={0.15}
        >
          <motion.div variants={gridItem} className="p-6 flex flex-col items-center justify-center" style={{ background: COLORS.canvasAlt }}>
            <Gauge value={14} max={14} label="Runway" valueLabel="14" color={COLORS.clear} size={112} />
          </motion.div>
          <motion.div variants={gridItem} className="p-6 flex flex-col items-center justify-center" style={{ background: COLORS.canvasAlt }}>
            <Gauge value={4.82} max={6} label="USDFC" valueLabel="$4.82" color={COLORS.clear} size={112} />
          </motion.div>
          <motion.div variants={gridItem} className="p-6 flex flex-col items-center justify-center gap-2" style={{ background: COLORS.canvasAlt }}>
            <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: COLORS.textFaint }}>PROVIDERS</span>
            <span style={{ fontFamily: FONT_MONO, fontSize: 26, color: COLORS.text }}>2 / 2</span>
            <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: COLORS.clear }}>healthy</span>
          </motion.div>
          <motion.div variants={gridItem} className="p-6 flex flex-col items-center justify-center gap-2" style={{ background: COLORS.canvasAlt }}>
            <WeatherBadge weatherKey="clear" pulse />
            <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: COLORS.textFaint }}>Station · updated now</span>
          </motion.div>
        </Reveal>
      </div>
    </section>
  );
}

export function ProofSection() {
  return (
    <section id="proof" className="py-24 md:py-32" style={{ background: COLORS.canvasAlt }}>
      <div className="max-w-6xl mx-auto px-6 md:px-10">
        <Reveal>
          <SectionLabel index="02" total="07" title="Proof" />
        </Reveal>
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-start">
          <Reveal>
            <motion.h2
              variants={fadeUp}
              style={{ fontFamily: FONT_DISPLAY, color: COLORS.text, letterSpacing: '-0.01em' }}
              className="text-3xl md:text-[40px] font-semibold leading-tight"
            >
              Storage that can prove
              <br />
              it&apos;s still there.
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-5 max-w-md" style={{ color: COLORS.textMuted }}>
              Every file gets a PieceCID, replicated across independent storage providers on
              Filecoin, and checked with proof-of-data-possession. Not a promise — a receipt.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8">
              <span className="block text-xs uppercase mb-2" style={{ color: COLORS.textFaint, fontFamily: FONT_MONO, letterSpacing: '0.1em' }}>
                Senior_Project_Final.pdf
              </span>
              <CopyHash value={PIECE_CID} display={`${PIECE_CID.slice(0, 18)}…`} />
            </motion.div>
          </Reveal>

          <Reveal className="grid grid-cols-2 gap-px" style={{ background: COLORS.hairline, border: `1px solid ${COLORS.hairline}` }} staggerChildren={0.08}>
            {PROOF_ITEMS.map((item) => {
              const Icon = item.Icon;
              return (
                <motion.div variants={gridItem} key={item.label} className="p-6" style={{ background: COLORS.canvasAlt }}>
                  <Icon size={17} style={{ color: COLORS.clear }} strokeWidth={1.75} />
                  <div className="mt-4 text-xl" style={{ fontFamily: FONT_MONO, color: COLORS.text }}>
                    {item.value}
                  </div>
                  <div className="mt-1 text-xs uppercase" style={{ color: COLORS.textFaint, fontFamily: FONT_MONO, letterSpacing: '0.08em' }}>
                    {item.label}
                  </div>
                  <div className="mt-2 text-xs" style={{ color: COLORS.textMuted }}>
                    {item.note}
                  </div>
                </motion.div>
              );
            })}
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export function PipelineSection() {
  return (
    <section id="pipeline" className="py-24 md:py-32" style={{ background: COLORS.canvas }}>
      <div className="max-w-6xl mx-auto px-6 md:px-10">
        <Reveal>
          <SectionLabel index="03" total="07" title="Pipeline" />
        </Reveal>
        <Reveal className="max-w-2xl">
          <motion.h2 variants={fadeUp} style={{ fontFamily: FONT_DISPLAY, color: COLORS.text }} className="text-3xl md:text-[40px] font-semibold leading-tight">
            One agent. Seven steps. Every time.
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-5" style={{ color: COLORS.textMuted }}>
            DeadlineGuard runs the same deterministic cycle on every file — no improvisation,
            no silent deletions, nothing Groq can override.
          </motion.p>
        </Reveal>

        <Reveal
          className="mt-14 grid md:grid-cols-7 gap-px"
          style={{ background: COLORS.hairline, border: `1px solid ${COLORS.hairline}` }}
          staggerChildren={0.06}
        >
          {PIPELINE.map((step) => {
            const Icon = step.Icon;
            return (
              <motion.div
                variants={gridItem}
                whileHover={{ y: -3 }}
                key={step.n}
                className="p-5 flex flex-col gap-4"
                style={{ background: COLORS.surface, minHeight: 190 }}
              >
                <div className="flex items-center justify-between">
                  <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: COLORS.textFaint }}>{step.n}</span>
                  <Icon size={16} style={{ color: COLORS.clear }} strokeWidth={1.75} />
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: COLORS.text, fontFamily: FONT_DISPLAY }}>
                    {step.label}
                  </div>
                  <div className="mt-2 text-xs leading-relaxed" style={{ color: COLORS.textMuted }}>
                    {step.text}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}

export function ProviderDiagram() {
  return (
    <section className="py-24 md:py-32" style={{ background: COLORS.canvasAlt }}>
      <div className="max-w-6xl mx-auto px-6 md:px-10">
        <Reveal>
          <SectionLabel index="04" total="07" title="Replication" />
        </Reveal>
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            className="order-2 md:order-1"
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <svg viewBox="0 0 420 260" className="w-full h-auto" role="img" aria-label="File replicated through PieceCID to two storage providers, verified by proof of data possession">
              <line x1="210" y1="30" x2="210" y2="80" stroke={COLORS.border} strokeWidth="1.5" />
              <line x1="210" y1="80" x2="110" y2="140" stroke={COLORS.border} strokeWidth="1.5" className="dg-flow" />
              <line x1="210" y1="80" x2="310" y2="140" stroke={COLORS.border} strokeWidth="1.5" className="dg-flow" />
              <line x1="110" y1="160" x2="180" y2="210" stroke={COLORS.border} strokeWidth="1.5" />
              <line x1="310" y1="160" x2="240" y2="210" stroke={COLORS.border} strokeWidth="1.5" />

              <g transform="translate(184,4)">
                <rect width="52" height="26" fill={COLORS.surface} stroke={COLORS.border} />
                <text x="26" y="17" textAnchor="middle" fontFamily={FONT_MONO} fontSize="9" fill={COLORS.text}>FILE</text>
              </g>
              <g transform="translate(160,84)">
                <rect width="100" height="30" fill={COLORS.surfaceRaised} stroke={COLORS.clear} />
                <text x="50" y="19" textAnchor="middle" fontFamily={FONT_MONO} fontSize="9" fill={COLORS.clear}>PieceCID</text>
              </g>
              <g transform="translate(60,140)">
                <rect width="100" height="30" fill={COLORS.surface} stroke={COLORS.border} />
                <text x="50" y="19" textAnchor="middle" fontFamily={FONT_MONO} fontSize="9" fill={COLORS.text}>PROVIDER A</text>
              </g>
              <g transform="translate(260,140)">
                <rect width="100" height="30" fill={COLORS.surface} stroke={COLORS.border} />
                <text x="50" y="19" textAnchor="middle" fontFamily={FONT_MONO} fontSize="9" fill={COLORS.text}>PROVIDER B</text>
              </g>
              <g transform="translate(150,210)">
                <rect width="120" height="30" fill={COLORS.critical} stroke={COLORS.clear} />
                <text x="60" y="19" textAnchor="middle" fontFamily={FONT_MONO} fontSize="9" fill={COLORS.clear}>PDP VERIFIED</text>
              </g>
            </svg>
          </motion.div>
          <Reveal className="order-1 md:order-2">
            <motion.h2 variants={fadeUp} style={{ fontFamily: FONT_DISPLAY, color: COLORS.text }} className="text-3xl md:text-[40px] font-semibold leading-tight">
              Two providers.
              <br />
              One PieceCID.
              <br />
              Zero single points of failure.
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-5 max-w-md" style={{ color: COLORS.textMuted }}>
              DeadlineGuard organizes files into Filecoin data sets by course and semester, and
              keeps academically important work replicated across independently operated
              storage providers — verified, not assumed.
            </motion.p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export function ForecastSection() {
  return (
    <section id="forecast" className="py-24 md:py-32" style={{ background: COLORS.canvas }}>
      <div className="max-w-6xl mx-auto px-6 md:px-10">
        <Reveal>
          <SectionLabel index="06" total="07" title="Forecast" />
        </Reveal>
        <Reveal className="flex items-end justify-between flex-wrap gap-4 mb-10">
          <motion.h2 variants={fadeUp} style={{ fontFamily: FONT_DISPLAY, color: COLORS.text }} className="text-3xl md:text-[40px] font-semibold leading-tight">
            Seven days out, not just right now.
          </motion.h2>
          <motion.p variants={fadeUp} className="max-w-xs text-sm" style={{ color: COLORS.textMuted }}>
            The forecast blends payment runway, upload trends, and upcoming deadlines
            into a single read on where storage is headed.
          </motion.p>
        </Reveal>

        <Reveal className="grid grid-cols-4 md:grid-cols-7 gap-px" style={{ background: COLORS.hairline, border: `1px solid ${COLORS.hairline}` }} staggerChildren={0.06}>
          {FORECAST.map((f) => {
            const w = WEATHER[f.key];
            const Icon = w.Icon;
            return (
              <motion.div variants={gridItem} key={f.day} className="p-5 flex flex-col items-center gap-3" style={{ background: COLORS.surface }}>
                <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: COLORS.textFaint }}>{f.day}</span>
                <Icon size={20} style={{ color: COLORS.text }} strokeWidth={1.5} />
                <span style={{ fontFamily: FONT_MONO, fontSize: 18, color: COLORS.text }}>{f.epochs}</span>
                <span style={{ width: 18, height: 2, background: w.dot }} />
              </motion.div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}

export function FinalCTA() {
  const stats = [
    { label: 'Files lost to storage pressure', value: '0' },
    { label: 'Providers holding protected work', value: '2 / 2' },
    { label: 'PDP verification', value: 'Continuous' },
  ];
  return (
    <section className="py-24 md:py-32" style={{ background: COLORS.canvasAlt }}>
      <div className="max-w-6xl mx-auto px-6 md:px-10">
        <Reveal>
          <SectionLabel index="07" total="07" title="Start" />
        </Reveal>
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <Reveal>
            <motion.h2
              variants={fadeUp}
              style={{ fontFamily: FONT_DISPLAY, color: COLORS.text, letterSpacing: '-0.01em' }}
              className="text-3xl md:text-[44px] font-semibold leading-tight"
            >
              Your assignments have deadlines.
              <br />
              <span style={{ color: COLORS.clear }}>Your storage does too.</span>
            </motion.h2>
            <motion.div variants={fadeUp} className="mt-9 flex flex-wrap gap-4">
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold"
                style={{ background: COLORS.clear, color: COLORS.canvas }}
              >
                <Wallet size={16} />
                Launch DeadlineGuard
              </motion.button>
              <motion.a
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                href="#proof"
                className="inline-flex items-center gap-2 px-5 py-3 text-sm"
                style={{ border: `1px solid ${COLORS.border}`, color: COLORS.text }}
              >
                See the proof
                <ArrowRight size={15} />
              </motion.a>
            </motion.div>
          </Reveal>
          <Reveal className="grid grid-cols-1 gap-px" style={{ background: COLORS.hairline, border: `1px solid ${COLORS.hairline}` }} staggerChildren={0.1}>
            {stats.map((s) => (
              <motion.div variants={gridItem} key={s.label} className="p-6 flex items-center justify-between" style={{ background: COLORS.canvasAlt }}>
                <span className="text-sm" style={{ color: COLORS.textMuted }}>{s.label}</span>
                <span style={{ fontFamily: FONT_MONO, fontSize: 20, color: COLORS.clear }}>{s.value}</span>
              </motion.div>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  const cols = [
    { title: 'Product', links: ['Dashboard', 'Agent', 'Pricing'] },
    { title: 'Filecoin', links: ['Synapse SDK', 'Storage providers', 'Payments'] },
    { title: 'Resources', links: ['Docs', 'Changelog', 'GitHub'] },
  ];
  return (
    <footer style={{ background: COLORS.canvas, borderTop: `1px solid ${COLORS.hairline}` }}>
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-16">
        <div className="grid md:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <span style={{ width: 8, height: 8, background: COLORS.clear }} />
              <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, color: COLORS.text }} className="text-sm">
                DEADLINEGUARD
              </span>
            </div>
            <p className="text-xs max-w-[220px]" style={{ color: COLORS.textFaint }}>
              Storage powered by Filecoin Onchain Cloud via the Synapse SDK.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <div className="text-xs uppercase mb-4" style={{ color: COLORS.textFaint, fontFamily: FONT_MONO, letterSpacing: '0.08em' }}>
                {c.title}
              </div>
              <div className="flex flex-col gap-2.5">
                {c.links.map((l) => (
                  <a key={l} href="#" className="text-sm flex items-center gap-1 group" style={{ color: COLORS.textMuted }}>
                    {l}
                    <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100" />
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-14 pt-6 flex flex-wrap items-center justify-between gap-3" style={{ borderTop: `1px solid ${COLORS.hairline}` }}>
          <span className="text-xs" style={{ color: COLORS.textFaint }}>Built for the Filecoin hackathon.</span>
          <span className="text-xs" style={{ color: COLORS.textFaint, fontFamily: FONT_MONO }}>© 2026 DeadlineGuard</span>
        </div>
      </div>
    </footer>
  );
}

export function LandingStorm() {
  return (
    <section className="max-w-5xl mx-auto px-4 py-16">
      <StormSimulation />
    </section>
  );
}
