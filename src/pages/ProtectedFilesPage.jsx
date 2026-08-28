import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase/client';
import {ProtectedFiles} from '../components/dashboard/ProtectedFiles';
import { Lock } from 'lucide-react';

const ProtectedFilesPage = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProtected = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setLoading(false);
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'protected');
      if (!error) setFiles(data || []);
      setLoading(false);
    };
    fetchProtected();
  }, []);

  if (loading) return <div className="text-center text-gray-400">Loading files...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Lock className="h-6 w-6 text-shamrock" /> Protected Files
      </h1>
      <ProtectedFiles count={files.length} />
    </div>
  );
};

export default ProtectedFilesPage;