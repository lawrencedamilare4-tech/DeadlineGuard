import { useEffect } from 'react';
import { supabase } from '../services/supabase/client';

export const useRealtime = (table, callback, filter = {}) => {
  useEffect(() => {
    const subscription = supabase
      .channel(`realtime-${table}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [table, JSON.stringify(filter)]);
};