import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

const SerialHistoryPage = () => {
    const { monitoringData, loadMonitoringData } = useApp();
    const [filter, setFilter] = useState('');

    useEffect(() => {
        loadMonitoringData();
    }, []);

    const filtered = monitoringData.filter(item =>
        !filter || item.policy_type === filter
    ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return (
        <div className="card">
            <div className="card-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2>Serial Request History</h2>
                    <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: '8px' }}>
                        <option value="">All Policies</option>
                        <option value="Allianz Well">Allianz Well</option>
                        <option value="AZpire Growth">AZpire Growth</option>
                        <option value="Single Pay/Optimal">Single Pay/Optimal</option>
                    </select>
                </div>
            </div>
            <div className="card-body">
                {filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px' }}>No requests found</div>
                ) : (
                    filtered.map(mon => (
                        <div key={mon.id} className="submission-card">
                            <div className="submission-header">
                                <div className="submission-title">
                                    Serial Request: {mon.client_name || mon.client_first_name}
                                </div>
                            </div>
                            <div className="submission-details">
                                <div><strong>Agency:</strong> {mon.agency}</div>
                                <div><strong>Policy:</strong> {mon.policy_type}</div>
                                {mon.serial_number && (
                                    <div>
                                        <strong>Serial:</strong>
                                        <span style={{ fontWeight: 'bold', color: '#0d47a1' }}> {mon.serial_number}</span>
                                    </div>
                                )}
                                <div><strong>Date:</strong> {new Date(mon.created_at).toLocaleDateString()}</div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default SerialHistoryPage;
