import { getSynapse } from './synapseService';
import { logger } from '../../utils/logger';

export async function retrieveFile(pieceCid, options = {}) {
  const synapse = getSynapse();
  const storageManager = synapse.storage;
  
  if (!storageManager) {
    throw new Error('Storage manager not available');
  }

  const bytes = await storageManager.download({ pieceCid, onProgress: options.onProgress });
  const blob = new Blob([bytes], { type: 'application/octet-stream' });
  
  return { blob, simulated: false };
}