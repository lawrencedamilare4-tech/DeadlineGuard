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
        // Check session first (faster)
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
        }
      } catch (error) {
        console.error('Failed to get session', error);
      } finally {
        setLoading(false);
      }
    };
    init();

    // Listen for auth changes
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Supabase] Auth event:', event, 'User:', session?.user?.id);
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => {
      subscription?.subscription?.unsubscribe();
    };
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