const mongoClient = require('mongodb').MongoClient
const state = {
    db: null
}

module.exports.connect = function (done) {
    const url = 'mongodb+srv://akhil:cake1234@cluster0.vol2ug6.mongodb.net/test'
    const dbname = 'CakeShop'
    mongoClient.connect(url, (err, data) => {
        if (err) return done(err)
        state.db = data.db(dbname)
        done()
    })

}

module.exports.get = function () {
    return state.db
}
