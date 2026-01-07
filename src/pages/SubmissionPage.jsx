import { useState } from 'react';
import api from '../services/api'; 

const SubmissionPage = () => {
    // --- STATE MANAGEMENT ---
    const [formData, setFormData] = useState({
        serialNumber: '', formType: '', policyType: '', 
        modeOfPayment: '', policyDate: '', clientFirstName: '', clientLastName: '',
        medical: { height: '', weight: '', diagnosed: 'No', hospitalized: 'No', smoker: 'No', alcohol: 'No' }
    });

    const [specificFiles, setSpecificFiles] = useState({});
    
    // UI States
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState(''); 
    const [generatedPdfUrl, setGeneratedPdfUrl] = useState(null); // For final download link
    
    // --- NEW: PREVIEW MODAL STATES ---
    const [showPreview, setShowPreview] = useState(false);
    const [previewBlobUrl, setPreviewBlobUrl] = useState(null);

    // --- REQUIREMENTS CONFIGURATION ---
    const REQUIREMENTS = {
        'VUL': [ 
            { id: 'app_form', label: 'Accomplished Application Form', required: true },
            { id: 'auth_med', label: 'Authorization to Furnish Medical', required: true },
            { id: 'inter_dec', label: 'Intermediary Declarations', required: true },
            { id: 'acr', label: "Agent's Confidential Report (ACR)", required: true },
            { id: 'specimen_sig', label: 'Client Specimen Signature Form OR Valid ID (Signed 3x)', required: true },
            { id: 'fna', label: 'Financial Needs Analysis (FNA)', required: true },
            { id: 'sales_illus', label: 'Sales Illustration', required: true },
            { id: 'irpq', label: 'Investor Risk Profile Questionnaire (IRPQ)', required: true },
            { id: 'proof_pay', label: 'Proof of Payment', required: true },
            { id: 'valid_id', label: 'Valid ID', required: true }
        ],
        'IHP': [ 
            { id: 'app_form', label: 'Application Form', required: true },
            { id: 'sales_illus', label: 'Sales Illustration', required: true },
            { id: 'acr', label: "Agent's Confidential Report (ACR)", required: true },
            { id: 'proof_pay', label: 'Proof of Payment', required: true },
            { id: 'valid_id_3', label: 'Valid ID w/ 3 Signatures', required: true },
            { id: 'auth_med', label: 'Authorization to Furnish Medical', required: true },
            { id: 'inter_dec', label: 'Intermediary Declarations', required: true }
        ],
        'TRAD': [ 
            { id: 'app_form', label: 'Accomplished Application Form', required: true },
            { id: 'auth_med', label: 'Authorization to Furnish Medical', required: true },
            { id: 'inter_dec', label: 'Intermediary Declarations', required: true },
            { id: 'acr', label: "Agent's Confidential Report (ACR)", required: true },
            { id: 'specimen_sig', label: 'Client Specimen Signature Form OR Valid ID (Signed 3x)', required: true },
            { id: 'fna', label: 'Financial Needs Analysis (FNA)', required: true },
            { id: 'sales_illus', label: 'Sales Illustration', required: true },
            { id: 'proof_pay', label: 'Proof of Payment', required: true },
            { id: 'valid_id', label: 'Valid ID', required: true }
        ]
    };

    const getCategoryFromPolicy = (policyName) => {
        if (!policyName) return '';
        const lower = policyName.toLowerCase();
        if (lower.includes('allianz well')) return 'IHP';
        if (lower.includes('eazy health') || lower.includes('fundamental cover')) return 'TRAD';
        return 'VUL'; 
    };

    const handleSerialBlur = async () => {
        if (!formData.serialNumber) return;
        
        try {
            setLoading(true);
            setMessage('Fetching serial details...');
            setMessageType('info');
            setGeneratedPdfUrl(null); 

            const response = await api.getSerialDetails(formData.serialNumber);
            
            if (response.success) {
                const data = response.data;
                const detectedCategory = getCategoryFromPolicy(data.policyType);

                setFormData(prev => ({
                    ...prev,
                    policyType: data.policyType || '',       
                    modeOfPayment: data.modeOfPayment || '', 
                    policyDate: data.policyDate || '',
                    clientFirstName: data.clientFirstName || '',
                    clientLastName: data.clientLastName || '',
                    formType: detectedCategory 
                }));
                
                setMessage(`Serial found! Identified as ${detectedCategory} Application.`);
                setMessageType('success');
            } else {
                setMessage('Serial Number not found.');
                setMessageType('error');
                setFormData(prev => ({ ...prev, formType: '', policyType: '' }));
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

    const handleSpecificFileChange = (slotId, e) => {
        const newFiles = Array.from(e.target.files);
        if (newFiles.length > 0) {
            setSpecificFiles(prev => {
                const existing = prev[slotId] || [];
                return { ...prev, [slotId]: [...existing, ...newFiles] };
            });
        }
        e.target.value = ''; 
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

    // --- MODIFIED: PREVIEW IN MODAL ---
    const handlePreview = async () => {
        try {
            setLoading(true);
            const response = await fetch('http://localhost:3000/api/preview-application', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ formData, serialNumber: formData.serialNumber })
            });
            
            if (!response.ok) throw new Error('Preview failed');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            // Set URL and Open Modal
            setPreviewBlobUrl(url);
            setShowPreview(true);

        } catch (e) {
            alert('Could not generate preview.');
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const closePreview = () => {
        setShowPreview(false);
        // Optional: Revoke URL to free memory, but keeping it is fine for re-opening
    };

    const handleSubmit = async () => {
        if (!formData.serialNumber || !formData.formType) {
            alert('Please enter a valid Serial Number first.');
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
            setMessage('Uploading documents and sending email...');
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
                setMessage('Documents submitted successfully!');
                setMessageType('success');
                setGeneratedPdfUrl(response.generatedPdfUrl); 
                
                setFormData({
                    serialNumber: '', formType: '', policyType: '', 
                    modeOfPayment: '', policyDate: '', clientFirstName: '', clientLastName: '',
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
                    <div className={`alert ${messageType === 'success' ? 'alert-success' : 'alert-error'}`} 
                         style={{ padding: '10px', marginBottom: '15px', borderRadius: '4px',
                                  backgroundColor: messageType === 'success' ? '#d4edda' : '#f8d7da',
                                  color: messageType === 'success' ? '#155724' : '#721c24' }}>
                        {message}
                    </div>
                )}
                
                {generatedPdfUrl && (
                    <div style={{ padding: '15px', backgroundColor: '#e8f4fd', borderRadius: '6px', marginBottom: '20px', border: '1px solid #b8daff', textAlign: 'center' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#004085' }}>Application Generated Successfully!</h4>
                        <a href={generatedPdfUrl} target="_blank" rel="noopener noreferrer" 
                           style={{ display: 'inline-block', padding: '10px 20px', backgroundColor: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '5px', fontWeight: 'bold' }}>
                            📄 View Final Submitted PDF
                        </a>
                    </div>
                )}

                <div className="form-grid">
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label>Serial Number <span className="required">*</span></label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input
                                type="text"
                                name="serialNumber"
                                value={formData.serialNumber}
                                onChange={handleTextChange}
                                onBlur={handleSerialBlur} 
                                placeholder="Enter Serial to auto-load requirements..."
                                required
                                style={{ flexGrow: 1 }}
                            />
                            <button className="btn-primary" onClick={handleSerialBlur} disabled={loading}>
                                {loading ? 'Loading...' : 'Load'}
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Policy Type</label>
                        <input value={formData.policyType} readOnly style={{ backgroundColor: '#e9ecef' }} />
                    </div>
                    
                    <div className="form-group">
                        <label>Form Category</label>
                        <input 
                            value={formData.formType ? `${formData.formType} Requirements` : ''} 
                            readOnly 
                            style={{ backgroundColor: '#e9ecef', fontWeight: 'bold', color: '#0055b8' }} 
                            placeholder="Auto-detected..."
                        />
                    </div>

                    <div className="form-group">
                        <label>Client Name</label>
                        <input value={`${formData.clientFirstName} ${formData.clientLastName}`} readOnly style={{ backgroundColor: '#e9ecef' }} />
                    </div>
                </div>

                {formData.formType && (
                    <div className="medical-section" style={{ marginTop: '25px', backgroundColor: '#fff', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
                        <h3 style={{ color: '#c0392b', borderBottom: '2px solid #eee', paddingBottom: '10px', marginTop: 0 }}>
                            Medical & Personal Declaration
                        </h3>
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

                {formData.formType && (
                    <div className="file-upload-section">
                        <h3>
                            Requirements for {formData.formType}
                            <span style={{ fontSize: '0.6em', color: '#666', marginLeft: '10px', fontWeight: 'normal' }}>
                                (Based on {formData.policyType})
                            </span>
                        </h3>
                        
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
                                                        backgroundColor: hasFiles ? '#28a745' : '#007bff', 
                                                        color: 'white', padding: '6px 12px',
                                                        borderRadius: '4px', cursor: 'pointer', fontSize: '13px', display: 'inline-block',
                                                        marginBottom: 0, transition: 'background 0.3s'
                                                    }}
                                                >
                                                    {hasFiles ? '+ Add More' : 'Upload File'}
                                                </label>
                                            </div>
                                        </div>

                                        {/* File List */}
                                        {hasFiles && (
                                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, borderTop: '1px solid #eee', paddingTop: '8px' }}>
                                                {uploadedFiles.map((file, idx) => (
                                                    <li key={idx} style={{ 
                                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                        fontSize: '0.9em', padding: '6px 0', color: '#555',
                                                        borderBottom: '1px solid #eee'
                                                    }}>
                                                        <span>📄 {file.name}</span>
                                                        <button 
                                                            onClick={() => handleRemoveFile(req.id, idx)}
                                                            style={{
                                                                marginLeft: '10px', border: 'none', backgroundColor: '#ff6b6b',
                                                                color: 'white', borderRadius: '4px', cursor: 'pointer', padding: '2px 8px'
                                                            }}
                                                        >
                                                            &times;
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="btn-group" style={{ marginTop: '30px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button 
                        type="button" 
                        onClick={handlePreview} 
                        disabled={loading || !formData.formType}
                        style={{ padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Preview Summary
                    </button>

                    <button 
                        className="btn-success" 
                        onClick={handleSubmit}
                        disabled={loading || !formData.formType}
                    >
                        {loading ? 'Submitting...' : 'Submit Application'}
                    </button>
                </div>
            </div>

            {/* --- PDF PREVIEW POPUP MODAL --- */}
            {showPreview && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white', width: '80%', height: '90%', borderRadius: '8px',
                        display: 'flex', flexDirection: 'column', overflow: 'hidden'
                    }}>
                        <div style={{ padding: '15px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>Preview Application Summary</h3>
                            <button onClick={closePreview} style={{ border: 'none', background: 'transparent', fontSize: '20px', cursor: 'pointer' }}>&times;</button>
                        </div>
                        <div style={{ flexGrow: 1, backgroundColor: '#f0f0f0' }}>
                            <iframe src={previewBlobUrl} width="100%" height="100%" title="PDF Preview" style={{ border: 'none' }} />
                        </div>
                        <div style={{ padding: '15px', borderTop: '1px solid #eee', textAlign: 'right' }}>
                            <button onClick={closePreview} style={{ padding: '8px 20px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Close Preview</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubmissionPage;