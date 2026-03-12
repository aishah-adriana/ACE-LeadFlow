import { useState, useEffect } from 'react';
import { Mail, Trash2, CheckCircle, Users, MessageSquare, XCircle, ExternalLink, Calculator, RotateCcw, Clock } from 'lucide-react';

const COURSES = ["SO", "OM", "AIBL", "CF", "PM", "OB", "SP", "FA", "ME", "TIL", "SFBL", "PMD", "QM"];

export default function App() {
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyNew, setShowOnlyNew] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [pasteData, setPasteData] = useState('');

  const fetchLeads = async () => {
    const res = await fetch('http://localhost:3001/api/leads');
    const data = await res.json();
    setLeads(data);
  };

  useEffect(() => { fetchLeads(); }, []);

  const filteredLeads = leads.filter(l => {
    const matchesCourse = activeFilter === 'All' ? true : l.program.includes(activeFilter);
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = l.name.toLowerCase().includes(searchLower) || l.email.toLowerCase().includes(searchLower) || l.company.toLowerCase().includes(searchLower);
    const matchesNewOnly = showOnlyNew ? l.status === 'New' : true;
    return matchesCourse && matchesSearch && matchesNewOnly;
  });

  const lastUpdate = leads.length > 0 ? leads[0].pasted_at : 'No data recorded';

  const stats = {
    total: filteredLeads.length,
    contacted: filteredLeads.filter(l => l.status === 'Contacted').length,
    replied: filteredLeads.filter(l => l.status === 'Replied').length,
    uncontactable: filteredLeads.filter(l => l.status === 'Uncontactable').length
  };

  const toggleStatus = async (email: string, currentStatus: string) => {
    const cycle: Record<string, string> = { 'New': 'Uncontactable', 'Uncontactable': 'Contacted', 'Contacted': 'Replied', 'Replied': 'New' };
    await fetch(`http://localhost:3001/api/leads/${email}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: cycle[currentStatus] || 'New' }),
    });
    fetchLeads();
  };

  const countSelected = () => {
    const selectedData = leads.filter(l => selectedEmails.includes(l.email));
    const courseBreakdown: Record<string, number> = {};
    selectedData.forEach(lead => {
      lead.program.split(', ').forEach((p: string) => courseBreakdown[p] = (courseBreakdown[p] || 0) + 1);
    });
    const breakdownString = Object.entries(courseBreakdown).map(([c, count]) => `${c}: ${count}`).join('\n');
    alert(`Selection Summary:\n-------------------\nTotal Unique Leads: ${selectedData.length}\n\nBreakdown:\n${breakdownString}`);
  };

  const deleteSelected = async () => {
    if (!window.confirm(`Delete ${selectedEmails.length} leads?`)) return;
    await fetch('http://localhost:3001/api/leads/delete-multiple', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emails: selectedEmails }) });
    setSelectedEmails([]); fetchLeads();
  };

  return (
    <div style={{ padding: '30px', backgroundColor: '#f3f4f6', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0, color: '#111827' }}>ACE LeadFlow</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280', fontSize: '13px', marginTop: '5px' }}>
            <Clock size={14} /> <span>Last Import (MYT): <strong>{lastUpdate}</strong></span>
          </div>
        </div>
        <button onClick={() => setIsImporting(!isImporting)} style={{ backgroundColor: '#000', color: '#fff', padding: '12px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
          {isImporting ? 'Close' : 'Import Excel Data'}
        </button>
      </header>

      {/* KPI Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
        {[
          { label: 'Visible Leads', val: stats.total, icon: <Users size={20}/>, color: '#2563eb' },
          { label: 'Uncontactable', val: stats.uncontactable, icon: <XCircle size={20}/>, color: '#ef4444' },
          { label: 'Contacted', val: stats.contacted, icon: <CheckCircle size={20}/>, color: '#16a34a' },
          { label: 'Replied', val: stats.replied, icon: <MessageSquare size={20}/>, color: '#9333ea' }
        ].map(kpi => (
          <div key={kpi.label} style={{ background: '#fff', padding: '20px', borderRadius: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ color: kpi.color, marginBottom: '10px' }}>{kpi.icon}</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{kpi.val}</div>
            <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {isImporting && (
        <div style={{ background: '#fff', padding: '25px', borderRadius: '15px', marginBottom: '25px', border: '2px dashed #e5e7eb' }}>
          <textarea value={pasteData} onChange={e => setPasteData(e.target.value)} placeholder="Paste JSON block here..." style={{ width: '100%', height: '100px', padding: '15px', borderRadius: '10px', border: '1px solid #ddd' }} />
          <button onClick={async () => { await fetch('http://localhost:3001/api/leads/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: pasteData }); setPasteData(''); setIsImporting(false); fetchLeads(); }} style={{ marginTop: '15px', width: '100%', padding: '14px', backgroundColor: '#2563eb', color: '#fff', borderRadius: '10px', border: 'none', fontWeight: 'bold' }}>Process Import</button>
        </div>
      )}

      {/* Filter controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '20px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
          <button onClick={() => setActiveFilter('All')} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', backgroundColor: activeFilter === 'All' ? '#000' : '#fff', color: activeFilter === 'All' ? '#fff' : '#000', cursor: 'pointer', fontWeight: '600' }}>All</button>
          {COURSES.map(c => <button key={c} onClick={() => setActiveFilter(c)} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', backgroundColor: activeFilter === c ? '#2563eb' : '#fff', color: activeFilter === c ? '#fff' : '#000', cursor: 'pointer', fontWeight: '600' }}>{c}</button>)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', backgroundColor: '#fff', padding: '8px 15px', borderRadius: '20px', border: showOnlyNew ? '1px solid #2563eb' : '1px solid #ddd' }}>
                <input type="checkbox" checked={showOnlyNew} onChange={e => setShowOnlyNew(e.target.checked)} />
                <span style={{ color: showOnlyNew ? '#2563eb' : '#111827' }}>New Only</span>
            </label>
            <input placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ padding: '10px 20px', borderRadius: '25px', border: '1px solid #ddd', width: '200px' }} />
        </div>
      </div>

      {/* Selection Action Bar */}
      {selectedEmails.length > 0 && (
        <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', background: '#fee2e2', padding: '10px 20px', borderRadius: '12px' }}>
          <button onClick={() => setSelectedEmails([])} style={{ backgroundColor: '#fff', color: '#374151', border: '1px solid #d1d5db', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <RotateCcw size={14}/> Deselect All
          </button>
          <button onClick={countSelected} style={{ backgroundColor: '#fff', color: '#991b1b', border: '1px solid #991b1b', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Calculator size={14}/> Count Leads
          </button>
          <button onClick={deleteSelected} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Trash2 size={14}/> Delete Selected
          </button>
        </div>
      )}

      {/* Data Table */}
      <div style={{ background: '#fff', borderRadius: '15px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb' }}>
            <tr style={{ textAlign: 'left', fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' }}>
              <th style={{ padding: '20px' }}><input type="checkbox" onChange={(e) => e.target.checked ? setSelectedEmails(filteredLeads.map(l => l.email)) : setSelectedEmails([])} checked={selectedEmails.length === filteredLeads.length && filteredLeads.length > 0} /></th>
              <th style={{ padding: '20px' }}>Lead Details</th>
              <th style={{ padding: '20px' }}>Company</th>
              <th style={{ padding: '20px' }}>Email</th>
              <th style={{ padding: '20px' }}>Programs</th>
              <th style={{ padding: '20px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map(l => (
              <tr key={l.email} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '20px' }}><input type="checkbox" checked={selectedEmails.includes(l.email)} onChange={() => selectedEmails.includes(l.email) ? setSelectedEmails(selectedEmails.filter(e => e !== l.email)) : setSelectedEmails([...selectedEmails, l.email])} /></td>
                <td style={{ padding: '20px' }}><div style={{ fontWeight: '700' }}>{l.name}</div><div style={{ fontSize: '12px', color: '#6b7280' }}>{l.job_title}</div></td>
                <td style={{ padding: '20px' }}>{l.company}</td>
                <td style={{ padding: '20px' }}><a href={`mailto:${l.email}`} style={{ color: '#2563eb', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>{l.email} <ExternalLink size={12}/></a></td>
                <td style={{ padding: '20px' }}><div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>{l.program.split(', ').map((p: any) => <span key={p} style={{ backgroundColor: '#eff6ff', color: '#1e40af', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>{p}</span>)}</div></td>
                <td style={{ padding: '20px' }}>
                    <button onClick={() => toggleStatus(l.email, l.status)} style={{ border: 'none', padding: '8px 12px', borderRadius: '25px', fontSize: '10px', fontWeight: '800', cursor: 'pointer', minWidth: '130px', backgroundColor: l.status === 'Uncontactable' ? '#fee2e2' : l.status === 'Contacted' ? '#dcfce7' : l.status === 'Replied' ? '#dbeafe' : '#f3f4f6', color: l.status === 'Uncontactable' ? '#991b1b' : l.status === 'Contacted' ? '#166534' : l.status === 'Replied' ? '#1e40af' : '#374151' }}>{l.status.toUpperCase()}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}