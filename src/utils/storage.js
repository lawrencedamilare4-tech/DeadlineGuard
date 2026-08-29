import { MONTHLY_COST_PER_GB, GB_IN_BYTES } from './constants';

/**
 * Estimate how many bytes the available USDFC balance can support for one month.
 * @param {number} availableBalance - available USDFC (not locked)
 * @returns {number} estimated capacity in bytes
 */
export function estimateStorageCapacity(availableBalance) {
  if (!availableBalance || availableBalance <= 0) return 0;
  const capacityInGB = availableBalance / MONTHLY_COST_PER_GB;
  return capacityInGB * GB_IN_BYTES;
}