// Supabase Realtime Service
import { supabase } from './client';

export const realtimeService = {
  subscribeToFiles(userId, callback) {
    const subscription = supabase
      .from(`files:user_id=eq.${userId}`)
      .on('*', payload => {
        callback(payload);
      })
      .subscribe();

    return subscription;
  },

  unsubscribe(subscription) {
    if (subscription) {
      supabase.removeSubscription(subscription);
    }
  }
};
