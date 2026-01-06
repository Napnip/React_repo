import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

const DashboardPage = () => {
    const { monitoringData, loadMonitoringData } = useApp();
    
    // Existing Stats State
    const [stats, setStats] = useState({
        totalANP: 0,
        monthlyANP: 0,
        submitted: 0,
        issued: 0,
        pending: 0,
        declined: 0
    });

    // Historical ANP State
    const [monthlyHistory, setMonthlyHistory] = useState({});
    const [selectedMonthKey, setSelectedMonthKey] = useState('');

    useEffect(() => {
        loadMonitoringData();
    }, []);

    useEffect(() => {
        if (monitoringData.length > 0) {
            let totalANP = 0, monthlyANP = 0;
            let submitted = monitoringData.length, issued = 0, declined = 0, pending = 0;
            
            // For Historical Data Aggregation
            const historyAgg = {};

            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            monitoringData.forEach(item => {
                // 1. Calculate Core Stats
                if (item.status === 'Issued') {
                    const anpVal = parseFloat(item.anp) || 0;
                    totalANP += anpVal;
                    issued++;
                    
                    const dDate = new Date(item.created_at);
                    if (!isNaN(dDate)) {
                        // Current Month Check
                        if (dDate.getMonth() === currentMonth && dDate.getFullYear() === currentYear) {
                            monthlyANP += anpVal;
                        }

                        // Aggregate for Historical Dropdown
                        const monthKey = `${dDate.getFullYear()}-${String(dDate.getMonth() + 1).padStart(2, '0')}`;
                        historyAgg[monthKey] = (historyAgg[monthKey] || 0) + anpVal;
                    }
                } else if (item.status === 'Declined') {
                    declined++;
                } else {
                    pending++;
                }
            });

            setStats({ totalANP, monthlyANP, submitted, issued, pending, declined });
            setMonthlyHistory(historyAgg);
            
            // Default to the most recent month WITH data
            const availableKeys = Object.keys(historyAgg).sort().reverse();
            if (availableKeys.length > 0) {
                if (!selectedMonthKey || !historyAgg[selectedMonthKey]) {
                    setSelectedMonthKey(availableKeys[0]);
                }
            }
        }
    }, [monitoringData, selectedMonthKey]);

    const statusData = {
        labels: ['Issued', 'Pending', 'Declined'],
        datasets: [{
            data: [stats.issued, stats.pending, stats.declined],
            backgroundColor: ['#28a745', '#ffc107', '#dc3545']
        }]
    };

    const policyTypes = {};
    monitoringData.forEach(d => {
        policyTypes[d.policy_type] = (policyTypes[d.policy_type] || 0) + 1;
    });

    const policyData = {
        labels: Object.keys(policyTypes),
        datasets: [{
            label: 'Count',
            data: Object.values(policyTypes),
            backgroundColor: '#0055b8'
        }]
    };

    // Helper to format "YYYY-MM" to "Month YYYY"
    const formatMonthKey = (key) => {
        if (!key) return '';
        const [year, month] = key.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return date.toLocaleString('default', { month: 'long', year: 'numeric' });
    };

    const sortedMonthKeys = Object.keys(monthlyHistory).sort().reverse();
    const selectedMonthANP = monthlyHistory[selectedMonthKey] || 0;

    return (
        <>
            <div className="card">
                <div className="card-header">
                    <h2>Dashboard Overview</h2>
                </div>
                <div className="card-body">
                    <div className="dashboard-grid">
                        <div className="stat-card blue">
                            <div className="stat-header">
                                <div className="stat-label">Total ANP</div>
                            </div>
                            <div className="stat-value">PHP {stats.totalANP.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                            <div className="stat-subtext">All-time annual premium</div>
                        </div>
                        
                        <div className="stat-card green">
                            <div className="stat-header">
                                <div className="stat-label">Monthly ANP</div>
                            </div>
                            <div className="stat-value">PHP {stats.monthlyANP.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                            <div className="stat-subtext">This Month</div>
                        </div>

                        {/* --- FIXED: Historical ANP Card (Standard Design) --- */}
                        <div className="stat-card purple">
                            <div className="stat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div className="stat-label">Historical ANP</div>
                                <select 
                                    value={selectedMonthKey}
                                    onChange={(e) => setSelectedMonthKey(e.target.value)}
                                    style={{ 
                                        padding: '2px 6px', 
                                        fontSize: '11px', 
                                        borderRadius: '4px',
                                        border: '1px solid rgba(0,0,0,0.1)',
                                        backgroundColor: 'rgba(255,255,255,0.2)', // Subtle background
                                        cursor: 'pointer',
                                        color: 'inherit',
                                        outline: 'none'
                                    }}
                                >
                                    {sortedMonthKeys.length > 0 ? (
                                        sortedMonthKeys.map(key => (
                                            <option key={key} value={key} style={{ color: '#333' }}>
                                                {formatMonthKey(key)}
                                            </option>
                                        ))
                                    ) : (
                                        <option value="" style={{ color: '#333' }}>No Data</option>
                                    )}
                                </select>
                            </div>
                            <div className="stat-value">
                                PHP {selectedMonthANP.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <div className="stat-subtext">
                                {selectedMonthKey ? formatMonthKey(selectedMonthKey) : 'Select Month'}
                            </div>
                        </div>

                        <div className="stat-card orange">
                            <div className="stat-header">
                                <div className="stat-label">Submitted</div>
                            </div>
                            <div className="stat-value">{stats.submitted}</div>
                            <div className="stat-subtext">Applications</div>
                        </div>
                        <div className="stat-card purple">
                            <div className="stat-header">
                                <div className="stat-label">Issued</div>
                            </div>
                            <div className="stat-value">{stats.issued}</div>
                            <div className="stat-subtext">
                                {stats.submitted ? ((stats.issued / stats.submitted) * 100).toFixed(1) : 0}% Rate
                            </div>
                        </div>
                        <div className="stat-card teal">
                            <div className="stat-header">
                                <div className="stat-label">Pending</div>
                            </div>
                            <div className="stat-value">{stats.pending}</div>
                            <div className="stat-subtext">Awaiting Action</div>
                        </div>
                        <div className="stat-card red">
                            <div className="stat-header">
                                <div className="stat-label">Declined</div>
                            </div>
                            <div className="stat-value">{stats.declined}</div>
                            <div className="stat-subtext">
                                {stats.submitted ? ((stats.declined / stats.submitted) * 100).toFixed(1) : 0}% Rate
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                        <div className="chart-container">
                            <div className="chart-title">Status Distribution</div>
                            <div className="chart-wrapper">
                                <Doughnut data={statusData} options={{ responsive: true, maintainAspectRatio: false }} />
                            </div>
                        </div>
                        <div className="chart-container">
                            <div className="chart-title">Most Availed Policies</div>
                            <div className="chart-wrapper">
                                <Bar data={policyData} options={{ responsive: true, maintainAspectRatio: false }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h2>Serial Number Usage</h2>
                </div>
                <div className="card-body">
                    <table className="serial-table">
                        <thead>
                            <tr>
                                <th>Serial</th>
                                <th>Policy</th>
                                <th>Client</th>
                                <th>Submitted</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {monitoringData.filter(s => s.serial_number).slice(0, 10).map(item => (
                                <tr key={item.id}>
                                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.serial_number}</td>
                                    <td>{item.policy_type}</td>
                                    <td>{item.client_name || `${item.client_first_name} ${item.client_last_name}`}</td>
                                    <td>{new Date(item.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <span className={`status-badge status-${item.status.toLowerCase()}`}>
                                            {item.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

export default DashboardPage;