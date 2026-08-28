import React, { useState, useEffect, useRef } from 'react';
import { useFilecoin } from '../contexts/FilecoinContext';
import { useSupabase } from '../hooks/useSupabase';
import { supabase } from '../services/supabase/client';
import { DEFAULT_AGENT_PERMISSIONS } from '../utils/constants';
import { FilecoinService } from '../services/filecoin';
import { Check, X, Wallet, Loader2, ShieldCheck, Zap } from 'lucide-react';

const SettingsPage = () => {
  const { user } = useSupabase();
  const { 
    wallet, 
    balance, 
    runway, 
    spendRate, 
    connected, 
    synapseReady,
    loading, 
    funding, 
    error, 
    connectWallet, 
    fundWallet,
    disconnectWallet 
  } = useFilecoin();
  
  const [permissions, setPermissions] = useState(DEFAULT_AGENT_PERMISSIONS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fundAmount, setFundAmount] = useState(10);
  const [authorizing, setAuthorizing] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  const hasLoadedPermissions = useRef(false);

  const loadPermissions = async () => {
    const { data, error } = await supabase
      .from('agent_permissions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Failed to load permissions', error);
      return;
    }

    if (data) {
      setPermissions({
        can_monitor_storage: data.can_monitor_storage,
        can_monitor_payments: data.can_monitor_payments,
        can_archive_files: data.can_archive_files,
        can_restore_files: data.can_restore_files,
        can_retrieve_files: data.can_retrieve_files,
        can_transfer_funds: data.can_transfer_funds,
        can_access_other_wallets: data.can_access_other_wallets,
      });
    } else {
      setPermissions(DEFAULT_AGENT_PERMISSIONS);
    }
  };

  useEffect(() => {
    if (user && !hasLoadedPermissions.current) {
      hasLoadedPermissions.current = true;
      loadPermissions();
    }
  }, [user]);

  const handlePermissionChange = (key) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const savePermissions = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const { error } = await supabase
        .from('agent_permissions')
        .upsert({ user_id: user.id, ...permissions }, { onConflict: 'user_id' });
      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save permissions', err);
    } finally {
      setSaving(false);
    }
  };

  const handleFundWallet = async () => {
    try {
      await fundWallet(fundAmount);
      alert(`Wallet funded with ${fundAmount} USDFC successfully!`);
    } catch (err) {
      alert('Funding failed: ' + err.message);
    }
  };

  const handleAuthorizeAgent = async () => {
    setAuthorizing(true);
    setAuthorized(false);
    try {
      await FilecoinService.authorizeAgent(permissions);
      setAuthorized(true);
      setTimeout(() => setAuthorized(false), 5000);
      alert('Agent authorized with limited permissions');
    } catch (err) {
      alert('Authorization failed: ' + err.message);
    } finally {
      setAuthorizing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Settings</h1>

      {/* Filecoin Wallet Section */}
      <section className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Wallet className="h-5 w-5 mr-2 text-shamrock" /> Filecoin Wallet
        </h2>

        {!connected ? (
          <div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Connect your wallet to manage Filecoin storage payments.
            </p>
            <button 
              onClick={connectWallet} 
              disabled={loading} 
              className="inline-flex items-center gap-2 rounded-md bg-shamrock px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-shamrock-dark disabled:opacity-50"
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
            {error && <p className="text-red-600 mt-2 text-sm">{error}</p>}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Wallet Address */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-300">Wallet Address</span>
              <span className="font-mono text-sm">
                {wallet?.slice(0, 10)}...{wallet?.slice(-6)}
              </span>
            </div>

            {/* Network */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-300">Network</span>
              <span className="font-medium">Filecoin Calibration</span>
            </div>

            {/* Synapse Status */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-300">Synapse Status</span>
              {synapseReady ? (
                <span className="text-green-500 flex items-center gap-1">
                  <Check size={16} /> Ready
                </span>
              ) : (
                <span className="text-yellow-500">Initializing...</span>
              )}
            </div>

            {/* Balance */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-300">Payment Balance</span>
              <span className="font-medium">${balance?.toFixed(2) ?? '—'} USDFC</span>
            </div>

            {/* Spend Rate */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-300">Spend Rate</span>
              <span className="font-medium">${spendRate?.toFixed(6) ?? '—'} / epoch</span>
            </div>

            {/* Runway */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-300">Runway</span>
              <span className="font-medium">
                {runway === Infinity ? '∞' : runway ? `${runway.toFixed(1)} epochs` : '—'}
              </span>
            </div>

            {/* Fund Wallet */}
            <div className="pt-4 border-t border-gray-200 dark:border-shamrock-darker">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                Fund your wallet with USDFC for storage payments:
              </p>
              <div className="flex gap-3 items-center">
                <input
                  type="number"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(Math.max(1, Number(e.target.value)))}
                  min="1"
                  max="100"
                  className="w-24 px-3 py-2 border border-gray-300 dark:border-shamrock-darker rounded-md bg-white dark:bg-shamrock-darker text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-shamrock"
                />
                <button
                  onClick={handleFundWallet}
                  disabled={funding || !synapseReady}
                  className="inline-flex items-center gap-2 rounded-md bg-shamrock px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-shamrock-dark disabled:opacity-50"
                >
                  {funding ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Funding...
                    </>
                  ) : (
                    'Fund Wallet'
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                This deposits USDFC to the Filecoin Payments contract for storage.
              </p>
            </div>

            {/* Disconnect */}
            <div className="pt-4 border-t border-gray-200 dark:border-shamrock-darker">
              <button
                onClick={disconnectWallet}
                className="text-sm text-red-500 hover:text-red-600"
              >
                Disconnect Wallet
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Agent Permissions Section */}
      <section className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
          <ShieldCheck className="h-5 w-5 mr-2 text-shamrock" /> DeadlineGuard Agent
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
          Configure what the agent is allowed to do autonomously.
        </p>

        <div className="space-y-4">
          {Object.entries(permissions).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between py-2">
              <span className="text-gray-700 dark:text-gray-300 capitalize">
                {key.replace(/_/g, ' ')}
              </span>
              <button
                onClick={() => handlePermissionChange(key)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  value ? 'bg-shamrock' : 'bg-gray-300 dark:bg-shamrock-darker'
                }`}
                role="switch"
                aria-checked={value}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    value ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-4">
          <button 
            onClick={savePermissions} 
            disabled={saving} 
            className="inline-flex items-center gap-2 rounded-md border border-shamrock px-4 py-2 text-sm font-semibold text-shamrock transition-colors hover:bg-shamrock/10 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              'Save Permissions'
            )}
          </button>

          <button 
            onClick={handleAuthorizeAgent} 
            disabled={authorizing || !synapseReady}
            className="inline-flex items-center gap-2 rounded-md bg-shamrock px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-shamrock-dark disabled:opacity-50"
          >
            {authorizing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Authorizing...
              </>
            ) : (
              <>
                <Zap size={16} />
                Authorize Agent
              </>
            )}
          </button>
        </div>

        {saved && (
          <p className="mt-3 text-green-600 text-sm flex items-center gap-1">
            <Check size={16} /> Permissions saved
          </p>
        )}

        {authorized && (
          <p className="mt-3 text-green-600 text-sm flex items-center gap-1">
            <Check size={16} /> Agent authorized successfully
          </p>
        )}
      </section>
    </div>
  );
};

export default SettingsPage;