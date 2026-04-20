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
  };
}

function createTransporter() {
  const env = getMailEnv();

  if (!env.smtpUser || !env.smtpPass) {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });
}

export async function sendOrderConfirmationEmail({ order, sessionId }) {
  const normalizedSessionId = String(sessionId || '').trim();
  const customerEmail = String(order?.customer?.email || '').trim();

  if (!normalizedSessionId || !customerEmail || hasEmailDelivery(normalizedSessionId)) {
    return { sent: false, reason: 'skipped' };
  }

  const transporter = createTransporter();

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
