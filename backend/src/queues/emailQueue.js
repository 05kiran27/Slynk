const { sendMail } = require('../utils/mailer');

const worker = new Worker('emailQueue', async job => {
  const { to, subject, text, html } = job.data;
  await sendMail({ to, subject, text, html });
  console.log("Email sent successfully");
}, { connection });
