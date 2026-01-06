import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

const SerialHistoryPage = () => {
    const { monitoringData, loadMonitoringData } = useApp();
    const [searchTerm, setSearchTerm] = useState('');
    
    // --- PAGINATION STATE ---
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    useEffect(() => {
        loadMonitoringData();
    }, []);

    // Filter Logic
    const filteredItems = monitoringData.filter(item => {
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const name = (item.client_name || item.client_first_name || '').toLowerCase();
            const serial = (item.serial_number || '').toLowerCase();
            return name.includes(term) || serial.includes(term);
        }
        return true;
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // --- PAGINATION LOGIC ---
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    return (
        <div className="card">
            <div className="card-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2>Serial Request History</h2>
                    <input 
                        type="text" 
                        placeholder="Search Serial or Name..." 
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
                        style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', width: '250px' }}
                    />
                </div>
            </div>
            <div className="card-body">
                {currentItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>No serial requests found.</div>
                ) : (
                    <>
                        <table className="serial-table">
                            <thead>
                                <tr>
                                    <th>Serial</th>
                                    <th>Client</th>
                                    <th>Policy</th>
                                    <th>Date Generated</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentItems.map(item => (
                                    <tr key={item.id}>
                                        <td style={{fontFamily:'monospace', fontWeight:600, color: '#003781'}}>{item.serial_number}</td>
                                        <td>{item.client_name || `${item.client_first_name} ${item.client_last_name}`}</td>
                                        <td>{item.policy_type}</td>
                                        <td>{new Date(item.created_at).toLocaleDateString()}</td>
                                        <td>
                                            {item.form_type ? (
                                                <span style={{color:'green', fontSize:'12px', fontWeight:600}}>Submitted</span>
                                            ) : (
                                                <span style={{color:'#666', fontSize:'12px'}}>Pending Docs</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

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

export default SerialHistoryPage;