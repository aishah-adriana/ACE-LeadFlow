import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Download, Trash2, Filter, 
  CheckCircle2, MessageSquare, AlertCircle, 
  ChevronRight, Calculator, XCircle
} from 'lucide-react';

interface Lead {
  email: string;
  name: string;
  company: string;
  job_title: string;
  program: string;
  status: string;
  pasted_at: string;
}

const App = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('All');
  const [showNewOnly, setShowNewOnly] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const programs = ['All', 'SO', 'OM', 'AIBL', 'CF', 'PM', 'OB', 'SP', 'FA', 'ME', 'TIL', 'SFBL', 'PMD', 'QM'];

  // 1. Fetch from Vercel/Neon Cloud
  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/leads');
      const data = await res.json();
      setLeads(data || []);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // 2. Import Logic (Smart Merge)
  const handleImport = async () => {
    try {
      const jsonData = JSON.parse(importText);
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonData),
      });
      setImportText('');
      setIsImporting(false);
      fetchLeads();
    } catch (err) {
      alert("Invalid JSON format. Please check your Excel Office Script output.");
    }
  };

  // 3. Status Cycle (New -> Uncontactable -> Contacted -> Replied)
  const toggleStatus = async (email: string, currentStatus: string) => {
    const cycle: Record<string, string> = { 
      'New': 'Uncontactable', 
      'Uncontactable': 'Contacted', 
      'Contacted': 'Replied', 
      'Replied': 'New' 
    };
    const nextStatus = cycle[currentStatus] || 'New';

    await fetch('/api/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, status: nextStatus }),
    });
    fetchLeads();
  };

  // 4. Delete Logic
  const deleteSelected = async () => {
    if (!window.confirm(`Delete ${selectedEmails.length} leads?`)) return;
    await fetch('/api/leads', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails: selectedEmails }),
    });
    setSelectedEmails([]);
    fetchLeads();
  };

  const toggleSelect = (email: string) => {
    setSelectedEmails(prev => 
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  // 5. Deep-Scan Logic for the Department
  const getSelectedStats = () => {
    const selectedLeads = leads.filter(l => selectedEmails.includes(l.email));
    const counts: Record<string, number> = {};
    selectedLeads.forEach(l => {
      l.program.split(', ').forEach(p => {
        counts[p] = (counts[p] || 0) + 1;
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  };

  // 6. Filtering Logic
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProgram = selectedProgram === 'All' || lead.program.includes(selectedProgram);
    const matchesNew = !showNewOnly || lead.status === 'New';
    return matchesSearch && matchesProgram && matchesNew;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Users className="text-blue-600" size={32} />
            ACE LeadFlow
          </h1>
          <p className="text-slate-500 mt-1">Departmental Lead Management Dashboard</p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => setIsImporting(!isImporting)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
          >
            <Download size={18} /> Import Excel Data
          </button>
          {selectedEmails.length > 0 && (
            <button 
              onClick={deleteSelected}
              className="bg-red-50 text-red-600 px-4 py-2 rounded-lg flex items-center gap-2 border border-red-200 hover:bg-red-100 transition"
            >
              <Trash2 size={18} /> Delete ({selectedEmails.length})
            </button>
          )}
        </div>
      </div>

      {/* Import Modal */}
      {isImporting && (
        <div className="max-w-7xl mx-auto mb-8 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <textarea
            placeholder="Paste JSON from Excel Office Script here..."
            className="w-full h-32 p-4 border border-slate-200 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
          <div className="flex justify-end mt-3 gap-2">
            <button onClick={() => setIsImporting(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg">Cancel</button>
            <button onClick={handleImport} className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800">Process Import</button>
          </div>
        </div>
      )}

      {/* KPI Cards & Deep Scan */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Leads</p>
          <p className="text-3xl font-bold text-slate-900">{leads.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm col-span-1 lg:col-span-3">
          <div className="flex items-center gap-2 mb-3 text-slate-500 font-medium">
            <Calculator size={18} /> Selection Deep-Scan
          </div>
          <div className="flex flex-wrap gap-3">
            {selectedEmails.length === 0 ? (
              <p className="text-slate-400 text-sm italic">Select leads to see course breakdown</p>
            ) : (
              getSelectedStats().map(([prog, count]) => (
                <div key={prog} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-semibold border border-blue-100">
                  {prog}: {count}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-wrap gap-4 items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex-1 min-w-[300px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search name, email, or company..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedProgram}
          onChange={(e) => setSelectedProgram(e.target.value)}
        >
          {programs.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button 
          onClick={() => setShowNewOnly(!showNewOnly)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${showNewOnly ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
        >
          <Filter size={18} /> {showNewOnly ? 'Focus Mode ON' : 'Show New Only'}
        </button>
        {selectedEmails.length > 0 && (
          <button onClick={() => setSelectedEmails([])} className="text-sm text-slate-400 hover:text-slate-600 underline decoration-slate-200">
            Deselect All
          </button>
        )}
      </div>

      {/* Main Table */}
      <div className="max-w-7xl mx-auto bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="p-4 w-10"></th>
              <th className="p-4 font-semibold text-slate-600">Lead Info</th>
              <th className="p-4 font-semibold text-slate-600 text-center">Program Interest</th>
              <th className="p-4 font-semibold text-slate-600 text-center">Status</th>
              <th className="p-4 font-semibold text-slate-600">Last Imported</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLeads.map((lead) => (
              <tr 
                key={lead.email} 
                className={`hover:bg-slate-50/50 transition cursor-pointer ${selectedEmails.includes(lead.email) ? 'bg-blue-50/30' : ''}`}
                onClick={() => toggleSelect(lead.email)}
              >
                <td className="p-4" onClick={(e) => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    checked={selectedEmails.includes(lead.email)}
                    onChange={() => toggleSelect(lead.email)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="p-4">
                  <div className="font-bold text-slate-900">{lead.name}</div>
                  <div className="text-sm text-slate-500 flex items-center gap-1 group">
                    <a 
                      href={`mailto:${lead.email}`} 
                      className="hover:text-blue-600 underline underline-offset-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {lead.email}
                    </a>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{lead.company} • {lead.job_title}</div>
                </td>
                <td className="p-4 text-center">
                  <div className="flex flex-wrap gap-1 justify-center">
                    {lead.program.split(', ').map(p => (
                      <span key={p} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wider border border-slate-200">
                        {p}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-4 text-center">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStatus(lead.email, lead.status);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${
                      lead.status === 'New' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                      lead.status === 'Uncontactable' ? 'bg-slate-100 text-slate-500 border border-slate-200' :
                      lead.status === 'Contacted' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                      'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    }`}
                  >
                    {lead.status === 'New' && <AlertCircle size={14} />}
                    {lead.status === 'Uncontactable' && <XCircle size={14} />}
                    {lead.status === 'Contacted' && <MessageSquare size={14} />}
                    {lead.status === 'Replied' && <CheckCircle2 size={14} />}
                    {lead.status.toUpperCase()}
                  </button>
                </td>
                <td className="p-4 text-sm text-slate-500 italic">
                  {lead.pasted_at}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredLeads.length === 0 && (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <Search size={40} className="text-slate-200" />
            No leads match your current filter.
          </div>
        )}
      </div>
    </div>
  );
};

export default App;