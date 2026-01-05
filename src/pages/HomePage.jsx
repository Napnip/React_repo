import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

const HomePage = () => {
    const { monitoringData, loadMonitoringData } = useApp();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        loadMonitoringData();
    }, []);

    const changeMonth = (dir) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + dir);
        setCurrentDate(newDate);
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

    const openDayModal = (day, month, year) => {
        setSelectedDay({ day, month, year });
        setShowModal(true);
    };

    const saveReminder = () => {
        const note = document.getElementById('reminderInput').value;
        const dateKey = `${selectedDay.year}-${selectedDay.month + 1}-${selectedDay.day}`;

        if (note) {
            localStorage.setItem(`cal_note_${dateKey}`, note);
        } else {
            localStorage.removeItem(`cal_note_${dateKey}`);
        }

        const radios = document.getElementsByName('dayPriority');
        let selectedPrio = '';
        radios.forEach(r => { if (r.checked) selectedPrio = r.value; });

        if (selectedPrio) {
            localStorage.setItem(`cal_prio_${dateKey}`, selectedPrio);
        } else {
            localStorage.removeItem(`cal_prio_${dateKey}`);
        }

        setShowModal(false);
        setCurrentDate(new Date(currentDate)); // Force re-render
    };

    const clearReminder = () => {
        const dateKey = `${selectedDay.year}-${selectedDay.month + 1}-${selectedDay.day}`;
        localStorage.removeItem(`cal_note_${dateKey}`);
        localStorage.removeItem(`cal_prio_${dateKey}`);
        setShowModal(false);
        setCurrentDate(new Date(currentDate));
    };

    const pending = monitoringData.filter(item => item.status === 'Pending').length;
    const recent = monitoringData.filter(item => {
        const diff = new Date() - new Date(item.created_at);
        return diff < (1000 * 60 * 60 * 24 * 3);
    }).length;

    return (
        <>
            <div className="welcome-banner">
                <div className="welcome-title">Welcome back, User</div>
                <div className="welcome-subtitle">Here is your daily overview and schedule.</div>
            </div>

            <div className="calendar-wrapper">
                <div className="calendar-container">
                    <div className="calendar-header">
                        <div className="calendar-title">
                            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </div>
                        <div className="calendar-controls">
                            <button onClick={() => changeMonth(-1)}>◀ Prev</button>
                            <button onClick={() => changeMonth(1)}>Next ▶</button>
                        </div>
                    </div>
                    <div className="calendar-grid">{renderCalendar()}</div>
                </div>

                <div className="calendar-sidebar">
                    <div className="summary-widget">
                        <div className="widget-title">My Efficiency</div>
                        <ul className="todo-list">
                            <li className="todo-item"><span style={{ color: '#e67e22' }}>●</span> {pending} Pending Applications</li>
                            <li className="todo-item"><span style={{ color: '#0055b8' }}>●</span> {recent} New Submissions (3 days)</li>
                            <li className="todo-item"><span style={{ color: '#28a745' }}>●</span> System Operational</li>
                        </ul>
                    </div>

                    <div className="summary-widget" style={{ borderLeftColor: '#0055b8' }}>
                        <div className="widget-title">Quick Actions</div>
                        <div className="quick-actions">
                            <div className="quick-action-btn" onClick={() => navigate('/monitoring')}>
                                <span></span>New Request
                            </div>
                            <div className="quick-action-btn" onClick={() => navigate('/submission')}>
                                <span></span>Submit Docs
                            </div>
                            <div className="quick-action-btn" onClick={() => navigate('/customers')}>
                                <span></span>Profiles
                            </div>
                            <div className="quick-action-btn" onClick={() => navigate('/')}>
                                <span></span>Analytics
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showModal && selectedDay && (
                <div className="modal show" onClick={() => setShowModal(false)}>
                    <div className="modal-content" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Date Details</h2>
                            <span className="close-modal" onClick={() => setShowModal(false)}>&times;</span>
                        </div>
                        <div className="modal-body">
                            <h3>{new Date(selectedDay.year, selectedDay.month, selectedDay.day).toDateString()}</h3>

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

export default HomePage;
