import { useState } from 'react';
import api from '../services/api'; 

const SubmissionPage = () => {
    // State for main form fields
    const [formData, setFormData] = useState({
        serialNumber: '',
        formType: '',
        policyType: '',
        modeOfPayment: '',
        policyDate: '',
        medical: {
            height: '',
            weight: '',
            diagnosed: 'No',
            hospitalized: 'No',
            smoker: 'No',
            alcohol: 'No'
        }
    });

    // State for specific file slots
    const [specificFiles, setSpecificFiles] = useState({});
    
    // UI States
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState(''); 

    // --- REQUIREMENTS CONFIGURATION ---
    const REQUIREMENTS = {
        GAE: [
            { id: 'valid_id', label: 'Valid Government ID', required: true },
            { id: 'proof_payment', label: 'Proof of Initial Payment', required: true },
            { id: 'application_form', label: 'Signed Application Form', required: true }
        ],
        NON_GAE: [
            { id: 'valid_id', label: 'Valid Government ID', required: true },
            { id: 'proof_payment', label: 'Proof of Initial Payment', required: true },
            { id: 'application_form', label: 'Signed Application Form', required: true },
            { id: 'medical_abstract', label: 'Medical Abstract / Records (if applicable)', required: false },
            { id: 'physician_statement', label: 'Attending Physician Statement (if applicable)', required: false }
        ]
    };

    // 1. Fetch Serial Details
    const handleSerialBlur = async () => {
        if (!formData.serialNumber) return;
        
        try {
            setLoading(true);
            setMessage('Checking serial number...');
            setMessageType('info');

            const response = await api.getSerialDetails(formData.serialNumber);
            
            if (response.success) {
                const data = response.data;
                
                // CORRECTED MAPPING: Uses CamelCase from the new endpoint
                setFormData(prev => ({
                    ...prev,
                    policyType: data.policyType || '',       
                    modeOfPayment: data.modeOfPayment || '', 
                    policyDate: data.policyDate || ''        
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

    const handleTextChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleMedicalChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            medical: { ...prev.medical, [name]: value }
        }));
    };

    // --- SPECIFIC FILE HANDLERS ---
    const handleSpecificFileChange = (slotId, e) => {
        const newFiles = Array.from(e.target.files);
        if (newFiles.length > 0) {
            setSpecificFiles(prev => {
                const existing = prev[slotId] || [];
                const combined = [...existing, ...newFiles];
                return { ...prev, [slotId]: combined };
            });
        }
        e.target.value = ''; // Reset input
    };

    const handleRemoveFile = (slotId, fileIndex) => {
        setSpecificFiles(prev => {
            const currentFiles = prev[slotId] || [];
            const updatedFiles = currentFiles.filter((_, idx) => idx !== fileIndex);
            
            if (updatedFiles.length === 0) {
                const newState = { ...prev };
                delete newState[slotId];
                return newState;
            }

            return { ...prev, [slotId]: updatedFiles };
        });
    };

    // 2. Submit Logic
    const handleSubmit = async () => {
        if (!formData.serialNumber || !formData.formType) {
            alert('Please fill in Serial Number and Form Type.');
            return;
        }

        const currentReqs = REQUIREMENTS[formData.formType] || [];
        const missingFiles = currentReqs
            .filter(r => r.required && (!specificFiles[r.id] || specificFiles[r.id].length === 0))
            .map(r => r.label);

        if (missingFiles.length > 0) {
            alert(`Missing required documents:\n- ${missingFiles.join('\n- ')}`);
            return;
        }

        try {
            setLoading(true);
            setMessage('Uploading documents...');
            setMessageType('info');

            const dataPayload = new FormData();
            dataPayload.append('serialNumber', formData.serialNumber);
            dataPayload.append('formData', JSON.stringify(formData));

            Object.entries(specificFiles).forEach(([key, filesArray]) => {
                filesArray.forEach(file => {
                    dataPayload.append(`documents_${key}`, file);
                });
            });

            const response = await api.submitForm(dataPayload);

            if (response.success) {
                setMessage('Documents submitted successfully! Email sent.');
                setMessageType('success');
                setFormData({
                    serialNumber: '', formType: '', policyType: '', 
                    modeOfPayment: '', policyDate: '',
                    medical: { height: '', weight: '', diagnosed: 'No', hospitalized: 'No', smoker: 'No', alcohol: 'No' }
                });
                setSpecificFiles({});
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
                {message && (
                    <div style={{ 
                        padding: '12px', marginBottom: '20px', borderRadius: '6px',
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
                            name="serialNumber"
                            value={formData.serialNumber}
                            onChange={handleTextChange}
                            onBlur={handleSerialBlur}
                            placeholder="Enter Serial..."
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Form Type <span className="required">*</span></label>
                        <select name="formType" value={formData.formType} onChange={handleTextChange}>
                            <option value="">Select Type</option>
                            <option value="GAE">GAE (Guaranteed Acceptance)</option>
                            <option value="NON_GAE">Non-GAE (Medical Required)</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Policy Type</label>
                        <input value={formData.policyType} readOnly style={{ backgroundColor: '#e9ecef' }} />
                    </div>
                    <div className="form-group">
                        <label>Mode of Payment</label>
                        <input value={formData.modeOfPayment} readOnly style={{ backgroundColor: '#e9ecef' }} />
                    </div>
                    <div className="form-group">
                        <label>Policy Date</label>
                        <input value={formData.policyDate} readOnly style={{ backgroundColor: '#e9ecef' }} />
                    </div>
                </div>

                {/* Medical Section for NON-GAE */}
                {formData.formType === 'NON_GAE' && (
                    <div className="medical-section" style={{ marginTop: '20px', animation: 'fadeIn 0.5s' }}>
                        <h3 style={{ color: '#c0392b', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>Medical Declaration</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Height (cm/ft)</label>
                                <input type="text" name="height" value={formData.medical.height} onChange={handleMedicalChange} placeholder="e.g. 175cm" />
                            </div>
                            <div className="form-group">
                                <label>Weight (kg/lbs)</label>
                                <input type="text" name="weight" value={formData.medical.weight} onChange={handleMedicalChange} placeholder="e.g. 70kg" />
                            </div>
                            <div className="form-group">
                                <label>Diagnosed with critical illness?</label>
                                <select name="diagnosed" value={formData.medical.diagnosed} onChange={handleMedicalChange}>
                                    <option value="No">No</option>
                                    <option value="Yes">Yes</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Hospitalized in last 2 years?</label>
                                <select name="hospitalized" value={formData.medical.hospitalized} onChange={handleMedicalChange}>
                                    <option value="No">No</option>
                                    <option value="Yes">Yes</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Smoker?</label>
                                <select name="smoker" value={formData.medical.smoker} onChange={handleMedicalChange}>
                                    <option value="No">No</option>
                                    <option value="Yes">Yes</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Alcohol consumer?</label>
                                <select name="alcohol" value={formData.medical.alcohol} onChange={handleMedicalChange}>
                                    <option value="No">No</option>
                                    <option value="Yes">Yes</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                <hr style={{ margin: '25px 0', border: '0', borderTop: '1px solid #eee' }} />

                {/* --- 1. VISUAL CHECKLIST --- */}
                {formData.formType && (
                    <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e8f4fd', borderRadius: '6px', borderLeft: '4px solid #007bff' }}>
                        <h4 style={{ marginTop: 0, color: '#0056b3', marginBottom: '10px' }}>
                            📋 Checklist: Requirements for {formData.formType}
                        </h4>
                        <ul style={{ margin: 0, paddingLeft: '20px', color: '#444' }}>
                            {REQUIREMENTS[formData.formType].map((req) => (
                                <li key={req.id} style={{ marginBottom: '4px' }}>
                                    {req.label}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* --- 2. UPLOAD BUTTONS --- */}
                {formData.formType && (
                    <div className="file-upload-section">
                        <h3>Upload Documents</h3>
                        <div style={{ display: 'grid', gap: '15px' }}>
                            {REQUIREMENTS[formData.formType].map((req) => {
                                const uploadedFiles = specificFiles[req.id] || [];
                                const hasFiles = uploadedFiles.length > 0;

                                return (
                                    <div key={req.id} style={{ 
                                        padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px', border: '1px solid #dee2e6'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: hasFiles ? '10px' : '0' }}>
                                            <div style={{ fontWeight: 600, color: '#333' }}>
                                                {req.label}
                                                {req.required && <span style={{ color: 'red', marginLeft: '4px' }}>*</span>}
                                            </div>
                                            
                                            <div>
                                                <input
                                                    type="file"
                                                    id={`file-${req.id}`}
                                                    style={{ display: 'none' }}
                                                    onChange={(e) => handleSpecificFileChange(req.id, e)}
                                                    accept="application/pdf,image/jpeg,image/png"
                                                    multiple
                                                />
                                                <label
                                                    htmlFor={`file-${req.id}`}
                                                    style={{
                                                        backgroundColor: '#007bff', color: 'white', padding: '6px 12px',
                                                        borderRadius: '4px', cursor: 'pointer', fontSize: '13px', display: 'inline-block',
                                                        marginBottom: 0
                                                    }}
                                                >
                                                    {hasFiles ? 'Add More Files' : 'Upload File'}
                                                </label>
                                            </div>
                                        </div>

                                        {/* File List for this Category */}
                                        {hasFiles && (
                                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, borderTop: '1px solid #eee', paddingTop: '8px' }}>
                                                {uploadedFiles.map((file, idx) => (
                                                    <li key={idx} style={{ 
                                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                        fontSize: '0.9em', padding: '6px 0', color: '#555',
                                                        borderBottom: '1px solid #eee'
                                                    }}>
                                                        <span>
                                                            📄 {file.name} <small style={{color: '#888'}}>({(file.size / 1024).toFixed(0)} KB)</small>
                                                        </span>
                                                        
                                                        <button 
                                                            onClick={() => handleRemoveFile(req.id, idx)}
                                                            style={{
                                                                width: '25px',       
                                                                height: '25px',
                                                                minWidth: '25px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                padding: 0,
                                                                margin: '0 0 0 10px',
                                                                border: 'none',
                                                                backgroundColor: '#ff6b6b',
                                                                color: 'white',
                                                                borderRadius: '4px',
                                                                cursor: 'pointer',
                                                                lineHeight: 1
                                                            }}
                                                            title="Remove file"
                                                        >
                                                            &times;
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                        
                                        {!hasFiles && (
                                            <div style={{ fontSize: '0.85em', color: '#888', marginTop: '5px' }}>
                                                No files uploaded.
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="btn-group" style={{ marginTop: '10px' }}>
                    <button className="btn-secondary" onClick={() => window.location.reload()}>Reset</button>
                    <button 
                        className="btn-success" 
                        onClick={handleSubmit}
                        disabled={loading || !formData.serialNumber}
                    >
                        {loading ? 'Submitting...' : 'Submit Application'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SubmissionPage;