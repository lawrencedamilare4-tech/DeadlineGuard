import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase/client';
import {AgentActivity} from '../components/dashboard/AgentActivity';
import { Activity } from 'lucide-react';

const AgentActivityPage = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setLoading(false);
      const { data, error } = await supabase
        .from('agent_actions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (!error) setActivities(data || []);
      setLoading(false);
    };
    fetchActivities();
  }, []);

  if (loading) return <div className="text-center text-gray-400">Loading activity...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Activity className="h-6 w-6 text-shamrock" /> Agent Activity
      </h1>
      <AgentActivity activities={activities} />
    </div>
  );
};

export default AgentActivityPage;