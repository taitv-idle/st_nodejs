exports.get404Page = (req, res, next) => {
    res.status(404).render('404', {
        pageTitle: 'Not Found',
        path: '/404',
        isAuthenticated: req.isLoggedIn
    });
}

exports.get500Page = (req, res, next) => {
    res.status(500).render('500', {
        pageTitle: 'Error 500',
        path: '/500',
        errorMessage: 'An unexpected error occurred!',
        isAuthenticated: req.isLoggedIn
    });
}

