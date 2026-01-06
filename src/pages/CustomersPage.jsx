import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../services/api'; 

const CustomersPage = () => {
    const { customers, loadCustomers } = useApp();
    const [searchQuery, setSearchQuery] = useState('');
    const [groupedPolicies, setGroupedPolicies] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    // Toggle to see "Pending" items
    const [showAll, setShowAll] = useState(false); 

    // --- NEW: State for Detailed View Modal ---
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedPolicy, setSelectedPolicy] = useState(null);
    
    // Track processing actions
    const [processingIds, setProcessingIds] = useState(new Set());

    useEffect(() => {
        handleRefresh();
    }, []);

    const handleRefresh = async () => {
        setIsLoading(true);
        await loadCustomers();
        setIsLoading(false);
    };

    // --- GROUPING LOGIC ---
    useEffect(() => {
        if (customers && customers.length > 0) {
            const policies = [];
            
            customers.forEach(c => {
                if (c.submissions && c.submissions.length > 0) {
                    c.submissions.forEach(s => {
                        const status = s.status ? s.status.toLowerCase() : '';
                        
                        // Show if 'issued' OR if 'showAll' is checked
                        if (status === 'issued' || showAll) { 
                            policies.push({
                                ...s,
                                customerName: `${c.first_name} ${c.last_name}`,
                                customerEmail: c.email,
                                customer_id: c.id
                            });
                        }
                    });
                }
            });

            const filtered = policies.filter(p =>
                p.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (p.customerEmail && p.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()))
            );

            const groups = {};
            filtered.forEach(p => {
                // Group missing dates under "Unscheduled / New"
                if (!p.next_payment_date) {
                    const key = 'Unscheduled / New';
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(p);
                    return;
                }
                
                const d = new Date(p.next_payment_date);
                if (isNaN(d.getTime())) {
                    const key = 'Invalid Date Error';
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(p);
                    return;
                }

                const key = d.toLocaleString('default', { month: 'long', year: 'numeric' });
                if (!groups[key]) groups[key] = [];
                groups[key].push(p);
            });

            setGroupedPolicies(groups);
        } else {
            setGroupedPolicies({});
        }
    }, [customers, searchQuery, showAll]);

    const isDateOverdue = (dateString) => {
        if (!dateString) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0); 
        const checkDate = new Date(dateString);
        return checkDate < today;
    };

    const markPaid = async (id, e) => {
        e.stopPropagation();
        if (!confirm('Confirm payment received?')) return;

        setProcessingIds(prev => new Set(prev).add(id));

        try {
            const res = await api.markPolicyPaid(id);
            if (res.success) {
                alert(`Payment Recorded! New Due Date: ${res.nextDate}`);
                await handleRefresh(); 
            }
        } catch (error) {
            alert('Error recording payment');
        } finally {
            setProcessingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
            });
        }
    };

    // --- UPDATED: Open Modal with Full Policy Object ---
    const handleViewDetails = (policy, e) => {
        e.stopPropagation();
        setSelectedPolicy(policy);
        setShowDetailsModal(true);
    };

    return (
        <div className="card">
            <div className="card-header">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <h2>Payment Board</h2>
                    <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                        <label style={{fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer'}}>
                            <input 
                                type="checkbox" 
                                checked={showAll} 
                                onChange={(e) => setShowAll(e.target.checked)} 
                            />
                            Show All (Inc. Pending)
                        </label>

                        <button 
                            onClick={handleRefresh} 
                            disabled={isLoading}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#6c757d',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: isLoading ? 'wait' : 'pointer',
                                fontSize: '13px'
                            }}
                        >
                            {isLoading ? 'Refreshing...' : ' Refresh Data'}
                        </button>
                    </div>
                </div>
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
                    <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                        {isLoading ? 'Loading...' : 'No policies found.'}
                    </div>
                ) : (
                    Object.entries(groupedPolicies).map(([monthStr, items]) => {
                        const overdueCount = items.filter(i => isDateOverdue(i.next_payment_date)).length;
                        const pendingCount = items.length - overdueCount;

                        return (
                            <div key={monthStr} className="month-container">
                                <div className="month-header">
                                    <div className="month-title">{monthStr}</div>
                                    <div className="month-stats">
                                        <span className="stat-badge">Total: {items.length}</span>
                                        <span className="stat-badge" style={{ color: '#ffc107' }}>Due: {pendingCount}</span>
                                        {overdueCount > 0 && (
                                            <span className="stat-badge" style={{ color: '#ff6b6b' }}>Overdue: {overdueCount}</span>
                                        )}
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
                                                
                                                const displayDate = p.next_payment_date 
                                                    ? new Date(p.next_payment_date).toLocaleDateString() 
                                                    : 'N/A';

                                                return (
                                                    <tr key={p.id}>
                                                        <td>
                                                            <strong>{p.customerName}</strong><br />
                                                            <span style={{ fontSize: '11px', color: '#777' }}>{p.customerEmail || ''}</span>
                                                        </td>
                                                        <td>{p.policy_type}</td>
                                                        <td>{displayDate}</td>
                                                        <td>PHP {parseFloat(p.premium_paid).toLocaleString()}</td>
                                                        <td>
                                                            {p.status !== 'Issued' ? (
                                                                <span className="status-badge status-pending" style={{fontSize:'10px'}}>{p.status}</span>
                                                            ) : isOver ? (
                                                                <span className="status-overdue">⚠ OVERDUE</span>
                                                            ) : (
                                                                <span className="status-due">Upcoming</span>
                                                            )}
                                                        </td>
                                                        
                                                        {/* View Details Button */}
                                                        <td>
                                                            <button 
                                                                onClick={(e) => handleViewDetails(p, e)}
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

                                                        <td>
                                                            <button 
                                                                className="pay-btn" 
                                                                onClick={(e) => markPaid(p.id, e)}
                                                                disabled={isProcessing}
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

            {/* --- NEW: DETAILED VIEW MODAL --- */}
            {showDetailsModal && selectedPolicy && (
                <div className="modal show" onClick={() => setShowDetailsModal(false)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div className="modal-content" style={{ maxWidth: '600px', margin: 0 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Policy Details</h2>
                            <span className="close-modal" onClick={() => setShowDetailsModal(false)}>&times;</span>
                        </div>
                        <div className="modal-body">
                            
                            {/* 1. KEY INFO GRID */}
                            <div style={{ 
                                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', 
                                backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #dee2e6'
                            }}>
                                {/* ADDED: Client Name Field */}
                                <div style={{gridColumn: '1 / -1', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '5px'}}>
                                    <small style={{color: '#666', fontWeight: 600}}>Client Name</small>
                                    <div style={{fontSize: '18px', fontWeight: 'bold', color: '#2c3e50'}}>
                                        {selectedPolicy.customerName}
                                    </div>
                                    <small style={{color: '#888'}}>{selectedPolicy.customerEmail}</small>
                                </div>

                                <div>
                                    <small style={{color: '#666', fontWeight: 600}}>Serial Number</small>
                                    <div style={{fontSize: '15px', fontWeight: 'bold', color: '#003781'}}>{selectedPolicy.serial_number || 'N/A'}</div>
                                </div>
                                <div>
                                    <small style={{color: '#666', fontWeight: 600}}>Current Status</small>
                                    <div>
                                        <span className={`status-badge status-${selectedPolicy.status ? selectedPolicy.status.toLowerCase() : 'pending'}`}>
                                            {selectedPolicy.status || 'Pending'}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <small style={{color: '#666', fontWeight: 600}}>Policy Type</small>
                                    <div style={{fontWeight: 500}}>{selectedPolicy.policy_type}</div>
                                </div>
                                <div>
                                    <small style={{color: '#666', fontWeight: 600}}>Premium</small>
                                    <div style={{fontWeight: 500}}>PHP {parseFloat(selectedPolicy.premium_paid).toLocaleString()}</div>
                                </div>

                                <div>
                                    <small style={{color: '#666', fontWeight: 600}}>Mode of Payment</small>
                                    <div>{selectedPolicy.mode_of_payment}</div>
                                </div>
                                <div>
                                    <small style={{color: '#666', fontWeight: 600}}>Agency</small>
                                    <div>{selectedPolicy.agency || '-'}</div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '20px' }}>
                                <div style={{padding: '10px', background: '#e3f2fd', borderRadius: '6px'}}>
                                    <small style={{color: '#0055b8', fontWeight: 700}}>Submitted On</small>
                                    <div style={{fontSize: '13px'}}>{new Date(selectedPolicy.created_at).toLocaleDateString()}</div>
                                </div>
                                <div style={{padding: '10px', background: '#d4edda', borderRadius: '6px'}}>
                                    <small style={{color: '#155724', fontWeight: 700}}>Issued On</small>
                                    <div style={{fontSize: '13px'}}>
                                        {selectedPolicy.status === 'Issued' ? 
                                            (selectedPolicy.updated_at ? new Date(selectedPolicy.updated_at).toLocaleDateString() : 'N/A') 
                                            : '-'}
                                    </div>
                                </div>
                                <div style={{padding: '10px', background: '#fff3cd', borderRadius: '6px'}}>
                                    <small style={{color: '#856404', fontWeight: 700}}>Next Due</small>
                                    <div style={{fontSize: '13px', fontWeight: 'bold'}}>
                                        {selectedPolicy.next_payment_date ? new Date(selectedPolicy.next_payment_date).toLocaleDateString() : 'N/A'}
                                    </div>
                                </div>
                            </div>

                            {/* 2. ATTACHMENTS LIST */}
                            <h3 style={{ marginTop: '25px', marginBottom: '10px', fontSize: '15px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
                                📎 Attached Files
                            </h3>
                            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                {selectedPolicy.attachments && selectedPolicy.attachments.length > 0 ? (
                                    <ul style={{ listStyle: 'none', padding: 0 }}>
                                        {selectedPolicy.attachments.map((file, idx) => (
                                            <li key={idx} style={{ marginBottom: '8px', padding: '8px 12px', backgroundColor: '#fff', borderRadius: '4px', border: '1px solid #dee2e6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <a 
                                                    href={file.fileUrl} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    style={{ textDecoration: 'none', color: '#007bff', fontWeight: 500, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
                                                >
                                                    📄 {file.fileName || 'Document'}
                                                </a>
                                                <span style={{fontSize: '11px', color: '#999'}}>
                                                    {(file.fileSize / 1024).toFixed(0)} KB
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p style={{ color: '#999', fontSize: '13px', fontStyle: 'italic' }}>No documents attached.</p>
                                )}
                            </div>

                            <div style={{ textAlign: 'right', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                                <button 
                                    onClick={() => setShowDetailsModal(false)}
                                    style={{
                                        padding: '8px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'
                                    }}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomersPage;