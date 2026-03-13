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

  const programs = ['All', 'SO', 'OM', 'AIBL', 'CF', 'PM', 'OB', 'SP', 'FA', 'ME', 'TIL', 'SFBL', 'PMD', 'QM'];

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
      setAiDraft(data.draft || "No draft generated.");
    } catch (err) {
      setAiDraft("Error: Make sure GEMINI_API_KEY is added to Vercel Environment Variables.");
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

  const filteredLeads = leads.filter(l => 
    (l.name + l.email + l.company).toLowerCase().includes(searchTerm.toLowerCase()) &&
    (selectedProgram === 'All' || l.program.includes(selectedProgram))
  );

  const kpis = {
    total: filteredLeads.length,
    contacted: filteredLeads.filter(l => l.status === 'Contacted').length,
    replied: filteredLeads.filter(l => l.status === 'Replied').length,
    asOf: leads.length > 0 ? leads[0].pasted_at : '---'
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-900 font-sans">
      {/* AI MODAL */}
      {showAiModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl p-8 border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-xl flex items-center gap-2 text-blue-600"><Sparkles /> AI Email Draft</h3>
              <button onClick={() => setShowAiModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X /></button>
            </div>
            {isDrafting ? (
              <div className="py-12 text-center flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="font-bold text-slate-400">Gemini is writing...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-slate-50 p-6 rounded-2xl border italic text-slate-700 leading-relaxed whitespace-pre-wrap">{aiDraft}</div>
                <button 
                  onClick={() => { navigator.clipboard.writeText(aiDraft); setCopied(true); setTimeout(() => setCopied(false), 2000); }} 
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                >
                  {copied ? "COPIED TO CLIPBOARD!" : "COPY DRAFT"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="max-w-[1400px] mx-auto flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
          <Users className="text-blue-600" size={32} /> ACE LeadFlow <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-md uppercase">AI Enabled</span>
        </h1>
        <button onClick={() => setIsImporting(!isImporting)} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-200 hover:scale-105 transition-transform">
          Import Excel Data
        </button>
      </div>

      {/* KPIs */}
      <div className="max-w-[1400px] mx-auto grid grid-cols-4 gap-4 mb-8">
        {[
          { l: 'Total Leads', v: kpis.total, c: 'text-blue-600' },
          { l: 'Contacted', v: kpis.contacted, c: 'text-indigo-600' },
          { l: 'Replies', v: kpis.replied, c: 'text-emerald-600' },
          { l: 'Last Sync', v: kpis.asOf, small: true, c: 'text-orange-600' }
        ].map((k, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{k.l}</p>
            <p className={`font-black ${k.c} ${k.small ? 'text-xs' : 'text-4xl'}`}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* FILTER BUTTONS */}
      <div className="max-w-[1400px] mx-auto mb-6 bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap gap-2">
        {programs.map(p => (
          <button key={p} onClick={() => setSelectedProgram(p)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${selectedProgram === p ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-slate-50 text-slate-500 hover:border-blue-300'}`}>
            {p}
          </button>
        ))}
      </div>

      {/* TABLE */}
      <div className="max-w-[1400px] mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400 tracking-widest">
            <tr>
              <th className="p-4 w-12 text-center"><input type="checkbox" className="w-5 h-5 accent-blue-600" /></th>
              <th className="p-4">Name</th>
              <th className="p-4">Contact & AI Assistant</th>
              <th className="p-4">Company Info</th>
              <th className="p-4 text-center">Status Control</th>
            </tr>
          </thead>
          <tbody className="text-sm font-medium">
            {filteredLeads.map(l => (
              <tr key={l.email} className="border-b border-slate-50 hover:bg-blue-50/20 transition-colors">
                <td className="p-4 text-center"><input type="checkbox" className="w-5 h-5 accent-blue-600" /></td>
                <td className="p-4 font-black text-slate-900">{l.name}</td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <a href={`mailto:${l.email}`} className="text-blue-600 font-bold hover:underline flex items-center gap-1">
                      <Mail size={14}/> {l.email}
                    </a>
                    <button 
                      onClick={() => generateDraft(l)} 
                      className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase hover:bg-blue-700 shadow-md shadow-blue-100 transition-all"
                    >
                      <Sparkles size={12}/> Draft Email
                    </button>
                  </div>
                </td>
                <td className="p-4">
                  <div className="text-slate-800 font-bold text-xs uppercase">{l.job_title}</div>
                  <div className="text-slate-400 text-[10px] font-black">{l.company}</div>
                </td>
                <td className="p-4 text-center">
                  <button onClick={() => toggleStatus(l.email, l.status)} className="w-36 py-2 rounded-xl text-[10px] font-black uppercase text-white bg-blue-500 shadow-sm">
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