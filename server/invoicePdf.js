function formatCustomerName(customer) {
  const firstName = String(customer?.firstName || '').trim();
  const lastName = String(customer?.lastName || '').trim();
  return `${firstName} ${lastName}`.trim() || 'Brez imena';
}

function formatCustomerAddress(customer) {
  const address = String(customer?.address || '').trim();
  const postalCode = String(customer?.postalCode || '').trim();
  const city = String(customer?.city || '').trim();
  const cityLine = [postalCode, city].filter(Boolean).join(' ');

  return [address, cityLine].filter(Boolean).join(', ') || 'Brez naslova';
}

function formatPdfCurrency(value, currency = 'EUR') {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '-';
  }

  const amount = new Intl.NumberFormat('sl-SI', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

  return `${amount} ${String(currency || 'EUR').toUpperCase()}`;
}

function formatPaymentStatusLabel(value) {
  const normalized = String(value || '').toLowerCase();

  if (normalized === 'paid') {
    return 'Placano';
  }

  if (normalized === 'unpaid') {
    return 'Ni placano';
  }

  return String(value || '-');
}

function normalizePdfText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll('\\', '\\\\')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)');
}

function wrapPdfLine(value, maxLength = 84) {
  const text = String(value || '').trim();

  if (!text) {
    return [''];
  }

  const words = text.split(/\s+/);
  const lines = [];
  let currentLine = '';

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (nextLine.length <= maxLength) {
      currentLine = nextLine;
      return;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

export function buildInvoicePdfBuffer(order) {
  const invoiceNumber = order?.orderNumber || 'Narocilo';
  const customerName = formatCustomerName(order?.customer);
  const address = formatCustomerAddress(order?.customer);
  const email = order?.customer?.email || 'Ni podatka';
  const createdAt = order?.createdAt ? new Date(order.createdAt).toLocaleString('sl-SI') : '-';
  const currency = order?.currency || 'EUR';
  const lines = [];

  function addLine(text, options = {}) {
    lines.push({
      text: normalizePdfText(text),
      x: options.x ?? 48,
      y: options.y ?? 0,
      font: options.font || 'F1',
      size: options.size || 12,
    });
  }

  let currentY = 800;
  addLine('DRESOTEKA', { font: 'F2', size: 24, y: currentY });
  currentY -= 28;
  addLine(`Racun za narocilo ${invoiceNumber}`, { font: 'F2', size: 15, y: currentY });
  currentY -= 30;

  [
    `Kupec: ${customerName}`,
    `E-posta: ${email}`,
    `Naslov: ${address}`,
    `Datum: ${createdAt}`,
    `Placilo: ${formatPaymentStatusLabel(order?.paymentStatus)}`,
  ].forEach((lineText) => {
    wrapPdfLine(lineText).forEach((wrappedLine) => {
      addLine(wrappedLine, { y: currentY });
      currentY -= 18;
    });
  });

  currentY -= 8;
  addLine('Postavke', { font: 'F2', size: 14, y: currentY });
  currentY -= 22;

  (order?.items || []).forEach((item) => {
    const quantity = Number(item?.quantity || 0);
    const unitPrice = Number(item?.unitPrice || 0);
    const lineTotal = unitPrice * quantity;
    const itemLabel = `${item?.name || 'Izdelek'} x ${quantity}`;
    const priceLabel = formatPdfCurrency(lineTotal, currency);

    wrapPdfLine(itemLabel, 62).forEach((wrappedLine, index) => {
      addLine(wrappedLine, { y: currentY, font: index === 0 ? 'F2' : 'F1' });

      if (index === 0) {
        addLine(priceLabel, { x: 430, y: currentY, font: 'F2' });
      }

      currentY -= 18;
    });

    addLine(`Cena/kos: ${formatPdfCurrency(unitPrice, currency)}`, { x: 68, y: currentY, size: 11 });
    currentY -= 20;
  });

  currentY -= 8;
  addLine(`Skupaj: ${formatPdfCurrency(Number(order?.totalAmount || 0), currency)}`, {
    x: 360,
    y: currentY,
    font: 'F2',
    size: 15,
  });

  const content = lines
    .map((line) => `BT /${line.font} ${line.size} Tf 1 0 0 1 ${line.x} ${line.y} Tm (${line.text}) Tj ET`)
    .join('\n');

  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >> endobj',
    `4 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    '6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  objects.forEach((object) => {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}
