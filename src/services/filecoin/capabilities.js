let capabilities = null;

export async function detectCapabilities() {
  if (capabilities) return capabilities;
  try {
    const SynapseModule = await import('@filoz/synapse-sdk');
    const sdk = SynapseModule.default || SynapseModule;
    capabilities = {
      upload: typeof sdk?.upload === 'function' || typeof sdk?.storageManager?.store === 'function',
      retrieve: typeof sdk?.retrieve === 'function' || typeof sdk?.retrieval?.retrieve === 'function',
      providers: typeof sdk?.providers?.list === 'function' || typeof sdk?.getProviders === 'function',
      payments: typeof sdk?.pay?.getBalance === 'function' || typeof sdk?.getBalance === 'function',
      datasets: typeof sdk?.dataSets?.create === 'function' || typeof sdk?.createDataSet === 'function',
      pdp: typeof sdk?.pdp?.check === 'function' || typeof sdk?.verifyStorage === 'function',
      session: typeof sdk?.session?.create === 'function' || typeof sdk?.createSession === 'function',
    };
  } catch (err) {
    console.warn('[Filecoin] Capability detection failed', err);
    capabilities = {
      upload: false,
      retrieve: false,
      providers: false,
      payments: false,
      datasets: false,
      pdp: false,
      session: false,
    };
  }
  return capabilities;
}