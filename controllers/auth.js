const crypto = require('crypto');
const { validationResult } = require('express-validator');

const sendMail = require('../utils/mailgunClient');

const bcrypt = require('bcryptjs');

const User = require('../models/user');

exports.getLogin = (req, res, next) => {
    let message = req.flash('error');
    if (message.length > 0) {
        message = message[0];
    }
    else {
        message = null;
    }
    res.render('auth/login', {
        path: '/login',
        pageTitle: 'Login',
        errorMessage: message,
        oldInputs: {email: "", password: ""},
        validationErrors: [],
    });
};

exports.getSignup = (req, res, next) => {
    let message = req.flash('error');
    if (message.length > 0) {
        message = message[0];
    }
    else {
        message = null;
    }
    res.render('auth/signup', {
        path: '/signup',
        pageTitle: 'Signup',
        errorMessage: message,
        oldInputs: {email: "", password: "", confirmPassword: "" },
        validationErrors: []
    });
};

exports.postSignup = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    const errors = validationResult(req);

    if (!errors.isEmpty()){
        console.log(errors.array());
        return res.status(422).render('auth/signup', {
            path: '/signup',
            pageTitle: 'Signup',
            errorMessage: errors.array()[0].msg,
            oldInputs: {email: email, password: password, confirmPassword: req.body.confirmPassword },
            validationErrors: errors.array()
        });
    }
    bcrypt.hash(password, 12)
        .then((hashedPassword) => {
            const user = new User({
                email: email,
                password: hashedPassword,
                cart: { items: [] }
            });
            return user.save();
        })
        .then(() => {
            res.redirect('/login');
            // Gửi email xác nhận bằng Mailgun
            return sendMail(email, 'Hello', '', '<h1>Testing some Mailgun awesomeness!</h1>');
        })
        .catch((err) => {
            console.log(err);
        })
};

exports.postLogin = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    const errors = validationResult(req);
    console.log(errors);

    if (!errors.isEmpty()){
        return res.status(422).render('auth/login', {
            path: '/login',
            pageTitle: 'Login',
            errorMessage: errors.array()[0].msg,
            oldInputs: {email: email, password: password},
            validationErrors: errors.array(),
        });
    }

    User.findOne({ email: email })
        .then(user => {
            if (!user) {
                req.flash('error', 'Invalid email');
                return res.redirect('/login');
            }
            bcrypt.compare(password, user.password)
                .then(doMath => {
                    if (doMath) {
                        req.session.isLoggedIn = true;
                        req.session.user = user;

                        // Sử dụng callback cho req.session.save
                        req.session.save((err) => {
                            if (err) {
                                console.log(err);
                                req.flash('error', 'Error saving session.');
                                return res.redirect('/login');
                            }

                            // Gửi email xác nhận
                            sendMail(email, 'Login success','', '<h1>Testing some Mailgun awesomeness!</h1>')
                                .then(result => {
                                    console.log('Email sent:', result);
                                    res.redirect('/'); // Chuyển hướng đến trang chính
                                })
                                .catch(mailErr => {
                                    console.error('Failed to send email:', mailErr);
                                    req.flash('error', 'Login successful, but failed to send email.');
                                    res.redirect('/'); // Vẫn chuyển hướng ngay cả khi gửi email thất bại
                                });
                        });
                    } else {
                        req.flash('error', 'Invalid email or password.');
                        return res.redirect('/login');
                    }
                });
        })
        .catch(err => {
            console.error('Error during user lookup:', err);
            req.flash('error', 'An error occurred. Please try again later.');
            res.redirect('/login');
        });
};


exports.postLogout = (req, res, next) => {
    req.session.destroy(err => {
        console.log(err);
        res.redirect('/');
    });
};

exports.getReset = (req, res, next) => {
    let message = req.flash('error');
    if (message.length > 0) {
        message = message[0];
    }
    else {
        message = null;
    }
    res.render('auth/reset', {
        path: '/reset',
        pageTitle: 'Reset Password',
        errorMessage: message
    });
};

exports.postReset = (req, res, next) => {
    crypto.randomBytes(32, (err, buffer) => {
        if (err) {
            console.log(err);
            return res.redirect('/reset'); // Dừng lại nếu có lỗi
        }

        const token = buffer.toString('hex');
        User.findOne({ email: req.body.email })
            .then(user => {
                if (!user) {
                    req.flash('error', 'No account with that email found!');
                    return res.redirect('/reset');
                }

                // Thiết lập token và thời hạn
                user.resetToken = token;
                user.resetTokenExpiration = Date.now() + 3600000;
                return user.save();
            })
            .then(result => {
                // Chuyển hướng đến trang đăng nhập sau khi lưu thành công
                res.redirect('/login');

                // Gửi email thông báo, không cần đợi hoàn thành
                return sendMail(req.body.email, 'Reset Password', '', `
                    <p>You requested a password reset</p>
                    <p>Click this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password.</p>`
                )
                    .then(result => {
                        console.log("Email sent successfully");
                    })
                    .catch(err => {
                        console.log("Error sending email:", err);
                    });
            })
            .catch(err => {
                console.error(err);
                req.flash('error', 'An error occurred. Please try again later.');
                res.redirect('/reset');
            });
    });
};

exports.getNewPassword = (req, res, next) => {
    const token = req.params.token;

    User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } })
        .then(user => {
            if (!user) {
                req.flash('error', 'Invalid or expired token.');
                return res.redirect('/reset');
            }
            let message = req.flash('error');
            message = message.length > 0 ? message[0] : null;

            res.render('auth/new-password', {
                path: '/new-password',
                pageTitle: 'New Password',
                errorMessage: message,
                userId: user._id.toString(),
                passwordToken: token // thêm token để dùng khi đặt lại mật khẩu
            });
        })
        .catch(err => {
            console.log(err);
            req.flash('error', 'Something went wrong. Please try again.');
            res.redirect('/reset');
        });
};


exports.postNewPassword = (req, res, next) =>{
    const newPassword = req.body.password;
    const userId = req.body.userId;
    const passwordToken = req.body.passwordToken;
    let resetUser;

    User.findOne({resetToken: passwordToken, _id: userId, resetTokenExpiration: {$gt: Date.now()}})
        .then(user => {
            resetUser = user;
            return bcrypt.hash(newPassword, 12);
        })
        .then(hashedPassword => {
        resetUser.password = hashedPassword;
        resetUser.resetToken = undefined;
        resetUser.resetTokenExpiration = undefined;
        return resetUser.save();
        })
        .then(result =>{
            res.redirect('/login');
            return sendMail(resetUser.email, 'Reset Password Successfully!', 'Reset Password Successfully!', `Reset Password Successfully!`);
        })
        .catch(err => console.log(err));

}

