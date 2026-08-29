
import {
  Sun, CloudSun, CloudRain, CloudLightning, Wallet, ShieldCheck, Server,
  CheckCircle2, Copy, ArrowRight, ArrowUpRight, Activity, RefreshCw,
  Clock, FileText, Layers, Eye, Search, Zap, PlayCircle,
} from 'lucide-react';

export const FILECOIN_NETWORK = 'filecoin-calibration'; // or 'filecoin-mainnet'
export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
export const WEATHER_THRESHOLDS = {
  CLEAR: { maxRunway: Infinity, minProviderHealth: 95, maxUtilization: 60 },
  WATCH: { maxRunway: 14, minProviderHealth: 95, maxUtilization: 60 },
  RAIN: { maxRunway: 10, minProviderHealth: 90, maxUtilization: 70 },
  STORM: { maxRunway: 6, minProviderHealth: 75, maxUtilization: 85 },
  CRITICAL: { maxRunway: 3, minProviderHealth: 50, maxUtilization: 95 },
};

export const FILE_TEMPERATURES = {
  HOT: 'HOT',
  WARM: 'WARM',
  COLD: 'COLD',
};

export const AGENT_ACTION_TYPES = {
  PROTECT: 'PROTECT',
  ARCHIVE: 'ARCHIVE',
  RESTORE: 'RESTORE',
  REBALANCE: 'REBALANCE',
  ALERT: 'ALERT',
  RETRIEVE: 'RETRIEVE',
  VERIFY: 'VERIFY',
};

export const DEFAULT_AGENT_PERMISSIONS = {
  can_monitor_storage: true,
  can_monitor_payments: true,
  can_archive_files: true,
  can_restore_files: true,
  can_retrieve_files: true,
  can_transfer_funds: false,
  can_access_other_wallets: false,
};

export const COLORS = {
  canvas: '#090d0a',
  canvasAlt: '#0c120d',
  surface: '#10160f',
  surfaceRaised: '#141d15',
  border: '#1c271d',
  hairline: '#161f18',
  clear: '#4db372',
  watch: '#86cf9e',
  rain: '#3a7852',
  storm: '#1f472e',
  critical: '#0b1910',
  amber: '#dba14a',
  text: '#eef4ef',
  textMuted: '#8ea394',
  textFaint: '#4c5a51',
};

export const FONT_DISPLAY = "'Space Grotesk', 'Helvetica Neue', sans-serif";
export const FONT_BODY = "'Inter', 'Helvetica Neue', sans-serif";
export const FONT_MONO = "'JetBrains Mono', 'SF Mono', monospace";

export const WEATHER = {
  clear:    { label: 'Clear skies', dot: COLORS.clear,   bg: COLORS.clear,   Icon: Sun,            desc: 'Healthy capacity, healthy runway.' },
  watch:    { label: 'Watch',       dot: COLORS.watch,   bg: COLORS.watch,   Icon: CloudSun,       desc: 'Storage pressure increasing.' },
  rain:     { label: 'Rain',        dot: COLORS.rain,    bg: COLORS.rain,    Icon: CloudRain,      desc: 'Storage and payment pressure building.' },
  storm:    { label: 'Storm',       dot: COLORS.storm,   bg: COLORS.storm,   Icon: CloudLightning, desc: 'Runway critically low.' },
  critical: { label: 'Critical',    dot: COLORS.amber,   bg: COLORS.critical,Icon: CloudLightning, desc: 'Immediate action required.' },
};

export const PIECE_CID = 'bafkzcibckyz2rcpjkkfmzqxvhh2gvpqfxfmxmz2wjjkzzzxkq7y3q2b';


export const PIPELINE = [
  { n: '01', label: 'Observe',  Icon: Eye,          text: 'Reads deadlines, grades, file activity, and live Filecoin payment state.' },
  { n: '02', label: 'Analyze',  Icon: Search,       text: 'Scores every file for urgency, academic weight, and storage cost.' },
  { n: '03', label: 'Protect',  Icon: ShieldCheck,  text: 'Locks anything due within 7 days. Groq cannot override this rule.' },
  { n: '04', label: 'Optimize', Icon: RefreshCw,    text: 'Finds completed, cold, or low-priority files worth archiving.' },
  { n: '05', label: 'Act',      Icon: Zap,          text: 'Executes the smallest real Filecoin-aware action available.' },
  { n: '06', label: 'Verify',   Icon: CheckCircle2, text: 'Re-checks provider health and proof-of-storage after every action.' },
  { n: '07', label: 'Report',   Icon: FileText,     text: 'Explains what changed and why, in plain language.' },
];

export const FORECAST = [
  { day: 'Today', key: 'storm',    epochs: 4  },
  { day: '+1',    key: 'rain',     epochs: 5  },
  { day: '+2',    key: 'rain',     epochs: 6  },
  { day: '+3',    key: 'watch',    epochs: 8  },
  { day: '+4',    key: 'watch',    epochs: 9  },
  { day: '+5',    key: 'clear',    epochs: 12 },
  { day: '+6',    key: 'clear',    epochs: 14 },
];

export const PROOF_ITEMS = [
  { label: 'Copies',    value: '2 / 2',    Icon: Server,      note: 'Independent storage providers' },
  { label: 'PDP',       value: 'Verified', Icon: ShieldCheck, note: 'Last checked 12 epochs ago' },
  { label: 'Retrieval', value: 'Available',Icon: Activity,    note: 'Optimized path for hot files' },
  { label: 'Payment',   value: 'Active',   Icon: Wallet,      note: '$4.82 USDFC balance' },
];

export const STORM_SEQUENCE = [
  { weather: 'clear',    runway: 14, balance: 4.82, spend: 0.34, log: null },
  { weather: 'watch',    runway: 11, balance: 4.10, spend: 0.37, log: { title: 'Storage pressure rising',   detail: 'New uploads detected across 3 courses.' } },
  { weather: 'rain',     runway: 8,  balance: 3.35, spend: 0.42, log: { title: 'Payment runway declining',  detail: 'Spend rate outpacing available balance.' } },
  { weather: 'storm',    runway: 5,  balance: 2.60, spend: 0.52, log: { title: 'Storage storm detected',    detail: 'Runway fell below the safety threshold.' } },
  { weather: 'critical', runway: 4,  balance: 2.10, spend: 0.52, log: { title: 'Critical runway',           detail: '4 epochs remaining. Agent activated.' } },
  { weather: 'critical', runway: 4,  balance: 2.10, spend: 0.52, log: { title: 'Filecoin analysis',         detail: '24 files evaluated · 6 archival candidates found.' } },
  { weather: 'critical', runway: 4,  balance: 2.10, spend: 0.52, log: { title: 'Protected',                 detail: 'Senior_Project_Final.pdf — due in 3 days, held.' } },
  { weather: 'storm',    runway: 6,  balance: 2.45, spend: 0.40, log: { title: 'Archive action',            detail: 'Fall2025_Group_Project.zip archived. Filecoin object retained.' } },
  { weather: 'rain',     runway: 9,  balance: 3.05, spend: 0.33, log: { title: 'Storage verified',          detail: 'Provider state healthy, PDP re-checked.' } },
  { weather: 'watch',    runway: 11, balance: 3.70, spend: 0.30, log: { title: 'Conditions improving',      detail: 'Runway climbing back toward baseline.' } },
  { weather: 'clear',    runway: 14, balance: 4.82, spend: 0.34, log: { title: 'Clear skies restored',      detail: 'Every deadline-critical file protected. Nothing lost.' } },
];

// Estimated Filecoin storage cost (tUSDFC per GB per month)
export const MONTHLY_COST_PER_GB = 0.05;
export const GB_IN_BYTES = 1024 * 1024 * 1024;