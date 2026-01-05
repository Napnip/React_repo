import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../services/api';

const DocHistoryPage = () => {
    const { formSubmissions, loadFormSubmissions } = useApp();
    const [statusFilter, setStatusFilter] = useState('');
    const [formFilter, setFormFilter] = useState('');
    const [viewMode, setViewMode] = useState('list');

    useEffect(() => {
        loadFormSubmissions();
    }, []);

    const filtered = formSubmissions.filter(item =>
        (!statusFilter || item.status === statusFilter) &&
        (!formFilter || item.form_type === formFilter)
    ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

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
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '8px' }}>
                            <option value="">All Statuses</option>
                            <option value="Pending">Pending</option>
                            <option value="Issued">Issued</option>
                            <option value="Declined">Declined</option>
                        </select>
                        <select value={formFilter} onChange={(e) => setFormFilter(e.target.value)} style={{ padding: '8px' }}>
                            <option value="">All Forms</option>
                            <option value="GAE">GAE</option>
                            <option value="NON_GAE">Non-GAE</option>
                            <option value="SIO">SIO</option>
                        </select>
                    </div>
                </div>
            </div>
            <div className="card-body">
                <div className="view-toggle">
                    <button
                        className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                        onClick={() => setViewMode('list')}
                    >
                        List View
                    </button>
                    <button
                        className={`toggle-btn ${viewMode === 'board' ? 'active' : ''}`}
                        onClick={() => setViewMode('board')}
                    >
                        Board View
                    </button>
                </div>

                {viewMode === 'list' ? (
                    filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px' }}>No submissions found</div>
                    ) : (
                        filtered.map(sub => {
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
                        })
                    )
                ) : (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>
                        Board view requires drag-and-drop functionality
                    </div>
                )}
            </div>
        </div>
    );
};

export default DocHistoryPage;
