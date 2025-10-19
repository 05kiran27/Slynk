const nodeMailer = require("nodemailer");
require("dotenv").config();

const sendMail = async ({ to, subject, text, html }) => {
  try {
    let transporter = nodeMailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,   // Gmail address
        pass: process.env.EMAIL_PASS,   // Gmail App Password
      },
    });

    let info = await transporter.sendMail({
      from: `"Slynk" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: html || `<p>${text}</p>`,
      text: text,
    });

    console.log("✅ Mail sent:", info.messageId);
    return info;
  } catch (error) {
    console.log("❌ Mail error:", error.message);
    throw error;
  }
};

module.exports = { sendMail };
