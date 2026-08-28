import React, { useEffect } from 'react';
import { useFilecoin } from '../../contexts/FilecoinContext';
import { Loader2, Wallet } from 'lucide-react';

const WalletConnector = () => {
  const { connected, loading, error, connectWallet, wallet } = useFilecoin();

  return (
    <div>
      {!connected ? (
        <button
          onClick={connectWallet}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-shamrock px-4 py-2 text-sm font-semibold text-shamrock-darkest transition-colors hover:bg-shamrock-light disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Wallet size={16} />
              Connect Wallet
            </>
          )}
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono">
            {wallet?.slice(0, 6)}...{wallet?.slice(-4)}
          </span>
          <span className="text-green-500">✓</span>
        </div>
      )}
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
};

export default WalletConnector;