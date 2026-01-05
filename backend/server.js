// server.js - Complete Backend
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Bypass SSL for dev (removes SSL warnings in development)
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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type'));
  }
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD }
});

const ALLIANZ_HO_EMAIL = process.env.ALLIANZ_HO_EMAIL;
const SUPABASE_BUCKET = 'policy-documents';

// --- HELPER FUNCTIONS ---

// Calculate Next Payment Date based on Mode of Payment
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
  // Return format YYYY-MM-DD
  return date.toISOString().split('T')[0];
}

async function uploadFileToSupabase(file, submissionId, documentType = '') {
  try {
    const timestamp = Date.now();
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `${submissionId}/${timestamp}_${sanitizedName}`;
    
    const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(path, file.buffer, {
      contentType: file.mimetype, upsert: false
    });

    if (error) throw error;
    const { data: urlData } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path);

    return {
      fileName: file.originalname,
      filePath: path,
      fileUrl: urlData.publicUrl,
      fileSize: file.size,
      mimeType: file.mimetype
    };
  } catch (err) {
    console.error('Upload failed:', err);
    throw err;
  }
}

async function downloadFile(path) {
  const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).download(path);
  if (error) throw error;
  return data;
}

// --- ENDPOINTS ---

// 1. Check Serial Availability
app.get('/api/serial-numbers/available/:policyType', async (req, res) => {
  try {
    const { policyType } = req.params;
    let targetPool = (policyType === 'Allianz Well') ? 'Allianz Well' : 'General';
    console.log(`Received request for: ${policyType}. Searching in pool: ${targetPool}`);
    
    const { data } = await supabase.from('serial_numbers')
      .select('*')
      .eq('policy_type', targetPool) 
      .eq('is_used', false)
      .limit(1)
      .single();
      
    if (!data) {
      return res.status(404).json({ success: false, message: `No serials available for pool: ${targetPool}` });
    }
    res.json({ success: true, requiresSerial: true, serialNumber: data.serial_number });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// 2. Monitoring Request (The Core Logic)
app.post('/api/monitoring/submit', async (req, res) => {
  try {
    const body = req.body;
    const firstName = body.clientFirstName ? body.clientFirstName.trim() : '';
    const lastName = body.clientLastName ? body.clientLastName.trim() : '';
    const fullName = `${firstName} ${lastName}`.trim();
    const clientEmail = body.clientEmail ? body.clientEmail.toLowerCase().trim() : null;

    let customerId = null;

    if (clientEmail) {
      const { data: existingCust } = await supabase
        .from('customers').select('id').eq('email', clientEmail).single();

      if (existingCust) {
        customerId = existingCust.id;
      } else {
        const { data: newCust, error: custErr } = await supabase
          .from('customers').insert([{ first_name: firstName, last_name: lastName, email: clientEmail }])
          .select('id').single();
        if (custErr) throw custErr;
        customerId = newCust.id;
      }
    }

    const nextPayDate = calculateNextPaymentDate(body.policyDate, body.modeOfPayment);

    const { data, error } = await supabase.from('submissions').insert([{
      agency: body.agency,
      submission_type: body.submissionType,
      intermediary_name: body.intermediaryName,
      intermediary_email: body.intermediaryEmail,
      client_first_name: firstName,
      client_last_name: lastName,
      client_name: fullName, 
      client_email: clientEmail,
      customer_id: customerId,
      policy_type: body.policyType, 
      premium_paid: parseFloat(body.premiumPaid),
      mode_of_payment: body.modeOfPayment,
      policy_date: body.policyDate,
      next_payment_date: nextPayDate,
      anp: parseFloat(body.anp),
      serial_number: body.serialNumber || null,
      status: 'Pending',
      created_at: new Date().toISOString()
    }]).select().single();

    if (error) throw error;

    if (body.serialNumber) {
      await supabase.from('serial_numbers')
        .update({ is_used: true, used_at: new Date(), used_by: body.intermediaryName })
        .eq('serial_number', body.serialNumber);
    }
    res.status(201).json({ success: true, data });
  } catch (e) { 
    console.error(e);
    res.status(500).json({ success: false, message: e.message }); 
  }
});

// 3. Get Submission Details
app.get('/api/submissions/details/:serialNumber', async (req, res) => {
  try {
    const { serialNumber } = req.params;
    const { data, error } = await supabase
      .from('submissions')
      .select('policy_type, client_name, mode_of_payment, policy_date')
      .eq('serial_number', serialNumber)
      .single();

    if (error || !data) return res.status(404).json({ success: false, message: 'Serial number not found' });
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// 4. Document Submission
app.post('/api/form-submissions', upload.any(), async (req, res) => {
  try {
    const { serialNumber, formData } = req.body; 
    const parsedData = JSON.parse(formData || '{}');

    if (!serialNumber) return res.status(400).json({ message: 'Serial Number missing' });

    const { data: existing, error: findErr } = await supabase
      .from('submissions').select('*').eq('serial_number', serialNumber).single();

    if (findErr || !existing) return res.status(404).json({ message: 'Record not found' });

    let newFiles = [];
    if (req.files) {
      for (const f of req.files) {
        try {
          const docType = f.fieldname.replace('documents_', ''); 
          const fileData = await uploadFileToSupabase(f, existing.id, docType);
          newFiles.push(fileData);
        } catch (e) { console.error('File upload error', e); }
      }
    }
    const allAttachments = [...(existing.attachments || []), ...newFiles];

    const { data: updated, error: upErr } = await supabase
      .from('submissions')
      .update({
        form_type: parsedData.formType, 
        form_data: parsedData,
        mode_of_payment: parsedData.modeOfPayment,
        policy_date: parsedData.policyDate,
        attachments: allAttachments,
        updated_at: new Date()
      })
      .eq('id', existing.id)
      .select().single();

    if (upErr) throw upErr;
    generateAndSendPDF(updated).catch(err => console.error('Email error:', err));
    res.json({ success: true, data: updated });
  } catch (e) { 
    console.error(e);
    res.status(500).json({ success: false, message: e.message }); 
  }
});

// 5. Get All Data
app.get('/api/monitoring/all', async (req, res) => {
  const { data } = await supabase.from('submissions').select('*').order('created_at', {ascending:false});
  res.json({ success: true, data });
});

// 6. Get Document History
app.get('/api/form-submissions', async (req, res) => {
  const { data } = await supabase.from('submissions')
    .select('*').not('form_type', 'is', null).order('updated_at', {ascending:false});
  res.json({ success: true, data });
});

// 7. Update Status
app.patch('/api/form-submissions/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const { data } = await supabase.from('submissions')
    .update({ status, updated_at: new Date() }).eq('id', id).select().single();
  res.json({ success: true, data });
});

// --- NEW CUSTOMER ENDPOINTS ---

// Get All Customers List
app.get('/api/customers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select(`*, submissions (*)`) // Fetch policies to determine due dates
      .order('last_name', { ascending: true });
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Get Specific Customer
app.get('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: customer, error: custErr } = await supabase.from('customers').select('*').eq('id', id).single();
    if (custErr) throw custErr;
    const { data: policies, error: polErr } = await supabase.from('submissions').select('*').eq('customer_id', id).order('created_at', { ascending: false });
    if (polErr) throw polErr;
    res.json({ success: true, data: { customer, policies } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// --- NEW PAYMENT ENDPOINT ---
app.post('/api/submissions/:id/pay', async (req, res) => {
  try {
    const { id } = req.params;
    // 1. Get current policy to find current due date
    const { data: policy, error: fetchErr } = await supabase
      .from('submissions').select('*').eq('id', id).single();
    
    if (fetchErr || !policy) return res.status(404).json({ success: false, message: 'Policy not found' });

    // 2. Calculate NEW due date
    if (!policy.next_payment_date) return res.status(400).json({ success: false, message: 'No payment schedule found' });
    
    const newDueDate = calculateNextPaymentDate(policy.next_payment_date, policy.mode_of_payment);
    
    // 3. Update DB
    const { data: updated, error: upErr } = await supabase
      .from('submissions')
      .update({ next_payment_date: newDueDate })
      .eq('id', id)
      .select().single();

    if (upErr) throw upErr;

    res.json({ success: true, message: 'Payment recorded', nextDate: newDueDate });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get('/api/health', (req, res) => res.json({ success: true }));

// --- PDF GENERATION LOGIC ---
async function generateAndSendPDF(sub) {
  const doc = new PDFDocument({ margin: 50 });
  const chunks = [];
  doc.on('data', c => chunks.push(c));

  doc.fontSize(20).text('Application Details', { align: 'center' });
  doc.fontSize(14).text(sub.form_type === 'GAE' ? 'GUARANTEED ACCEPTANCE' : 'NON-GUARANTEED ACCEPTANCE', { align: 'center' });
  doc.moveDown();

  const d = sub.form_data || {};
  doc.fontSize(12).text('Client Information', { underline: true });
  doc.fontSize(10);
  doc.text(`Serial: ${sub.serial_number}`);
  doc.text(`Name: ${sub.client_name || d.clientName}`);
  doc.text(`Email: ${sub.client_email || '-'}`);
  doc.text(`DOB: ${d.dob || '-'}`);
  doc.text(`Gender: ${d.gender || '-'}`);
  doc.text(`Occupation: ${d.occupation || '-'}`);
  doc.text(`Payment Mode: ${sub.mode_of_payment || '-'}`);
  doc.text(`Policy Date: ${sub.policy_date || '-'}`);
  doc.moveDown();

  if (sub.form_type === 'NON_GAE' && d.medical) {
    doc.fontSize(12).fillColor('#c0392b').text('Medical Declarations', { underline: true });
    doc.fontSize(10).fillColor('black');
    doc.text(`Build: ${d.medical.height} / ${d.medical.weight}`);
    doc.text(`1. Critical Illness History: ${d.medical.diagnosed}`);
    doc.text(`2. Hospitalization: ${d.medical.hospitalized}`);
    doc.text(`3. Smoker: ${d.medical.smoker}`);
    doc.text(`4. Alcohol: ${d.medical.alcohol}`);
    doc.moveDown();
  }

  doc.end();
  await new Promise(r => doc.on('end', r));
  const pdfBuffer = Buffer.concat(chunks);

  const attachments = [{ filename: 'Application_Summary.pdf', content: pdfBuffer }];
  if (sub.attachments) {
    for (const f of sub.attachments) {
      try {
        const fileData = await downloadFile(f.filePath);
        const b = Buffer.from(await fileData.arrayBuffer());
        attachments.push({ filename: f.fileName, content: b });
      } catch (e) { console.error('Attachment dl fail', e); }
    }
  }

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: ALLIANZ_HO_EMAIL,
    subject: `Submission: ${sub.serial_number} - ${sub.client_name}`,
    text: 'Please find attached the application documents.',
    attachments
  });
}

// --- GLOBAL ERROR HANDLER ---
app.use((err, req, res, next) => {
  console.error('Global Error Handler:', err); 
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, message: `Upload Error: ${err.message}` });
  }
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));