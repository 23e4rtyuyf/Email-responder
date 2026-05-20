process.env.JWT_SECRET = 'test-secret';

const bcrypt = require('bcryptjs');
const request = require('supertest');
const { createApp } = require('../src/app');
const { createUser, resetForTests } = require('../src/repository');

let app;
let userToken;
let adminToken;

beforeAll(async () => {
  resetForTests();
  app = await createApp();

  const registerResponse = await request(app).post('/api/auth/register').send({
    name: 'Test User',
    email: 'test@example.com',
    password: 'Password123!',
  });

  userToken = registerResponse.body.token;

  const passwordHash = await bcrypt.hash('Password123!', 10);
  await createUser({
    name: 'Admin User',
    email: 'admin@test.com',
    passwordHash,
    role: 'admin',
  });

  const adminLogin = await request(app).post('/api/auth/login').send({
    email: 'admin@test.com',
    password: 'Password123!',
  });

  adminToken = adminLogin.body.token;
});

test('health check works', async () => {
  const response = await request(app).get('/api/health');
  expect(response.status).toBe(200);
  expect(response.body.status).toBe('ok');
});

test('auth token is required for protected endpoints', async () => {
  const response = await request(app).get('/api/drafts');
  expect(response.status).toBe(401);
  expect(response.body.error).toContain('Missing auth token');
});

test('autoReplyEnabled=false blocks email generation and returns clear error', async () => {
  const settingsUpdate = await request(app)
    .put('/api/admin/settings')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ aiModel: 'gpt-4o-mini', autoReplyEnabled: false });

  expect(settingsUpdate.status).toBe(200);
  expect(settingsUpdate.body.settings.autoReplyEnabled).toBe(false);

  const emailResponse = await request(app)
    .post('/api/email/respond')
    .set('Authorization', `Bearer ${userToken}`)
    .send({ inquiry: 'What are your support hours?' });

  expect(emailResponse.status).toBe(403);
  expect(emailResponse.body.error).toBe('Auto-reply is disabled');
});

test('draft CRUD happy path works', async () => {
  const created = await request(app)
    .post('/api/drafts')
    .set('Authorization', `Bearer ${userToken}`)
    .send({ inquiry: 'Need invoice copy', response: 'We will send it shortly.' });

  expect(created.status).toBe(201);
  expect(created.body.draft.id).toBeDefined();

  const draftId = created.body.draft.id;

  const list = await request(app).get('/api/drafts').set('Authorization', `Bearer ${userToken}`);
  expect(list.status).toBe(200);
  expect(list.body.drafts.some((draft) => draft.id === draftId)).toBe(true);

  const updated = await request(app)
    .put(`/api/drafts/${draftId}`)
    .set('Authorization', `Bearer ${userToken}`)
    .send({ inquiry: 'Need invoice copy ASAP', response: 'Sent to your inbox.' });

  expect(updated.status).toBe(200);
  expect(updated.body.draft.inquiry).toContain('ASAP');

  const removed = await request(app)
    .delete(`/api/drafts/${draftId}`)
    .set('Authorization', `Bearer ${userToken}`);

  expect(removed.status).toBe(204);
});

test('invoice preview parses data and returns camelCase shape', async () => {
  const preview = await request(app)
    .post('/api/invoices/preview')
    .set('Authorization', `Bearer ${userToken}`)
    .send({
      rawText: 'Vendor: Atlas\nInvoice Number: A-42\nTotal: $320.00\nDue Date: 2026-07-01',
    });

  expect(preview.status).toBe(200);
  expect(preview.body.invoice.vendor).toBe('Atlas');
  expect(preview.body.invoice.invoiceNumber).toBe('A-42');
  expect(preview.body.invoice.dueDate).toBe('2026-07-01');
  expect(preview.body.invoice.rawText).toContain('Vendor: Atlas');
});

test('admin dashboard allows admin and blocks normal users', async () => {
  const denied = await request(app)
    .get('/api/admin/dashboard')
    .set('Authorization', `Bearer ${userToken}`);
  expect(denied.status).toBe(403);

  const adminView = await request(app)
    .get('/api/admin/dashboard')
    .set('Authorization', `Bearer ${adminToken}`);

  expect(adminView.status).toBe(200);
  expect(adminView.body.metrics.users).toBeGreaterThanOrEqual(2);
});
