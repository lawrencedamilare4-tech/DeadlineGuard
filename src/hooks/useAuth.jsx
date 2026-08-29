import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '../services/supabase/client';

export const useAuth = () => {
  const { address, isConnected } = useAccount();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore Supabase session on mount
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setLoading(false);
    };
    init();

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  // When wallet connects or changes, ensure a Supabase session exists
  useEffect(() => {
    if (!isConnected || !address) return;

    const linkWalletToSupabase = async () => {
      // If no Supabase session yet, sign in anonymously
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) {
          console.error('Anonymous sign-in failed:', error.message);
          return;
        }
      }

      // Update user metadata with wallet address
      await supabase.auth.updateUser({
        data: { wallet_address: address },
      });

      // Also upsert into profiles table if you have one
      await supabase.from('profiles').upsert({
        id: (await supabase.auth.getSession()).data.session.user.id,
        wallet_address: address,
      }, { onConflict: 'id' });
    };

    linkWalletToSupabase();
  }, [address, isConnected]);

  return { user, loading };
};