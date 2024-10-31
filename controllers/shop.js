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
            console.log(err);
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
        .catch(err => console.log(err));
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
            console.log(err);
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
        .catch(err => console.log(err));
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
        .catch(err => console.log(err));
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
        .catch(err => console.log(err));
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
        .catch(err => console.log(err));
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
        .catch(err => console.log(err));
};
