import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase/client';
import { FilecoinService } from '../services/filecoin';
import { Database } from 'lucide-react';

const DataSetsPage = () => {
  const [dataSets, setDataSets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDataSets = async () => {
      try {
        const ds = await FilecoinService.listDataSets();
        setDataSets(ds || []);
      } catch (err) {
        console.warn('Failed to fetch data sets', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDataSets();
  }, []);

  if (loading) return <div className="text-center text-gray-400">Loading data sets...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Database className="h-6 w-6 text-shamrock" /> Data Sets
      </h1>
      {dataSets.length === 0 ? (
        <p className="text-gray-400">No data sets found. Data set support may not be available.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dataSets.map((ds) => (
            <div key={ds.id} className="p-4 bg-shamrock-darker/20 border border-shamrock-darker/40 rounded-lg">
              <p className="font-semibold text-white">{ds.name}</p>
              <p className="text-sm text-gray-300">ID: {ds.id}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DataSetsPage;