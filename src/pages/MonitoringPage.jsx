import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import { calculateANP } from '../utils/calculations';

const MonitoringPage = () => {
    const { loadMonitoringData } = useApp();
    const [formData, setFormData] = useState({
        agency: '',
        submissionType: '',
        intermediaryName: '',
        intermediaryEmail: '',
        clientFirstName: '',
        clientLastName: '',
        clientEmail: '',
        policyType: '',
        premiumPaid: '',
        modeOfPayment: '',
        policyDate: '',
        anp: ''
    });
    const [serialNumber, setSerialNumber] = useState('');
    const [showSerial, setShowSerial] = useState(false);

    const handleChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));

        if (id === 'premiumPaid' || id === 'modeOfPayment') {
            const anp = calculateANP(
                id === 'premiumPaid' ? value : formData.premiumPaid,
                id === 'modeOfPayment' ? value : formData.modeOfPayment
            );
            setFormData(prev => ({ ...prev, anp }));
        }
    };

    const handleSubmit = async () => {
        if (!formData.policyType) {
            alert('Select Policy Type');
            return;
        }

        try {
            const serialRes = await api.getAvailableSerial(formData.policyType);
            if (serialRes.success && serialRes.serialNumber) {
                const payload = { ...formData, serialNumber: serialRes.serialNumber };
                const res = await api.submitMonitoring(payload);

                if (res.success) {
                    setSerialNumber(serialRes.serialNumber);
                    setShowSerial(true);
                    alert('Request Submitted');
                    loadMonitoringData();
                }
            } else {
                alert('No serials available');
            }
        } catch (error) {
            alert('Error submitting request');
        }
    };

    const resetForm = () => {
        setFormData({
            agency: '', submissionType: '', intermediaryName: '', intermediaryEmail: '',
            clientFirstName: '', clientLastName: '', clientEmail: '', policyType: '',
            premiumPaid: '', modeOfPayment: '', policyDate: '', anp: ''
        });
        setShowSerial(false);
    };

    return (
        <div className="card">
            <div className="card-header">
                <h2>Solutions Provider Monitoring System</h2>
            </div>
            <div className="card-body">
                <div className="form-grid">
                    <div className="form-group">
                        <label>Agency <span className="required">*</span></label>
                        <select id="agency" value={formData.agency} onChange={handleChange} required>
                            <option value="">Select</option>
                            <option value="Caelum">Caelum</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Type <span className="required">*</span></label>
                        <select id="submissionType" value={formData.submissionType} onChange={handleChange} required>
                            <option value="">Select</option>
                            <option value="Tablet">Tablet</option>
                            <option value="Email">Email</option>
                            <option value="Eazy Health">Eazy Health</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Intermediary Name <span className="required">*</span></label>
                        <input type="text" id="intermediaryName" value={formData.intermediaryName} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>Intermediary Email <span className="required">*</span></label>
                        <input type="email" id="intermediaryEmail" value={formData.intermediaryEmail} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>Client First Name <span className="required">*</span></label>
                        <input type="text" id="clientFirstName" value={formData.clientFirstName} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>Client Last Name <span className="required">*</span></label>
                        <input type="text" id="clientLastName" value={formData.clientLastName} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>Client Email <span className="required">*</span></label>
                        <input type="email" id="clientEmail" value={formData.clientEmail} onChange={handleChange} placeholder="Required for Customer Profile" required />
                    </div>
                    <div className="form-group">
                        <label>Policy Type <span className="required">*</span></label>
                        <select id="policyType" value={formData.policyType} onChange={handleChange} required>
                            <option value="">Select</option>
                            <option value="Allianz Well">Allianz Well</option>
                            <option value="AZpire Growth">AZpire Growth</option>
                            <option value="Single Pay/Optimal">Single Pay/Optimal</option>
                            <option value="Eazy Health">Eazy Health</option>
                            <option value="Allianz Fundamental Cover">Allianz Fundamental Cover</option>
                            <option value="Allianz Secure Pro">Allianz Secure Pro</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Premium Paid <span className="required">*</span></label>
                        <input type="number" id="premiumPaid" value={formData.premiumPaid} onChange={handleChange} step="0.01" required />
                    </div>
                    <div className="form-group">
                        <label>Mode of Payment <span className="required">*</span></label>
                        <select id="modeOfPayment" value={formData.modeOfPayment} onChange={handleChange} required>
                            <option value="">Select</option>
                            <option value="Monthly">Monthly</option>
                            <option value="Quarterly">Quarterly</option>
                            <option value="Semi-Annual">Semi-Annual</option>
                            <option value="Annual">Annual</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Policy Date <span className="required">*</span></label>
                        <input type="date" id="policyDate" value={formData.policyDate} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>ANP <span className="required">*</span></label>
                        <input type="number" id="anp" value={formData.anp} step="0.01" disabled required />
                    </div>
                </div>
                {showSerial && (
                    <div className="serial-notice show">
                        <strong>Assigned Serial: </strong><span>{serialNumber}</span>
                    </div>
                )}
                <div className="btn-group">
                    <button className="btn-secondary" onClick={resetForm}>Reset</button>
                    <button className="btn-success" onClick={handleSubmit}>Request Serial</button>
                </div>
            </div>
        </div>
    );
};

export default MonitoringPage;
