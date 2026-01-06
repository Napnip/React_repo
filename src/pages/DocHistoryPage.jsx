import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../services/api';

const DocHistoryPage = () => {
    const { formSubmissions, loadFormSubmissions } = useApp();
    const [statusFilter, setStatusFilter] = useState('');
    const [formFilter, setFormFilter] = useState('');
    
    // --- PAGINATION STATE ---
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 7;

    useEffect(() => {
        loadFormSubmissions();
    }, []);

    // Filter and Sort Data
    const filtered = formSubmissions.filter(item =>
        (!statusFilter || item.status === statusFilter) &&
        (!formFilter || item.form_type === formFilter)
    ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // --- PAGINATION CALCULATIONS ---
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentItems = filtered.slice(startIndex, startIndex + itemsPerPage);

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
                loadFormSubmissions();
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
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }} style={{ padding: '8px' }}>
                            <option value="">All Statuses</option>
                            <option value="Pending">Pending</option>
                            <option value="Issued">Issued</option>
                            <option value="Declined">Declined</option>
                        </select>
                        <select value={formFilter} onChange={(e) => { setFormFilter(e.target.value); setCurrentPage(1); }} style={{ padding: '8px' }}>
                            <option value="">All Forms</option>
                            <option value="GAE">GAE</option>
                            <option value="NON_GAE">Non-GAE</option>
                            <option value="SIO">SIO</option>
                        </select>
                    </div>
                </div>
            </div>
            <div className="card-body">
                {currentItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px' }}>No submissions found</div>
                ) : (
                    <>
                        {/* List of Items */}
                        {currentItems.map(sub => {
                            const badgeClass = `status-${sub.status.toLowerCase()}`;
                            return (
                                <div key={sub.id} className="submission-card">
                                    <div className="submission-header">
                                        <div className="submission-title">Submission: {sub.serial_number}</div>
                                        <span className={`status-badge ${badgeClass}`}>{sub.status}</span>
                                    </div>
                                    <div className="submission-details">
                                        <div><strong>Form:</strong> {sub.form_type}</div>
                                        <div><strong>Policy:</strong> {sub.policy_type}</div>
                                        <div><strong>Date:</strong> {new Date(sub.created_at).toLocaleDateString()}</div>
                                        <div><strong>Client:</strong> {sub.client_name || 'N/A'}</div>
                                    </div>
                                    {sub.status === 'Pending' && (
                                        <div className="action-buttons">
                                            <button className="btn-action btn-issue" onClick={() => updateStatus(sub.id, 'Issued')}>
                                                ✓ Issue
                                            </button>
                                            <button className="btn-action btn-decline" onClick={() => updateStatus(sub.id, 'Declined')}>
                                                ✕ Decline
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '20px', gap: '15px' }}>
                                <button 
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: currentPage === 1 ? '#e0e0e0' : '#007bff',
                                        color: currentPage === 1 ? '#999' : 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    Previous
                                </button>
                                
                                <span style={{ fontWeight: 'bold', color: '#555' }}>
                                    Page {currentPage} of {totalPages}
                                </span>

                                <button 
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: currentPage === totalPages ? '#e0e0e0' : '#007bff',
                                        color: currentPage === totalPages ? '#999' : 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
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