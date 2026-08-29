import { useEffect } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';

export const useFilecoinChain = () => {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    if (!isConnected) return;
    if (chainId === 314159) return; // already correct

    const ensureChain = async () => {
      try {
        // Try to switch and add if not present
        await switchChain({
          chainId: 314159,
          addEthereumChain: true, // this tells wagmi to add the chain if missing
        });
      } catch (err) {
        console.warn('[Chain] Auto-switch failed:', err);
        // User will see NetworkWarning for manual fallback
      }
    };

    ensureChain();
  }, [isConnected, chainId, switchChain]);
};