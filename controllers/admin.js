const { validationResult } = require('express-validator');
const Product = require('../models/product');
const mongoose = require('mongoose');
const fileHelper = require('../utils/file');

// Kiểm tra quyền truy cập
exports.getAddProduct = (req, res, next) => {
    if (!req.session.isLoggedIn) {
        return res.redirect('/login');
    }
    res.render('admin/edit-product', {
        pageTitle: 'Add Product',
        path: '/admin/add-product',
        editing: false,
        hasError: false,
        errorMessage: null,
        validationErrors: []
    });
};

exports.postAddProduct = (req, res, next) => {
    const title = req.body.title;
    const image = req.file;
    const price = req.body.price;
    const description = req.body.description;
    const errors = validationResult(req);
    if (!image){
        return res.status(422).render('admin/edit-product', {
            pageTitle: 'Add Product',
            path: '/admin/add-product',
            editing: false,
            hasError: true,
            product: {
                title: title,
                price: price,
                description: description,
            },
            errorMessage: 'Attached file is not an image.',
            validationErrors: []
        })
    }

    const imageUrl = image.path;

    if (!errors.isEmpty()) {
        console.log(errors.array());
        return res.status(422).render('admin/edit-product', {
            pageTitle: 'Add Product',
            path: '/admin/add-product',
            editing: false,
            hasError: true,
            product: {
                title: title,
                imageUrl: imageUrl,
                price: price,
                description: description,
            },
            errorMessage: errors.array()[0].msg,
            validationErrors: errors.array()
        });
    }

    const product = new Product({
        // _id: new mongoose.Types.ObjectId('6726da998da5d85752b32a8d'),
        title: title,
        price: price,
        description: description,
        imageUrl: imageUrl,
        userId: req.user
    });
    product
        .save()
        .then(result => {
            console.log('Created Product');
            res.redirect('/admin/products');
        })
        .catch( err => {
            // return res.status(500).render('admin/edit-product', {
            //     pageTitle: 'Add Product',
            //     path: '/admin/edit-product',
            //     editing: false,
            //     hasError: true,
            //     product: {
            //         title: title,
            //         imageUrl: imageUrl,
            //         price: price,
            //         description: description,
            //     },
            //     errorMessage: 'Database operatyion failed, please try again.',
            //     validationErrors: []
            // });

            // c2
            // res.redirect('/500');

            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.getEditProduct = (req, res, next) => {
    const editMode = req.query.edit === 'true';
    if (!editMode) {
        return res.redirect('/');
    }
    const prodId = req.params.productId;
    Product.findById(prodId)
        .then(product => {
            if (!product) {
                return res.redirect('/');
            }
            res.render('admin/edit-product', {
                pageTitle: 'Edit Product',
                path: '/admin/edit-product',
                editing: editMode,
                product: product,
                hasError: false,
                errorMessage: null,
                validationErrors: []
            });
        })
        .catch(
            err => {
                const error = new Error(err);
                error.httpStatusCode = 500;
                return next(error);
            }
        );
};

exports.postEditProduct = (req, res, next) => {
    const prodId = req.body.productId;
    const updatedTitle = req.body.title;
    const updatedPrice = req.body.price;
    const image = req.file;
    const updatedDesc = req.body.description;
    const errors = validationResult(req);

    // Kiểm tra lỗi xác thực đầu vào
    if (!errors.isEmpty()) {
        return res.status(422).render('admin/edit-product', {
            pageTitle: 'Edit Product',
            path: '/admin/edit-product',
            editing: true,
            hasError: true,
            product: {
                _id: prodId,
                title: updatedTitle,
                price: updatedPrice,
                description: updatedDesc,
            },
            errorMessage: errors.array()[0].msg,
            validationErrors: errors.array()
        });
    }

    Product.findById(prodId)
        .then(product => {
            // Kiểm tra xem người dùng có quyền chỉnh sửa sản phẩm không
            if (product.userId.toString() !== req.user._id.toString()) {
                return res.redirect('/');
            }

            // Cập nhật thông tin sản phẩm
            product.title = updatedTitle;
            product.price = updatedPrice;
            product.description = updatedDesc;

            // Kiểm tra và cập nhật hình ảnh mới (nếu có)
            if (image) {
                fileHelper.deleteFile(product.imageUrl); // Xóa ảnh cũ
                product.imageUrl = image.path; // Cập nhật ảnh mới
            }

            // Lưu thay đổi vào cơ sở dữ liệu
            return product.save().then(() => {
                console.log('UPDATED PRODUCT!');
                res.redirect('/admin/products');
            });
        })
        .catch(err => {
            // Xử lý lỗi và chuyển đến middleware lỗi
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};


exports.getProducts = (req, res, next) => {
    Product.find({userId: req.user._id})
        // .select('title price -_id')
        // .populate('userId', 'name')
        .then(products => {
            res.render('admin/products', {
                prods: products,
                pageTitle: 'Admin Products',
                path: '/admin/products'
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.deleteProduct = (req, res, next) => {
    const prodId = req.params.productId;

    // Tìm kiếm sản phẩm bằng ID
    Product.findById(prodId)
        .then(product => {
            // Kiểm tra xem sản phẩm có tồn tại không
            if (!product) {
                return next(new Error('Product not found'));
            }

            // Xóa tệp hình ảnh của sản phẩm
            fileHelper.deleteFile(product.imageUrl);

            // Xóa sản phẩm với điều kiện ID của người dùng khớp với người tạo sản phẩm
            return Product.deleteOne({ _id: prodId, userId: req.user._id });
        })
        .then(() => {
            console.log('DESTROYED PRODUCT');
            res.status(200).json({message: 'Product deleted successfully.'});
        })
        .catch(err => {
            res.status(500).json({message: 'Deleting product failed'});
        });
};
