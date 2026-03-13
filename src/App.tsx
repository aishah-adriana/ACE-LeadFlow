import React, { useState, useEffect } from 'react';
import { Users, Search, Download, Trash2, Mail } from 'lucide-react';

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
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const programs = [
    { id: 'All', name: 'All Courses' },
    { id: 'SO', name: 'Systems Optimization' },
    { id: 'OM', name: 'Operations Management' },
    { id: 'AIBL', name: 'AI for Business Leaders' },
    { id: 'CF', name: 'Corporate Finance' },
    { id: 'PM', name: 'Portfolio Management' },
    { id: 'OB', name: 'Organizational Behavior' },
    { id: 'SP', name: 'Scenario Planning' },
    { id: 'FA', name: 'Financial Accounting' },
    { id: 'ME', name: 'Managerial Economics' },
    { id: 'TIL', name: 'Technology & Innovation Leadership' },
    { id: 'SFBL', name: 'Sustainability for Business Leaders' },
    { id: 'PMD', name: 'Platforms: Marketplaces and Digitization' },
    { id: 'QM', name: 'Quantitative Methods' }
  ];

  const fetchLeads = async () => {
    try {
      const res = await fetch(`/api/leads?t=${Date.now()}`);
      const data = await res.json();
      setLeads(data || []);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleImport = async () => {
    if (!importText || isProcessing) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: importText,
      });
      if (res.ok) {
        setImportText('');
        setIsImporting(false);
        await fetchLeads();
      }
    } catch (err) {
      alert("Import failed. Check data format.");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleStatus = async (email: string, current: string) => {
    const cycle: Record<string, string> = { 
      'New': 'Uncontactable', 
      'Uncontactable': 'Contacted', 
      'Contacted': 'Replied', 
      'Replied': 'New' 
    };
    const next = cycle[current] || 'New';

    // Optimistic UI Update
    setLeads(prev => prev.map(l => l.email === email ? { ...l, status: next } : l));

    try {
      await fetch('/api/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, status: next }),
      });
    } catch (err) {
      fetchLeads(); // Revert on error
    }
  };

  const deleteSelected = async () => {
    if (!window.confirm(`Delete ${selectedEmails.length} leads?`)) return;
    const res = await fetch('/api/leads', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails: selectedEmails }),
    });
    if (res.ok) {
      setSelectedEmails([]);
      await fetchLeads();
    }
  };

  // Logic: Filter data first, then calculate KPIs based on that filtered data
  const filteredLeads = leads.filter(l => 
    (l.name + l.email + l.company).toLowerCase().includes(searchTerm.toLowerCase()) &&
    (selectedProgram === 'All' || l.program.includes(selectedProgram))
  );

  const kpis = {
    total: filteredLeads.length,
    contacted: filteredLeads.filter(l => l.status === 'Contacted').length,
    uncontactable: filteredLeads.filter(l => l.status === 'Uncontactable').length,
    replied: filteredLeads.filter(l => l.status === 'Replied').length,
    asOf: leads.length > 0 ? leads[0].pasted_at : '---'
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <div className="max-w-[1600px] mx-auto flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black flex items-center gap-3">
          <Users className="text-blue-600" size={32} /> ACE LeadFlow
        </h1>
        <button 
          onClick={() => setIsImporting(!isImporting)} 
          className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 shadow-lg transition-all flex items-center gap-2"
        >
          <Download size={20} /> Import Excel Data
        </button>
      </div>

      {isImporting && (
        <div className="max-w-[1600px] mx-auto mb-8 bg-white p-6 rounded-2xl border-2 border-blue-100 shadow-xl">
          <textarea 
            className="w-full h-32 p-4 border rounded-xl font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
            placeholder="Paste JSON here..." 
            value={importText} 
            onChange={e => setImportText(e.target.value)} 
          />
          <div className="flex justify-end mt-3 gap-2">
            <button onClick={() => setIsImporting(false)} className="px-4 py-2 font-bold text-slate-400">Cancel</button>
            <button 
              onClick={handleImport} 
              disabled={isProcessing}
              className={`px-8 py-2 rounded-xl font-bold transition-all ${isProcessing ? 'bg-slate-300' : 'bg-slate-900 text-white'}`}
            >
              {isProcessing ? 'Syncing...' : 'Process Import'}
            </button>
          </div>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto grid grid-cols-5 gap-4 mb-8">
        {[
          { l: 'Total Leads', v: kpis.total, c: 'text-blue-600' },
          { l: 'Contacted', v: kpis.contacted, c: 'text-indigo-600' },
          { l: 'Uncontactable', v: kpis.uncontactable, c: 'text-slate-500' },
          { l: 'Replies', v: kpis.replied, c: 'text-emerald-600' },
          { l: 'Last Imported As Of', v: kpis.asOf, small: true, c: 'text-orange-600' }
        ].map((k, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{k.l}</p>
            <p className={`font-black ${k.c} ${k.small ? 'text-xs' : 'text-4xl'}`}>{k.v}</p>
          </div>
        ))}
      </div>

      <div className="max-w-[1600px] mx-auto mb-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap gap-2">
          {programs.map(p => (
            <button 
              key={p.id} 
              onClick={() => setSelectedProgram(p.id)} 
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${selectedProgram === p.id ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-blue-300'}`}
            >
              {p.id === 'All' ? p.name : `${p.id}: ${p.name}`}
            </button>
          ))}
        </div>
        <div className="flex gap-4 pt-4 border-t">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search..." 
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
          {selectedEmails.length > 0 && (
            <button onClick={deleteSelected} className="bg-red-50 text-red-600 px-6 py-3 rounded-xl font-bold border border-red-100 hover:bg-red-100 flex items-center gap-2 transition-all">
              <Trash2 size={20} /> Delete Selected ({selectedEmails.length})
            </button>
          )}
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-black text-slate-400 tracking-widest">
              <th className="p-4 w-12 text-center">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 accent-blue-600" 
                  checked={selectedEmails.length === filteredLeads.length && filteredLeads.length > 0} 
                  onChange={() => setSelectedEmails(selectedEmails.length === filteredLeads.length ? [] : filteredLeads.map(l => l.email))} 
                />
              </th>
              <th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4">Position</th><th className="p-4">Company</th><th className="p-4">Interests</th><th className="p-4 text-center">Status Control</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-sm">
            {filteredLeads.map(l => (
              <tr key={l.email} className={`hover:bg-blue-50/20 transition-colors ${selectedEmails.includes(l.email) ? 'bg-blue-50/50' : ''}`}>
                <td className="p-4 text-center">
                  <input type="checkbox" className="w-5 h-5 accent-blue-600" checked={selectedEmails.includes(l.email)} onChange={() => setSelectedEmails(prev => prev.includes(l.email) ? prev.filter(e => e !== l.email) : [...prev, l.email])} />
                </td>
                <td className="p-4 font-bold text-slate-900">{l.name}</td>
                <td className="p-4"><a href={`mailto:${l.email}`} className="text-blue-600 flex items-center gap-1.5 hover:underline"><Mail size={14} />{l.email}</a></td>
                <td className="p-4 text-slate-500 font-bold uppercase tracking-tight">{l.job_title}</td>
                <td className="p-4 text-slate-500 font-bold">{l.company}</td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1">
                    {l.program.split(', ').map(p => <span key={p} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-black border border-slate-200">{p}</span>)}
                  </div>
                </td>
                <td className="p-4 text-center">
                  <button 
                    onClick={() => toggleStatus(l.email, l.status)} 
                    className={`w-36 py-2 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${
                      l.status === 'New' ? 'bg-amber-400 border-amber-500 text-white' : 
                      l.status === 'Uncontactable' ? 'bg-slate-400 border-slate-500 text-white' : 
                      l.status === 'Contacted' ? 'bg-blue-500 border-blue-600 text-white' : 
                      'bg-emerald-500 border-emerald-600 text-white'
                    }`}
                  >
                    {l.status}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default App;