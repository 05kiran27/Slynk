const crypto = require('crypto');

exports.generateOtp = () => {
  const otp = (Math.floor(100000 + Math.random() * 900000)).toString();
  const hash = crypto.createHash('sha256').update(otp).digest('hex');
  return { otp, hash };
};
