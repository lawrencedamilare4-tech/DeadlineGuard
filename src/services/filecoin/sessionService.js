import { getSynapse } from './synapseService';
import { logger } from '../../utils/logger';

export async function authorizeAgent(permissions) {
  try {
    const synapse = getSynapse();
    if (synapse.session?.create) {
      const session = await synapse.session.create({ permissions });
      return session.token;
    }
    logger.warn('[Filecoin] Session keys not supported, returning mock token');
    return `mock-session-${Date.now()}`;
  } catch (err) {
    logger.error('[Filecoin] Agent authorization failed', err);
    throw err;
  }
}