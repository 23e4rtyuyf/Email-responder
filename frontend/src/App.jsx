import { useEffect, useMemo, useState } from 'react';
import { api } from './api';
import './App.css';

const TABS = ['auth', 'dashboard', 'email', 'invoices', 'meetings', 'automations', 'settings'];

const defaultAuth = {
  name: 'Admin User',
  email: 'admin@example.com',
  password: 'AdminPass123!',
};

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function App() {
  const [tab, setTab] = useState('auth');
  const [authForm, setAuthForm] = useState(defaultAuth);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [currentUser, setCurrentUser] = useState(() => {
    const raw = localStorage.getItem('currentUser');
    return raw ? JSON.parse(raw) : null;
  });
  const [notice, setNotice] = useState('');

  const [dashboard, setDashboard] = useState(null);
  const [emailInquiry, setEmailInquiry] = useState('Can you share your pricing plans?');
  const [emailResponse, setEmailResponse] = useState('');
  const [drafts, setDrafts] = useState([]);
  const [selectedDraftId, setSelectedDraftId] = useState(null);

  const [invoiceText, setInvoiceText] = useState('Vendor: Acme\nInvoice Number: AC-100\nTotal: $125.50\nDue Date: 2026-06-30');
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [invoices, setInvoices] = useState([]);

  const [meetingForm, setMeetingForm] = useState({
    title: 'Client Kickoff',
    description: 'Initial planning session',
    start: '2026-05-22T09:00',
    end: '2026-05-22T09:30',
    attendees: 'client@example.com',
  });
  const [meetings, setMeetings] = useState([]);
  const [lastCalendarEvent, setLastCalendarEvent] = useState(null);

  const [automations, setAutomations] = useState([]);

  const [settings, setSettings] = useState({ aiModel: 'gpt-4o-mini', autoReplyEnabled: true });

  const isAuthed = Boolean(token);
  const isAdmin = currentUser?.role === 'admin';

  const canViewTab = useMemo(() => {
    return {
      auth: true,
      dashboard: isAuthed,
      email: isAuthed,
      invoices: isAuthed,
      meetings: isAuthed,
      automations: isAuthed,
      settings: isAuthed && isAdmin,
    };
  }, [isAuthed, isAdmin]);

  useEffect(() => {
    if (!canViewTab[tab]) {
      setTab('auth');
    }
  }, [canViewTab, tab]);

  function setSession(payload) {
    localStorage.setItem('token', payload.token);
    localStorage.setItem('currentUser', JSON.stringify(payload.user));
    setToken(payload.token);
    setCurrentUser(payload.user);
  }

  function clearNoticeSoon(message) {
    setNotice(message);
    setTimeout(() => setNotice(''), 3500);
  }

  async function withError(action) {
    try {
      await action();
    } catch (error) {
      clearNoticeSoon(error.message || 'Unexpected error');
    }
  }

  async function handleLogin() {
    await withError(async () => {
      const payload = await api.login({ email: authForm.email, password: authForm.password });
      setSession(payload);
      clearNoticeSoon(`Logged in as ${payload.user.email}`);
      setTab('dashboard');
    });
  }

  async function handleRegister() {
    await withError(async () => {
      const payload = await api.register(authForm);
      setSession(payload);
      clearNoticeSoon(`Registered and logged in as ${payload.user.email}`);
      setTab('dashboard');
    });
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    setToken('');
    setCurrentUser(null);
    setTab('auth');
    clearNoticeSoon('Logged out');
  }

  async function loadDashboard() {
    await withError(async () => {
      const payload = await api.dashboard(token);
      setDashboard(payload);
      setAutomations(payload.metrics?.automations || []);
      clearNoticeSoon('Dashboard loaded');
    });
  }

  async function generateEmail() {
    await withError(async () => {
      const payload = await api.respondToEmail(token, emailInquiry);
      setEmailResponse(payload.response);
      clearNoticeSoon('Response generated');
    });
  }

  async function loadDrafts() {
    await withError(async () => {
      const payload = await api.listDrafts(token);
      setDrafts(payload.drafts || []);
    });
  }

  async function saveDraft() {
    await withError(async () => {
      if (!emailInquiry.trim() || !emailResponse.trim()) {
        throw new Error('Generate or enter an inquiry/response before saving a draft');
      }

      if (selectedDraftId) {
        const updated = await api.updateDraft(token, selectedDraftId, {
          inquiry: emailInquiry,
          response: emailResponse,
        });
        setDrafts((prev) => prev.map((d) => (d.id === updated.draft.id ? updated.draft : d)));
        clearNoticeSoon('Draft updated');
        return;
      }

      const created = await api.createDraft(token, { inquiry: emailInquiry, response: emailResponse });
      setDrafts((prev) => [created.draft, ...prev]);
      setSelectedDraftId(created.draft.id);
      clearNoticeSoon('Draft created');
    });
  }

  async function openDraft(id) {
    await withError(async () => {
      const payload = await api.getDraft(token, id);
      setSelectedDraftId(payload.draft.id);
      setEmailInquiry(payload.draft.inquiry);
      setEmailResponse(payload.draft.response);
      clearNoticeSoon(`Draft #${id} loaded`);
    });
  }

  async function removeDraft(id) {
    await withError(async () => {
      await api.deleteDraft(token, id);
      setDrafts((prev) => prev.filter((d) => d.id !== id));
      if (selectedDraftId === id) {
        setSelectedDraftId(null);
        setEmailResponse('');
      }
      clearNoticeSoon('Draft deleted');
    });
  }

  async function previewInvoiceFromText() {
    await withError(async () => {
      const payload = await api.previewInvoiceWithText(token, invoiceText);
      setPreviewInvoice(payload.invoice);
      clearNoticeSoon('Invoice preview ready');
    });
  }

  async function previewInvoiceFromFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    await withError(async () => {
      const payload = await api.previewInvoiceWithFile(token, file);
      setPreviewInvoice(payload.invoice);
      clearNoticeSoon(`Preview parsed from ${file.name}`);
    });
  }

  async function savePreviewInvoice() {
    await withError(async () => {
      if (!previewInvoice) {
        throw new Error('Preview an invoice first');
      }

      const payload = await api.saveInvoice(token, previewInvoice);
      setInvoices((prev) => [payload.invoice, ...prev]);
      clearNoticeSoon(`Invoice ${payload.invoice.invoiceNumber} saved`);
    });
  }

  async function loadInvoices() {
    await withError(async () => {
      const payload = await api.listInvoices(token);
      setInvoices(payload.invoices || []);
      clearNoticeSoon('Invoices loaded');
    });
  }

  async function scheduleMeeting() {
    await withError(async () => {
      const startDate = new Date(meetingForm.start);
      const endDate = new Date(meetingForm.end);
      if (!(startDate < endDate)) {
        throw new Error('Start time must be before end time');
      }

      const attendees = meetingForm.attendees
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean);

      const invalid = attendees.find((email) => !isValidEmail(email));
      if (invalid) {
        throw new Error(`Invalid attendee email: ${invalid}`);
      }

      const payload = await api.scheduleMeeting(token, {
        title: meetingForm.title,
        description: meetingForm.description,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        attendees,
      });

      setMeetings((prev) => [payload.meeting, ...prev]);
      setLastCalendarEvent(payload.calendarEvent);
      clearNoticeSoon('Meeting scheduled');
    });
  }

  async function loadMeetings() {
    await withError(async () => {
      const payload = await api.listMeetings(token);
      setMeetings(payload.meetings || []);
      clearNoticeSoon('Meetings loaded');
    });
  }

  async function loadAutomations() {
    await withError(async () => {
      const payload = await api.listAutomations(token);
      setAutomations(payload.automations || []);
      clearNoticeSoon('Automation history loaded');
    });
  }

  async function loadSettings() {
    await withError(async () => {
      const payload = await api.getSettings(token);
      setSettings(payload.settings);
      clearNoticeSoon('Settings loaded');
    });
  }

  async function saveSettings() {
    await withError(async () => {
      const payload = await api.updateSettings(token, settings);
      setSettings(payload.settings);
      clearNoticeSoon('Settings updated');
    });
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>AI Assistant SaaS</h1>
          <p>Automate email, invoices, meetings, onboarding, and admin workflows.</p>
        </div>
        <div className="session">
          <span>{currentUser ? `${currentUser.email} (${currentUser.role})` : 'Guest'}</span>
          {isAuthed && (
            <button type="button" className="btn secondary" onClick={handleLogout}>
              Logout
            </button>
          )}
        </div>
      </header>

      <nav className="tabs">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={tab === item ? 'active' : ''}
            disabled={!canViewTab[item]}
          >
            {item}
          </button>
        ))}
      </nav>

      {notice && <div className="notice">{notice}</div>}

      {tab === 'auth' && (
        <section className="panel">
          <h2>Login / Register</h2>
          <p className="hint">For admin local dev, run <code>npm run seed --workspace backend</code> and login with admin@example.com / AdminPass123!</p>
          <div className="grid two">
            <label>
              Name
              <input value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} />
            </label>
            <label>
              Email
              <input value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} />
            </label>
            <label>
              Password
              <input type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} />
            </label>
          </div>
          <div className="row">
            <button type="button" className="btn" onClick={handleLogin}>Login</button>
            <button type="button" className="btn secondary" onClick={handleRegister}>Register</button>
          </div>
        </section>
      )}

      {tab === 'dashboard' && (
        <section className="panel">
          <h2>Dashboard</h2>
          <button type="button" className="btn" onClick={loadDashboard}>Load Metrics</button>
          {dashboard && (
            <div className="grid cards">
              <article><h3>Users</h3><strong>{dashboard.metrics.users}</strong></article>
              <article><h3>Onboarding Tasks</h3><strong>{dashboard.metrics.onboardingTasks}</strong></article>
              <article><h3>Invoices</h3><strong>{dashboard.metrics.invoices}</strong></article>
              <article><h3>Meetings</h3><strong>{dashboard.metrics.meetings}</strong></article>
            </div>
          )}
        </section>
      )}

      {tab === 'email' && (
        <section className="panel">
          <h2>Email Responder + Drafts</h2>
          <label>
            Inquiry
            <textarea rows={4} value={emailInquiry} onChange={(e) => setEmailInquiry(e.target.value)} />
          </label>
          <label>
            Response
            <textarea rows={6} value={emailResponse} onChange={(e) => setEmailResponse(e.target.value)} />
          </label>
          <div className="row">
            <button type="button" className="btn" onClick={generateEmail}>Generate Response</button>
            <button type="button" className="btn secondary" onClick={saveDraft}>{selectedDraftId ? 'Update Draft' : 'Save Draft'}</button>
            <button type="button" className="btn secondary" onClick={loadDrafts}>Refresh Drafts</button>
          </div>
          <ul className="list">
            {drafts.map((draft) => (
              <li key={draft.id}>
                <div>
                  <strong>#{draft.id}</strong> {draft.inquiry.slice(0, 60)}
                </div>
                <div className="row compact">
                  <button type="button" className="btn secondary" onClick={() => openDraft(draft.id)}>Open</button>
                  <button type="button" className="btn danger" onClick={() => removeDraft(draft.id)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === 'invoices' && (
        <section className="panel">
          <h2>Invoices</h2>
          <label>
            Invoice Text Preview
            <textarea rows={6} value={invoiceText} onChange={(e) => setInvoiceText(e.target.value)} />
          </label>
          <div className="row">
            <button type="button" className="btn" onClick={previewInvoiceFromText}>Preview from Text</button>
            <input type="file" onChange={previewInvoiceFromFile} />
            <button type="button" className="btn secondary" onClick={savePreviewInvoice}>Save Previewed Invoice</button>
            <button type="button" className="btn secondary" onClick={loadInvoices}>Load Invoices</button>
          </div>
          {previewInvoice && <pre>{JSON.stringify(previewInvoice, null, 2)}</pre>}
          <ul className="list">
            {invoices.map((invoice) => (
              <li key={invoice.id}>
                <strong>{invoice.invoiceNumber}</strong> — {invoice.vendor} — ${invoice.amount}
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === 'meetings' && (
        <section className="panel">
          <h2>Meetings</h2>
          <div className="grid two">
            <label>
              Title
              <input value={meetingForm.title} onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })} />
            </label>
            <label>
              Attendees (comma-separated)
              <input value={meetingForm.attendees} onChange={(e) => setMeetingForm({ ...meetingForm, attendees: e.target.value })} />
            </label>
            <label>
              Start
              <input type="datetime-local" value={meetingForm.start} onChange={(e) => setMeetingForm({ ...meetingForm, start: e.target.value })} />
            </label>
            <label>
              End
              <input type="datetime-local" value={meetingForm.end} onChange={(e) => setMeetingForm({ ...meetingForm, end: e.target.value })} />
            </label>
          </div>
          <label>
            Description
            <textarea rows={3} value={meetingForm.description} onChange={(e) => setMeetingForm({ ...meetingForm, description: e.target.value })} />
          </label>
          <div className="row">
            <button type="button" className="btn" onClick={scheduleMeeting}>Schedule Meeting</button>
            <button type="button" className="btn secondary" onClick={loadMeetings}>Load Meetings</button>
          </div>
          {lastCalendarEvent && <pre>{JSON.stringify(lastCalendarEvent, null, 2)}</pre>}
          <ul className="list">
            {meetings.map((meeting) => (
              <li key={meeting.id}>
                <strong>{meeting.title}</strong> — {meeting.startTime} to {meeting.endTime}
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === 'automations' && (
        <section className="panel">
          <h2>Automation Run History</h2>
          <button type="button" className="btn" onClick={loadAutomations}>Load Runs</button>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Status</th>
                <th>Details</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {automations.map((item) => (
                <tr key={item.id}>
                  <td>{item.type}</td>
                  <td>{item.status}</td>
                  <td>{item.details}</td>
                  <td>{item.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'settings' && (
        <section className="panel">
          <h2>Admin Settings</h2>
          <p className="hint">Visible only when logged in as admin.</p>
          <div className="grid two">
            <label>
              AI Model
              <select value={settings.aiModel} onChange={(e) => setSettings({ ...settings, aiModel: e.target.value })}>
                <option value="gpt-4o-mini">gpt-4o-mini</option>
                <option value="gpt-4.1-mini">gpt-4.1-mini</option>
                <option value="gpt-4o">gpt-4o</option>
              </select>
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={settings.autoReplyEnabled}
                onChange={(e) => setSettings({ ...settings, autoReplyEnabled: e.target.checked })}
              />
              Auto reply enabled
            </label>
          </div>
          <div className="row">
            <button type="button" className="btn" onClick={loadSettings}>Load Settings</button>
            <button type="button" className="btn secondary" onClick={saveSettings}>Save Settings</button>
          </div>
        </section>
      )}
    </main>
  );
}

export default App;
