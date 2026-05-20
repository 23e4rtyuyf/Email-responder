import { useMemo, useState } from 'react';
import './App.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

const defaultCredentials = {
  email: 'admin@example.com',
  password: 'AdminPass123!',
};

function App() {
  const [credentials, setCredentials] = useState(defaultCredentials);
  const [token, setToken] = useState('');
  const [status, setStatus] = useState('');
  const [emailInquiry, setEmailInquiry] = useState('Can you share your pricing plans?');
  const [emailResponse, setEmailResponse] = useState('');
  const [invoiceResult, setInvoiceResult] = useState(null);
  const [dashboard, setDashboard] = useState(null);

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }),
    [token],
  );

  const login = async () => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    const payload = await response.json();
    if (!response.ok) {
      setStatus(payload.error || 'Login failed');
      return;
    }
    setToken(payload.token);
    setStatus(`Logged in as ${payload.user.email}`);
  };

  const generateEmail = async () => {
    const response = await fetch(`${API_BASE}/email/respond`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ inquiry: emailInquiry }),
    });
    const payload = await response.json();
    setEmailResponse(payload.response || payload.error || 'No response generated');
  };

  const uploadInvoice = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('invoice', file);

    const response = await fetch(`${API_BASE}/invoices/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const payload = await response.json();
    setInvoiceResult(payload.invoice || payload.error);
  };

  const loadDashboard = async () => {
    const response = await fetch(`${API_BASE}/admin/dashboard`, {
      headers: authHeaders,
    });
    const payload = await response.json();
    setDashboard(payload);
  };

  return (
    <main className="page">
      <header>
        <h1>AI Assistant SaaS MVP</h1>
        <p>Automate support email, onboarding, invoices, scheduling, and admin workflows.</p>
      </header>

      <section className="card">
        <h2>Authentication</h2>
        <div className="row">
          <input
            value={credentials.email}
            onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
            placeholder="Email"
          />
          <input
            type="password"
            value={credentials.password}
            onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
            placeholder="Password"
          />
          <button onClick={login}>Login</button>
        </div>
        <p className="status">{status}</p>
      </section>

      <section className="card">
        <h2>Email Autoresponder</h2>
        <textarea value={emailInquiry} onChange={(e) => setEmailInquiry(e.target.value)} rows={4} />
        <button onClick={generateEmail} disabled={!token}>Generate Response</button>
        {emailResponse && <pre>{emailResponse}</pre>}
      </section>

      <section className="card">
        <h2>Invoice Tracking</h2>
        <input type="file" onChange={uploadInvoice} disabled={!token} />
        {invoiceResult && <pre>{JSON.stringify(invoiceResult, null, 2)}</pre>}
      </section>

      <section className="card">
        <h2>Admin Dashboard</h2>
        <button onClick={loadDashboard} disabled={!token}>Load Dashboard</button>
        {dashboard && <pre>{JSON.stringify(dashboard, null, 2)}</pre>}
      </section>
    </main>
  );
}

export default App;
