import React from 'react';
import { useChainId, useSwitchChain } from 'wagmi';
import { AlertTriangle, PlusCircle } from 'lucide-react';

const NetworkWarning = () => {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  if (chainId === 314159) return null;

  const handleAddNetwork = async () => {
    try {
      await switchChain({
        chainId: 314159,
        addEthereumChain: true,
      });
    } catch (err) {
      console.error('Failed to add network:', err);
      alert('Please add Filecoin Calibration manually to your wallet.');
    }
  };

  return (
    <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-400 px-4 py-3 rounded-md flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm font-medium">Wrong network detected</span>
      </div>
      <p className="text-xs text-yellow-300/80">
        DeadlineGuard requires Filecoin Calibration (Chain ID 314159).
      </p>
      <button
        onClick={handleAddNetwork}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 text-xs font-semibold transition-colors self-start"
      >
        <PlusCircle className="h-3 w-3" />
        Add & Switch Network
      </button>
      <p className="text-xs text-yellow-200/60">
        Or add manually: RPC{' '}
        <span className="font-mono">https://api.calibration.node.glif.io/rpc/v1</span>, Chain ID{' '}
        <span className="font-mono">314159</span>
      </p>
    </div>
  );
};

export default NetworkWarning;