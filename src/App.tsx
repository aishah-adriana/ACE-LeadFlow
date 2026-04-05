import React, { useState, useEffect } from 'react';
import { Users, Search, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';

interface Lead {
  email: string;
  name: string;
  company: string;
  job_title: string;
  program: string;
  status: string;
  pasted_at: string;
}

const PROGRAMS = [
  'SO', 'OM', 'AIBL', 'CF', 'PM', 'OB', 'SP',
  'FA', 'ME', 'TIL', 'SFBL', 'PMD', 'QM', 'PE',
];

const STATUS_CYCLE: Record<string, string> = {
  New: 'Contacted',
  Contacted: 'Replied',
  Replied: 'Uncontactable',
  Uncontactable: 'Duplicate',
  Duplicate: 'New',
};

const STATUS_STYLE: Record<string, string> = {
  New:            'text-slate-600 border-slate-200 bg-slate-50',
  Contacted:      'text-emerald-700 border-emerald-200 bg-emerald-50',
  Replied:        'text-blue-700 border-blue-200 bg-blue-50',
  Uncontactable:  'text-amber-700 border-amber-200 bg-amber-50',
  Duplicate:      'text-red-600 border-red-200 bg-red-50',
};

const App = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('All');
  const [multiCourseOnly, setMultiCourseOnly] = useState(false);
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastImported, setLastImported] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchLeads = async () => {
    try {
      const res = await fetch(`/api/leads?t=${Date.now()}`);
      const data = await res.json();
      setLeads(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch leads error:', err);
    }
  };

  const fetchMeta = async () => {
    try {
      const res = await fetch('/api/meta');
      const data = await res.json();
      setLastImported(data.last_imported || null);
    } catch (err) {
      console.error('Fetch meta error:', err);
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchMeta();
  }, []);

  const handleImport = async () => {
    if (!importText.trim() || isProcessing) return;
    setIsProcessing(true);
    try {
      const cleaned = importText
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
        .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
        .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
        .trim();

      const parsed = JSON.parse(cleaned);

      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      if (res.ok) {
        setImportText('');
        setIsImporting(false);
        await fetchLeads();
        await fetchMeta();
      } else {
        const err = await res.json();
        alert(`Server error: ${err.error}`);
      }
    } catch (err: any) {
      alert(`Parse error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleStatus = async (email: string, current: string) => {
    const next = STATUS_CYCLE[current] || 'New';
    setLeads(prev => prev.map(l => l.email === email ? { ...l, status: next } : l));
    await fetch('/api/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, status: next }),
    });
  };

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return;
    setIsDeleting(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: Array.from(selected) }),
      });
      if (res.ok) {
        setLeads(prev => prev.filter(l => !selected.has(l.email)));
        setSelected(new Set());
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const filteredLeads = leads.filter(l => {
    const matchesSearch = (l.name + l.email + l.company)
      .toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProgram = selectedProgram === 'All' || l.program.includes(selectedProgram);
    const matchesMulti = !multiCourseOnly || l.program.includes(',');
    return matchesSearch && matchesProgram && matchesMulti;
  });

  const allFilteredSelected = filteredLeads.length > 0 && filteredLeads.every(l => selected.has(l.email));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      const next = new Set(selected);
      filteredLeads.forEach(l => next.delete(l.email));
      setSelected(next);
    } else {
      const next = new Set(selected);
      filteredLeads.forEach(l => next.add(l.email));
      setSelected(next);
    }
  };

  const toggleSelectOne = (email: string) => {
    const next = new Set(selected);
    next.has(email) ? next.delete(email) : next.add(email);
    setSelected(next);
  };

  const kpis = {
    total: leads.length,
    outreachSent: leads.filter(l => l.status === 'Contacted' || l.status === 'Replied').length,
    replies: leads.filter(l => l.status === 'Replied').length,
    newLeads: leads.filter(l => l.status === 'New').length,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 text-slate-800 font-sans">
      <div className="max-w-[1500px] mx-auto">

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-slate-800">
              <Users size={24} className="text-slate-600" />
              ACE LeadFlow
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              {lastImported ? `Last imported: ${lastImported}` : 'No data imported yet'}
            </p>
          </div>
          <button
            onClick={() => setIsImporting(!isImporting)}
            className="bg-slate-800 text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-slate-700 transition-colors"
          >
            {isImporting ? 'Close' : 'Import Excel Data'}
          </button>
        </div>

        {/* Import Panel */}
        {isImporting && (
          <div className="mb-8 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3 text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <AlertCircle size={15} />
              <p className="text-xs font-medium">
                Paste your Office Script JSON output below. Hidden Excel characters will be stripped automatically.
              </p>
            </div>
            <textarea
              className="w-full h-40 p-4 border border-slate-200 rounded-lg font-mono text-xs mb-4 outline-none bg-slate-50 focus:ring-2 ring-slate-300"
              placeholder='Paste JSON starting with [ ...'
              value={importText}
              onChange={e => setImportText(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsImporting(false)} className="font-medium text-sm text-slate-400 hover:text-slate-600">
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={isProcessing}
                className="bg-slate-800 text-white px-6 py-2 rounded-lg font-semibold text-sm hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                {isProcessing ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw size={12} className="animate-spin" /> Syncing...
                  </span>
                ) : 'Sync Leads'}
              </button>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Leads',   value: kpis.total },
            { label: 'Outreach Sent', value: kpis.outreachSent },
            { label: 'Replies',       value: kpis.replies },
            { label: 'New Leads',     value: kpis.newLeads },
          ].map((k, i) => (
            <div key={i} className="bg-white p-5 rounded-xl border border-slate-200">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">{k.label}</p>
              <p className="font-bold text-3xl text-slate-800">{k.value}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
          <input
            type="text"
            placeholder="Search by name, email, or company..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 ring-slate-200"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Program Filter */}
        <div className="mb-6 flex flex-wrap gap-1.5 items-center">
          <button
            onClick={() => { setSelectedProgram('All'); setMultiCourseOnly(false); }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
              selectedProgram === 'All' && !multiCourseOnly
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
            }`}
          >
            All
          </button>
          {PROGRAMS.map(p => (
            <button
              key={p}
              onClick={() => { setSelectedProgram(p); setMultiCourseOnly(false); }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                selectedProgram === p && !multiCourseOnly
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => { setMultiCourseOnly(!multiCourseOnly); setSelectedProgram('All'); }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
              multiCourseOnly
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
            }`}
          >
            Multi-Course
          </button>
        </div>

        {/* Toolbar: selection count + delete */}
        {selected.size > 0 && (
          <div className="mb-3 flex items-center gap-3 px-4 py-2.5 bg-white border border-slate-200 rounded-lg">
            <span className="text-sm font-semibold text-slate-700">{selected.size} selected</span>
            <button
              onClick={() => setShowDeleteModal(true)}
              disabled={isDeleting}
              className="flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              <Trash2 size={14} />
              Delete selected
            </button>
          </div>
        )}

        {/* Leads Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3">Name & Title</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Courses</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {filteredLeads.map((l, idx) => (
                <tr
                  key={`${l.email}-${idx}`}
                  className={`hover:bg-slate-50 transition-colors ${selected.has(l.email) ? 'bg-slate-50' : ''}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(l.email)}
                      onChange={() => toggleSelectOne(l.email)}
                      className="rounded border-slate-300 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800">{l.name || '—'}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{l.job_title || '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{l.company || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{l.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {l.program.split(/,\s*/).filter(Boolean).map(p => (
                        <span
                          key={p}
                          className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-semibold uppercase"
                        >
                          {p.trim()}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleStatus(l.email, l.status)}
                      className={`px-3 py-1 rounded-md font-semibold text-xs border transition-colors hover:opacity-80 ${
                        STATUS_STYLE[l.status] || STATUS_STYLE['New']
                      }`}
                      title="Click to advance status"
                    >
                      {l.status || 'New'}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-16 text-center text-slate-300 text-sm font-medium">
                    {leads.length === 0
                      ? 'No leads yet. Import your Excel data to get started.'
                      : 'No leads match your current filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-center text-xs text-slate-300">
          Showing {filteredLeads.length} of {leads.length} leads
        </p>

      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-50 p-2 rounded-lg">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <h2 className="font-bold text-slate-800">Delete {selected.size} lead{selected.size > 1 ? 's' : ''}?</h2>
            </div>
            <p className="text-sm text-slate-500 mb-6">
              This will permanently remove {selected.size === 1 ? 'this lead' : `these ${selected.size} leads`} from the dashboard. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
