import { Synapse } from '@filoz/synapse-sdk';
import { calibration } from '@filoz/synapse-core/chains';
import { createWalletClient, custom, http } from 'viem';
import 'viem/window';
import { logger } from '../../utils/logger';

let synapseInstance = null;
let walletAddress = null;

const GLIF_RPC = 'https://api.calibration.node.glif.io/rpc/v1';

// Intercept fetch ONLY for Filecoin RPC calls
function patchWalletRPC() {
  const originalFetch = window.fetch;
  
  window.fetch = async (url, options) => {
    const urlStr = typeof url === 'string' ? url : url?.url || '';
    
    // ONLY intercept Filecoin RPC calls, NOT Supabase
    const isFilecoinRPC = 
      urlStr.includes('drpc.org') ||
      urlStr.includes('glif.io') ||
      urlStr.includes('filecoin') ||
      urlStr.includes('calibration');
    
    if (isFilecoinRPC && options?.body && typeof options.body === 'string') {
      try {
        const body = JSON.parse(options.body);
        
        // Intercept eth_signTypedData_v4
        if (body.method === 'eth_signTypedData_v4') {
          console.log('[Filecoin] Intercepting eth_signTypedData_v4 → MetaMask');
          
          const [address, typedData] = body.params;
          
          const signature = await window.ethereum.request({
            method: 'eth_signTypedData_v4',
            params: [address, typedData],
          });
          
          return new Response(JSON.stringify({
            jsonrpc: '2.0',
            id: body.id,
            result: signature,
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        
        // Intercept eth_sendTransaction
        if (body.method === 'eth_sendTransaction') {
          console.log('[Filecoin] Intercepting eth_sendTransaction → MetaMask');
          
          const txParams = body.params[0];
          
          const txHash = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [txParams],
          });
          
          return new Response(JSON.stringify({
            jsonrpc: '2.0',
            id: body.id,
            result: txHash,
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } catch (parseErr) {
        // Not a JSON body or not a method we intercept
      }
    }
    
    // Pass through ALL other requests (including Supabase)
    return originalFetch(url, options);
  };
}

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

export async function initializeSynapse(address, options = {}) {
  try {
    // Patch fetch BEFORE creating Synapse
    patchWalletRPC();

    if (!window.ethereum) {
      throw new Error('No wallet detected. Please install MetaMask.');
    }

    let account = address;
    if (!account) {
      const [ethAddress] = await window.ethereum.request({ method: 'eth_requestAccounts' });
      account = ethAddress;
    }
    walletAddress = account;

    console.log('[Filecoin] User account:', account);

    const walletClient = createWalletClient({
      account: account,
      chain: calibration,
      transport: custom(window.ethereum),
    });

    const synapse = await Synapse.create({
      account: account,
      signer: walletClient,
      chain: calibration,
      source: 'deadlineguard',
    });

    console.log('[Filecoin] Synapse created');
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