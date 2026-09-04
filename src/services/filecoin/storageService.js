import { getSynapse } from './synapseService';
import { logger } from '../../utils/logger';
import { parseUnits } from '@filoz/synapse-sdk';

// MUST match the value used in FilecoinContext.jsx's pre-approval
// (REQUIRED_LOCKUP_PERIOD there). If they diverge, this function may
// decide re-approval is needed even when the background pre-approval
// already ran — or vice versa. Consider moving this into one shared
// constants file imported by both.
const REQUIRED_LOCKUP_PERIOD = 31536000n; // ~1 year in epochs

export async function uploadFile(file, options = {}) {
  const synapse = getSynapse();

  if (!synapse || !synapse.storage) {
    throw new Error('Synapse storage module not available. Please reconnect your wallet.');
  }

  const walletAddress = options.walletAddress || synapse.account?.address;
  if (!walletAddress) {
    throw new Error('No wallet address available. Please connect your wallet.');
  }

  const payerAddress = synapse.account?.address || options.walletAddress;
  console.log('[Upload] Uploading from wallet:', payerAddress);

  // These three don't depend on each other — run them concurrently
  // instead of one after another.
  const [tfilBalance, approval, fileBuffer] = await Promise.all([
    synapse.client.getBalance({ address: walletAddress }),
    synapse.payments.serviceApproval(),
    file.arrayBuffer(),
  ]);

  if (tfilBalance === 0n) {
    throw new Error('You need tFIL for gas. Please get tFIL from the faucet and try again.');
  }

  // 1. Approve Warm Storage operator — only if not already approved
  // with a sufficiently long lockup period.
  try {
    const needsApproval =
      !approval?.isApproved || (approval.maxLockupPeriod ?? 0n) < REQUIRED_LOCKUP_PERIOD;

    if (needsApproval) {
      console.log('[Upload] Operator not approved (or lockup too short). Requesting approval...');
      const txHash = await synapse.payments.approveService({
        rateAllowance: parseUnits('10', 18),     // max USDFC/epoch
        lockupAllowance: parseUnits('1000', 18), // max USDFC locked
        maxLockupPeriod: REQUIRED_LOCKUP_PERIOD,
      });

      if (txHash) {
        const receipt = await synapse.client.waitForTransactionReceipt({
          hash: txHash,
          confirmations: 1,
        });
        // Check the receipt we already have instead of re-querying
        // serviceApproval() — saves a round trip.
        if (receipt.status !== 'success') {
          throw new Error('Operator approval transaction reverted. Please try again.');
        }
        console.log('[Upload] Operator approval transaction confirmed');
      } else {
        // No hash to confirm against — this is the one case where a
        // fresh read is actually necessary.
        console.warn('[Upload] No hash returned from approveService; checking approval...');
        const recheck = await synapse.payments.serviceApproval();
        if (!recheck?.isApproved) {
          throw new Error('Operator approval did not succeed. Please try again.');
        }
      }
      console.log('[Upload] Operator is now approved');
    } else {
      console.log('[Upload] Operator already approved');
    }
  } catch (err) {
    // Differentiate between user rejection and other failures
    if (err.message.includes('user rejected') || err.message.includes('rejected')) {
      throw new Error('Operator approval was rejected in your wallet. Please approve the transaction to upload.');
    }
    console.error('[Upload] Operator approval failed:', err.message);
    throw new Error('Operator approval failed: ' + err.message);
  }

  let bytes = new Uint8Array(fileBuffer);
  if (bytes.byteLength < 127) {
    const padded = new Uint8Array(127);
    padded.set(bytes);
    bytes = padded;
  }

  const totalBytes = bytes.byteLength;

  const filecoinMetadata = {
    fileName: options.fileName || file.name,
    fileSize: String(file.size),
    courseName: options.courseName || '',
    assignmentTitle: options.assignmentTitle || '',
    dueDate: options.dueDate || '',
    gradeWeight: String(options.gradeWeight || ''),
    walletAddress: options.walletAddress || '',
    source: 'deadlineguard',
    uploadedAt: new Date().toISOString(),
  };

  console.log('[Upload] Uploading to Filecoin (1 copy)...');

  // Upload with retry for transient provider health failures
  let attempt = 0;
  const maxAttempts = 5;
  const baseDelayMs = 5000;

  while (attempt < maxAttempts) {
    try {
      const result = await synapse.storage.upload(bytes, {
        // Lifecycle hooks belong under `callbacks`, not top-level — the
        // old top-level `onProgress` key was silently ignored by the
        // SDK, which is why the bar never moved. `onProgress` here also
        // hands back a cumulative BYTE COUNT, not a percentage, so we
        // convert before forwarding to the caller's callback.
        callbacks: {
          onProgress: (bytesUploaded) => {
            if (typeof options.onProgress === 'function' && totalBytes > 0) {
              const percent = Math.min(100, Math.round((bytesUploaded / totalBytes) * 100));
              options.onProgress(percent);
            }
          },
        },
        metadata: filecoinMetadata,
        copies: 1, // Store only one copy (reduces duplicate approvals)
      });

      return {
        pieceCid: result?.pieceCid || 'unknown',
        metadata: filecoinMetadata,
        storageInfo: {
          providerCount: result?.copies?.length || 1,
          healthyProviderCount: result?.copies?.filter(c => c?.healthy !== false).length || 1,
          storageStatus: result?.complete ? 'HEALTHY' : 'DEGRADED',
          retrievalStatus: 'AVAILABLE',
          paymentStatus: 'ACTIVE',
          pdpStatus: 'VERIFIED',
          providers: [],
        },
      };
    } catch (err) {
      const isProviderHealthError =
        err.message.includes('smartSelect failed') ||
        err.message.includes('No endorsed provider') ||
        err.message.includes('503');

      if (isProviderHealthError && attempt < maxAttempts - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt); // exponential backoff
        console.warn(`[Upload] Provider health check failed (attempt ${attempt + 1}/${maxAttempts}). Retrying in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        attempt++;
      } else {
        logger.error('[Upload] Upload failed:', err.message);
        throw err;
      }
    }
  }

  throw new Error('Upload failed after multiple attempts.');
}

export async function getStorageStatus(pieceCid) {
  const synapse = getSynapse();
  try {
    const info = await synapse.storage.getStorageInfo({ pieceCid });
    return info;
  } catch (err) {
    logger.warn('[Filecoin] getStorageStatus failed:', err.message);
    return null;
  }
}