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
  const navigationAttempted = useRef(false);

  // Redirect when user becomes available
  useEffect(() => {
    if (user && !navigationAttempted.current) {
      navigationAttempted.current = true;
      console.log('[Login] User detected, navigating to dashboard');
      navigate('/dashboard/overview', { replace: true });
    }
  }, [user, navigate]);

  const handleWalletLogin = async () => {
    setLoading(true);
    setError(null);
    navigationAttempted.current = false;
    
    try {
      // 1. Connect wallet
      const walletAddress = await connectWallet();
      if (!walletAddress) throw new Error('Failed to connect wallet');

      console.log('[Login] Wallet connected:', walletAddress);

      // 2. Create/get Supabase session
      const { user: authUser, session } = await signInWithWallet(walletAddress);
      
      console.log('[Login] Auth user:', authUser?.id);

      if (authUser) {
        // 3. Store wallet in profile
        await supabase.from('profiles').upsert(
          {
            id: authUser.id,
            wallet_address: walletAddress,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
      }

      // 4. Force auth state update
      await supabase.auth.getSession();
      
      // 5. Navigate after a short delay to allow state to propagate
      setTimeout(() => {
        console.log('[Login] Navigating to dashboard');
        navigate('/dashboard/overview', { replace: true });
      }, 500);
      
    } catch (err) {
      console.error('[Login] Failed:', err);
      setError(err.message || 'Failed to sign in');
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