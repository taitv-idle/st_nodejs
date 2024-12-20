// Import các module cần thiết
const path = require('path');
const fs = require('fs');
const https = require('https');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoBbStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');
require('dotenv').config(); // Thêm dòng này để sử dụng biến môi trường từ file .env
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

// Import controllers và models
const errController = require('./controllers/errors');
const User = require('./models/user');

// console.log(process.env.NODE_ENV);
// Khai báo URI của MongoDB
const MONGODB_URI = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@cluster0.maq21.mongodb.net/${process.env.MONGODB_DATABASE_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

// Khởi tạo ứng dụng Express
const app = express();
const store = new MongoBbStore({
    uri: MONGODB_URI,
    collection: 'sessions',
});
const csrfProtection = csrf();

// const privateKey = fs.readFileSync('server.key');
// const certificate = fs.readFileSync('server.cert');

// Thiết lập nơi lưu trữ file
const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images'); // Thư mục đích để lưu file
    },
    filename: (req, file, cb) => {
        cb(null, new Date().toISOString().replace(/:/g, '-') + '-' + file.originalname); // Đặt tên file
    }
});

// Bộ lọc loại file
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg') {
        cb(null, true); // Chấp nhận file
    } else {
        cb(null, false); // Từ chối file
    }
};

// Thiết lập view engine và thư mục views
app.set('view engine', 'ejs');
app.set('views', 'views');

// Import các routes
const adminRoutes  = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });
// Middleware
app.use(helmet());
// app.use(compression());
app.use(morgan('combined', { stream: accessLogStream }));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(multer({ storage: fileStorage, fileFilter: fileFilter }).single('image'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use(
    session({
        secret: 'my secret',
        resave: false,
        saveUninitialized: false,
        store: store
    })
);

app.use(csrfProtection);
app.use(flash());

// Middleware để gán người dùng vào request
app.use((req, res, next) => {
    // Kiểm tra xem có thông tin người dùng trong session không
    if (!req.session.user) {
        return next(); // Nếu không có người dùng, chuyển tiếp ngay
    }

    // Nếu có người dùng, tìm kiếm trong cơ sở dữ liệu
    User.findById(req.session.user._id)
        .then(user => {
            if (!user) {
                return next(); // Không làm gì thêm, chuyển tiếp
            }
            req.user = user; // Gán người dùng vào req để sử dụng trong các route sau
            next(); // Tiếp tục với middleware hoặc route tiếp theo
        })
        .catch(err => {
            next(new Error(err));
        });
});

// Middleware để gán thông tin cho locals
app.use((req, res, next) => {
    res.locals.isAuthenticated = req.session.isLoggedIn || false;
    res.locals.csrfToken = req.csrfToken();
    next();
});

// Định nghĩa routes
app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

// Route cho trang lỗi 500
app.get('/500', errController.get500Page);
app.use(errController.get404Page);

// Middleware xử lý lỗi
app.use((error, req, res, next) => {
    res.status(500).render('500', {
        pageTitle: 'Error 500',
        path: '/500',
        errorMessage: 'An unexpected error occurred!',
        isAuthenticated: req.isLoggedIn
    });
});


// Kết nối đến cơ sở dữ liệu MongoDB và khởi động server
mongoose.connect(MONGODB_URI)
    .then(result => {
        // https.createServer({key: privateKey, cert: certificate}, app).listen(process.env.PORT || 3000);
        app.listen(process.env.PORT || 3000)
    })
    .catch(err => {
        console.log(err);
    });
