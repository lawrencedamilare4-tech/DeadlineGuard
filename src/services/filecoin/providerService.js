import { getSynapse } from './synapseService';
import { logger } from '../../utils/logger';

export async function getProvidersForPiece(pieceCid) {
  try {
    const synapse = getSynapse();
    // Use the storage info method if available
    const info = await synapse.storage.info?.({ pieceCid });
    if (info?.copies) {
      return info.copies.map(c => ({
        providerId: c.providerId,
        name: c.providerName,
        location: c.location,
        status: 'active',
        health: c.healthy !== false ? 'healthy' : 'degraded',
      }));
    }
    return [];
  } catch (err) {
    logger.warn('[Filecoin] Provider list failed', err);
    return [];
  }
}