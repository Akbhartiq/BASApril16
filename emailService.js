const nodemailer = require('nodemailer');
require('dotenv').config();

// Create a transporter using Gmail or other email service providers
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Function to send an OTP email
async function sendOTP(email, otp) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Your OTP for Password Reset',
        text: `Your OTP for password reset is: ${otp}`,
    };

    console.log(mailOptions);

    await transporter.sendMail(mailOptions);
}

module.exports = { sendOTP };
