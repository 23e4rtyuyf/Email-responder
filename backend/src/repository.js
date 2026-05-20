const { Pool } = require('pg');

const useMemory = !process.env.DATABASE_URL;
const memory = {
  users: [],
  onboardingTasks: [],
  invoices: [],
  meetings: [],
  settings: { aiModel: 'gpt-4o-mini', autoReplyEnabled: true },
  automations: [],
  ids: { user: 1, task: 1, invoice: 1, meeting: 1, automation: 1 },
};

const pool = useMemory
  ? null
  : new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
    });

async function initDb() {
  if (useMemory) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      google_id TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS onboarding_tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      completed BOOLEAN DEFAULT FALSE,
      form_data JSONB,
      esignature TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id SERIAL PRIMARY KEY,
      vendor TEXT,
      invoice_number TEXT,
      amount NUMERIC,
      due_date TEXT,
      raw_text TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS meetings (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      attendees JSONB,
      calendar_event_id TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS settings (
      id SERIAL PRIMARY KEY,
      ai_model TEXT NOT NULL,
      auto_reply_enabled BOOLEAN DEFAULT TRUE
    );

    CREATE TABLE IF NOT EXISTS automation_runs (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      details TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(
    `INSERT INTO settings (id, ai_model, auto_reply_enabled)
     VALUES (1, $1, $2)
     ON CONFLICT (id) DO NOTHING`,
    ['gpt-4o-mini', true],
  );
}

async function createUser({ name, email, passwordHash, role = 'user', googleId = null }) {
  if (useMemory) {
    const existing = memory.users.find((u) => u.email === email);
    if (existing) {
      const err = new Error('User already exists');
      err.code = 'DUPLICATE';
      throw err;
    }
    const user = {
      id: memory.ids.user++,
      name,
      email,
      password_hash: passwordHash || null,
      role,
      google_id: googleId,
    };
    memory.users.push(user);
    return user;
  }

  const result = await pool.query(
    'INSERT INTO users (name, email, password_hash, role, google_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [name, email, passwordHash || null, role, googleId],
  );
  return result.rows[0];
}

async function findUserByEmail(email) {
  if (useMemory) {
    return memory.users.find((u) => u.email === email) || null;
  }
  const result = await pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
  return result.rows[0] || null;
}

async function listUsers() {
  if (useMemory) {
    return memory.users;
  }
  const result = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY id ASC');
  return result.rows;
}

async function addOnboardingTask({ title, formData = null, eSignature = null }) {
  if (useMemory) {
    const task = {
      id: memory.ids.task++,
      title,
      completed: false,
      form_data: formData,
      esignature: eSignature,
      created_at: new Date().toISOString(),
    };
    memory.onboardingTasks.push(task);
    return task;
  }

  const result = await pool.query(
    'INSERT INTO onboarding_tasks (title, form_data, esignature) VALUES ($1, $2, $3) RETURNING *',
    [title, formData, eSignature],
  );
  return result.rows[0];
}

async function updateOnboardingTask(taskId, completed) {
  if (useMemory) {
    const task = memory.onboardingTasks.find((t) => t.id === Number(taskId));
    if (!task) return null;
    task.completed = completed;
    return task;
  }

  const result = await pool.query(
    'UPDATE onboarding_tasks SET completed = $1 WHERE id = $2 RETURNING *',
    [completed, taskId],
  );
  return result.rows[0] || null;
}

async function listOnboardingTasks() {
  if (useMemory) {
    return memory.onboardingTasks;
  }
  const result = await pool.query('SELECT * FROM onboarding_tasks ORDER BY id ASC');
  return result.rows;
}

async function addInvoice(invoice) {
  if (useMemory) {
    const record = { id: memory.ids.invoice++, created_at: new Date().toISOString(), ...invoice };
    memory.invoices.push(record);
    return record;
  }

  const result = await pool.query(
    `INSERT INTO invoices (vendor, invoice_number, amount, due_date, raw_text)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [invoice.vendor, invoice.invoiceNumber, invoice.amount, invoice.dueDate, invoice.rawText],
  );
  return result.rows[0];
}

async function listInvoices() {
  if (useMemory) {
    return memory.invoices;
  }
  const result = await pool.query('SELECT * FROM invoices ORDER BY id DESC');
  return result.rows;
}

async function addMeeting(meeting) {
  if (useMemory) {
    const record = { id: memory.ids.meeting++, created_at: new Date().toISOString(), ...meeting };
    memory.meetings.push(record);
    return record;
  }

  const result = await pool.query(
    `INSERT INTO meetings (title, start_time, end_time, attendees, calendar_event_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [meeting.title, meeting.startTime, meeting.endTime, meeting.attendees, meeting.calendarEventId],
  );
  return result.rows[0];
}

async function listMeetings() {
  if (useMemory) {
    return memory.meetings;
  }
  const result = await pool.query('SELECT * FROM meetings ORDER BY id DESC');
  return result.rows;
}

async function getSettings() {
  if (useMemory) {
    return memory.settings;
  }
  const result = await pool.query('SELECT ai_model, auto_reply_enabled FROM settings WHERE id = 1');
  const row = result.rows[0];
  return { aiModel: row.ai_model, autoReplyEnabled: row.auto_reply_enabled };
}

async function updateSettings({ aiModel, autoReplyEnabled }) {
  if (useMemory) {
    memory.settings = { aiModel, autoReplyEnabled };
    return memory.settings;
  }

  await pool.query('UPDATE settings SET ai_model = $1, auto_reply_enabled = $2 WHERE id = 1', [
    aiModel,
    autoReplyEnabled,
  ]);
  return getSettings();
}

async function addAutomationRun({ type, status, details }) {
  if (useMemory) {
    const run = {
      id: memory.ids.automation++,
      type,
      status,
      details,
      created_at: new Date().toISOString(),
    };
    memory.automations.push(run);
    return run;
  }

  const result = await pool.query(
    'INSERT INTO automation_runs (type, status, details) VALUES ($1, $2, $3) RETURNING *',
    [type, status, details],
  );
  return result.rows[0];
}

async function listAutomations() {
  if (useMemory) {
    return memory.automations;
  }
  const result = await pool.query('SELECT * FROM automation_runs ORDER BY id DESC LIMIT 25');
  return result.rows;
}

async function getDashboardMetrics() {
  const [users, onboardingTasks, invoices, meetings, automations] = await Promise.all([
    listUsers(),
    listOnboardingTasks(),
    listInvoices(),
    listMeetings(),
    listAutomations(),
  ]);

  return {
    users: users.length,
    onboardingTasks: onboardingTasks.length,
    invoices: invoices.length,
    meetings: meetings.length,
    automations,
  };
}

module.exports = {
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
  listAutomations,
  getDashboardMetrics,
};
