import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  console.log('🔄 Initializing email transporter test...');
  console.log('Host:', process.env.SMTP_HOST);
  console.log('Port:', process.env.SMTP_PORT);
  console.log('User:', process.env.SMTP_USER);
  console.log('Pass:', process.env.SMTP_PASS ? '*****' : 'MISSING');
  console.log('From:', process.env.SMTP_FROM);

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('❌ Missing required SMTP environment variables in .env file!');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    logger: true, // Log all communication to console
    debug: true   // Include debug messages in log
  });

  try {
    console.log('🔄 Sending test email to', process.env.SMTP_USER, '...');
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@smartbus.com',
      to: process.env.SMTP_USER, // Send it to yourself
      subject: 'SMARTBUS+ SMTP Test',
      text: 'If you receive this, SMTP email configuration is 100% working!',
      html: '<h3>SMARTBUS+ Email Status</h3><p>If you receive this, SMTP email configuration is 100% working!</p>'
    });
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
  } catch (err) {
    console.error('❌ Failed to send email:', err);
  }
}

main();
