function parseInvoiceText(rawText) {
  const vendorMatch = rawText.match(/Vendor\s*:\s*(.+)/i);
  const numberMatch = rawText.match(/Invoice\s*(?:No|Number)\s*:\s*([\w-]+)/i);
  const amountMatch = rawText.match(/(?:Total|Amount)\s*:\s*\$?([0-9]+(?:\.[0-9]{1,2})?)/i);
  const dueDateMatch = rawText.match(/Due\s*Date\s*:\s*([0-9\-\/]+)/i);

  return {
    vendor: vendorMatch ? vendorMatch[1].trim() : 'Unknown Vendor',
    invoiceNumber: numberMatch ? numberMatch[1].trim() : `INV-${Date.now()}`,
    amount: amountMatch ? Number(amountMatch[1]) : 0,
    dueDate: dueDateMatch ? dueDateMatch[1].trim() : null,
    rawText,
  };
}

module.exports = { parseInvoiceText };
