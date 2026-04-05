import React, { useState, useEffect } from 'react';
import { Users, Search, AlertCircle, RefreshCw } from 'lucide-react';

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
  New:            'text-blue-600 border-blue-100 bg-blue-50',
  Contacted:      'text-green-700 border-green-200 bg-green-50',
  Replied:        'text-emerald-600 border-emerald-100 bg-emerald-50',
  Uncontactable:  'text-orange-500 border-orange-100 bg-orange-50',
  Duplicate:      'text-red-600 border-red-100 bg-red-50',
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

  const filteredLeads = leads.filter(l => {
    const matchesSearch = (l.name + l.email + l.company)
      .toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProgram = selectedProgram === 'All' || l.program.includes(selectedProgram);
    const matchesMulti = !multiCourseOnly || l.program.includes(',');
    return matchesSearch && matchesProgram && matchesMulti;
  });

  const kpis = {
    total: leads.length,
    outreachSent: leads.filter(l => l.status === 'Contacted' || l.status === 'Replied').length,
    replies: leads.filter(l => l.status === 'Replied').length,
    newLeads: leads.filter(l => l.status === 'New').length,
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-900 font-sans">
      <div className="max-w-[1400px] mx-auto">

        {/* Header */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase flex items-center gap-3 text-slate-800">
              <Users className="text-blue-600" size={32} />
              ACE LeadFlow
            </h1>
            {lastImported ? (
              <p className="mt-1 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                Data as of: {lastImported}
              </p>
            ) : (
              <p className="mt-1 text-[11px] font-semibold text-slate-300 uppercase tracking-widest">
                No data imported yet
              </p>
            )}
          </div>
          <button
            onClick={() => setIsImporting(!isImporting)}
            className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-sm uppercase shadow-xl hover:bg-blue-700 transition-all active:scale-95"
          >
            {isImporting ? 'Close' : 'Import Excel Data'}
          </button>
        </div>

        {/* Import Panel */}
        {isImporting && (
          <div className="mb-10 bg-white p-6 rounded-3xl border shadow-xl">
            <div className="flex items-center gap-2 mb-3 text-blue-600 bg-blue-50 p-3 rounded-xl border border-blue-100">
              <AlertCircle size={16} />
              <p className="text-[10px] font-bold uppercase tracking-tight">
                Paste your Office Script JSON output below. Hidden Excel characters will be stripped automatically.
              </p>
            </div>
            <textarea
              className="w-full h-40 p-4 border rounded-2xl font-mono text-xs mb-4 outline-none bg-slate-50 focus:ring-2 ring-blue-500"
              placeholder='Paste JSON starting with [ ...'
              value={importText}
              onChange={e => setImportText(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsImporting(false)} className="font-bold text-slate-400">
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={isProcessing}
                className="bg-slate-900 text-white px-8 py-2 rounded-xl font-bold uppercase text-xs hover:bg-black transition-all disabled:opacity-50"
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
            { label: 'Total Leads',    value: kpis.total,        color: 'text-blue-600' },
            { label: 'Outreach Sent',  value: kpis.outreachSent, color: 'text-indigo-600' },
            { label: 'Replies',        value: kpis.replies,       color: 'text-emerald-600' },
            { label: 'New Leads',      value: kpis.newLeads,      color: 'text-amber-500' },
          ].map((k, i) => (
            <div key={i} className="bg-white p-6 rounded-[30px] border shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{k.label}</p>
              <p className={`font-black text-4xl ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input
            type="text"
            placeholder="Search by name, email, or company..."
            className="w-full pl-12 pr-4 py-3 bg-white border rounded-2xl outline-none focus:ring-2 ring-blue-100"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Program Filter + Multi-Course Toggle */}
        <div className="mb-8 flex flex-wrap gap-2 items-center">
          <button
            onClick={() => { setSelectedProgram('All'); setMultiCourseOnly(false); }}
            className={`px-4 py-2 rounded-full text-[10px] font-black uppercase border transition-all ${
              selectedProgram === 'All' && !multiCourseOnly
                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                : 'bg-white text-slate-400 hover:border-slate-300'
            }`}
          >
            All
          </button>
          {PROGRAMS.map(p => (
            <button
              key={p}
              onClick={() => { setSelectedProgram(p); setMultiCourseOnly(false); }}
              className={`px-4 py-2 rounded-full text-[10px] font-black uppercase border transition-all ${
                selectedProgram === p && !multiCourseOnly
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : 'bg-white text-slate-400 hover:border-slate-300'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => { setMultiCourseOnly(!multiCourseOnly); setSelectedProgram('All'); }}
            className={`px-4 py-2 rounded-full text-[10px] font-black uppercase border transition-all ${
              multiCourseOnly
                ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                : 'bg-white text-orange-400 border-orange-200 hover:border-orange-300'
            }`}
          >
            Multi-Course
          </button>
        </div>

        {/* Leads Table */}
        <div className="bg-white rounded-[40px] shadow-sm border overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b text-[10px] uppercase font-black text-slate-400">
              <tr>
                <th className="p-6">Lead Details</th>
                <th className="p-6">Email Address</th>
                <th className="p-6">Course Interests</th>
                <th className="p-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {filteredLeads.map((l, idx) => (
                <tr key={`${l.email}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-6">
                    <div className="font-black text-slate-900">{l.name || '—'}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase leading-tight">
                      {[l.job_title, l.company].filter(Boolean).join(' @ ') || '—'}
                    </div>
                  </td>
                  <td className="p-6 font-mono text-[11px] text-slate-400">{l.email}</td>
                  <td className="p-6">
                    <div className="flex flex-wrap gap-1">
                      {l.program.split(/,\s*/).filter(Boolean).map(p => (
                        <span
                          key={p}
                          className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-black border border-blue-100 uppercase"
                        >
                          {p.trim()}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-6">
                    <button
                      onClick={() => toggleStatus(l.email, l.status)}
                      className={`px-4 py-1.5 rounded-lg font-black text-[9px] uppercase border transition-all hover:opacity-80 ${
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
                  <td colSpan={4} className="p-20 text-center text-slate-300 font-bold uppercase tracking-widest">
                    {leads.length === 0
                      ? 'No leads yet. Import your Excel data to get started.'
                      : 'No leads match your current filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-[10px] text-slate-300 font-bold uppercase tracking-widest">
          Showing {filteredLeads.length} of {leads.length} leads
        </p>

      </div>
    </div>
  );
};

export default App;
