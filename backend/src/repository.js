const { Pool } = require('pg');

const useMemory = !process.env.DATABASE_URL;

const memory = {
  users: [],
  onboardingTasks: [],
  invoices: [],
  meetings: [],
  settings: { aiModel: 'gpt-4o-mini', autoReplyEnabled: true },
  automations: [],
  drafts: [],
  ids: { user: 1, task: 1, invoice: 1, meeting: 1, automation: 1, draft: 1 },
};

const pool = useMemory
  ? null
  : new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
    });

function toIso(value) {
  if (!value) return null;
  return typeof value === 'string' ? value : new Date(value).toISOString();
}

function mapUserInternal(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    googleId: row.google_id ?? row.googleId ?? null,
    passwordHash: row.password_hash ?? row.passwordHash ?? null,
    createdAt: toIso(row.created_at ?? row.createdAt),
  };
}

function mapUserPublic(row) {
  if (!row) return null;
  const mapped = mapUserInternal(row);
  return {
    id: mapped.id,
    name: mapped.name,
    email: mapped.email,
    role: mapped.role,
    googleId: mapped.googleId,
    createdAt: mapped.createdAt,
  };
}

function mapOnboardingTask(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    completed: Boolean(row.completed),
    formData: row.form_data ?? row.formData ?? null,
    eSignature: row.esignature ?? row.eSignature ?? null,
    createdAt: toIso(row.created_at ?? row.createdAt),
  };
}

function mapInvoice(row) {
  if (!row) return null;
  return {
    id: row.id,
    vendor: row.vendor,
    invoiceNumber: row.invoice_number ?? row.invoiceNumber,
    amount: row.amount == null ? 0 : Number(row.amount),
    dueDate: row.due_date ?? row.dueDate ?? null,
    rawText: row.raw_text ?? row.rawText ?? '',
    createdAt: toIso(row.created_at ?? row.createdAt),
  };
}

function mapMeeting(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    startTime: row.start_time ?? row.startTime,
    endTime: row.end_time ?? row.endTime,
    attendees: row.attendees || [],
    calendarEventId: row.calendar_event_id ?? row.calendarEventId ?? null,
    createdAt: toIso(row.created_at ?? row.createdAt),
  };
}

function mapAutomation(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    details: row.details,
    createdAt: toIso(row.created_at ?? row.createdAt),
  };
}

function mapDraft(row) {
  if (!row) return null;
  return {
    id: row.id,
    inquiry: row.inquiry,
    response: row.response,
    createdAt: toIso(row.created_at ?? row.createdAt),
    updatedAt: toIso(row.updated_at ?? row.updatedAt),
  };
}

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

    CREATE TABLE IF NOT EXISTS drafts (
      id SERIAL PRIMARY KEY,
      inquiry TEXT NOT NULL,
      response TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
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
      role,
      googleId,
      passwordHash: passwordHash || null,
      createdAt: new Date().toISOString(),
    };

    memory.users.push(user);
    return mapUserInternal(user);
  }

  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, google_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [name, email, passwordHash || null, role, googleId],
  );

  return mapUserInternal(result.rows[0]);
}

async function findUserByEmail(email) {
  if (useMemory) {
    const user = memory.users.find((u) => u.email === email) || null;
    return mapUserInternal(user);
  }

  const result = await pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
  return mapUserInternal(result.rows[0] || null);
}

async function listUsers() {
  if (useMemory) {
    return memory.users.map(mapUserPublic);
  }

  const result = await pool.query('SELECT id, name, email, role, google_id, created_at FROM users ORDER BY id ASC');
  return result.rows.map(mapUserPublic);
}

async function addOnboardingTask({ title, formData = null, eSignature = null }) {
  if (useMemory) {
    const task = {
      id: memory.ids.task++,
      title,
      completed: false,
      formData,
      eSignature,
      createdAt: new Date().toISOString(),
    };
    memory.onboardingTasks.push(task);
    return mapOnboardingTask(task);
  }

  const result = await pool.query(
    'INSERT INTO onboarding_tasks (title, form_data, esignature) VALUES ($1, $2, $3) RETURNING *',
    [title, formData, eSignature],
  );

  return mapOnboardingTask(result.rows[0]);
}

async function updateOnboardingTask(taskId, completed) {
  if (useMemory) {
    const task = memory.onboardingTasks.find((t) => t.id === Number(taskId));
    if (!task) return null;
    task.completed = completed;
    return mapOnboardingTask(task);
  }

  const result = await pool.query(
    'UPDATE onboarding_tasks SET completed = $1 WHERE id = $2 RETURNING *',
    [completed, taskId],
  );

  return mapOnboardingTask(result.rows[0] || null);
}

async function listOnboardingTasks() {
  if (useMemory) {
    return memory.onboardingTasks.map(mapOnboardingTask);
  }

  const result = await pool.query('SELECT * FROM onboarding_tasks ORDER BY id ASC');
  return result.rows.map(mapOnboardingTask);
}

async function addInvoice(invoice) {
  if (useMemory) {
    const record = {
      id: memory.ids.invoice++,
      vendor: invoice.vendor,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount,
      dueDate: invoice.dueDate,
      rawText: invoice.rawText,
      createdAt: new Date().toISOString(),
    };
    memory.invoices.push(record);
    return mapInvoice(record);
  }

  const result = await pool.query(
    `INSERT INTO invoices (vendor, invoice_number, amount, due_date, raw_text)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [invoice.vendor, invoice.invoiceNumber, invoice.amount, invoice.dueDate, invoice.rawText],
  );

  return mapInvoice(result.rows[0]);
}

async function listInvoices() {
  if (useMemory) {
    return memory.invoices.map(mapInvoice);
  }

  const result = await pool.query('SELECT * FROM invoices ORDER BY id DESC');
  return result.rows.map(mapInvoice);
}

async function addMeeting(meeting) {
  if (useMemory) {
    const record = {
      id: memory.ids.meeting++,
      title: meeting.title,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      attendees: meeting.attendees,
      calendarEventId: meeting.calendarEventId,
      createdAt: new Date().toISOString(),
    };
    memory.meetings.push(record);
    return mapMeeting(record);
  }

  const result = await pool.query(
    `INSERT INTO meetings (title, start_time, end_time, attendees, calendar_event_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [meeting.title, meeting.startTime, meeting.endTime, meeting.attendees, meeting.calendarEventId],
  );

  return mapMeeting(result.rows[0]);
}

async function listMeetings() {
  if (useMemory) {
    return memory.meetings.map(mapMeeting);
  }

  const result = await pool.query('SELECT * FROM meetings ORDER BY id DESC');
  return result.rows.map(mapMeeting);
}

async function getSettings() {
  if (useMemory) {
    return { ...memory.settings };
  }

  const result = await pool.query('SELECT ai_model, auto_reply_enabled FROM settings WHERE id = 1');
  const row = result.rows[0];
  return {
    aiModel: row?.ai_model || 'gpt-4o-mini',
    autoReplyEnabled: Boolean(row?.auto_reply_enabled),
  };
}

async function updateSettings({ aiModel, autoReplyEnabled }) {
  if (useMemory) {
    memory.settings = { aiModel, autoReplyEnabled };
    return { ...memory.settings };
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
      createdAt: new Date().toISOString(),
    };
    memory.automations.push(run);
    return mapAutomation(run);
  }

  const result = await pool.query(
    'INSERT INTO automation_runs (type, status, details) VALUES ($1, $2, $3) RETURNING *',
    [type, status, details],
  );

  return mapAutomation(result.rows[0]);
}

async function listAutomations(limit = 25) {
  if (useMemory) {
    return memory.automations.slice(-limit).reverse().map(mapAutomation);
  }

  const result = await pool.query('SELECT * FROM automation_runs ORDER BY id DESC LIMIT $1', [limit]);
  return result.rows.map(mapAutomation);
}

async function createDraft({ inquiry, response }) {
  if (useMemory) {
    const now = new Date().toISOString();
    const draft = {
      id: memory.ids.draft++,
      inquiry,
      response,
      createdAt: now,
      updatedAt: now,
    };
    memory.drafts.push(draft);
    return mapDraft(draft);
  }

  const result = await pool.query(
    'INSERT INTO drafts (inquiry, response) VALUES ($1, $2) RETURNING *',
    [inquiry, response],
  );

  return mapDraft(result.rows[0]);
}

async function listDrafts() {
  if (useMemory) {
    return memory.drafts.slice().sort((a, b) => b.id - a.id).map(mapDraft);
  }

  const result = await pool.query('SELECT * FROM drafts ORDER BY id DESC');
  return result.rows.map(mapDraft);
}

async function getDraftById(id) {
  if (useMemory) {
    const draft = memory.drafts.find((d) => d.id === Number(id));
    return mapDraft(draft || null);
  }

  const result = await pool.query('SELECT * FROM drafts WHERE id = $1', [id]);
  return mapDraft(result.rows[0] || null);
}

async function updateDraft(id, { inquiry, response }) {
  if (useMemory) {
    const draft = memory.drafts.find((d) => d.id === Number(id));
    if (!draft) return null;
    draft.inquiry = inquiry;
    draft.response = response;
    draft.updatedAt = new Date().toISOString();
    return mapDraft(draft);
  }

  const result = await pool.query(
    'UPDATE drafts SET inquiry = $1, response = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
    [inquiry, response, id],
  );

  return mapDraft(result.rows[0] || null);
}

async function deleteDraft(id) {
  if (useMemory) {
    const idx = memory.drafts.findIndex((d) => d.id === Number(id));
    if (idx === -1) return false;
    memory.drafts.splice(idx, 1);
    return true;
  }

  const result = await pool.query('DELETE FROM drafts WHERE id = $1', [id]);
  return result.rowCount > 0;
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

function resetForTests() {
  if (!useMemory) return;
  memory.users = [];
  memory.onboardingTasks = [];
  memory.invoices = [];
  memory.meetings = [];
  memory.settings = { aiModel: 'gpt-4o-mini', autoReplyEnabled: true };
  memory.automations = [];
  memory.drafts = [];
  memory.ids = { user: 1, task: 1, invoice: 1, meeting: 1, automation: 1, draft: 1 };
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
  createDraft,
  listDrafts,
  getDraftById,
  updateDraft,
  deleteDraft,
  getDashboardMetrics,
  resetForTests,
};
