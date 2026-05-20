require('dotenv').config();
const bcrypt = require('bcryptjs');
const { initDb, findUserByEmail, createUser, addOnboardingTask, addInvoice, addMeeting } = require('./repository');

async function seed() {
  await initDb();

  const existingAdmin = await findUserByEmail('admin@example.com');
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('AdminPass123!', 10);
    await createUser({
      name: 'Admin User',
      email: 'admin@example.com',
      passwordHash,
      role: 'admin',
    });
  }

  await addOnboardingTask({ title: 'Complete HR form' });
  await addOnboardingTask({ title: 'Read employee handbook' });
  await addInvoice({
    vendor: 'Acme Supplies',
    invoiceNumber: 'ACM-1001',
    amount: 1299.95,
    dueDate: '2026-06-01',
    rawText: 'Seed invoice',
  });
  await addMeeting({
    title: 'Weekly Ops Sync',
    startTime: '2026-05-22T15:00:00Z',
    endTime: '2026-05-22T15:30:00Z',
    attendees: ['team@example.com'],
    calendarEventId: 'seed-event',
  });

  console.log('Seed complete. Admin login: admin@example.com / AdminPass123!');
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
