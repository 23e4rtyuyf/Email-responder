const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');

const {
  initDb,
  createUser,
  findUserByEmail,
  listUsers,
  addOnboardingTask,
  updateOnboardingTask,
  listOnboardingTasks,
  addInvoice,
  listInvoices,
  addMeeting,
  listMeetings,
  getSettings,
  updateSettings,
  addAutomationRun,
  getDashboardMetrics,
} = require('./repository');
const { createToken, requireAuth, requireAdmin } = require('./auth');
const { generateEmailResponse } = require('./ai');
const { parseInvoiceText } = require('./invoice');
const { createCalendarEvent } = require('./googleCalendar');

const upload = multer({ storage: multer.memoryStorage() });

async function createApp() {
  await initDb();

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password || password.length < 8) {
        return res.status(400).json({ error: 'name, email, and password(8+) are required' });
      }
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await createUser({ name, email, passwordHash, role: 'user' });
      const token = createToken(user);
      return res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
      if (error.code === 'DUPLICATE' || error.code === '23505') {
        return res.status(409).json({ error: 'User already exists' });
      }
      return res.status(500).json({ error: 'Unable to register user' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await findUserByEmail(email);
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = createToken(user);
    return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  });

  app.post('/api/auth/google', async (req, res) => {
    try {
      const { email, name, googleId } = req.body;
      if (!email || !name) {
        return res.status(400).json({ error: 'email and name are required' });
      }

      let user = await findUserByEmail(email);
      if (!user) {
        user = await createUser({ name, email, googleId, role: 'user' });
      }

      const token = createToken(user);
      return res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
    } catch (_error) {
      return res.status(500).json({ error: 'Unable to process Google OAuth login' });
    }
  });

  app.post('/api/email/respond', requireAuth, async (req, res) => {
    const { inquiry } = req.body;
    if (!inquiry) {
      return res.status(400).json({ error: 'inquiry is required' });
    }

    const settings = await getSettings();
    const response = await generateEmailResponse(inquiry, settings.aiModel);
    await addAutomationRun({ type: 'email-response', status: 'completed', details: inquiry });
    return res.json({ response, model: settings.aiModel });
  });

  app.get('/api/onboarding/tasks', requireAuth, async (_req, res) => {
    const tasks = await listOnboardingTasks();
    return res.json({ tasks });
  });

  app.post('/api/onboarding/tasks', requireAuth, async (req, res) => {
    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }
    const task = await addOnboardingTask({ title });
    await addAutomationRun({ type: 'onboarding-task', status: 'completed', details: title });
    return res.status(201).json({ task });
  });

  app.patch('/api/onboarding/tasks/:id', requireAuth, async (req, res) => {
    const task = await updateOnboardingTask(req.params.id, Boolean(req.body.completed));
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    return res.json({ task });
  });

  app.post('/api/onboarding/forms', requireAuth, async (req, res) => {
    const { formName, fields } = req.body;
    if (!formName) {
      return res.status(400).json({ error: 'formName is required' });
    }
    const task = await addOnboardingTask({ title: `Form: ${formName}`, formData: fields || {} });
    return res.status(201).json({ formTask: task });
  });

  app.post('/api/onboarding/esignature', requireAuth, async (req, res) => {
    const { signerName } = req.body;
    if (!signerName) {
      return res.status(400).json({ error: 'signerName is required' });
    }
    const task = await addOnboardingTask({
      title: 'E-signature completed',
      eSignature: `${signerName}:${new Date().toISOString()}`,
    });
    return res.status(201).json({ eSignatureTask: task });
  });

  app.post('/api/invoices/upload', requireAuth, upload.single('invoice'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'invoice file is required' });
    }

    const text = req.file.buffer.toString('utf-8');
    const parsed = parseInvoiceText(text);
    const invoice = await addInvoice(parsed);
    await addAutomationRun({ type: 'invoice-parse', status: 'completed', details: invoice.invoice_number || '' });
    return res.status(201).json({ invoice });
  });

  app.get('/api/invoices', requireAuth, async (_req, res) => {
    const invoices = await listInvoices();
    return res.json({ invoices });
  });

  app.post('/api/schedule/meetings', requireAuth, async (req, res) => {
    const { title, description, start, end, attendees = [] } = req.body;
    if (!title || !start || !end) {
      return res.status(400).json({ error: 'title, start, and end are required' });
    }

    const calendarEvent = await createCalendarEvent({ title, description, start, end, attendees });
    const meeting = await addMeeting({
      title,
      startTime: start,
      endTime: end,
      attendees,
      calendarEventId: calendarEvent.id,
    });

    await addAutomationRun({ type: 'meeting-scheduling', status: 'completed', details: title });
    return res.status(201).json({ meeting, calendarEvent });
  });

  app.get('/api/admin/dashboard', requireAuth, requireAdmin, async (_req, res) => {
    const metrics = await getDashboardMetrics();
    const settings = await getSettings();
    return res.json({ metrics, settings });
  });

  app.get('/api/admin/users', requireAuth, requireAdmin, async (_req, res) => {
    const users = await listUsers();
    return res.json({ users });
  });

  app.get('/api/admin/settings', requireAuth, requireAdmin, async (_req, res) => {
    const settings = await getSettings();
    return res.json({ settings });
  });

  app.put('/api/admin/settings', requireAuth, requireAdmin, async (req, res) => {
    const aiModel = req.body.aiModel || 'gpt-4o-mini';
    const autoReplyEnabled = Boolean(req.body.autoReplyEnabled);
    const settings = await updateSettings({ aiModel, autoReplyEnabled });
    return res.json({ settings });
  });

  return app;
}

module.exports = { createApp };
