import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase/client';
import {ArchiveCandidates} from '../components/dashboard/ArchiveCandidates';
import { Archive } from 'lucide-react';

const ArchiveCandidatesPage = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCandidates = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setLoading(false);
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .eq('temperature', 'cold');
      if (!error) setFiles(data || []);
      setLoading(false);
    };
    fetchCandidates();
  }, []);

  if (loading) return <div className="text-center text-gray-400">Loading files...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Archive className="h-6 w-6 text-shamrock" /> Archive Candidates
      </h1>
      <ArchiveCandidates files={files} />
    </div>
  );
};

export default ArchiveCandidatesPage;