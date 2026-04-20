import dns from 'dns/promises';
import nodemailer from 'nodemailer';
import { getEnv } from './stripeCheckout.js';
import { hasEmailDelivery, markEmailDelivered } from './emailDeliveryStore.js';
import { buildInvoicePdfBuffer } from './invoicePdf.js';

function getMailEnv() {
  const env = getEnv();

  return {
    smtpUser: process.env.GMAIL_SMTP_USER || env.gmailSmtpUser || '',
    smtpPass: process.env.GMAIL_SMTP_PASS || env.gmailSmtpPass || '',
    fromEmail: process.env.ORDER_EMAIL_FROM || env.orderEmailFrom || 'dresko54@gmail.com',
    allowSelfSigned: ['1', 'true', 'yes'].includes(String(process.env.GMAIL_SMTP_ALLOW_SELF_SIGNED || env.gmailAllowSelfSigned || '').toLowerCase()),
  };
}

async function createTransporter() {
  const env = getMailEnv();

  if (!env.smtpUser || !env.smtpPass) {
    return null;
  }

  let smtpHost = 'smtp.gmail.com';

  try {
    const resolved = await dns.resolve4('smtp.gmail.com');

    if (Array.isArray(resolved) && resolved[0]) {
      smtpHost = resolved[0];
    }
  } catch {
    smtpHost = 'smtp.gmail.com';
  }

  const baseConfig = {
    host: smtpHost,
    family: 4,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
    tls: {
      servername: 'smtp.gmail.com',
      rejectUnauthorized: !env.allowSelfSigned,
    },
  };

  const secureTransporter = nodemailer.createTransport({
    ...baseConfig,
    port: 465,
    secure: true,
  });

  try {
    await secureTransporter.verify();
    return secureTransporter;
  } catch {
    const startTlsTransporter = nodemailer.createTransport({
      ...baseConfig,
      port: 587,
      secure: false,
      requireTLS: true,
    });

    await startTlsTransporter.verify();
    return startTlsTransporter;
  }
}

export async function sendOrderConfirmationEmail({ order, sessionId }) {
  const normalizedSessionId = String(sessionId || '').trim();
  const customerEmail = String(order?.customer?.email || '').trim();

  if (!normalizedSessionId || !customerEmail || hasEmailDelivery(normalizedSessionId)) {
    return { sent: false, reason: 'skipped' };
  }

  const transporter = await createTransporter();

  if (!transporter) {
    return { sent: false, reason: 'missing-config' };
  }

  const env = getMailEnv();
  const invoiceNumber = order?.orderNumber || 'Narocilo';
  const customerName = `${order?.customer?.firstName || ''} ${order?.customer?.lastName || ''}`.trim() || 'kupec';
  const pdfBuffer = buildInvoicePdfBuffer(order);

  await transporter.sendMail({
    from: `"Dresoteka" <${env.fromEmail}>`,
    to: customerEmail,
    subject: `Potrditev narocila ${invoiceNumber}`,
    text: [
      `Pozdravljen${customerName ? ` ${customerName}` : ''},`,
      '',
      `tvoje narocilo ${invoiceNumber} je bilo uspesno oddano.`,
      'V priponki prejmes racun v PDF obliki.',
      '',
      'Hvala za nakup,',
      'Dresoteka',
    ].join('\n'),
    attachments: [
      {
        filename: `racun-${invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });

  markEmailDelivered(normalizedSessionId);

  return { sent: true };
}

export async function sendTestEmail(toEmail) {
  const transporter = await createTransporter();
  const env = getMailEnv();

  if (!transporter) {
    throw new Error('Missing Gmail SMTP configuration.');
  }

  const normalizedTo = String(toEmail || '').trim() || env.smtpUser;

  await transporter.sendMail({
    from: `"Dresoteka" <${env.fromEmail}>`,
    to: normalizedTo,
    subject: 'Dresoteka test email',
    text: 'To je testni email iz Dresoteka aplikacije.',
  });

  return { sent: true, to: normalizedTo };
}
