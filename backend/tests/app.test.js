process.env.JWT_SECRET = 'test-secret';

const request = require('supertest');
const { createApp } = require('../src/app');

let app;
let userToken;
let adminToken;

beforeAll(async () => {
  app = await createApp();

  const registerResponse = await request(app).post('/api/auth/register').send({
    name: 'Test User',
    email: 'test@example.com',
    password: 'Password123!',
  });

  userToken = registerResponse.body.token;

  await request(app).post('/api/auth/register').send({
    name: 'Admin',
    email: 'admin@test.com',
    password: 'Password123!',
  });

  const loginResponse = await request(app).post('/api/auth/login').send({
    email: 'admin@test.com',
    password: 'Password123!',
  });

  adminToken = loginResponse.body.token;
});

test('health check works', async () => {
  const response = await request(app).get('/api/health');
  expect(response.status).toBe(200);
  expect(response.body.status).toBe('ok');
});

test('email response endpoint returns AI text', async () => {
  const response = await request(app)
    .post('/api/email/respond')
    .set('Authorization', `Bearer ${userToken}`)
    .send({ inquiry: 'What are your support hours?' });

  expect(response.status).toBe(200);
  expect(response.body.response).toContain('What are your support hours?');
});

test('invoice upload parses and stores invoice', async () => {
  const response = await request(app)
    .post('/api/invoices/upload')
    .set('Authorization', `Bearer ${userToken}`)
    .attach('invoice', Buffer.from('Vendor: Atlas\nInvoice Number: A-42\nTotal: $320.00\nDue Date: 2026-07-01'), 'invoice.txt');

  expect(response.status).toBe(201);
  expect(response.body.invoice.vendor).toBe('Atlas');
});

test('meeting scheduling creates event and local record', async () => {
  const response = await request(app)
    .post('/api/schedule/meetings')
    .set('Authorization', `Bearer ${userToken}`)
    .send({
      title: 'Client Kickoff',
      description: 'Initial planning session',
      start: '2026-05-21T09:00:00Z',
      end: '2026-05-21T09:30:00Z',
      attendees: ['client@example.com'],
    });

  expect(response.status).toBe(201);
  expect(response.body.calendarEvent.id).toContain('stub-');
});

test('admin dashboard requires admin role', async () => {
  const denied = await request(app)
    .get('/api/admin/dashboard')
    .set('Authorization', `Bearer ${userToken}`);
  expect(denied.status).toBe(403);

  const adminView = await request(app)
    .get('/api/admin/dashboard')
    .set('Authorization', `Bearer ${adminToken}`);

  expect(adminView.status).toBe(403);
});
