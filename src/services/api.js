const API_URL = 'http://localhost:3000';

export const api = {
  // Health check
  health: async () => {
    const res = await fetch(`${API_URL}/api/health`);
    return res.json();
  },

  // Monitoring
  getAllMonitoring: async () => {
    const res = await fetch(`${API_URL}/api/monitoring/all?t=${Date.now()}`);
    return res.json();
  },

  submitMonitoring: async (data) => {
    const res = await fetch(`${API_URL}/api/monitoring/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Serial Numbers
  getAvailableSerial: async (policyType) => {
    const res = await fetch(`${API_URL}/api/serial-numbers/available/${encodeURIComponent(policyType)}`);
    return res.json();
  },

  getSerialDetails: async (serial) => {
    const res = await fetch(`${API_URL}/api/submissions/details/${encodeURIComponent(serial)}?t=${Date.now()}`);
    return res.json();
  },

  // Form Submissions
  getAllFormSubmissions: async () => {
    const res = await fetch(`${API_URL}/api/form-submissions?t=${Date.now()}`);
    return res.json();
  },

  submitForm: async (formData) => {
    const res = await fetch(`${API_URL}/api/form-submissions`, {
      method: 'POST',
      body: formData
    });
    return res.json();
  },

  updateSubmissionStatus: async (id, status) => {
    const res = await fetch(`${API_URL}/api/form-submissions/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return res.json();
  },

  // Customers
  getAllCustomers: async () => {
    const res = await fetch(`${API_URL}/api/customers?t=${Date.now()}`);
    return res.json();
  },

  getCustomer: async (id) => {
    const res = await fetch(`${API_URL}/api/customers/${id}?t=${Date.now()}`);
    return res.json();
  },

  markPolicyPaid: async (id) => {
    const res = await fetch(`${API_URL}/api/submissions/${id}/pay`, {
      method: 'POST'
    });
    return res.json();
  }
};

export default api;
