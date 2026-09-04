import { Synapse } from '@filoz/synapse-sdk';
import { calibration } from '@filoz/synapse-core/chains';
import { custom } from 'viem';
import 'viem/window';
import { logger } from '../../utils/logger';

let synapseInstance = null;
let walletAddress = null;

const GLIF_RPC = 'https://api.calibration.node.glif.io/rpc/v1';

// Helper to add timeout to any promise
const withTimeout = (promise, ms, errorMessage) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), ms)
    ),
  ]);

// Switch/add Filecoin Calibration network in MetaMask
export async function switchToFilecoinCalibration() {
  if (!window.ethereum) throw new Error('No Ethereum provider found');

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x4CB2F' }],
    });
  } catch (switchError) {
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x4CB2F',
          chainName: 'Filecoin Calibration',
          nativeCurrency: {
            name: 'tFIL',
            symbol: 'tFIL',
            decimals: 18,
          },
          rpcUrls: [GLIF_RPC],
          blockExplorerUrls: ['https://calibration.filscan.io'],
        }],
      });
    } else {
      throw switchError;
    }
  }
}

/**
 * Initialize Synapse with the given wallet address.
 *
 * Reads AND writes are routed through `transport: custom(window.ethereum)`,
 * so every RPC call (including signing and sending transactions) goes
 * straight through the injected wallet's own request() method — no HTTP
 * round-trip to a public RPC node, and no need to intercept/redirect
 * anything after the fact.
 *
 * @param {string} address - Optional wallet address. If omitted, request from provider.
 * @param {object} options - Optional config. (Reserved for future use —
 *   a viem/wagmi walletClient is no longer needed here now that Synapse
 *   talks to window.ethereum directly via `transport`.)
 * @returns {Promise<Synapse>}
 */
export async function initializeSynapse(address, options = {}) {
  console.log('[Filecoin] initializeSynapse started');

  // Already initialized for this exact account — skip re-creating the
  // Synapse instance (and losing its cached storage context) on effect
  // re-runs that don't actually represent a new wallet connection.
  if (synapseInstance && walletAddress === address) {
    console.log('[Filecoin] Synapse already initialized for this account, reusing');
    return synapseInstance;
  }

  if (!window.ethereum) {
    throw new Error('No wallet detected. Please install MetaMask or use WalletConnect.');
  }

  try {
    // 1. Get account
    let account = address;
    if (!account) {
      const [ethAddress] = await window.ethereum.request({ method: 'eth_requestAccounts' });
      account = ethAddress;
    }
    walletAddress = account;
    console.log('[Filecoin] Account:', account);

    // 2. Create Synapse with a timeout — transport talks to the injected
    // wallet directly, so this single call handles reads, signing, and
    // sending transactions with no extra client plumbing.
    console.log('[Filecoin] Creating Synapse...');
    const synapse = await withTimeout(
      Synapse.create({
        account,
        transport: custom(window.ethereum),
        chain: calibration,
        source: 'deadlineguard',
      }),
      20000, // 20 seconds
      'Synapse initialization timed out'
    );
    console.log('[Filecoin] Synapse created successfully');
    console.log('[Filecoin] Has storage:', !!synapse.storage);

    synapseInstance = synapse;
    logger.info('[Filecoin] Synapse initialized');
    return synapse;
  } catch (error) {
    logger.error('[Filecoin] Synapse init failed:', error.message);
    throw error;
  }
}

export function getSynapse() {
  if (!synapseInstance) {
    throw new Error('Synapse not initialized');
  }
  return synapseInstance;
}

export function getWalletAddress() {
  return walletAddress;
}

export function setWalletAddress(address) {
  walletAddress = address;
}