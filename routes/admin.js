
const express = require('express');
const adminController = require('../controllers/admin');
const isAuth = require('../middleware/is-auth');
const { body } = require('express-validator');
const router = express.Router();

// Đặt quy tắc kiểm tra trong một biến để tái sử dụng
const productValidationRules = [
    body('title').isString().isLength({ min: 3 }).trim(),
    body('price').isFloat().trim(),
    body('description').isLength({ min: 5, max: 100 }).trim()
];

// Route thêm sản phẩm
router.get('/add-product', isAuth, adminController.getAddProduct);
router.post('/add-product', isAuth, productValidationRules, adminController.postAddProduct);

// Route xem danh sách sản phẩm
router.get('/products', isAuth, adminController.getProducts);

// Route chỉnh sửa sản phẩm
router.get('/edit-product/:productId', isAuth, adminController.getEditProduct);
router.post('/edit-product', isAuth, productValidationRules, adminController.postEditProduct);

// Route xóa sản phẩm
router.delete('/product/:productId', isAuth, adminController.deleteProduct);

module.exports = router;