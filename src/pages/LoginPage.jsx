import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithWallet } from '../services/supabase/auth';
import { useSupabase } from '../hooks/useSupabase';
import { useFilecoin } from '../contexts/FilecoinContext';
import { Wallet, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabase/client';

const LoginPage = () => {
  const navigate = useNavigate();
  const { connectWallet } = useFilecoin();
  const { user } = useSupabase();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [debugLog, setDebugLog] = useState([]);
  const navigationAttempted = useRef(false);

  const addLog = (msg) => {
    console.log(msg);
    setDebugLog((prev) => [...prev, msg]);
  };

  useEffect(() => {
    if (user && !navigationAttempted.current) {
      navigationAttempted.current = true;
      addLog('[Login] User already logged in, navigating to dashboard');
      navigate('/dashboard/overview', { replace: true });
    }
  }, [user, navigate]);

const handleWalletLogin = async () => {
  setLoading(true);
  setError(null);

  try {
    const walletAddress = await connectWallet();
    
    // Sign in / get session
    const { user: authUser } = await signInWithWallet(walletAddress);
    
    if (authUser) {
      await supabase.from('profiles').upsert({
        id: authUser.id,
        wallet_address: walletAddress,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    }

    // FORCE auth state update
    await supabase.auth.setSession({
      access_token: (await supabase.auth.getSession()).data.session?.access_token,
      refresh_token: (await supabase.auth.getSession()).data.session?.refresh_token,
    });

    // Wait longer for state propagation
    setTimeout(() => {
      navigate('/dashboard/overview', { replace: true });
    }, 1000);

  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
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
          onClick={handleWalletLogin}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-shamrock px-4 py-3 text-sm font-semibold text-shamrock-darkest transition-colors hover:bg-shamrock-light disabled:opacity-50"
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

        {/* Debug Log */}
        {debugLog.length > 0 && (
          <div className="mt-4 p-3 bg-shamrock-darker/20 rounded-md text-left max-h-40 overflow-y-auto">
            {debugLog.map((log, idx) => (
              <p key={idx} className="text-xs font-mono text-gray-400">{log}</p>
            ))}
          </div>
        )}

        <p className="mt-6 text-sm text-gray-600 dark:text-gray-300">
          New to DeadlineGuard?{' '}
          <Link to="/signup" className="text-shamrock hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;