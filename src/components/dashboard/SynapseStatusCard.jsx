import { useFilecoin } from '../../contexts/FilecoinContext';
import { CheckCircle, Loader2, AlertTriangle, RefreshCw, Zap } from 'lucide-react';

const SynapseStatusCard = () => {
  const {
    synapseReady,
    switchingNetwork,
    networkError,
    initializeSynapse,
    currentChainId,
  } = useFilecoin();

  const isFilecoin = currentChainId === '0x4CB2F' || currentChainId === '0x13A';

  let statusText, statusColor, icon, bgColor;

  if (switchingNetwork) {
    statusText = 'Connecting...';
    statusColor = 'text-yellow-400';
    bgColor = 'bg-yellow-500/10 border-yellow-500/30';
    icon = <Loader2 className="h-5 w-5 text-yellow-400 animate-spin" />;
  } else if (synapseReady) {
    statusText = 'Synapse Ready';
    statusColor = 'text-green-400';
    bgColor = 'bg-green-500/10 border-green-500/30';
    icon = <CheckCircle className="h-5 w-5 text-green-400" />;
  } else if (networkError) {
    statusText = 'Initialization Failed';
    statusColor = 'text-red-400';
    bgColor = 'bg-red-500/10 border-red-500/30';
    icon = <AlertTriangle className="h-5 w-5 text-red-400" />;
  } else {
    statusText = 'Initializing...';
    statusColor = 'text-yellow-400';
    bgColor = 'bg-yellow-500/10 border-yellow-500/30';
    icon = <Loader2 className="h-5 w-5 text-yellow-400 animate-spin" />;
  }

  return (
    <div className={`rounded-xl border ${bgColor} p-2 flex items-center justify-between gap-3`}>
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className={`text-sm font-semibold ${statusColor}`}>{statusText}</p>
        </div>
      </div>
      
      {!synapseReady && !switchingNetwork && (
        <button
          onClick={() => initializeSynapse()}
          className="inline-flex items-center gap-1.5 rounded-md bg-shamrock/20 px-3 py-1.5 text-xs font-medium text-shamrock hover:bg-shamrock/30 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      )}
    </div>
  );
};

export default SynapseStatusCard;