import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithWallet } from '../services/supabase/auth';
import { useSupabase } from '../hooks/useSupabase';
import { useFilecoin } from '../hooks/useFilecoin';
import { Wallet, Loader2 } from 'lucide-react';

const SignupPage = () => {
  const navigate = useNavigate();
  const { connectWallet } = useFilecoin();
  const { supabase } = useSupabase();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleWalletSignup = async () => {
    setLoading(true);
    setError(null);
    try {
      const walletAddress = await connectWallet();
      if (!walletAddress) throw new Error('Failed to connect wallet');

      const { user } = await signInWithWallet(walletAddress);
      if (user) {
        await supabase.from('profiles').upsert(
          {
            id: user.id,
            wallet_address: walletAddress,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
      }
      navigate('/dashboard/overview');
    } catch (err) {
      setError(err.message || 'Failed to sign up with wallet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-shamrock-darkest px-4">
      <div className="bg-white dark:bg-shamrock-darkest rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Create Account</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Connect your wallet to get started.
        </p>
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-md text-sm">
            {error}
          </div>
        )}
        <button
          onClick={handleWalletSignup}
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
          Already have an account?{' '}
          <Link to="/login" className="text-shamrock hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;