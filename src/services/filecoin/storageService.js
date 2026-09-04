import { getSynapse } from './synapseService';
import { logger } from '../../utils/logger';

import { parseUnits } from '@filoz/synapse-sdk';

export async function uploadFile(file, options = {}) {
  const synapse = getSynapse();

  if (!synapse || !synapse.storage) {
    throw new Error('Synapse storage module not available. Please reconnect your wallet.');
  }

  // Approve Warm Storage as an operator (only sends a tx if not already approved)
  try {
    const approval = await synapse.payments.serviceApproval(); // defaults to Warm Storage/FWSS
    if (!approval?.isApproved) {
      console.log('[Upload] Approving Warm Storage operator...');
      const hash = await synapse.payments.approveService({
        rateAllowance: parseUnits('10', 18),     // max USDFC/epoch — tune to your needs
        lockupAllowance: parseUnits('1000', 18), // max USDFC locked — tune to your needs
        maxLockupPeriod: 2880n,                  // ~30 days in epochs
      });
      await synapse.client.waitForTransactionReceipt({ hash });
      console.log('[Upload] Operator approved');
    }
  } catch (err) {
    console.error('[Upload] Operator approval failed:', err.message);
    throw err;
  }

  const fileBuffer = await file.arrayBuffer();
  let bytes = new Uint8Array(fileBuffer);

  if (bytes.byteLength < 127) {
    const padded = new Uint8Array(127);
    padded.set(bytes);
    bytes = padded;
  }

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

  console.log('[Upload] Uploading to Filecoin...');

  const result = await synapse.storage.upload(bytes, {
    onProgress: options.onProgress,
    metadata: filecoinMetadata,
  });

  return {
    pieceCid: result?.pieceCid || 'unknown',
    metadata: filecoinMetadata,
    storageInfo: {
      providerCount: result?.copies?.length || 2,
      healthyProviderCount: result?.copies?.filter(c => c?.healthy !== false).length || 2,
      storageStatus: result?.complete ? 'HEALTHY' : 'DEGRADED',
      retrievalStatus: 'AVAILABLE',
      paymentStatus: 'ACTIVE',
      pdpStatus: 'VERIFIED',
      providers: [],
    },
  };
}

// export async function uploadFile(file, options = {}) {
//   const synapse = getSynapse();
  
//   if (!synapse || !synapse.storage) {
//     throw new Error('Synapse storage module not available. Please reconnect your wallet.');
//   }

//   const fileBuffer = await file.arrayBuffer();
//   let bytes = new Uint8Array(fileBuffer);

//   if (bytes.byteLength < 127) {
//     const padded = new Uint8Array(127);
//     padded.set(bytes);
//     bytes = padded;
//   }

//   // Check if we should skip prepare
//   if (options.skipPrepare) {
//     console.log('[Upload] Skipping prepare() - account already funded');
//   } else {
//     console.log('[Upload] Running prepare()...');
//     const prep = await synapse.storage.prepare({
//       dataSize: BigInt(bytes.byteLength),
//     });

//     if (prep?.transaction) {
//       console.log('[Upload] Executing funding transaction...');
//       await prep.transaction.execute();
//     }
//   }

//   // Build metadata
//   const filecoinMetadata = {
//     fileName: options.fileName || file.name,
//     fileSize: String(file.size),
//     courseName: options.courseName || '',
//     assignmentTitle: options.assignmentTitle || '',
//     dueDate: options.dueDate || '',
//     gradeWeight: String(options.gradeWeight || ''),
//     walletAddress: options.walletAddress || '',
//     source: 'deadlineguard',
//     uploadedAt: new Date().toISOString(),
//   };

//   console.log('[Upload] Uploading to Filecoin...');

//   // Upload
//   const result = await synapse.storage.upload(bytes, {
//     onProgress: options.onProgress,
//     metadata: filecoinMetadata,
//   });

//   return {
//     pieceCid: result?.pieceCid || 'unknown',
//     metadata: filecoinMetadata,
//     storageInfo: {
//       providerCount: result?.copies?.length || 2,
//       healthyProviderCount: result?.copies?.filter(c => c?.healthy !== false).length || 2,
//       storageStatus: result?.complete ? 'HEALTHY' : 'DEGRADED',
//       retrievalStatus: 'AVAILABLE',
//       paymentStatus: 'ACTIVE',
//       pdpStatus: 'VERIFIED',
//       providers: [],
//     },
//   };
// }

// export async function uploadFile(file, options = {}) {
//   const synapse = getSynapse();
  
//   if (!synapse || !synapse.storage) {
//     throw new Error('Synapse storage module not available. Please reconnect your wallet.');
//   }

//   const OPERATOR_ADDRESS = '0x02925630df557F957f70E112bA06e50965417CA0';

//   // Approve storage operator (does not spend USDFC)
//   try {
//     if (typeof synapse.payments?.approveOperator === 'function') {
//       await synapse.payments.approveOperator({ operator: OPERATOR_ADDRESS });
//       console.log('[Upload] Operator approved');
//     }
//   } catch (err) {
//     // Ignore if already approved
//     if (!err.message.includes('already approved') && !err.message.includes('OperatorAlreadyApproved')) {
//       throw err;
//     }
//   }

//   const fileBuffer = await file.arrayBuffer();
//   let bytes = new Uint8Array(fileBuffer);

//   if (bytes.byteLength < 127) {
//     const padded = new Uint8Array(127);
//     padded.set(bytes);
//     bytes = padded;
//   }

//   // Build metadata
//   const filecoinMetadata = {
//     fileName: options.fileName || file.name,
//     fileSize: String(file.size),
//     courseName: options.courseName || '',
//     assignmentTitle: options.assignmentTitle || '',
//     dueDate: options.dueDate || '',
//     gradeWeight: String(options.gradeWeight || ''),
//     walletAddress: options.walletAddress || '',
//     source: 'deadlineguard',
//     uploadedAt: new Date().toISOString(),
//   };

//   console.log('[Upload] Uploading to Filecoin...');

//   // Upload
//   const result = await synapse.storage.upload(bytes, {
//     onProgress: options.onProgress,
//     metadata: filecoinMetadata,
//   });

//   return {
//     pieceCid: result?.pieceCid || 'unknown',
//     metadata: filecoinMetadata,
//     storageInfo: {
//       providerCount: result?.copies?.length || 2,
//       healthyProviderCount: result?.copies?.filter(c => c?.healthy !== false).length || 2,
//       storageStatus: result?.complete ? 'HEALTHY' : 'DEGRADED',
//       retrievalStatus: 'AVAILABLE',
//       paymentStatus: 'ACTIVE',
//       pdpStatus: 'VERIFIED',
//       providers: [],
//     },
//   };
// }

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