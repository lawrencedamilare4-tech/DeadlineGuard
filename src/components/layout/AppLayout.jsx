import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Settings,
  LogOut,
  Wallet,
  Cloud,
  HardDrive,
  Activity,
  Lock,
  Archive,
  Database,
  Server,
  Upload,
  Menu,
  X,
} from 'lucide-react';
import { useSupabase } from '../../hooks/useSupabase';
import { useFilecoin } from '../../contexts/FilecoinContext';
import { signOut } from '../../services/supabase/auth';
import { useFilecoinChain } from '../../hooks/useFilecoinChain';
import NetworkWarning from './NetworkWarning';
import { useAccount, useDisconnect } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';

const AppLayout = () => {
  const { user } = useSupabase();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false); // ✅ loader state

  // RainbowKit/wagmi hooks
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();

  // Filecoin context
  const {
    balance,
    loading: walletLoading,
    error: walletError,
    disconnectWallet,
  } = useFilecoin();

  useFilecoinChain();

  const handleSignOut = async () => {
    setSigningOut(true); // Show loader immediately

    try {
      // Disconnect wallet
      disconnect();

      // Sign out from Supabase
      await signOut();

      // Clear all relevant localStorage keys
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key.startsWith('wagmi') ||
          key.startsWith('wc@') ||
          key.startsWith('rainbow') ||
          key.includes('supabase') ||
          key === 'deadlineguard_wallet'
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));

      // Reset custom Filecoin context
      if (disconnectWallet) disconnectWallet();

      // Navigate after all cleanup
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setSigningOut(false); // Hide loader
    }
  };

  const navItems = [
    { label: 'Overview', to: '/dashboard/overview', icon: LayoutDashboard },
    { label: 'Upload', to: '/dashboard/upload', icon: Upload },
    { label: 'Storage', to: '/dashboard/storage', icon: HardDrive },
    { label: 'Payments', to: '/dashboard/payments', icon: Wallet },
    { label: 'Forecast', to: '/dashboard/forecast', icon: Cloud },
    { label: 'Agent Activity', to: '/dashboard/agent', icon: Activity },
    { label: 'Protected Files', to: '/dashboard/protected', icon: Lock },
    { label: 'Settings', to: '/settings', icon: Settings },
  ];

  const closeMobileNav = () => setMobileNavOpen(false);

  return (
    <div className="min-h-screen bg-shamrock-darkest">
      {/* Full‑screen logout loader */}
      {signingOut && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-shamrock-darkest/95 backdrop-blur-sm">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-shamrock border-t-transparent" />
          <p className="mt-4 text-sm text-gray-300">Signing out...</p>
        </div>
      )}

      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b border-shamrock-darker/40 bg-shamrock-darkest/95 px-4 md:px-6 backdrop-blur">
        <div className="flex items-center gap-2">
          <button
            className="lg:hidden text-gray-300 hover:text-white mr-2"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={24} />
          </button>
          <Cloud className="h-6 w-6 text-shamrock" />
          <span className="max-sm:text-xs text-lg font-semibold tracking-wide text-white">DEADLINEGUARD</span>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {isConnected && address ? (
            <div className="flex items-center gap-2 bg-shamrock-darker/30 rounded-md px-3 py-2">
              <Wallet size={16} className="text-shamrock" />
              <span className="text-sm text-gray-300 font-mono hidden sm:inline">
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
              <span className="text-sm text-shamrock font-medium">
                ${balance?.toFixed ? balance.toFixed(2) : '—'} USDFC
              </span>
            </div>
          ) : (
            <button
              onClick={openConnectModal}
              disabled={walletLoading}
              className="inline-flex items-center gap-2 rounded-md bg-shamrock px-3 md:px-4 py-2 max-sm:text-xs text-sm font-semibold text-shamrock-darkest transition-colors hover:bg-shamrock-light disabled:opacity-50"
            >
              <Wallet size={16} />
              {walletLoading ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}

          {walletError && (
            <span className="text-xs text-storm-critical hidden md:inline">{walletError}</span>
          )}

          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="inline-flex items-center gap-2 rounded-md border border-shamrock-darker px-3 md:px-4 py-2 max-sm:text-xs text-sm font-medium text-gray-300 transition-colors hover:bg-shamrock-darker/30 disabled:opacity-50"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Mobile drawer overlay */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={closeMobileNav} />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-72 bg-shamrock-darkest border-r border-shamrock-darker/40 z-50 transform transition-transform duration-300 lg:hidden ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-shamrock-darker/40">
          <span className="text-white font-semibold">Navigation</span>
          <button onClick={closeMobileNav} className="text-gray-300 hover:text-white">
            <X size={24} />
          </button>
        </div>
        <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-4rem)]">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={closeMobileNav}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-shamrock/10 text-shamrock font-medium'
                    : 'text-gray-300 hover:bg-shamrock/10 hover:text-shamrock'
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block fixed left-0 top-16 bottom-0 w-64 shrink-0 border-r border-shamrock-darker/40 bg-shamrock-darker/20 overflow-y-auto z-40">
        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-shamrock/10 text-shamrock font-medium'
                    : 'text-gray-300 hover:bg-shamrock/10 hover:text-shamrock'
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 lg:ml-64 pt-16 px-4 py-8">
        <NetworkWarning />
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;