import { useState } from 'react';

const SubmissionPage = () => {
    const [formData, setFormData] = useState({
        serialNumber: '',
        formType: '',
        policyType: '',
        modeOfPayment: '',
        policyDate: ''
    });

    return (
        <div className="card">
            <div className="card-header">
                <h2>Document Submission</h2>
            </div>
            <div className="card-body">
                <div className="form-grid">
                    <div className="form-group">
                        <label>Serial Number</label>
                        <input
                            type="text"
                            value={formData.serialNumber}
                            onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Form Type</label>
                        <select
                            value={formData.formType}
                            onChange={(e) => setFormData({ ...formData, formType: e.target.value })}
                        >
                            <option value="">Select</option>
                            <option value="GAE">GAE</option>
                            <option value="NON_GAE">Non-GAE</option>
                        </select>
                    </div>
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
                    <p style={{ color: '#666', fontStyle: 'italic' }}>
                        Document upload functionality requires backend integration
                    </p>
                </div>

                <div className="btn-group">
                    <button className="btn-secondary">Reset</button>
                    <button className="btn-primary">Generate Preview</button>
                    <button className="btn-success" disabled>Submit Documents</button>
                </div>
            </div>
        </div>
    );
};

export default SubmissionPage;
