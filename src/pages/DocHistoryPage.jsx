import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../services/api';

const DocHistoryPage = () => {
    const { monitoringData, loadMonitoringData } = useApp();
    const [statusFilter, setStatusFilter] = useState('All');
    
    // --- PAGINATION STATE ---
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    useEffect(() => {
        loadMonitoringData();
    }, []);

    // Filter Logic
    const submissions = monitoringData.filter(item => 
        item.form_type && // Must have documents
        (statusFilter === 'All' || item.status === statusFilter)
    ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // --- PAGINATION CALCULATIONS ---
    const totalPages = Math.ceil(submissions.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentItems = submissions.slice(startIndex, startIndex + itemsPerPage);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const updateStatus = async (id, newStatus) => {
        if (!confirm(`Mark this submission as ${newStatus}?`)) return;
        try {
            const res = await api.updateSubmissionStatus(id, newStatus);
            if (res.success) {
                alert('Status Updated');
                loadMonitoringData();
            }
        } catch (error) {
            alert('Error updating status');
        }
    };

    return (
        <div className="card">
            <div className="card-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2>Document Submission History</h2>
                    <select 
                        value={statusFilter} 
                        onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #dee2e6' }}
                    >
                        <option value="All">All Statuses</option>
                        <option value="Pending">Pending</option>
                        <option value="Issued">Issued</option>
                        <option value="Declined">Declined</option>
                    </select>
                </div>
            </div>
            <div className="card-body">
                {currentItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>No document submissions found.</div>
                ) : (
                    <>
                        {currentItems.map(item => {
                            const statusClass = `status-${(item.status || 'pending').toLowerCase()}`;
                            
                            // Helper to detect GAE/Non-GAE for better display
                            const isVUL = item.form_type && item.form_type.includes('VUL');
                            const gaeType = item.form_type && item.form_type.includes('GAE') 
                                ? (item.form_type.includes('Non-GAE') ? '(Non-GAE)' : '(GAE)')
                                : '';

                            return (
                                <div key={item.id} className="submission-card" style={{ borderLeftColor: '#0055b8' }}>
                                    {/* Header: Name & Status */}
                                    <div className="submission-header">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div className="submission-title">
                                                {item.client_name || item.client_first_name}
                                            </div>
                                            <span style={{ fontSize: '12px', color: '#6c757d', background: '#f8f9fa', padding: '2px 6px', borderRadius: '4px' }}>
                                                📄 Document Submission
                                            </span>
                                        </div>
                                        <span className={`status-badge ${statusClass}`}>
                                            {item.status || 'Pending'}
                                        </span>
                                    </div>

                                    {/* Body: Clean Grid Layout */}
                                    <div className="submission-details" style={{ 
                                        display: 'grid', 
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                                        gap: '15px', 
                                        marginTop: '10px' 
                                    }}>
                                        <div>
                                            <span style={{color:'#666', fontSize:'12px', display:'block'}}>Serial</span>
                                            <span style={{fontFamily:'monospace', fontWeight:600}}>{item.serial_number}</span>
                                        </div>
                                        <div>
                                            <span style={{color:'#666', fontSize:'12px', display:'block'}}>Policy</span>
                                            <span style={{fontWeight:500}}>{item.policy_type}</span>
                                        </div>
                                        <div>
                                            <span style={{color:'#666', fontSize:'12px', display:'block'}}>Date</span>
                                            <span>{new Date(item.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <div>
                                            <span style={{color:'#666', fontSize:'12px', display:'block'}}>Agency</span>
                                            <span>{item.agency}</span>
                                        </div>
                                        
                                        {/* MODIFIED: Improved Form Type Display */}
                                        <div>
                                            <span style={{color:'#666', fontSize:'12px', display:'block'}}>Form</span>
                                            <span style={{fontWeight:500}}>
                                                {isVUL && gaeType ? (
                                                    <span>
                                                        VUL <span style={{fontSize: '11px', color: '#555', fontWeight: 'normal'}}>{gaeType}</span>
                                                    </span>
                                                ) : (
                                                    item.form_type
                                                )}
                                            </span>
                                        </div>

                                        <div>
                                            <span style={{color:'#666', fontSize:'12px', display:'block'}}>Mode</span>
                                            <span>{item.mode_of_payment}</span>
                                        </div>
                                    </div>

                                    {/* Action Buttons (Only for Pending) */}
                                    {item.status === 'Pending' && (
                                        <div className="action-buttons" style={{ marginTop: '20px' }}>
                                            <button className="btn-action btn-issue" onClick={() => updateStatus(item.id, 'Issued')}>
                                                ✓ Issue Policy
                                            </button>
                                            <button className="btn-action btn-decline" onClick={() => updateStatus(item.id, 'Declined')}>
                                                ✕ Decline
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* --- PAGINATION CONTROLS --- */}
                        {totalPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '20px', gap: '15px' }}>
                                <button 
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    style={{
                                        padding: '8px 16px',
                                        backgroundColor: currentPage === 1 ? '#e9ecef' : '#0055b8',
                                        color: currentPage === 1 ? '#adb5bd' : 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                        fontWeight: 600,
                                        fontSize: '13px'
                                    }}
                                >
                                    Previous
                                </button>
                                
                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#495057' }}>
                                    Page {currentPage} of {totalPages}
                                </span>

                                <button 
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    style={{
                                        padding: '8px 16px',
                                        backgroundColor: currentPage === totalPages ? '#e9ecef' : '#0055b8',
                                        color: currentPage === totalPages ? '#adb5bd' : 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                        fontWeight: 600,
                                        fontSize: '13px'
                                    }}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default DocHistoryPage;