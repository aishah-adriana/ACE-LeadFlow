import React, { useState, useEffect } from 'react';
import { Users, Search, Download, Trash2, Mail, Sparkles, X, Copy, Check } from 'lucide-react';

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

  // AI State
  const [aiDraft, setAiDraft] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [copied, setCopied] = useState(false);

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
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchLeads(); }, []);

  const handleImport = async () => {
    if (!importText || isProcessing) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: importText,
      });
      if (res.ok) { setImportText(''); setIsImporting(false); await fetchLeads(); }
    } catch (err) { alert("Import failed."); } finally { setIsProcessing(false); }
  };

  const generateDraft = async (lead: Lead) => {
    setIsDrafting(true);
    setAiDraft('');
    setShowAiModal(true);
    try {
      const res = await fetch('/api/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: lead.name,
          position: lead.job_title,
          company: lead.company,
          interests: lead.program
        }),
      });
      const data = await res.json();
      setAiDraft(data.draft);
    } catch (err) {
      setAiDraft("Failed to generate draft. Please check your API key in Vercel.");
    } finally {
      setIsDrafting(false);
    }
  };

  const toggleStatus = async (email: string, current: string) => {
    const cycle: Record<string, string> = { 'New': 'Uncontactable', 'Uncontactable': 'Contacted', 'Contacted': 'Replied', 'Replied': 'New' };
    const next = cycle[current] || 'New';
    setLeads(prev => prev.map(l => l.email === email ? { ...l, status: next } : l));
    await fetch('/api/status', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, status: next }) });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(aiDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
    <div className="min-h-screen bg-slate-50 p-8 text-slate-900 font-sans">
      {/* AI DRAFT MODAL */}
      {showAiModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-xl flex items-center gap-2"><Sparkles className="text-blue-600"/> AI Email Draft</h3>
              <button onClick={() => setShowAiModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
            </div>
            <div className="p-8">
              {isDrafting ? (
                <div className="flex flex-col items-center py-12 gap-4">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="font-bold text-slate-400">Gemini is analyzing lead context...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 min-h-[150px] whitespace-pre-wrap text-lg leading-relaxed italic text-slate-700">
                    {aiDraft}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={copyToClipboard} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-800 transition-all">
                      {copied ? <><Check size={20}/> Copied!</> : <><Copy size={20}/> Copy Draft</>}
                    </button>
                    <button onClick={() => setShowAiModal(false)} className="px-8 py-4 border-2 border-slate-200 rounded-2xl font-black text-slate-400 hover:bg-slate-50">Close</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="max-w-[1600px] mx-auto flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3"><Users className="text-blue-600" size={32} /> ACE LeadFlow</h1>
        <button onClick={() => setIsImporting(!isImporting)} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all">
          <Download size={20} /> Import Excel Data
        </button>
      </div>

      {isImporting && (
        <div className="max-w-[1600px] mx-auto mb-8 bg-white p-6 rounded-2xl border-2 border-blue-100 shadow-xl">
          <textarea className="w-full h-32 p-4 border rounded-xl font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Paste JSON..." value={importText} onChange={e => setImportText(e.target.value)} />
          <div className="flex justify-end mt-3 gap-2">
            <button onClick={() => setIsImporting(false)} className="px-4 py-2 font-bold text-slate-400">Cancel</button>
            <button onClick={handleImport} disabled={isProcessing} className={`px-8 py-2 rounded-xl font-bold text-white transition-all ${isProcessing ? 'bg-slate-300' : 'bg-slate-900 hover:bg-slate-800'}`}>
              {isProcessing ? 'Syncing...' : 'Process Import'}
            </button>
          </div>
        </div>
      )}

      {/* KPI SECTION */}
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

      {/* FILTER & SEARCH */}
      <div className="max-w-[1600px] mx-auto mb-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap gap-2">
          {programs.map(p => (
            <button key={p.id} onClick={() => setSelectedProgram(p.id)} className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${selectedProgram === p.id ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-blue-300'}`}>
              {p.id === 'All' ? p.name : `${p.id}: ${p.name}`}
            </button>
          ))}
        </div>
        <div className="flex gap-4 pt-4 border-t">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input type="text" placeholder="Search leads..." className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </div>
      </div>

      {/* MAIN DATA TABLE */}
      <div className="max-w-[1600px] mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-black text-slate-400 tracking-widest">
              <th className="p-4 w-12 text-center">
                <input type="checkbox" className="w-5 h-5 accent-blue-600" />
              </th>
              <th className="p-4">Name</th>
              <th className="p-4">Email & AI</th>
              <th className="p-4">Position & Company</th>
              <th className="p-4">Interests</th>
              <th className="p-4 text-center">Status Control</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-sm">
            {filteredLeads.map(l => (
              <tr key={l.email} className={`hover:bg-blue-50/20 transition-colors`}>
                <td className="p-4 text-center">
                  <input type="checkbox" className="w-5 h-5 accent-blue-600" />
                </td>
                <td className="p-4 font-black text-slate-900">{l.name}</td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <a href={`mailto:${l.email}`} className="text-blue-600 flex items-center gap-1.5 hover:underline font-bold">
                      <Mail size={14} /> {l.email}
                    </a>
                    {/* THIS IS THE DRAFT BUTTON */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); generateDraft(l); }}
                      className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all border border-blue-100 flex items-center gap-1 text-[10px] font-black uppercase"
                    >
                      <Sparkles size={12} /> Draft
                    </button>
                  </div>
                </td>
                <td className="p-4">
                   <div className="text-slate-800 font-bold text-xs uppercase">{l.job_title}</div>
                   <div className="text-slate-400 text-[10px] font-black">{l.company}</div>
                </td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1">
                    {l.program.split(', ').map(p => <span key={p} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-black border border-slate-200">{p}</span>)}
                  </div>
                </td>
                <td className="p-4 text-center">
                  <button onClick={() => toggleStatus(l.email, l.status)} className={`w-36 py-2 rounded-xl text-[10px] font-black uppercase border-2 shadow-sm transition-all ${
                    l.status === 'New' ? 'bg-amber-400 border-amber-500 text-white' : 
                    l.status === 'Uncontactable' ? 'bg-slate-400 border-slate-500 text-white' : 
                    l.status === 'Contacted' ? 'bg-blue-500 border-blue-600 text-white' : 
                    'bg-emerald-500 border-emerald-600 text-white'
                  }`}>
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