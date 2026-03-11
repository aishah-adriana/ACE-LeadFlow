import { useState, useEffect } from 'react';
import { Search, Trash2, Mail } from 'lucide-react';

export default function App() {
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [filterType, setFilterType] = useState('All'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [pasteData, setPasteData] = useState('');

  const fetchLeads = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/leads');
      const data = await res.json();
      setLeads(Array.isArray(data) ? data : []);
    } catch (err) {
      setLeads([]);
    }
  };

  useEffect(() => { fetchLeads(); }, []);

  const toggleStatus = async (email: string, currentStatus: string) => {
    const status = (currentStatus || 'New').trim();
    let nextStatus = 'New';
    if (status === 'New') nextStatus = 'Contacted';
    else if (status === 'Contacted') nextStatus = 'Replied';
    else if (status === 'Replied') nextStatus = 'New';

    try {
      await fetch(`http://localhost:3001/api/leads/${email}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      fetchLeads();
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const filteredLeads = leads.filter(l => {
    const matchesCategory = filterType === 'All' ? true : 
                            filterType === 'Both' ? l.program.includes('&') : 
                            l.program === filterType;
    const matchesSearch = (l.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (l.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (l.company || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedEmails(filteredLeads.map(l => l.email));
    } else {
      setSelectedEmails([]);
    }
  };

  const deleteSelected = async () => {
    if (!window.confirm(`Delete ${selectedEmails.length} leads?`)) return;
    await fetch('http://localhost:3001/api/leads/delete-multiple', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails: selectedEmails }),
    });
    setSelectedEmails([]);
    fetchLeads();
  };

  const processImport = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/leads/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: pasteData,
      });
      if (res.ok) { setPasteData(''); setIsImporting(false); fetchLeads(); }
    } catch (e) { alert("Import failed."); }
  };

  const lastImport = leads.length > 0 && leads[0].pasted_at 
    ? new Date(leads[0].pasted_at).toLocaleString() 
    : "No data";

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', alignItems: 'center' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold' }}>LeadFlow CRM</h1>
        <button onClick={() => setIsImporting(!isImporting)} style={{ padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', backgroundColor: '#000', color: '#fff', border: 'none' }}>
          {isImporting ? "Cancel" : "Import from Excel"}
        </button>
      </header>

      {isImporting && (
        <div style={{ marginBottom: '20px', padding: '20px', background: 'white', borderRadius: '12px', border: '1px solid #ddd' }}>
          <textarea 
            style={{ width: '100%', height: '100px', marginBottom: '10px', padding: '10px', borderRadius: '8px', border: '1px solid #eee' }} 
            value={pasteData} 
            onChange={(e) => setPasteData(e.target.value)} 
            placeholder="Paste Excel Script output here..." 
          />
          <button onClick={processImport} style={{ width: '100%', padding: '12px', background: '#2563eb', color: '#fff', borderRadius: '8px', border: 'none', fontWeight: 'bold' }}>Save Leads</button>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: 'white', padding: '25px', borderRadius: '15px', border: '1px solid #eee' }}>
          <p style={{ color: '#888', fontSize: '11px', fontWeight: 'bold' }}>TOTAL LEADS</p>
          <p style={{ fontSize: '36px', fontWeight: 'bold' }}>{leads.length}</p>
          <p style={{ color: '#aaa', fontSize: '11px' }}>As of: {lastImport}</p>
        </div>
        <div style={{ background: '#92d050', color: 'white', padding: '25px', borderRadius: '15px' }}>
          <p style={{ fontSize: '11px', fontWeight: 'bold' }}>CONTACTED</p>
          <p style={{ fontSize: '36px', fontWeight: 'bold' }}>{leads.filter(l => l.status === 'Contacted').length}</p>
        </div>
        <div style={{ background: '#4991ca', color: 'white', padding: '25px', borderRadius: '15px' }}>
          <p style={{ fontSize: '11px', fontWeight: 'bold' }}>REPLIED</p>
          <p style={{ fontSize: '36px', fontWeight: 'bold' }}>{leads.filter(l => l.status === 'Replied').length}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', border: '1px solid #eee', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
          <input style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }} placeholder="Search name, email, or company..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          {selectedEmails.length > 0 && (
              <button onClick={deleteSelected} style={{ background: '#ef4444', color: 'white', padding: '12px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                Delete ({selectedEmails.length})
              </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {['All', 'System Optimization', 'Operations Management', 'Both'].map(type => (
            <button key={type} onClick={() => setFilterType(type)} style={{
              padding: '8px 18px', borderRadius: '25px', border: '1px solid #ddd',
              backgroundColor: filterType === type ? '#000' : '#fff', color: filterType === type ? '#fff' : '#000', cursor: 'pointer'
            }}>{type}</button>
          ))}
        </div>
      </div>

      {/* Leads Table */}
      <div style={{ backgroundColor: 'white', borderRadius: '15px', border: '1px solid #eee', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: '#f8f9fa' }}>
            <tr style={{ color: '#6b7280', fontSize: '12px', textTransform: 'uppercase' }}>
              <th style={{ padding: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" onChange={handleSelectAll} checked={selectedEmails.length === filteredLeads.length && filteredLeads.length > 0} />
                  <span style={{ fontSize: '10px' }}>ALL</span>
                </div>
              </th>
              <th style={{ padding: '18px' }}>Name</th>
              <th style={{ padding: '18px' }}>Company</th>
              <th style={{ padding: '18px' }}>Email</th>
              <th style={{ padding: '18px' }}>Program</th>
              <th style={{ padding: '18px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map(l => {
              const s = l.status;
              let bgColor = '#f4f4f5'; let txtColor = '#52525b';
              if (s === 'Contacted') { bgColor = '#92d050'; txtColor = '#fff'; }
              else if (s === 'Replied') { bgColor = '#4991ca'; txtColor = '#fff'; }
              else if (s === 'Uncontactable') { bgColor = '#f1a983'; txtColor = '#fff'; }
              else if (s === 'Duplicate') { bgColor = '#ff0000'; txtColor = '#fff'; }

              return (
                <tr key={l.email} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '18px' }}>
                    <input type="checkbox" checked={selectedEmails.includes(l.email)} onChange={() => {
                      setSelectedEmails(prev => prev.includes(l.email) ? prev.filter(e => e !== l.email) : [...prev, l.email])
                    }} />
                  </td>
                  <td style={{ padding: '18px', fontWeight: 'bold' }}>{l.name}</td>
                  <td style={{ padding: '18px', color: '#374151', fontSize: '13px' }}>{l.company || '—'}</td>
                  <td style={{ padding: '18px' }}>
                    {/* CLICKABLE EMAIL LINK */}
                    <a 
                      href={`mailto:${l.email}`} 
                      style={{ 
                        color: '#2563eb', 
                        textDecoration: 'underline', 
                        fontSize: '13px', 
                        fontFamily: 'monospace',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Mail size={14} />
                      {l.email}
                    </a>
                  </td>
                  <td style={{ padding: '18px' }}>
                    <span style={{ 
                      fontSize: '11px', 
                      background: l.program.includes('&') ? '#ffff00' : '#f3f4f6', 
                      padding: '5px 10px', 
                      borderRadius: '6px',
                      border: l.program.includes('&') ? '1px solid #eab308' : 'none'
                    }}>{l.program}</span>
                  </td>
                  <td style={{ padding: '18px' }}>
                    <button 
                      onClick={() => toggleStatus(l.email, l.status)}
                      style={{ 
                        backgroundColor: bgColor, 
                        color: txtColor, 
                        padding: '5px 15px', 
                        borderRadius: '20px', 
                        fontSize: '10px', 
                        fontWeight: 'bold',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {s}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}