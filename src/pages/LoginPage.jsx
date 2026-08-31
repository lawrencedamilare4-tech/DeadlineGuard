import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithWallet } from '../services/supabase/auth';
import { useSupabase } from '../hooks/useSupabase';
import { Wallet, Loader2, ShieldCheck, ArrowLeft } from 'lucide-react';
import { supabase } from '../services/supabase/client';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import NetworkWarning from '../components/layout/NetworkWarning';

const LoginPage = () => {
  const navigate = useNavigate();
  const { user } = useSupabase();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [debugLog, setDebugLog] = useState([]);
  const navigationAttempted = useRef(false);
  const connectInitiated = useRef(false); // <-- flag to prevent auto-login

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

  // Only auto-login when user explicitly clicked Connect and wallet becomes connected
  useEffect(() => {
    if (connectInitiated.current && isConnected && address && !loading && !user) {
      connectInitiated.current = false; // reset flag
      handleSupabaseAuth(address);
    }
  }, [address, isConnected, user, loading]);

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

      // Navigate after a short delay
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
    if (isConnected && address) {
      // Already connected, but no Supabase user? Then manually trigger auth
      if (!user) {
        connectInitiated.current = true;
        handleSupabaseAuth(address);
      } else {
        navigate('/dashboard/overview', { replace: true });
      }
    } else {
      // User clicked Connect – set flag and open modal
      connectInitiated.current = true;
      openConnectModal();
    }
  };

  return (
    <div className="dg-anim relative min-h-screen overflow-hidden bg-shamrock-darkest flex items-center justify-center px-4">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-shamrock/25 blur-3xl dg-blob"
          style={{ animationDuration: '14s' }}
        />
        <div
          className="absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-shamrock-light/15 blur-3xl dg-blob"
          style={{ animationDuration: '18s', animationDelay: '-4s' }}
        />
        <div
          className="absolute bottom-[-6rem] left-1/4 h-64 w-64 rounded-full bg-shamrock/15 blur-3xl dg-blob"
          style={{ animationDuration: '16s', animationDelay: '-8s' }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.35)_100%)]" />
      </div>

      {/* Back link */}
      <Link
        to="/"
        className="absolute top-6 left-6 z-10 inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors dg-fade-up"
      >
        <ArrowLeft size={14} />
        DeadlineGuard
      </Link>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div
          className="relative rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] backdrop-blur-xl shadow-[0_8px_40px_-8px_rgba(0,0,0,0.6)] px-8 py-10 text-center dg-fade-up"
          style={{ animationDelay: '80ms' }}
        >
          {/* Signal badge */}
          <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center">
            <span className={`absolute inset-0 rounded-full border border-shamrock/60 dg-ring ${loading ? 'dg-ring-fast' : ''}`} />
            <span
              className={`absolute inset-0 rounded-full border border-shamrock/60 dg-ring ${loading ? 'dg-ring-fast' : ''}`}
              style={{ animationDelay: '0.6s' }}
            />
            <span
              className={`absolute inset-0 rounded-full border border-shamrock/60 dg-ring ${loading ? 'dg-ring-fast' : ''}`}
              style={{ animationDelay: '1.2s' }}
            />
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-shamrock text-shamrock-darkest shadow-lg">
              <ShieldCheck size={20} />
            </div>
          </div>

          <div
            className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-shamrock/10 dark:bg-shamrock-darker/40 px-3 py-1 text-[11px] font-medium tracking-wide text-shamrock-darkest dark:text-shamrock-light dg-fade-up"
            style={{ animationDelay: '140ms' }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-shamrock dg-blink" />
            AGENT MONITORING ACTIVE
          </div>

          <h1
            className="mt-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-white dg-fade-up"
            style={{ animationDelay: '180ms' }}
          >
            Sign in
          </h1>
          <p
            className="mt-2 text-sm text-gray-600 dark:text-gray-300 dg-fade-up"
            style={{ animationDelay: '220ms' }}
          >
            Connect your wallet to access DeadlineGuard.
          </p>

          <div className="mt-6 dg-fade-up" style={{ animationDelay: '260ms' }}>
            {error && (
              <div className="mb-4 rounded-md border border-red-200/60 dark:border-red-900/40 bg-red-50 dark:bg-red-900/30 px-3 py-3 text-left text-sm text-red-600 dark:text-red-400 dg-shake">
                {error}
              </div>
            )}

            <NetworkWarning />

            <button
              onClick={handleConnectClick}
              disabled={loading}
              className="group relative mt-2 w-full overflow-hidden rounded-md bg-shamrock px-4 py-3 text-sm font-semibold text-shamrock-darkest transition-all hover:bg-shamrock-light active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
            >
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:animate-[dg-shimmer_1.1s_ease]" />
              <span className="relative inline-flex items-center justify-center gap-2">
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
              </span>
            </button>
          </div>

          {/* Debug Logs */}
          {debugLog.length > 0 && (
            <div className="mt-5 max-h-40 overflow-y-auto rounded-md border border-gray-200 dark:border-white/5 bg-shamrock-darker/[0.06] dark:bg-shamrock-darker/20 p-3 text-left dg-fade-up">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Session log
              </p>
              {debugLog.map((log, idx) => (
                <p
                  key={idx}
                  className="font-mono text-xs text-gray-400 dg-fade-up"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  {log}
                </p>
              ))}
            </div>
          )}
        </div>

        <p className="mt-5 text-center text-xs text-white/40 dg-fade-up" style={{ animationDelay: '320ms' }}>
          Filecoin Calibration testnet
        </p>
      </div>

      <style>{`
        @keyframes dg-fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dg-blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(24px, -28px) scale(1.08); }
          66% { transform: translate(-18px, 16px) scale(0.94); }
        }
        @keyframes dg-ring {
          0% { transform: scale(0.75); opacity: 0.55; }
          80%, 100% { transform: scale(1.9); opacity: 0; }
        }
        @keyframes dg-shimmer {
          from { transform: translateX(-120%); }
          to { transform: translateX(120%); }
        }
        @keyframes dg-shake {
          10%, 90% { transform: translateX(-1px); }
          20%, 80% { transform: translateX(2px); }
          30%, 50%, 70% { transform: translateX(-4px); }
          40%, 60% { transform: translateX(4px); }
        }
        @keyframes dg-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .dg-fade-up { opacity: 0; animation: dg-fade-up 0.6s ease forwards; }
        .dg-blob { animation-name: dg-blob; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
        .dg-ring { animation: dg-ring 3s ease-out infinite; }
        .dg-ring-fast { animation-duration: 1.2s; }
        .dg-blink { animation: dg-blink 2s ease-in-out infinite; }
        .dg-shake { animation: dg-shake 0.5s ease; }

        @media (prefers-reduced-motion: reduce) {
          .dg-anim, .dg-anim * {
            animation: none !important;
            transition: none !important;
          }
          .dg-fade-up {
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;