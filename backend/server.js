const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Bypass SSL verification for development
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Upload Config
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type'));
  }
});

// --- CONNECTION ---
const SUPABASE_URL = 'https://ibbjsjvjfeymglpsvgap.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImliYmpzanZqZmV5bWdscHN2Z2FwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTMwODM1OCwiZXhwIjoyMDgwODg0MzU4fQ._gIdqP80fwN_6Qu_Pgqi3ecYJHEYuZmJjboBnfs9zv0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD }
});

const ALLIANZ_HO_EMAIL = process.env.ALLIANZ_HO_EMAIL;
const SUPABASE_BUCKET = 'policy-documents';

// --- HELPER FUNCTIONS ---
function calculateNextPaymentDate(policyDate, mode) {
  const date = new Date(policyDate);
  if (isNaN(date.getTime())) return null;
  switch (mode) {
    case 'Monthly': date.setMonth(date.getMonth() + 1); break;
    case 'Quarterly': date.setMonth(date.getMonth() + 3); break;
    case 'Semi-Annual': date.setMonth(date.getMonth() + 6); break;
    case 'Annual': date.setFullYear(date.getFullYear() + 1); break;
    default: break; 
  }
  return date.toISOString().split('T')[0];
}

async function uploadFileToSupabase(file, subId) {
  try {
    const timestamp = Date.now();
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `${subId}/${timestamp}_${sanitizedName}`;
    const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(path, file.buffer, {
      contentType: file.mimetype, upsert: false
    });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
    return {
      fileName: file.originalname, filePath: path, fileUrl: urlData.publicUrl,
      fileSize: file.size, mimeType: file.mimetype
    };
  } catch (err) { console.error('Upload failed:', err); throw err; }
}

async function generateAndSendPDF(sub) {
  const doc = new PDFDocument({ margin: 50 });
  const chunks = [];
  doc.on('data', c => chunks.push(c));
  doc.text(`Serial: ${sub.serial_number || 'N/A'}`);
  doc.text(`Client: ${sub.client_name}`);
  doc.end();
  await new Promise(r => doc.on('end', r));
}

// --- ENDPOINTS ---

app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok' }));

// 1. CHECK SERIAL
app.get('/api/serial-numbers/available/:policyType', async (req, res) => {
  try {
    const { policyType } = req.params;
    const typeToSearch = policyType === 'Allianz Well' ? 'Allianz Well' : 'Default';
    
    console.log(`Request: ${policyType} -> Searching DB for: ${typeToSearch}`);

    const { data, error } = await supabase.from('serial_number')
      .select('*')
      .eq('serial_type', typeToSearch) 
      .or('is_issued.is.null,is_issued.eq.false') 
      .limit(1)
      .single();
      
    if (error) {
        if (error.code === 'PGRST116') {
             return res.status(404).json({ success: false, message: `No available serials for: ${policyType}` });
        }
        console.error("DB Error:", error);
        throw error;
    }
    
    if (!data) return res.status(404).json({ success: false, message: `No available serials` });

    console.log(`Found Serial: ${data.serial_number}`);
    res.json({ success: true, requiresSerial: true, serialNumber: data.serial_number.toString() });
  } catch (e) { 
    console.error("Server Error:", e);
    res.status(500).json({ success: false, message: e.message }); 
  }
});

// 2. SUBMIT MONITORING (SMART LOOKUP)
app.post('/api/monitoring/submit', async (req, res) => {
  try {
    const body = req.body;
    console.log(`Submitting for: ${body.clientFirstName}, Policy: ${body.policyType}`);

    // --- A. SMART POLICY LOOKUP ---
    let finalPolicyId = null;

    // 1. Try Exact Match
    const { data: exactMatch } = await supabase
      .from('policy').select('policy_id').eq('policy_type', body.policyType).single();
    
    if (exactMatch) {
        finalPolicyId = exactMatch.policy_id;
    } else {
        // 2. Exact match failed. Try Fuzzy Match (ignore spaces/case)
        console.log(`Exact match failed for '${body.policyType}'. Checking fuzzy matches...`);
        const { data: allPolicies } = await supabase.from('policy').select('policy_id, policy_type');
        
        if (allPolicies && allPolicies.length > 0) {
            const match = allPolicies.find(p => 
                p.policy_type.trim().toLowerCase() === body.policyType.trim().toLowerCase()
            );
            if (match) {
                console.log(`Fuzzy match found: '${match.policy_type}'`);
                finalPolicyId = match.policy_id;
            } else {
                console.error("--- DEBUG: AVAILABLE POLICIES IN DB ---");
                allPolicies.forEach(p => console.error(`ID: ${p.policy_id}, Type: '${p.policy_type}'`));
                console.error("---------------------------------------");
            }
        }
    }

    if (!finalPolicyId) {
        throw new Error(`Policy Type '${body.policyType}' not found in DB. Check server console.`);
    }

    // B. User
    let userId = null;
    const { data: userData } = await supabase
      .from('users').select('user_id').eq('user_email', body.intermediaryEmail).single();

    if (userData) {
      userId = userData.user_id;
    } else {
      const { data: agencyData } = await supabase.from('agency').select('agency_id').limit(1).single();
      const agId = agencyData ? agencyData.agency_id : 1;
      
      const { data: newUser, error: userErr } = await supabase
        .from('users')
        .insert([{ 
            first_name: body.intermediaryName, last_name: '', user_email: body.intermediaryEmail,
            contact_number: 0, agency_id: agId, role_id: 1 
        }]).select('user_id').single();
      
      if (userErr) throw userErr;
      userId = newUser.user_id;
    }

    // C. Serial
    let serialId = null;
    if (body.serialNumber) {
        const { data: serialData, error: serErr } = await supabase
            .from('serial_number').select('serial_id').eq('serial_number', body.serialNumber).single();
        if (serErr || !serialData) throw new Error(`Serial ${body.serialNumber} not found`);
        serialId = serialData.serial_id;
    }

    // D. Insert
    const nextPayDate = calculateNextPaymentDate(body.policyDate, body.modeOfPayment);
    const { data, error } = await supabase.from('az_submissions').insert([{
      user_id: userId,
      client_name: `${body.clientFirstName} ${body.clientLastName}`,
      client_email: body.clientEmail,
      policy_id: finalPolicyId,
      premium_paid: parseFloat(body.premiumPaid),
      anp: parseFloat(body.anp),
      payment_interval: JSON.stringify(body.modeOfPayment),
      mode_of_payment: body.modeOfPayment,
      serial_id: serialId,
      issued_at: new Date().toISOString(),
      submission_type: body.submissionType,
      status: 'Pending',
      next_payment_date: nextPayDate,
      attachments: [] 
    }]).select().single();

    if (error) throw error;

    // E. Mark Issued
    if (body.serialNumber) {
      await supabase.from('serial_number').update({ is_issued: true }).eq('serial_number', body.serialNumber);
    }

    res.status(201).json({ success: true, data: { ...data, serial_number: body.serialNumber } });
  } catch (e) { 
    console.error("Submit Error:", e);
    res.status(500).json({ success: false, message: e.message }); 
  }
});

// 3. GET DETAILS
app.get('/api/submissions/details/:serialNumber', async (req, res) => {
    try {
        const { serialNumber } = req.params;
        const { data: serialData, error: sErr } = await supabase
            .from('serial_number').select('serial_id').eq('serial_number', serialNumber).single();
        
        if (sErr || !serialData) return res.status(404).json({ success: false, message: 'Serial not found' });

        const { data: sub, error: subErr } = await supabase
            .from('az_submissions')
            .select(`*, policy (policy_type), users (first_name, last_name)`)
            .eq('serial_id', serialData.serial_id)
            .single();

        if (subErr || !sub) return res.status(404).json({ success: false, message: 'Submission not found' });

        const nameParts = (sub.client_name || '').split(' ');
        const mappedData = {
            clientFirstName: nameParts[0] || '',
            clientLastName: nameParts.slice(1).join(' ') || '',
            clientEmail: sub.client_email,
            policyType: sub.policy?.policy_type,
            modeOfPayment: sub.mode_of_payment,
            policyDate: sub.issued_at ? sub.issued_at.split('T')[0] : '',
        };

        res.json({ success: true, data: mappedData });
    } catch (e) {
        console.error("Get Details Error:", e);
        res.status(500).json({ success: false, message: e.message });
    }
});

// 4. DOCUMENT SUBMISSION
app.post('/api/form-submissions', upload.any(), async (req, res) => {
  try {
    const { serialNumber, formData } = req.body; 
    const parsedData = JSON.parse(formData || '{}');

    const { data: serialData } = await supabase.from('serial_number').select('serial_id').eq('serial_number', serialNumber).single();
    if (!serialData) return res.status(404).json({ message: 'Serial not found' });

    const { data: existing } = await supabase.from('az_submissions').select('*').eq('serial_id', serialData.serial_id).single();
    if (!existing) return res.status(404).json({ message: 'Submission not found' });

    let newFiles = [];
    if (req.files) {
      for (const f of req.files) {
        try {
          const fileData = await uploadFileToSupabase(f, existing.sub_id);
          newFiles.push(fileData);
        } catch (e) { console.error('Upload error', e); }
      }
    }
    
    const { data: updated, error } = await supabase.from('az_submissions').update({
        form_type: parsedData.formType, 
        mode_of_payment: parsedData.modeOfPayment,
        attachments: [...(existing.attachments || []), ...newFiles]
      }).eq('sub_id', existing.sub_id).select().single();

    if (error) throw error;
    
    updated.serial_number = serialNumber; 
    generateAndSendPDF(updated).catch(console.error);
    
    res.json({ success: true, data: updated });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: e.message }); }
});

// 5. GET ALL
app.get('/api/monitoring/all', async (req, res) => {
  try {
      const { data, error } = await supabase
        .from('az_submissions')
        .select(`*, policy (policy_type), serial_number (serial_number), users (first_name, last_name)`)
        .order('issued_at', {ascending:false});

      if (error) throw error;
      const safeData = data || [];

      const flattened = safeData.map(item => ({
        ...item, id: item.sub_id, policy_type: item.policy?.policy_type,
        serial_number: item.serial_number?.serial_number, intermediary_name: item.users?.first_name,
        created_at: item.issued_at
      }));
      res.json({ success: true, data: flattened });
  } catch (e) {
      console.error("Monitoring/All Error:", e);
      res.status(500).json({ success: false, message: e.message });
  }
});

// 6. UPDATE STATUS
app.patch('/api/form-submissions/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  await supabase.from('az_submissions').update({ status }).eq('sub_id', id);
  res.json({ success: true });
});

// 7. PAYMENT
app.post('/api/submissions/:id/pay', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: policy } = await supabase.from('az_submissions').select('*').eq('sub_id', id).single();
    if (!policy) return res.status(404).json({ success: false, message: 'Not found' });
    
    const newDueDate = calculateNextPaymentDate(policy.next_payment_date, policy.mode_of_payment);
    await supabase.from('az_submissions').update({ next_payment_date: newDueDate }).eq('sub_id', id);
    res.json({ success: true, message: 'Paid', nextDate: newDueDate });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// 8. CUSTOMERS
app.get('/api/customers', async (req, res) => {
    try {
        const { data, error } = await supabase.from('az_submissions').select('*');
        if (error) throw error;

        const safeData = data || [];
        const customersMap = {};
        
        safeData.forEach(sub => {
            if (!sub.client_email) return; 
            if (!customersMap[sub.client_email]) {
                const nameParts = (sub.client_name || '').split(' ');
                customersMap[sub.client_email] = {
                    id: sub.sub_id, 
                    first_name: nameParts[0] || '', 
                    last_name: nameParts.slice(1).join(' ') || '',
                    email: sub.client_email, 
                    submissions: []
                };
            }
            customersMap[sub.client_email].submissions.push({ ...sub, id: sub.sub_id });
        });
        res.json({ success: true, data: Object.values(customersMap) });
    } catch (e) {
        console.error("Customers Error:", e);
        res.status(500).json({ success: false, message: e.message });
    }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));