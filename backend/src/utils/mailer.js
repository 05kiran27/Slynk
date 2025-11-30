const nodeMailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Load OTP template once
const otpTemplatePath = path.join(__dirname, "../email-templates/otp.html");
const OTP_TEMPLATE = fs.readFileSync(otpTemplatePath, "utf8");

function renderOtpTemplate(otp) {
  return OTP_TEMPLATE
    .replace(/{{OTP}}/g, otp)
    .replace(/{{YEAR}}/g, new Date().getFullYear());
}

const sendMail = async ({ to, subject, html, text }) => {
  try {
    const transporter = nodeMailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"Slynk" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: html || `<p>${text}</p>`,
      text,
    });

    console.log("✅ Mail sent:", info.messageId);
    return info;
  } catch (error) {
    console.log("❌ Mail error:", error.message);
    throw error;
  }
};

module.exports = { sendMail, renderOtpTemplate };
