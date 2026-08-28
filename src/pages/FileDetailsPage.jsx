import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchFileById, fetchFileActivities } from '../services/supabase/database';
import ProviderVisualization from '../components/file/ProviderVisualization';
import RetrievalModal from '../components/file/RetrievalModal';
import PDPStatusBadge from '../components/file/PDPStatusBadge';
import { Copy, Download, Thermometer } from 'lucide-react';

const FileDetailsPage = () => {
  const { id } = useParams();
  const [file, setFile] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRetrieval, setShowRetrieval] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchFileById(id);
        setFile(data);
        const acts = await fetchFileActivities(id);
        setActivities(acts);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const copyPieceCid = () => {
    if (file?.piece_cid) navigator.clipboard.writeText(file.piece_cid);
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>;
  if (!file) return <div className="p-8 text-center text-gray-400">File not found.</div>;

  const storage = file.filecoin_storage?.[0];
  const providers = file.filecoin_providers || [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">{file.file_name}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <section className="card">
            <h2 className="text-xl font-semibold mb-4">Academic Status</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Status</span>
                <span className="font-medium text-shamrock">{file.status?.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Due</span>
                <span className="font-medium">3 days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Grade Impact</span>
                <span className="font-medium">40%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Last Accessed</span>
                <span className="font-medium">{new Date(file.last_accessed).toLocaleDateString()}</span>
              </div>
            </div>
          </section>

          <section className="card">
            <h2 className="text-xl font-semibold mb-4">Filecoin Identity</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-300">PieceCID</span>
                <div className="flex items-center">
                  <span className="font-mono text-sm">{file.piece_cid?.slice(0, 20)}...</span>
                  <button onClick={copyPieceCid} className="ml-2 text-shamrock hover:text-shamrock-dark">
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Copies</span>
                <span className="font-medium">{storage?.healthy_provider_count ?? '—'}/{storage?.provider_count ?? '—'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">PDP</span>
                <PDPStatusBadge status={storage?.pdp_status} />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Payment</span>
                <span className="font-medium">{storage?.payment_status ?? 'UNKNOWN'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Retrieval</span>
                <span className="font-medium">{storage?.retrieval_status ?? 'UNKNOWN'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Temperature</span>
                <span className="font-medium flex items-center">
                  <Thermometer className="h-4 w-4 mr-1 text-orange-500" />
                  {file.temperature?.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Overall Health</span>
                <span className="font-medium text-shamrock">HEALTHY</span>
              </div>
            </div>
          </section>

          <button
            onClick={() => setShowRetrieval(true)}
            className="w-full bg-shamrock hover:bg-shamrock-dark text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center"
          >
            <Download className="h-5 w-5 mr-2" />
            Open File
          </button>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-6">Storage Providers</h2>
          <ProviderVisualization providers={providers} />
          {providers.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400 text-center mt-4">
              No provider information available.
            </p>
          )}
        </div>
      </div>

      {/* File Activity */}
      <section className="card mt-8">
        <h2 className="text-xl font-semibold mb-4">File Activity</h2>
        {activities.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No agent actions recorded for this file.</p>
        ) : (
          <ul className="space-y-3">
            {activities.map((action) => (
              <li key={action.id} className="flex items-start gap-3 text-sm">
                <span className="text-gray-500 dark:text-gray-400 w-16 shrink-0">
                  {new Date(action.created_at).toLocaleTimeString()}
                </span>
                <span className="font-medium">{action.description}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {showRetrieval && <RetrievalModal file={file} onClose={() => setShowRetrieval(false)} />}
    </div>
  );
};

export default FileDetailsPage;