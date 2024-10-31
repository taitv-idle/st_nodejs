const formData = require('form-data');
const Mailgun = require('mailgun.js');
const mailgun = new Mailgun(formData);
require('dotenv').config(); // Thêm dòng này để sử dụng biến môi trường từ file .env
const mg = mailgun.client({username: 'api', key: process.env.MAILGUN_API_KEY});

// Hàm gửi mail sử dụng cấu hình trên
const sendMail = (email, subject, text, html) => {
    return mg.messages.create('sandboxf4833d3a4cd94100827bdf5e7ae8e191.mailgun.org', {
        from: "Excited User <mailgun@sandboxf4833d3a4cd94100827bdf5e7ae8e191.mailgun.org>",
        to: [email],
        subject: subject,
        text: text,
        html: html
    })
    .then(msg => console.log(msg)) // logs response data
    .catch(err => console.log(err)); // logs any error;
};

module.exports = sendMail;
