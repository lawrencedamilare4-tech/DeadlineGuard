const isDev = import.meta.env.DEV;

const log = (level, prefix, message, ...args) => {
  if (!isDev) return;
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] [${prefix}] ${message}`;
  switch (level) {
    case 'info':
      console.info(formattedMessage, ...args);
      break;
    case 'warn':
      console.warn(formattedMessage, ...args);
      break;
    case 'error':
      console.error(formattedMessage, ...args);
      break;
    default:
      console.log(formattedMessage, ...args);
  }
};

export const logger = {
  info: (prefix, message, ...args) => log('info', prefix, message, ...args),
  warn: (prefix, message, ...args) => log('warn', prefix, message, ...args),
  error: (prefix, message, ...args) => log('error', prefix, message, ...args),
  debug: (prefix, message, ...args) => log('debug', prefix, message, ...args),
};