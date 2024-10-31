const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoBbStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');

const errController = require('./controllers/404');
const User = require('./models/user');

const MONGODB_URI = 'mongodb+srv://tester:faaJ8OzQ29fMHAIz@cluster0.maq21.mongodb.net/shop?retryWrites=true&w=majority&appName=Cluster0';

const app = express();
const store = new MongoBbStore({
    uri: MONGODB_URI,
    collection: 'sessions',
});
const csrfProtection = csrf();

app.set('view engine', 'ejs')
app.set('views', 'views')

const adminRoutes  = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(
    session({
        secret: 'my secret',
        resave: false,
        saveUninitialized: false,
        store: store
    }));

app.use(csrfProtection);
app.use(flash());

app.use((req, res, next) => {
    // Kiểm tra xem có thông tin người dùng trong session không
    if (!req.session.user) {
        return next(); // Nếu không có người dùng, chuyển tiếp ngay
    }

    // Nếu có người dùng, tìm kiếm trong cơ sở dữ liệu
    User.findById(req.session.user._id)
        .then(user => {
            // Nếu người dùng không tồn tại trong cơ sở dữ liệu
            if (!user) {
                return next(); // Không làm gì thêm, chuyển tiếp
            }
            req.user = user; // Gán người dùng vào req để sử dụng trong các route sau
            next(); // Tiếp tục với middleware hoặc route tiếp theo
        })
        .catch(err => {
            console.log(err); // Ghi lỗi ra console
            next(); // Tiếp tục ngay cả khi có lỗi
        });
});

app.use((req, res, next) =>{
    res.locals.isAuthenticated = req.session.isLoggedIn || false;
    res.locals.csrfToken = req.csrfToken();
    next();
});

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.use(errController.get404Page);

mongoose.connect(MONGODB_URI)
    .then(result => {
        app.listen(3000);
    })
    .catch(err => {
        console.log(err);
    })

