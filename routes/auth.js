const express = require('express');
const { check, body} = require('express-validator');
const authController = require('../controllers/auth');
const User = require("../models/user");
const router = express.Router();

router.get('/login', authController.getLogin);
router.get('/signup', authController.getSignup);
router.post('/login',
    [
        body('email')
            .isEmail()
            .withMessage('Please enter a valid email'),

        body('password', 'Password has to be valid  ')
            .isLength({ min: 5 }) // Đảm bảo mật khẩu có ít nhất 5 ký tự
            .isAlphanumeric()     // Đảm bảo chỉ chứa chữ và số, không có ký tự đặc biệt
    ],
    authController.postLogin
);

router.post('/logout', authController.postLogout);
router.post(
    '/signup',
    [
        check('email')
            .isEmail()
            .withMessage('Please enter a valid email')
            .custom((value) => {
                // Kiểm tra xem email đã tồn tại trong hệ thống chưa
                return User.findOne({ email: value }).then((userDoc) => {
                    if (userDoc) {
                        return Promise.reject('Email exists already');
                    }
                });
            }),

        body('password', 'Please enter a password with only numbers and text and at least 5 characters')
            .isLength({ min: 5 }) // Kiểm tra độ dài tối thiểu của mật khẩu là 5 ký tự
            .isAlphanumeric(),    // Đảm bảo mật khẩu chỉ chứa chữ và số (không có ký tự đặc biệt)

        body('confirmPassword').custom((value, { req }) => {
            // Kiểm tra xem confirmPassword có khớp với password hay không
            if (value !== req.body.password) {
                throw new Error('Passwords have to match!');
            }
            return true;
        })
    ],
    authController.postSignup
);


router.get('/reset', authController.getReset);
router.post('/reset', authController.postReset);
router.get('/reset/:token', authController.getNewPassword);
router.post('/new-password', authController.postNewPassword);
module.exports = router;