var db = require('../config/connection')
var collection = require('../config/collections')
var objectId = require('mongodb').ObjectId
const fs = require('fs')
const { promisify } = require('util')
const unlinkAsync = promisify(fs.unlink)
module.exports = {
    addProducts: (product) => {
        return new Promise((resolve, reject) => {
            product.avilability = parseInt(product.avilability)
            // product.view = parseInt(product.view)
            db.get().collection(collection.PRODUCT_COLLECTION).insertOne(product).then((data) => {
                resolve()
            })
        })

    },
    getAllProducts: (currentPage) => {
        return new Promise(async (resolve, reject) => {
            const perPage = 15
            const skip = (currentPage - 1) * perPage;
            let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().sort({ _id: -1 }).skip(skip).limit(perPage).toArray()
            resolve(products)
        })

    },
    deleteProducts: (Id) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({ _id: objectId(Id) }).then((result) => {
                resolve(result)
            })
        })

    },
    editProducts: (Id) => {
        return new Promise((resolve, request) => {
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: objectId(Id) }).then((response) => {
                resolve(response)
            })
        })
    },
    updateProduct: (Id, productData) => {
        productData.avilability = parseInt(productData.avilability)
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: objectId(Id) }, {
                $set: {
                    name: productData.name,
                    category: productData.category,
                    price: productData.price,
                    description: productData.description,
                    avilability: productData.avilability
                }
            })

            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: objectId(Id) }, {
                $push: {
                    image: {
                        $each: productData.image
                    }
                }
            }).then((data) => {
                resolve(data)
            })
        })
    },
    blockUser: (Id) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(Id) }, { $set: { blockStatus: true } }).then((result) => {
                resolve(result)
            })
        })
    },
    unblockUser: (Id) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(Id) }, { $set: { blockStatus: false } }).then((result) => {
                resolve(result)
            })
        })
    },
    addCategory: (category) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).insertOne(category).then((response) => {
                resolve(response.insertedId)
            })
        })
    },
    getCategory: async () => {
        const category = await db.get().collection(collection.CATEGORY_COLLECTION).find().toArray()
        return category

    },
    deleteCategory: (Id) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).deleteOne({ _id: objectId(Id) }).then((response) => {
                resolve(response)
            })
        })
    },
    editCategory: (Id) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).findOne({ _id: objectId(Id) }).then((data) => {
                resolve(data)
            })
        })
    },
    updateCategory: (Id, data) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).updateOne({ _id: objectId(Id) }, {
                $set: {
                    category: data.category,
                    categoryOffer: data.categoryOffer,
                    "image.$[]": data.image
                }
            }).then((result) => {
                resolve(true)
            })
        })
    },
    adminLogin: (data) => {
        return new Promise(async (resolve, reject) => {
            let validator = await db.get().collection(collection?.ADMIN_COLLECTION).find({ email: data.email }).toArray()
            if (validator) {
                if (validator[0].psw == data.psw) {
                    resolve(true)
                } else {
                    resolve(false)
                }
            } else {
                resolve(false)
            }
        })
    },
    orders: (currentPage) => {
        return new Promise(async (resolve, reject) => {
            const perPage = 10
            const skip = (currentPage - 1) * perPage;
            db.get().collection(collection.ORDER_COLLECTION).find().sort({ _id: -1 }).skip(skip).limit(perPage).toArray().then((orders) => {
                resolve(orders)
            })
        })
    },
    updateStatus: (data) => {
        return new Promise(async (resolve, response) => {
            let order = await db.get().collection(collection.ORDER_COLLECTION).findOne({ _id: objectId(data.orderId) })
            for (const i of order.orderdProducts) {
                if (i.item == data.productId) {
                    i.status = data.status

                    db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(data.orderId) },
                        {
                            $set: { ...order }
                        })
                    break;

                }
            }
            resolve()

        })
    },
    salesDataDay: () => {
        return new Promise(async (resolve, reject) => {
            let result = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                        totaRevenue: { $sum: '$totalMoney' }
                    }
                }, {
                    $sort: { _id: 1 }
                }
            ]).toArray()
            resolve(result)
        })
    },
    salesDataMonth: () => {
        return new Promise(async (resolve, reject) => {
            let result = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
                        totaRevenue: { $sum: '$totalMoney' }
                    }
                }
            ]).toArray()
            resolve(result)
        })
    },
    salesDataYear: () => {
        return new Promise(async (resolve, reject) => {
            let result = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y", date: "$date" } },
                        totaRevenue: { $sum: '$totalMoney' }
                    }
                }
            ]).toArray()
            resolve(result)
        })
    },
    productOffer: (data) => {
        db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: objectId(data.proId) },
            {
                $set: { productOffer: data.offer }
            })
    },
    viewOffer: (id) => {
        return new Promise(async (resolve, reject) => {
            let offerRate = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: objectId(id) })
            resolve(offerRate.productOffer)

        })
    },
    getDiscountedProducts: () => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).aggregate([
                {
                    $match: { avilability: 1 }
                },
                {

                    $lookup: {
                        from: collection.CATEGORY_COLLECTION,
                        localField: 'category',
                        foreignField: 'category',
                        as: 'category'
                    }
                },
                {
                    $unwind: "$category"
                },
                {
                    $addFields: {
                        discountOff: { $cond: { if: { $gt: [{ $toInt: "$productOffer" }, { $toInt: '$category.categoryOffer' }] }, then: "$productOffer", else: '$category.categoryOffer' } },
                    }

                },
                {
                    $addFields: {

                        discountedAmount: { $round: { $divide: [{ $multiply: [{ $toInt: "$price" }, { $toInt: "$discountOff" }] }, 100] } },
                    }
                },
                {
                    $addFields: {
                        priceAfterDiscount: { $round: { $subtract: [{ $toInt: "$price" }, { $toInt: "$discountedAmount" }] } }
                    }
                },


            ]).toArray().then((discount) => {
                resolve(discount)
            })

        })
    },
    deleteCoupon: (Id) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.COUPON_COLLECTION).deleteOne({ _id: objectId(Id) }).then((response) => {
                resolve()
            })
        }).catch((err) => {
            console.log(err)
        })
    },
    addSlider: (slider) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.BANNER_SLIDER).insertOne(slider).then((response) => {
                resolve(response.insertedId)
            })
        })
    },
    addSercices: (services) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.SERVICES_COLLECTION).insertOne(services).then((response) => {
                resolve()
            })
        })
    },
    addBanner3: (banner) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.BANNER3_COLLECTION).insertOne(banner).then((response) => {
                resolve()
            })
        })
    },
    removeImg: (data) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: objectId(data.proId) }, {
                $pull: { image: data.imgName }
            }).then(async (datafind) => {
                if (datafind.modifiedCount) {
                    imgPath = 'public/uploads/' + data.imgName
                    await unlinkAsync(imgPath)
                }
            })


        })

    },
    addMoneyToWallet: (data, user) => {
        data.money = parseInt(data.money)
        return new Promise(async (resolve, reject) => {
            let result = await db.get().collection(collection.WALLET_COLLECTION).updateOne({ userId: objectId(user) },
                {
                    $inc: { totalBalance: data.money }

                }).then((response) => {
                    db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(data.orderId), "orderdProducts.item": objectId(data.id) },
                        { $set: { "orderdProducts.$.paymentStatus": "Refunded" } }
                    ).then((response) => {
                        console.log(result)
                        resolve()
                    })
                })


        })
    }

}




















