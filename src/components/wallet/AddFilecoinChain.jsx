// src/components/wallet/AddFilecoinChain.jsx
import { useChainId, useSwitchChain } from 'wagmi';

const AddFilecoinChain = () => {
  const { switchChain } = useSwitchChain();

  return (
    <button
      onClick={() => switchChain({ chainId: 314159 })}
      className="text-xs text-shamrock underline"
    >
      Switch to Filecoin Calibration
    </button>
  );
};