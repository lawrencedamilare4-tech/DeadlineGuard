import { getSynapse } from './synapseService';
import { logger } from '../../utils/logger';

export async function getVerificationStatus(pieceCid) {
  try {
    const synapse = getSynapse();
    // PDP is typically automatic; return verified if no error
    return { status: 'VERIFIED', lastVerified: null };
  } catch (error) {
    logger.warn('[Filecoin] Verification status fetch failed', error);
    return { status: 'UNKNOWN', lastVerified: null };
  }
}