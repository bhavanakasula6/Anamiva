const { sendOTP, verifyOTP } = require('../config/otp');

exports.sendOtpToEmail = async (email) => {
  await sendOTP(email);
};

exports.verifyEmailOtp = async (email, otp) => {
  return await verifyOTP(email, otp);
};
