import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../services/api'; 

const CustomersPage = () => {
    const { customers, loadCustomers } = useApp();
    const [searchQuery, setSearchQuery] = useState('');
    const [groupedPolicies, setGroupedPolicies] = useState({});

    // State for File Modal
    const [showFileModal, setShowFileModal] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);

    // NEW: State to track which buttons are currently loading
    const [processingIds, setProcessingIds] = useState(new Set());

    useEffect(() => {
        loadCustomers();
    }, []);

    useEffect(() => {
        if (customers.length > 0) {
            const policies = [];
            customers.forEach(c => {
                if (c.submissions && c.submissions.length > 0) {
                    c.submissions.forEach(s => {
                        policies.push({
                            ...s,
                            customerName: `${c.first_name} ${c.last_name}`,
                            customerEmail: c.email,
                            customer_id: c.id
                        });
                    });
                }
            });

            const filtered = policies.filter(p =>
                p.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (p.customerEmail && p.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()))
            );

            const groups = {};
            filtered.forEach(p => {
                if (!p.next_payment_date) return;
                const d = new Date(p.next_payment_date);
                const key = d.toLocaleString('default', { month: 'long', year: 'numeric' });
                if (!groups[key]) groups[key] = [];
                groups[key].push(p);
            });

            setGroupedPolicies(groups);
        }
    }, [customers, searchQuery]);

    // NEW: Helper to check if a date is strictly in the past
    const isDateOverdue = (dateString) => {
        if (!dateString) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to midnight

        const checkDate = new Date(dateString);
        checkDate.setHours(0, 0, 0, 0); // Reset time to midnight

        return checkDate < today;
    };

    const markPaid = async (id, e) => {
        e.stopPropagation();
        if (!confirm('Confirm payment received?')) return;

        // 1. Add ID to processing set to disable button
        setProcessingIds(prev => new Set(prev).add(id));

        try {
            const res = await api.markPolicyPaid(id);
            if (res.success) {
                alert(`Payment Recorded! New Due Date: ${res.nextDate}`);
                await loadCustomers(); // Refresh data
            }
        } catch (error) {
            alert('Error recording payment');
        } finally {
            // 2. Remove ID from processing set
            setProcessingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
            });
        }
    };

    const handleViewFiles = (files, e) => {
        e.stopPropagation();
        setSelectedFiles(files || []);
        setShowFileModal(true);
    };

    return (
        <div className="card">
            <div className="card-header">
                <h2>Payment Board</h2>
            </div>
            <div className="card-body">
                <div className="search-bar-container">
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search by Name or Email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button className="search-btn">Search</button>
                </div>

                {Object.keys(groupedPolicies).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>No policies found.</div>
                ) : (
                    Object.entries(groupedPolicies).map(([monthStr, items]) => {
                        // Calculate stats using the robust date checker
                        const overdueCount = items.filter(i => isDateOverdue(i.next_payment_date)).length;
                        const pendingCount = items.length - overdueCount;

                        return (
                            <div key={monthStr} className="month-container">
                                <div className="month-header">
                                    <div className="month-title">{monthStr}</div>
                                    <div className="month-stats">
                                        <span className="stat-badge">Total: {items.length}</span>
                                        <span className="stat-badge" style={{ color: '#ffc107' }}>Pending: {pendingCount}</span>
                                        <span className="stat-badge" style={{ color: '#ff6b6b' }}>Overdue: {overdueCount}</span>
                                    </div>
                                </div>
                                <div className="customer-list">
                                    <table className="monthly-table">
                                        <thead>
                                            <tr>
                                                <th>Client Name</th>
                                                <th>Policy Type</th>
                                                <th>Due Date</th>
                                                <th>Premium</th>
                                                <th>Status</th>
                                                <th>View</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map(p => {
                                                const isOver = isDateOverdue(p.next_payment_date);
                                                const isProcessing = processingIds.has(p.id);

                                                return (
                                                    <tr key={p.id}>
                                                        <td>
                                                            <strong>{p.customerName}</strong><br />
                                                            <span style={{ fontSize: '11px', color: '#777' }}>{p.customerEmail || ''}</span>
                                                        </td>
                                                        <td>{p.policy_type}</td>
                                                        <td>{new Date(p.next_payment_date).toLocaleDateString()}</td>
                                                        <td>PHP {parseFloat(p.premium_paid).toLocaleString()}</td>
                                                        <td>
                                                            {isOver ? (
                                                                <span className="status-overdue">⚠ OVERDUE</span>
                                                            ) : (
                                                                <span className="status-due">Upcoming</span>
                                                            )}
                                                        </td>
                                                        
                                                        {/* View Button */}
                                                        <td>
                                                            <button 
                                                                onClick={(e) => handleViewFiles(p.attachments, e)}
                                                                style={{
                                                                    backgroundColor: '#007bff', 
                                                                    color: 'white', 
                                                                    border: 'none', 
                                                                    padding: '6px 12px', 
                                                                    borderRadius: '4px', 
                                                                    cursor: 'pointer',
                                                                    fontSize: '13px'
                                                                }}
                                                            >
                                                                View
                                                            </button>
                                                        </td>

                                                        {/* Mark Paid Button */}
                                                        <td>
                                                            <button 
                                                                className="pay-btn" 
                                                                onClick={(e) => markPaid(p.id, e)}
                                                                disabled={isProcessing} // <--- Disables button when clicked
                                                                style={{
                                                                    opacity: isProcessing ? 0.6 : 1,
                                                                    cursor: isProcessing ? 'not-allowed' : 'pointer'
                                                                }}
                                                            >
                                                                {isProcessing ? 'Saving...' : 'Mark Paid'}
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
                    })
                )}
            </div>

            {/* File Modal Popup */}
            {showFileModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white', padding: '24px', borderRadius: '8px', width: '400px', maxWidth: '90%'
                    }}>
                        <h3 style={{ marginTop: 0 }}>Attached Files</h3>
                        <div style={{ maxHeight: '300px', overflowY: 'auto', margin: '15px 0' }}>
                            {selectedFiles && selectedFiles.length > 0 ? (
                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                    {selectedFiles.map((file, idx) => (
                                        <li key={idx} style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px', border: '1px solid #dee2e6' }}>
                                            <a 
                                                href={file.fileUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                style={{ textDecoration: 'none', color: '#007bff', fontWeight: 500 }}
                                            >
                                                📄 {file.fileName || 'Document'}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p style={{ color: '#666', fontStyle: 'italic' }}>No files attached to this submission.</p>
                            )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <button 
                                onClick={() => setShowFileModal(false)}
                                style={{
                                    padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomersPage;