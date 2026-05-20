const { parseInvoiceText } = require('../src/invoice');

test('parseInvoiceText extracts vendor, number, amount and due date', () => {
  const parsed = parseInvoiceText(`Vendor: Northwind\nInvoice Number: NW-101\nTotal: $499.99\nDue Date: 2026-06-10`);

  expect(parsed.vendor).toBe('Northwind');
  expect(parsed.invoiceNumber).toBe('NW-101');
  expect(parsed.amount).toBe(499.99);
  expect(parsed.dueDate).toBe('2026-06-10');
});
