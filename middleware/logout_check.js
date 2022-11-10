

const logout = (req, res, next) => {
    !req.session.adminActive ? next() : res.redirect("/admin")
}

module.exports = logout