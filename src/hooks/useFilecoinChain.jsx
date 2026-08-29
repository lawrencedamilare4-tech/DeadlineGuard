// src/hooks/useFilecoinChain.js
import { useEffect } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { filecoinCalibration } from '../config/wagmi';

export const useFilecoinChain = () => {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    if (isConnected && chainId !== 314159) {
      switchChain({ chainId: 314159 });
    }
  }, [isConnected, chainId, switchChain]);
};