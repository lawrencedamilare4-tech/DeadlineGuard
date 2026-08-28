import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase/client';
import { FilecoinService } from '../services/filecoin';
import { Server } from 'lucide-react';

const ProvidersPage = () => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProviders = async () => {
      // Fetch all distinct providers from filecoin_providers table (or via SDK)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setLoading(false);
      const { data, error } = await supabase
        .from('filecoin_providers')
        .select('*')
        .eq('user_id', user.id);
      if (!error) setProviders(data || []);
      setLoading(false);
    };
    fetchProviders();
  }, []);

  if (loading) return <div className="text-center text-gray-400">Loading providers...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Server className="h-6 w-6 text-shamrock" /> Storage Providers
      </h1>
      {providers.length === 0 ? (
        <p className="text-gray-400">No provider information available.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-shamrock-darker">
                <th className="py-2 px-4 text-gray-300">Provider</th>
                <th className="py-2 px-4 text-gray-300">Location</th>
                <th className="py-2 px-4 text-gray-300">Status</th>
                <th className="py-2 px-4 text-gray-300">Health</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((p) => (
                <tr key={p.id} className="border-b border-shamrock-darker/40">
                  <td className="py-2 px-4 text-white">{p.provider_name || 'Unknown'}</td>
                  <td className="py-2 px-4 text-gray-300">{p.location || '—'}</td>
                  <td className="py-2 px-4 text-gray-300">{p.status}</td>
                  <td className="py-2 px-4 text-gray-300">{p.health}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ProvidersPage;