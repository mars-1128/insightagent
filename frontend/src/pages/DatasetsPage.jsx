import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database,
  Upload,
  Trash2,
  Eye,
  Sparkles,
  Loader2,
  FileSpreadsheet,
  ArrowRight
} from 'lucide-react';
import api from '../api/client';

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [datasetName, setDatasetName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const navigate = useNavigate();

  const fetchDatasets = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/datasets');
      setDatasets(res.data.datasets || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load datasets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;
    setError('');
    setSuccess('');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', selectedFile);
      if (datasetName.trim()) form.append('name', datasetName.trim());

      await api.post('/api/datasets/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSelectedFile(null);
      setDatasetName('');
      setSuccess('CSV uploaded and indexed into PostgreSQL!');
      await fetchDatasets();
    } catch (err) {
      setError(err.response?.data?.error || 'CSV upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleSeedSamples = async () => {
    setSeeding(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.post('/api/datasets/seed-samples');
      setDatasets(res.data.datasets || []);
      setSuccess(res.data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to seed sample datasets.');
    } finally {
      setSeeding(false);
    }
  };

  const handlePreview = async (id) => {
    try {
      const res = await api.get(`/api/datasets/${id}`);
      setPreviewData(res.data.dataset);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load preview.');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete dataset "${name}" and its PostgreSQL table permanently?`)) return;
    try {
      await api.delete(`/api/datasets/${id}`);
      if (previewData?.id === id) setPreviewData(null);
      await fetchDatasets();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete dataset.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Datasets &amp; CSV Manager
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Upload CSV files into isolated PostgreSQL tables or load built-in demo datasets.
          </p>
        </div>

        <button
          onClick={handleSeedSamples}
          disabled={seeding}
          className="aurora-btn flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold"
        >
          {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Load Built-in Demo Datasets
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-500">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-500">
          {success}
        </div>
      )}

      {/* Upload Box */}
      <form
        onSubmit={handleUpload}
        className="glass-panel p-5"
      >
        <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <Upload className="h-4 w-4 text-cyan-500" />
          Upload New CSV Dataset
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            type="text"
            value={datasetName}
            onChange={(e) => setDatasetName(e.target.value)}
            placeholder="Dataset Name (optional)"
            className="glass-input px-3.5 py-2.5 text-xs"
          />
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            className="glass-input px-3 py-2 text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white"
          />
          <button
            type="submit"
            disabled={uploading || !selectedFile}
            className="aurora-btn flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? 'Importing to PostgreSQL...' : 'Upload & Index CSV'}
          </button>
        </div>
      </form>

      {/* Dataset Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : datasets.length === 0 ? (
        <div className="glass-panel border-dashed p-12 text-center">
          <Database className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-3 text-sm font-semibold">No datasets yet</p>
          <p className="mt-1 text-xs text-slate-500">Upload a CSV above or click &quot;Load Built-in Demo Datasets&quot;.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {datasets.map((ds) => (
            <div
              key={ds.id}
              className="glass-panel p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-500">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{ds.name}</h3>
                      <p className="text-[11px] text-slate-500">
                        {ds.row_count} rows · {ds.columns?.length || 0} columns
                        {ds.is_sample && ' · Built-in Sample'}
                      </p>
                    </div>
                  </div>
                </div>

                {ds.description && (
                  <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-400">{ds.description}</p>
                )}

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(ds.columns || []).slice(0, 8).map((c) => (
                    <span
                      key={c}
                      className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {c}
                    </span>
                  ))}
                  {(ds.columns?.length || 0) > 8 && (
                    <span className="text-[10px] text-slate-400">+{ds.columns.length - 8} more</span>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePreview(ds.id)}
                    className="flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Preview
                  </button>
                  <button
                    onClick={() => handleDelete(ds.id, ds.name)}
                    className="flex items-center gap-1 rounded-lg border border-rose-500/30 px-2.5 py-1.5 text-xs font-medium text-rose-500 hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>

                <button
                  onClick={() => navigate('/studio', { state: { rerunGoal: '', datasetId: ds.id } })}
                  className="aurora-btn flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold"
                >
                  Analyze
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Table */}
      {previewData && (
        <div className="glass-panel p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Preview: {previewData.name} (first 15 rows)
            </h3>
            <button
              onClick={() => setPreviewData(null)}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-white"
            >
              Close
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="min-w-full divide-y divide-slate-200 text-xs dark:divide-slate-800">
              <thead className="bg-slate-100 dark:bg-slate-950">
                <tr>
                  {(previewData.columns || []).map((c) => (
                    <th key={c} className="px-3 py-2 text-left font-semibold">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(previewData.sample || []).map((row, idx) => (
                  <tr key={idx}>
                    {(previewData.columns || []).map((c) => (
                      <td key={c} className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">
                        {String(row[c] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
