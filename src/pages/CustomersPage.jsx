import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

const CustomersPage = () => {
    const { customers, loadCustomers } = useApp();
    const [searchQuery, setSearchQuery] = useState('');
    const [groupedPolicies, setGroupedPolicies] = useState({});

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

    const markPaid = async (id, e) => {
        e.stopPropagation();
        if (!confirm('Confirm payment received?')) return;

        try {
            const res = await api.markPolicyPaid(id);
            if (res.success) {
                alert(`Payment Recorded! New Due Date: ${res.nextDate}`);
                loadCustomers();
            }
        } catch (error) {
            alert('Error recording payment');
        }
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
                        const now = new Date();
                        const overdue = items.filter(i => new Date(i.next_payment_date) < now).length;
                        const pending = items.length - overdue;

                        return (
                            <div key={monthStr} className="month-container">
                                <div className="month-header">
                                    <div className="month-title">{monthStr}</div>
                                    <div className="month-stats">
                                        <span className="stat-badge">Total: {items.length}</span>
                                        <span className="stat-badge" style={{ color: '#ffc107' }}>Pending: {pending}</span>
                                        <span className="stat-badge" style={{ color: '#ff6b6b' }}>Overdue: {overdue}</span>
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
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map(p => {
                                                const isOver = new Date(p.next_payment_date) < now;
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
                                                        <td>
                                                            <button className="pay-btn" onClick={(e) => markPaid(p.id, e)}>
                                                                Mark Paid
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
        </div>
    );
};

export default CustomersPage;
