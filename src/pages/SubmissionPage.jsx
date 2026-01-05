import { useState } from 'react';
import api from '../services/api'; // Import your existing API bridge

const SubmissionPage = () => {
    // State for form fields
    const [formData, setFormData] = useState({
        serialNumber: '',
        formType: '',
        policyType: '',
        modeOfPayment: '',
        policyDate: ''
    });

    // State for file uploads
    const [files, setFiles] = useState([]);
    
    // UI Loading states
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState(''); // 'success' or 'error'

    // --- CONNECTED FUNCTION 1: Fetch Serial Details ---
    // Triggered when the user clicks away from the "Serial Number" box
    const handleSerialBlur = async () => {
        if (!formData.serialNumber) return;
        
        try {
            setLoading(true);
            setMessage('Checking serial number...');
            setMessageType('info');

            // Calls server.js endpoint: /api/submissions/details/:serialNumber
            const response = await api.getSerialDetails(formData.serialNumber);
            
            if (response.success) {
                const data = response.data;
                // Auto-fill the form with data from the server
                setFormData(prev => ({
                    ...prev,
                    policyType: data.policy_type || '',
                    modeOfPayment: data.mode_of_payment || '',
                    policyDate: data.policy_date || ''
                }));
                setMessage('Serial found! Details auto-filled.');
                setMessageType('success');
            } else {
                setMessage('Serial Number not found in system.');
                setMessageType('error');
            }
        } catch (error) {
            console.error(error);
            setMessage('Error connecting to server.');
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    // Helper to handle file selection
    const handleFileChange = (e) => {
        setFiles([...e.target.files]);
    };

    // --- CONNECTED FUNCTION 2: Submit to Backend ---
    const handleSubmit = async () => {
        if (!formData.serialNumber || !formData.formType) {
            alert('Please fill in Serial Number and Form Type.');
            return;
        }

        try {
            setLoading(true);
            setMessage('Uploading documents...');
            setMessageType('info');

            // We must use FormData because we are sending files
            const dataPayload = new FormData();
            
            // Append text data
            dataPayload.append('serialNumber', formData.serialNumber);
            dataPayload.append('formData', JSON.stringify(formData));

            // Append files (server.js looks for 'documents_' prefix)
            files.forEach((file) => {
                // 'documents_application' is just a generic name for the file field
                dataPayload.append('documents_application', file);
            });

            // Calls server.js endpoint: POST /api/form-submissions
            const response = await api.submitForm(dataPayload);

            if (response.success) {
                setMessage('Documents submitted successfully! Email sent.');
                setMessageType('success');
                // Clear form after success
                setFormData({
                    serialNumber: '', formType: '', policyType: '', 
                    modeOfPayment: '', policyDate: ''
                });
                setFiles([]);
            } else {
                setMessage('Submission failed: ' + response.message);
                setMessageType('error');
            }
        } catch (error) {
            console.error(error);
            setMessage('Server error occurred.');
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <div className="card-header">
                <h2>Document Submission</h2>
            </div>
            <div className="card-body">
                {/* STATUS MESSAGES */}
                {message && (
                    <div style={{ 
                        padding: '12px', 
                        marginBottom: '20px',
                        borderRadius: '6px',
                        backgroundColor: messageType === 'success' ? '#d4edda' : messageType === 'error' ? '#f8d7da' : '#e2e3e5', 
                        color: messageType === 'success' ? '#155724' : messageType === 'error' ? '#721c24' : '#383d41',
                        border: `1px solid ${messageType === 'success' ? '#c3e6cb' : messageType === 'error' ? '#f5c6cb' : '#d6d8db'}`
                    }}>
                        {message}
                    </div>
                )}

                <div className="form-grid">
                    <div className="form-group">
                        <label>Serial Number <span className="required">*</span></label>
                        <input
                            type="text"
                            value={formData.serialNumber}
                            onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                            onBlur={handleSerialBlur} /* <--- This triggers the fetch */
                            placeholder="Enter Serial & Click Away to Search"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Form Type <span className="required">*</span></label>
                        <select
                            value={formData.formType}
                            onChange={(e) => setFormData({ ...formData, formType: e.target.value })}
                        >
                            <option value="">Select</option>
                            <option value="GAE">GAE</option>
                            <option value="NON_GAE">Non-GAE</option>
                        </select>
                    </div>
                    
                    {/* Read-only fields auto-filled from backend */}
                    <div className="form-group">
                        <label>Policy Type</label>
                        <input
                            type="text"
                            value={formData.policyType}
                            placeholder="Auto-filled from Serial"
                            readOnly
                            style={{ backgroundColor: '#e9ecef', cursor: 'not-allowed' }}
                        />
                    </div>
                    <div className="form-group">
                        <label>Mode of Payment</label>
                        <input
                            type="text"
                            value={formData.modeOfPayment}
                            placeholder="Auto-filled from Serial"
                            readOnly
                            style={{ backgroundColor: '#e9ecef', cursor: 'not-allowed' }}
                        />
                    </div>
                    <div className="form-group">
                        <label>Policy Date</label>
                        <input
                            type="text"
                            value={formData.policyDate}
                            placeholder="Auto-filled from Serial"
                            readOnly
                            style={{ backgroundColor: '#e9ecef', cursor: 'not-allowed' }}
                        />
                    </div>
                </div>

                <div className="file-upload-section">
                    <h3>Required Documents</h3>
                    <input 
                        type="file" 
                        multiple 
                        onChange={handleFileChange}
                        accept="application/pdf,image/jpeg,image/png"
                        style={{ padding: '10px', width: '100%' }}
                    />
                    <p style={{ fontSize: '0.9em', color: '#666', marginTop: '8px' }}>
                        {files.length > 0 ? `Selected ${files.length} file(s)` : 'No files selected'}
                    </p>
                </div>

                <div className="btn-group">
                    <button className="btn-secondary" onClick={() => window.location.reload()}>Reset</button>
                    <button 
                        className="btn-success" 
                        onClick={handleSubmit}
                        disabled={loading || !formData.serialNumber}
                    >
                        {loading ? 'Submitting...' : 'Submit Documents'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SubmissionPage;