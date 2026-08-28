import { getSynapse } from './synapseService';
import { logger } from '../../utils/logger';

export async function createDataSet(name, metadata = {}) {
  try {
    const synapse = getSynapse();
    if (synapse.storage?.createDataSet) {
      const ds = await synapse.storage.createDataSet({ name, metadata });
      return ds.id;
    }
    return `dataset-${Date.now()}`; // fallback
  } catch (err) {
    logger.error('[Filecoin] DataSet creation failed', err);
    throw err;
  }
}

export async function listDataSets() {
  try {
    const synapse = getSynapse();
    if (synapse.storage?.listDataSets) {
      return await synapse.storage.listDataSets();
    }
    return [];
  } catch (err) {
    logger.error('[Filecoin] DataSet list failed', err);
    return [];
  }
}