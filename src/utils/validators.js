export const isValidFile = (file) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream',
    'image/jpeg',
    'image/png',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.figma',
  ];
  return allowedTypes.includes(file.type) || file.name.endsWith('.fig') || file.name.endsWith('.zip');
};

export const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const isValidPassword = (password) => {
  return password.length >= 8;
};

export const isValidPieceCid = (cid) => {
  // Basic check: starts with 'bafk' or 'Qm' etc.
  return typeof cid === 'string' && (cid.startsWith('bafk') || cid.startsWith('Qm'));
};