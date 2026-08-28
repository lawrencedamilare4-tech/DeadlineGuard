export const formatBytes = (bytes, decimals = 2) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const formatDate = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatTime = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatRelativeTime = (dateString) => {
  if (!dateString) return '—';
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
};

export const formatBalance = (balance, decimals = 2) => {
  return `$${Number(balance).toFixed(decimals)} USDFC`;
};

export const formatRunway = (runway) => {
  if (runway === Infinity || runway === null) return '∞';
  return `${Math.round(runway)} epochs`;
};

export const truncate = (str, start = 10, end = 8) => {
  if (!str) return '';
  if (str.length <= start + end) return str;
  return `${str.substring(0, start)}...${str.substring(str.length - end)}`;
};