import { useEffect, useRef } from 'react';
import { runAgent } from '../engines/agentEngine';
import { useSupabase } from './useSupabase';

export const useAgentScheduler = (intervalMs = 300000) => { // 5 minutes
  const { user } = useSupabase();
  const isRunningRef = useRef(false);

  useEffect(() => {
    if (!user) return;

    const run = async () => {
      if (isRunningRef.current) return;
      isRunningRef.current = true;
      try {
        await runAgent(user.id);
      } catch (err) {
        console.error('[Agent] Scheduler run failed', err);
      } finally {
        isRunningRef.current = false;
      }
    };

    // Do NOT run immediately – wait for first interval
    const timer = setInterval(run, intervalMs);
    return () => clearInterval(timer);
  }, [user, intervalMs]);
};