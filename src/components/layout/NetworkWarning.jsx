import { useChainId, useSwitchChain } from 'wagmi';
import { AlertTriangle } from 'lucide-react';

const NetworkWarning = () => {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  if (chainId === 314159) return null; // Already on Filecoin Calibration

  return (
    <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-400 px-4 py-2 rounded-md flex items-center gap-2">
      <AlertTriangle className="h-4 w-4" />
      <span className="text-sm">You're on the wrong network.</span>
      <button
        onClick={() => switchChain({ chainId: 314159 })}
        className="ml-auto text-xs font-semibold underline hover:text-yellow-300"
      >
        Switch to Filecoin Calibration
      </button>
    </div>
  );
};

export default NetworkWarning;