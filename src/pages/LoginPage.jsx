import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithWallet } from '../services/supabase/auth';
import { useSupabase } from '../hooks/useSupabase';
import { Wallet, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabase/client';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

const LoginPage = () => {
  const navigate = useNavigate();
  const { user } = useSupabase();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [debugLog, setDebugLog] = useState([]);
  const navigationAttempted = useRef(false);

  const { openConnectModal } = useConnectModal();
  const { address, isConnected } = useAccount();

  const addLog = (msg) => {
    console.log(msg);
    setDebugLog((prev) => [...prev, msg]);
  };

  // If Supabase user already logged in, navigate to dashboard
  useEffect(() => {
    if (user && !navigationAttempted.current) {
      navigationAttempted.current = true;
      addLog('[Login] User already logged in, navigating to dashboard');
      navigate('/dashboard/overview', { replace: true });
    }
  }, [user, navigate]);

  // When wallet connects, perform Supabase anonymous login and link wallet
  useEffect(() => {
    if (isConnected && address && !loading && !user) {
      handleSupabaseAuth(address);
    }
  }, [address, isConnected]);

  const handleSupabaseAuth = async (walletAddress) => {
    setLoading(true);
    setError(null);
    addLog(`[Login] Wallet connected: ${walletAddress}`);

    try {
      // Create or restore anonymous session and link wallet
      const { user: authUser } = await signInWithWallet(walletAddress);
      addLog(`[Login] Supabase user: ${authUser?.id}`);

      if (authUser) {
        await supabase.from('profiles').upsert({
          id: authUser.id,
          wallet_address: walletAddress,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
        addLog('[Login] Profile saved');
      }

      // Force auth state update
      await supabase.auth.getSession();

      // Navigate after a short delay to allow state propagation
      setTimeout(() => {
        addLog('[Login] Navigating to dashboard');
        navigate('/dashboard/overview', { replace: true });
      }, 500);
    } catch (err) {
      addLog(`[Login] Auth error: ${err.message}`);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectClick = () => {
    if (isConnected) {
      // Already connected, redirect to dashboard
      navigate('/dashboard/overview', { replace: true });
    } else {
      openConnectModal();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-shamrock-darkest px-4">
      <div className="bg-white dark:bg-shamrock-darkest rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Sign In</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Connect your wallet to access DeadlineGuard.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-md text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleConnectClick}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-shamrock px-4 py-3 text-sm font-semibold text-shamrock-darkest transition-colors hover:bg-shamrock-light disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Connecting...
            </>
          ) : isConnected && address ? (
            <>
              <Wallet size={16} />
              {address.slice(0, 6)}...{address.slice(-4)}
            </>
          ) : (
            <>
              <Wallet size={16} />
              Connect Wallet
            </>
          )}
        </button>

        {/* Debug Logs */}
        {debugLog.length > 0 && (
          <div className="mt-4 p-3 bg-shamrock-darker/20 rounded-md text-left max-h-40 overflow-y-auto">
            {debugLog.map((log, idx) => (
              <p key={idx} className="text-xs font-mono text-gray-400">{log}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;