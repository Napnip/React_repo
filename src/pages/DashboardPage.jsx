import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom'; 
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

const DashboardPage = () => {
    const { monitoringData, loadMonitoringData } = useApp();
    const navigate = useNavigate();
    
    // --- DASHBOARD STATS STATE ---
    const [stats, setStats] = useState({
        totalANP: 0,
        monthlyANP: 0,
        submitted: 0,
        issued: 0,
        pending: 0,
        declined: 0
    });

    const [monthlyHistory, setMonthlyHistory] = useState({});
    const [selectedMonthKey, setSelectedMonthKey] = useState('');

    // --- CALENDAR STATE ---
    const [showCalendarModal, setShowCalendarModal] = useState(false); 
    const [showDayModal, setShowDayModal] = useState(false);         
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState(null);

    // --- PAGINATION STATE (NEW) ---
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    useEffect(() => {
        loadMonitoringData();
    }, []);

    // --- DATA PROCESSING ---
    useEffect(() => {
        if (monitoringData.length > 0) {
            let totalANP = 0, monthlyANP = 0;
            let submitted = monitoringData.length, issued = 0, declined = 0, pending = 0;
            const historyAgg = {};

            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            monitoringData.forEach(item => {
                if (item.status === 'Issued') {
                    const anpVal = parseFloat(item.anp) || 0;
                    totalANP += anpVal;
                    issued++;
                    
                    const dDate = new Date(item.created_at);
                    if (!isNaN(dDate)) {
                        if (dDate.getMonth() === currentMonth && dDate.getFullYear() === currentYear) {
                            monthlyANP += anpVal;
                        }
                        const monthKey = `${dDate.getFullYear()}-${String(dDate.getMonth() + 1).padStart(2, '0')}`;
                        historyAgg[monthKey] = (historyAgg[monthKey] || 0) + anpVal;
                    }
                } else if (item.status === 'Declined') declined++;
                else pending++;
            });

            setStats({ totalANP, monthlyANP, submitted, issued, pending, declined });
            setMonthlyHistory(historyAgg);
            
            const availableKeys = Object.keys(historyAgg).sort().reverse();
            if (availableKeys.length > 0 && (!selectedMonthKey || !historyAgg[selectedMonthKey])) {
                setSelectedMonthKey(availableKeys[0]);
            }
        }
    }, [monitoringData, selectedMonthKey]);

    // --- PAGINATION LOGIC ---
    // Filter data to only show items with serial numbers (matching your original table logic)
    const serialData = monitoringData.filter(s => s.serial_number);
    const totalPages = Math.ceil(serialData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentItems = serialData.slice(startIndex, startIndex + itemsPerPage);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    // --- CALENDAR LOGIC ---
    const changeMonth = (dir) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + dir);
        setCurrentDate(newDate);
    };

    const openDayModal = (day, month, year) => {
        setSelectedDay({ day, month, year });
        setShowDayModal(true);
    };

    const saveReminder = () => {
        const dateKey = `${selectedDay.year}-${selectedDay.month + 1}-${selectedDay.day}`;
        const note = document.getElementById('reminderInput').value;
        
        if (note) localStorage.setItem(`cal_note_${dateKey}`, note);
        else localStorage.removeItem(`cal_note_${dateKey}`);

        const radios = document.getElementsByName('dayPriority');
        let selectedPrio = '';
        radios.forEach(r => { if (r.checked) selectedPrio = r.value; });

        if (selectedPrio) localStorage.setItem(`cal_prio_${dateKey}`, selectedPrio);
        else localStorage.removeItem(`cal_prio_${dateKey}`);

        setShowDayModal(false);
        setCurrentDate(new Date(currentDate)); 
    };

    const clearReminder = () => {
        const dateKey = `${selectedDay.year}-${selectedDay.month + 1}-${selectedDay.day}`;
        localStorage.removeItem(`cal_note_${dateKey}`);
        localStorage.removeItem(`cal_prio_${dateKey}`);
        setShowDayModal(false);
        setCurrentDate(new Date(currentDate));
    };

    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();

        const days = [];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        dayNames.forEach(name => {
            days.push(<div key={`name-${name}`} className="calendar-day-name">{name}</div>);
        });

        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = `${year}-${month + 1}-${day}`;
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const note = localStorage.getItem(`cal_note_${dateKey}`);
            const priority = localStorage.getItem(`cal_prio_${dateKey}`);

            let className = 'calendar-day';
            if (isToday) className += ' today';
            if (priority === 'high') className += ' prio-high';
            else if (priority === 'mid') className += ' prio-mid';
            else if (priority === 'low') className += ' prio-low';

            days.push(
                <div key={day} className={className} onClick={() => openDayModal(day, month, year)}>
                    <span className="day-number">{day}</span>
                    {note && <div className="day-note-preview">{note}</div>}
                </div>
            );
        }
        return days;
    };

    // --- CHART DATA PREP ---
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

    const formatMonthKey = (key) => {
        if (!key) return '';
        const [year, month] = key.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return date.toLocaleString('default', { month: 'long', year: 'numeric' });
    };

    const sortedMonthKeys = Object.keys(monthlyHistory).sort().reverse();
    const selectedMonthANP = monthlyHistory[selectedMonthKey] || 0;

    // Helper for "My Efficiency" counts in the Calendar Sidebar
    const pendingCount = monitoringData.filter(item => item.status === 'Pending').length;
    const recentCount = monitoringData.filter(item => {
        const diff = new Date() - new Date(item.created_at);
        return diff < (1000 * 60 * 60 * 24 * 3); // 3 days
    }).length;

    return (
        <>
            <div className="card">
                <div className="card-header">
                    <h2>Dashboard Overview</h2>
                </div>
                <div className="card-body">
                    {/* 4-Column Grid */}
                    <div className="dashboard-grid" style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(4, 1fr)', 
                        gap: '20px' 
                    }}>
                        {/* TOP ROW */}
                        <div className="stat-card blue">
                            <div className="stat-header"><div className="stat-label">Total ANP</div></div>
                            <div className="stat-value">PHP {stats.totalANP.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                            <div className="stat-subtext">All-time annual premium</div>
                        </div>
                        
                        <div className="stat-card green">
                            <div className="stat-header"><div className="stat-label">Monthly ANP</div></div>
                            <div className="stat-value">PHP {stats.monthlyANP.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                            <div className="stat-subtext">This Month</div>
                        </div>

                        <div className="stat-card purple">
                            <div className="stat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div className="stat-label">Historical ANP</div>
                                <select 
                                    value={selectedMonthKey}
                                    onChange={(e) => setSelectedMonthKey(e.target.value)}
                                    style={{ 
                                        padding: '2px 6px', fontSize: '11px', borderRadius: '4px',
                                        border: '1px solid rgba(0,0,0,0.1)', backgroundColor: 'rgba(255,255,255,0.2)',
                                        cursor: 'pointer', color: 'inherit', outline: 'none'
                                    }}
                                >
                                    {sortedMonthKeys.length > 0 ? (
                                        sortedMonthKeys.map(key => <option key={key} value={key} style={{ color: '#333' }}>{formatMonthKey(key)}</option>)
                                    ) : (
                                        <option value="" style={{ color: '#333' }}>No Data</option>
                                    )}
                                </select>
                            </div>
                            <div className="stat-value">PHP {selectedMonthANP.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                            <div className="stat-subtext">{selectedMonthKey ? formatMonthKey(selectedMonthKey) : 'Select Month'}</div>
                        </div>

                        <div 
                            className="stat-card" 
                            style={{ borderLeft: '4px solid #0055b8', cursor: 'pointer', transition: 'transform 0.2s', backgroundColor: '#f0f7ff' }}
                            onClick={() => setShowCalendarModal(true)}
                        >
                            <div className="stat-header">
                                <div className="stat-label" style={{ color: '#0055b8' }}>Tools</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <span style={{ fontSize: '32px' }}>📅</span>
                                <div>
                                    <div className="stat-value" style={{ fontSize: '18px', marginBottom: '0' }}>Calendar</div>
                                    <div className="stat-subtext">Schedule & Actions</div>
                                </div>
                            </div>
                        </div>

                        {/* BOTTOM ROW */}
                        <div className="stat-card orange">
                            <div className="stat-header"><div className="stat-label">Submitted</div></div>
                            <div className="stat-value">{stats.submitted}</div>
                            <div className="stat-subtext">Applications</div>
                        </div>

                        <div className="stat-card purple">
                            <div className="stat-header"><div className="stat-label">Issued</div></div>
                            <div className="stat-value">{stats.issued}</div>
                            <div className="stat-subtext">{stats.submitted ? ((stats.issued / stats.submitted) * 100).toFixed(1) : 0}% Rate</div>
                        </div>

                        <div className="stat-card teal">
                            <div className="stat-header"><div className="stat-label">Pending</div></div>
                            <div className="stat-value">{stats.pending}</div>
                            <div className="stat-subtext">Awaiting Action</div>
                        </div>

                        <div className="stat-card red">
                            <div className="stat-header"><div className="stat-label">Declined</div></div>
                            <div className="stat-value">{stats.declined}</div>
                            <div className="stat-subtext">{stats.submitted ? ((stats.declined / stats.submitted) * 100).toFixed(1) : 0}% Rate</div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px', marginTop: '24px' }}>
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
                    {/* PAGINATED TABLE */}
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
                            {currentItems.length > 0 ? (
                                currentItems.map(item => (
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
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" style={{textAlign: 'center', padding: '20px', color: '#666'}}>No serial usage data found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* PAGINATION CONTROLS */}
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
                </div>
            </div>

            {/* --- MODAL 1: FULL CALENDAR + QUICK ACTIONS --- */}
            {showCalendarModal && (
                <div className="modal show" onClick={() => setShowCalendarModal(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="modal-content" style={{ width: '90%', maxWidth: '1200px', height: '85vh', margin: 0 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Agency Schedule & Tools</h2>
                            <span className="close-modal" onClick={() => setShowCalendarModal(false)}>&times;</span>
                        </div>
                        
                        <div className="modal-body" style={{ padding: '0', height: '100%', overflow: 'hidden' }}>
                            <div className="calendar-wrapper" style={{ height: '100%', padding: '20px' }}>
                                {/* Calendar Section */}
                                <div className="calendar-container" style={{ overflowY: 'auto', flex: 2, boxShadow: 'none', border: '1px solid #eee' }}>
                                    <div className="calendar-header">
                                        <div className="calendar-title" style={{ fontSize: '20px' }}>
                                            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                        </div>
                                        <div className="calendar-controls">
                                            <button onClick={() => changeMonth(-1)}>◀ Prev</button>
                                            <button onClick={() => changeMonth(1)}>Next ▶</button>
                                        </div>
                                    </div>
                                    <div className="calendar-grid">
                                        {renderCalendar()}
                                    </div>
                                </div>

                                {/* Sidebar Section (Inside Modal) */}
                                <div className="calendar-sidebar" style={{ flex: 1, overflowY: 'auto' }}>
                                    {/* Efficiency Widget */}
                                    <div className="summary-widget">
                                        <div className="widget-title">Overview</div>
                                        <ul className="todo-list">
                                            <li className="todo-item"><span style={{ color: '#e67e22' }}>●</span> {pendingCount} Pending Applications</li>
                                            <li className="todo-item"><span style={{ color: '#0055b8' }}>●</span> {recentCount} New Submissions (3 days)</li>
                                            <li className="todo-item"><span style={{ color: '#28a745' }}>●</span> System Operational</li>
                                        </ul>
                                    </div>

                                    {/* --- QUICK ACTIONS WIDGET --- */}
                                    <div className="summary-widget" style={{ borderLeftColor: '#0055b8' }}>
                                        <div className="widget-title">Quick Actions</div>
                                        <div className="quick-actions">
                                            <div className="quick-action-btn" onClick={() => { setShowCalendarModal(false); navigate('/monitoring'); }}>
                                                <span style={{ fontSize: '24px' }}>📝</span> New Request
                                            </div>
                                            <div className="quick-action-btn" onClick={() => { setShowCalendarModal(false); navigate('/submission'); }}>
                                                <span style={{ fontSize: '24px' }}>📄</span> Submit Docs
                                            </div>
                                            <div className="quick-action-btn" onClick={() => { setShowCalendarModal(false); navigate('/customers'); }}>
                                                <span style={{ fontSize: '24px' }}>👥</span> Profiles
                                            </div>
                                            <div className="quick-action-btn" onClick={() => { setShowCalendarModal(false); navigate('/doc-history'); }}>
                                                <span style={{ fontSize: '24px' }}>📁</span> History
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL 2: DAY DETAILS --- */}
            {showDayModal && selectedDay && (
                <div className="modal show" style={{ zIndex: 2100 }} onClick={() => setShowDayModal(false)}>
                    <div className="modal-content" style={{ maxWidth: '400px', marginTop: '10vh' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{new Date(selectedDay.year, selectedDay.month, selectedDay.day).toDateString()}</h2>
                            <span className="close-modal" onClick={() => setShowDayModal(false)}>&times;</span>
                        </div>
                        <div className="modal-body">
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ fontWeight: 600, fontSize: '13px', display: 'block', marginBottom: '8px', color: '#555' }}>
                                    Set Daily Priority
                                </label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input type="radio" name="dayPriority" value="high" />
                                        <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#28a745', borderRadius: '50%' }}></span>
                                        High (Green)
                                    </label>
                                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input type="radio" name="dayPriority" value="mid" />
                                        <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#ffc107', borderRadius: '50%' }}></span>
                                        Mid (Yellow)
                                    </label>
                                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input type="radio" name="dayPriority" value="low" />
                                        <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#dc3545', borderRadius: '50%' }}></span>
                                        Low (Red)
                                    </label>
                                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input type="radio" name="dayPriority" value="" defaultChecked />
                                        <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '1px solid #ccc', borderRadius: '50%' }}></span>
                                        None
                                    </label>
                                </div>
                            </div>

                            <label style={{ fontWeight: 600, fontSize: '13px', display: 'block', marginBottom: '5px', color: '#555' }}>Notes</label>
                            <textarea
                                id="reminderInput"
                                rows="4"
                                style={{ width: '100%' }}
                                placeholder="Type your note here..."
                                defaultValue={localStorage.getItem(`cal_note_${selectedDay.year}-${selectedDay.month + 1}-${selectedDay.day}`) || ''}
                            />

                            <div className="btn-group">
                                <button className="btn-secondary" onClick={clearReminder}>Clear All</button>
                                <button className="btn-success" onClick={saveReminder}>Save Changes</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default DashboardPage;