const fs = require('fs');
const path = require('path');

const PDFDocument = require('pdfkit');

const Product = require('../models/product');
const Order = require('../models/order');

// Lấy tất cả sản phẩm
exports.getProducts = (req, res, next) => {
    Product.find()
        .then(products => {
            res.render('shop/product-list', {
                prods: products,
                pageTitle: 'All Products',
                path: '/products',
                isAuthenticated: req.session.isLoggedIn || false // Nếu không có isLoggedIn, mặc định là false
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

// Lấy chi tiết sản phẩm cụ thể
exports.getProduct = (req, res, next) => {
    const prodId = req.params.productId;
    Product.findById(prodId)
        .then(product => {
            if (!product) {
                return res.redirect('/products'); // Nếu không tìm thấy sản phẩm, chuyển hướng về danh sách sản phẩm
            }
            res.render('shop/product-detail', {
                product: product,
                pageTitle: product.title,
                path: '/products'
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

// Lấy trang chủ
exports.getIndex = (req, res, next) => {
    Product.find()
        .then(products => {
            res.render('shop/index', {
                prods: products,
                pageTitle: 'Shop',
                path: '/',
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

// Lấy giỏ hàng
exports.getCart = (req, res, next) => {
    if (!req.user) {
        return res.redirect('/'); // Nếu người dùng không đăng nhập, chuyển hướng về trang chủ
    }
    req.user
        .populate('cart.items.productId')
        .then(user => {
            const products = user.cart.items;
            res.render('shop/cart', {
                path: '/cart',
                pageTitle: 'Your Cart',
                products: products
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

// Thêm sản phẩm vào giỏ hàng
exports.postCart = (req, res, next) => {
    const prodId = req.body.productId;
    Product.findById(prodId)
        .then(product => {
            if (!product) {
                return res.redirect('/products'); // Nếu không tìm thấy sản phẩm, chuyển hướng về danh sách sản phẩm
            }
            return req.user.addToCart(product); // Chuyển từ req.session.user sang req.user
        })
        .then(result => {
            console.log(result);
            res.redirect('/cart');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

// Xóa sản phẩm khỏi giỏ hàng
exports.postCartDeleteProduct = (req, res, next) => {
    const prodId = req.body.productId;
    if (!req.user) {
        return res.redirect('/'); // Nếu người dùng không đăng nhập, chuyển hướng về trang chủ
    }
    req.user
        .removeFromCart(prodId)
        .then(result => {
            res.redirect('/cart');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

// Đặt hàng
exports.postOrder = (req, res, next) => {
    if (!req.user) {
        return res.redirect('/'); // Nếu người dùng không đăng nhập, chuyển hướng về trang chủ
    }
    req.user
        .populate('cart.items.productId')
        .then(user => {
            const products = user.cart.items.map(i => {
                return { quantity: i.quantity, product: { ...i.productId._doc } };
            });
            const order = new Order({
                user: {
                    email: req.user.email, // Sử dụng req.user thay vì req.session.user
                    userId: req.user
                },
                products: products
            });
            return order.save();
        })
        .then(result => {
            return req.user.clearCart(); // Chuyển từ req.session.user sang req.user
        })
        .then(() => {
            res.redirect('/orders');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

// Lấy danh sách đơn hàng
exports.getOrders = (req, res, next) => {
    if (!req.user) {
        return res.redirect('/'); // Nếu người dùng không đăng nhập, chuyển hướng về trang chủ
    }
    Order.find({ 'user.userId': req.user._id }) // Sử dụng req.user thay vì req.session.user
        .then(orders => {
            res.render('shop/orders', {
                path: '/orders',
                pageTitle: 'Your Orders',
                orders: orders
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.getInvoice = (req, res, next) => {
    const orderId = req.params.orderId;

    // Tìm hóa đơn theo ID
    Order.findById(orderId)
        .then(order => {
            if (!order) {
                return next(new Error('No order found'));
            }

            // Kiểm tra quyền truy cập của người dùng
            if (order.user.userId.toString() !== req.user._id.toString()) {
                return next(new Error('Unauthorized'));
            }

            // Thiết lập đường dẫn và tên file hóa đơn
            const invoiceName = `invoice-${orderId}.pdf`;
            const invoicePath = path.join('data', 'invoices', invoiceName);

            // Tạo tài liệu PDF
            const pdfDoc = new PDFDocument();
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${invoiceName}"`);

            // Ghi vào tệp
            const writeStream = fs.createWriteStream(invoicePath);
            pdfDoc.pipe(writeStream); // Ghi vào file
            pdfDoc.pipe(res); // Ghi vào response

            // Tiêu đề hóa đơn
            pdfDoc.fontSize(26).text('Invoice', { underline: true, align: 'center' }).moveDown(1);

            // Thông tin người mua
            pdfDoc.fontSize(12).text(`Order ID: ${orderId}`, { align: 'center' });
            pdfDoc.text(`Date: ${new Date().toLocaleDateString()}`, { align: 'center' });
            pdfDoc.text(`Customer: ${order.user.email}`, { align: 'center' }).moveDown(2);

            // Thêm tiêu đề cho bảng
            pdfDoc.fontSize(12).text('Item', { align: 'left', continued: true }).text('Quantity', { width: 90, align: 'center', continued: true })
                .text('Price', { width: 90, align: 'right' }).moveDown();

            // Thêm đường viền dưới tiêu đề
            pdfDoc.moveTo(50, pdfDoc.y).lineTo(550, pdfDoc.y).stroke().moveDown(5);

            let totalPrice = 0;
            order.products.forEach((prod) => {
                totalPrice += prod.quantity * prod.product.price;
                pdfDoc.text(prod.product.title, { align: 'left', continued: true })
                    .text(prod.quantity, { width: 90, align: 'center', continued: true })
                    .text('$' + prod.product.price.toFixed(2), { width: 90, align: 'right' }).moveDown(2); // Tạo khoảng cách giữa các hàng
            });

            // Hiển thị tổng giá
            pdfDoc.moveDown().fontSize(14).text('Total Price: $' + totalPrice.toFixed(2), { align: 'right' });

            // Khi ghi tệp hoàn tất, gửi phản hồi
            writeStream.on('finish', () => {
                pdfDoc.end(); // Kết thúc tài liệu PDF
            });

            pdfDoc.end(); // Kết thúc tài liệu PDF
        })
        .catch(err => {
            return next(err);
        });
};