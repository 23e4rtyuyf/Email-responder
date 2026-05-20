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
