import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase/client';
import { getCurrentUser, onAuthStateChange } from '../services/supabase/auth';

const SupabaseContext = createContext(null);

export const SupabaseProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        // Check session first
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
        } else {
          // Try getUser as fallback
          const currentUser = await getCurrentUser();
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Failed to get session', error);
      } finally {
        setLoading(false);
      }
    };
    init();

    const { data: subscription } = onAuthStateChange((user) => {
      console.log('[Supabase] Auth state changed:', user?.id || 'null');
      setUser(user);
      setLoading(false);
    });

    return () => subscription?.subscription?.unsubscribe();
  }, []);

  const value = { supabase, user, loading };

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
};

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (!context) {
    return { supabase, user: null, loading: false };
  }
  return context;
};