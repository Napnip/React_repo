import { useState } from 'react';
import api from '../services/api';
import { calculateANP } from '../utils/calculations'; 

const MonitoringPage = () => {
    // --- 1. CONFIGURATION ---
    const MANUAL_POLICIES = ['Eazy Health', 'Allianz Fundamental Cover', 'Allianz Secure Pro'];

    // --- 2. STATE ---
    const [formData, setFormData] = useState({
        agency: 'Caelum', 
        submissionType: 'New Business', 
        
        // CHANGED: Set to empty strings so they are not auto-filled
        intermediaryName: '', 
        intermediaryEmail: '',
        
        clientFirstName: '',
        clientLastName: '',
        clientEmail: '',
        policyType: 'Allianz Well', 
        policyDate: '',
        modeOfPayment: 'Annual',
        premiumPaid: '',
        anp: '',
    });

    const [serialNumber, setSerialNumber] = useState('');
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState(''); 
    const [submitting, setSubmitting] = useState(false);

    // Derived State
    const isManualPolicy = MANUAL_POLICIES.includes(formData.policyType);

    // --- 3. HANDLERS ---

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        setFormData(prev => {
            const newData = { ...prev, [name]: value };

            // Auto-Calculate ANP
            if (name === 'premiumPaid' || name === 'modeOfPayment') {
                const currentPremium = name === 'premiumPaid' ? value : prev.premiumPaid;
                const currentMode = name === 'modeOfPayment' ? value : prev.modeOfPayment;
                newData.anp = calculateANP(currentPremium, currentMode);
            }

            return newData;
        });

        // Clear Serial if Policy Type changes
        if (name === 'policyType') {
            setSerialNumber('');
            setMessage('');
        }
    };

    const handleManualSerialChange = (e) => {
        setSerialNumber(e.target.value);
    };

    // Helper: Fetch System Serial (Used inside Submit)
    const fetchSystemSerial = async (policyType) => {
        const response = await api.getAvailableSerial(policyType);
        if (response.success) {
            return response.serialNumber;
        } else {
            throw new Error(response.message || 'No serials available.');
        }
    };

    // --- MAIN SUBMIT HANDLER ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (submitting) return;
        setSubmitting(true);
        setMessage('');

        try {
            let finalSerial = serialNumber;

            // 1. If System Policy: FETCH serial now (Auto-generate)
            if (!isManualPolicy) {
                try {
                    setMessage('Requesting System Serial Number...');
                    finalSerial = await fetchSystemSerial(formData.policyType);
                    setSerialNumber(finalSerial); 
                } catch (err) {
                    throw new Error('Could not generate serial: ' + err.message);
                }
            } else {
                // 2. If Manual Policy: Use user input
                if (!finalSerial) throw new Error('Please type the Serial Number manually.');
            }

            // 3. Submit Data
            setMessage(`Submitting with Serial: ${finalSerial}...`);
            
            const payload = { ...formData, serialNumber: finalSerial };
            const response = await api.submitMonitoring(payload);

            if (response.success) {
                setMessage(`Success! Serial Number: ${response.data.serial_number}`);
                setMessageType('success');
                
                // Clear form but keep Agency/Agent info for convenience? 
                // Or clear everything as requested:
                setFormData(prev => ({ 
                    ...prev, 
                    clientFirstName: '', clientLastName: '', clientEmail: '',
                    premiumPaid: '', anp: '', policyDate: ''
                }));
                
                // Keep the serial number visible
                setSerialNumber(response.data.serial_number); 
            } else {
                setMessage('Submission Failed: ' + response.message);
                setMessageType('error');
            }
        } catch (error) {
            console.error(error);
            setMessage(error.message || 'Server Error.');
            setMessageType('error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="card">
            <div className="card-header">
                <h2>New Application Monitoring</h2>
            </div>
            <div className="card-body">
                {message && (
                    <div className={`alert ${messageType === 'success' ? 'alert-success' : 'alert-error'}`} style={{
                        padding: '10px', marginBottom: '15px', borderRadius: '4px',
                        backgroundColor: messageType === 'success' ? '#d4edda' : '#f8d7da',
                        color: messageType === 'success' ? '#155724' : '#721c24'
                    }}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-grid">
                        
                        <div className="form-group">
                            <label>Agency</label>
                            <select name="agency" value={formData.agency} onChange={handleChange}>
                                <option value="Caelum">Caelum</option>
                                <option value="Shepard One">Shepard One</option>
                                <option value="Others">Others</option>
                            </select>
                        </div>
                        
                        <div className="form-group">
                            <label>Intermediary Name</label>
                            <input name="intermediaryName" value={formData.intermediaryName} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label>Intermediary Email</label>
                            <input type="email" name="intermediaryEmail" value={formData.intermediaryEmail} onChange={handleChange} required />
                        </div>

                        <div className="form-group">
                            <label>Policy Type</label>
                            <select name="policyType" value={formData.policyType} onChange={handleChange} disabled={submitting}>
                                <option value="Allianz Well">Allianz Well (System)</option>
                                <option value="AZpire Growth">AZpire Growth (System)</option>
                                <option value="Single Pay/Optimal">Single Pay/Optimal (System)</option>
                                <option value="Eazy Health">Eazy Health (Manual)</option>
                                <option value="Allianz Fundamental Cover">Allianz Fundamental Cover (Manual)</option>
                                <option value="Allianz Secure Pro">Allianz Secure Pro (Manual)</option>
                            </select>
                        </div>

                        {/* --- SERIAL NUMBER FIELD (Smart) --- */}
                        <div className="form-group">
                            <label>
                                Serial Number 
                                {isManualPolicy ? 
                                    <span style={{color:'#e67e22', marginLeft:'5px'}}>(Input Manually)</span> : 
                                    <span style={{color:'#007bff', marginLeft:'5px'}}>(Auto-Generated on Submit)</span>
                                }
                            </label>
                            
                            <input 
                                type="text" 
                                value={serialNumber} 
                                onChange={handleManualSerialChange}
                                readOnly={!isManualPolicy} // Locked if System
                                placeholder={isManualPolicy ? "Type Serial from Sales Portal" : "System will assign this upon Submit"} 
                                style={{ 
                                    backgroundColor: isManualPolicy ? '#fff' : '#f8f9fa', 
                                    borderColor: isManualPolicy ? '#007bff' : '#ced4da',
                                    color: isManualPolicy ? '#000' : '#6c757d',
                                    fontWeight: serialNumber ? 'bold' : 'normal',
                                    cursor: isManualPolicy ? 'text' : 'default'
                                }}
                            />
                        </div>

                        <div className="form-group"><label>Client First Name</label><input name="clientFirstName" value={formData.clientFirstName} onChange={handleChange} required /></div>
                        <div className="form-group"><label>Client Last Name</label><input name="clientLastName" value={formData.clientLastName} onChange={handleChange} required /></div>
                        <div className="form-group"><label>Client Email</label><input type="email" name="clientEmail" value={formData.clientEmail} onChange={handleChange} required /></div>

                        <div className="form-group">
                            <label>Mode of Payment</label>
                            <select name="modeOfPayment" value={formData.modeOfPayment} onChange={handleChange}>
                                <option value="Annual">Annual</option>
                                <option value="Semi-Annual">Semi-Annual</option>
                                <option value="Quarterly">Quarterly</option>
                                <option value="Monthly">Monthly</option>
                            </select>
                        </div>
                        <div className="form-group"><label>Premium Paid</label><input type="number" name="premiumPaid" value={formData.premiumPaid} onChange={handleChange} placeholder="0.00" required /></div>
                        <div className="form-group"><label>ANP (Auto)</label><input type="text" name="anp" value={formData.anp} readOnly style={{ backgroundColor: '#e9ecef', fontWeight: 'bold' }} placeholder="0.00" /></div>
                        <div className="form-group"><label>Policy Date</label><input type="date" name="policyDate" value={formData.policyDate} onChange={handleChange} required /></div>
                    </div>

                    <div className="btn-group" style={{ marginTop: '20px' }}>
                        <button 
                            type="submit" 
                            className="btn-success" 
                            disabled={submitting} 
                        >
                            {submitting ? 'Processing...' : 'Submit Monitoring'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MonitoringPage;